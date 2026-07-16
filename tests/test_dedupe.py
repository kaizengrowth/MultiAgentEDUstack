"""Spec tests for pipeline/dedupe.py, the credibility + dedup pass.

The spec, per the module docstring and README:
- tier assignment is a rule-based lookup by scout (or blog category)
- exact-URL matches across scouts collapse to one curated_item
- high title similarity also merges
- corroboration strengthens tier (lower number wins) and bumps mention_count
- every raw_item ends up in item_merges exactly once, so re-runs are no-ops
"""

from __future__ import annotations

import base
import dedupe
import pytest


def _insert_raw(conn, scout, url, title, metadata=None):
    assert base.insert_item(
        conn, scout=scout, source_url=url, title=title, raw_metadata=metadata
    )


# --- tier assignment -------------------------------------------------------


@pytest.mark.parametrize(
    ("scout", "expected_tier"),
    [
        ("arxiv", 1),
        ("youtube", 3),
        ("hn", 5),
        ("github_trending", 5),
        ("reddit", 5),
        ("bluesky", 5),
        ("x", 5),
    ],
)
def test_tier_for_scout_lookup(scout, expected_tier):
    assert dedupe._tier_for(scout, {}) == expected_tier


@pytest.mark.parametrize(
    ("category", "expected_tier"),
    [("lab", 2), ("academic", 2), ("practitioner", 3)],
)
def test_tier_for_blog_depends_on_source_category(category, expected_tier):
    assert dedupe._tier_for("blog", {"category": category}) == expected_tier


def test_tier_for_blog_defaults_to_practitioner():
    assert dedupe._tier_for("blog", {}) == 3
    assert dedupe._tier_for("blog", {"category": "unknown-thing"}) == 3


def test_tier_for_unknown_scout_defaults_to_tier_4():
    """CLAUDE.md: a scout missing from SCOUT_TIER defaults to tier 4."""
    assert dedupe._tier_for("brand_new_scout", {}) == 4


def test_every_assignable_tier_has_a_label():
    tiers = set(dedupe.SCOUT_TIER.values()) | set(dedupe.BLOG_CATEGORY_TIER.values())
    tiers.add(4)  # the unknown-scout default
    for tier in tiers:
        assert tier in dedupe.TIER_LABELS


# --- title similarity ------------------------------------------------------


def test_title_similarity_identical_is_one():
    assert dedupe._title_similarity("GPT-5 Released", "GPT-5 Released") == 1.0


def test_title_similarity_is_case_insensitive():
    a = dedupe._title_similarity("GPT-5 RELEASED", "gpt-5 released")
    assert a == 1.0


def test_title_similarity_unrelated_titles_below_threshold():
    score = dedupe._title_similarity(
        "Rust borrow checker deep dive", "Sourdough starter maintenance tips"
    )
    assert score < dedupe.TITLE_SIMILARITY_THRESHOLD


# --- run(): curation and merging ------------------------------------------


def test_run_creates_curated_item_with_tier_and_label(conn):
    _insert_raw(conn, "arxiv", "https://arxiv.org/abs/1", "Attention Revisited")
    dedupe.run()

    row = conn.execute(
        "SELECT title, canonical_url, tier, tier_label, mention_count, status"
        " FROM curated_items"
    ).fetchone()
    assert row == (
        "Attention Revisited",
        "https://arxiv.org/abs/1",
        1,
        "Primary research",
        1,
        "new",
    )


def test_run_merges_exact_url_across_scouts(conn):
    url = "https://example.com/model-release"
    _insert_raw(conn, "hn", url, "Big Lab ships new model")
    _insert_raw(conn, "blog", url, "Big Lab ships new model", {"category": "lab"})
    dedupe.run()

    rows = conn.execute(
        "SELECT tier, tier_label, mention_count FROM curated_items"
    ).fetchall()
    assert len(rows) == 1
    tier, label, mentions = rows[0]
    # hn lands first as tier 5; the lab blog corroboration strengthens to 2.
    assert tier == 2
    assert label == "Lab/vendor primary source"
    assert mentions == 2


def test_run_corroboration_never_weakens_tier(conn):
    url_a = "https://arxiv.org/abs/2"
    url_b = "https://news.ycombinator.com/item?id=1"
    _insert_raw(conn, "arxiv", url_a, "Scaling Laws for Frontier Agents")
    dedupe.run()
    # Same story resurfaces from a tier-5 source with a near-identical title.
    _insert_raw(conn, "hn", url_b, "Scaling laws for frontier agents")
    dedupe.run()

    rows = conn.execute("SELECT tier, mention_count FROM curated_items").fetchall()
    assert rows == [(1, 2)]


def test_run_merges_similar_titles_with_different_urls(conn):
    _insert_raw(conn, "blog", "https://a.example/post", "Claude 5 announced by Anthropic")
    _insert_raw(conn, "hn", "https://b.example/story", "Claude 5 announced by Anthropic today")
    dedupe.run()

    assert conn.execute("SELECT COUNT(*) FROM curated_items").fetchone()[0] == 1
    assert conn.execute("SELECT COUNT(*) FROM item_merges").fetchone()[0] == 2


def test_run_keeps_distinct_stories_separate(conn):
    _insert_raw(conn, "arxiv", "https://arxiv.org/abs/3", "Mixture of Depths Routing")
    _insert_raw(conn, "hn", "https://c.example/story", "Postgres 18 performance notes")
    dedupe.run()

    assert conn.execute("SELECT COUNT(*) FROM curated_items").fetchone()[0] == 2


def test_run_records_every_raw_item_in_item_merges(conn):
    _insert_raw(conn, "arxiv", "https://arxiv.org/abs/4", "Paper Four")
    _insert_raw(conn, "hn", "https://d.example/x", "Something with LLM agents")
    dedupe.run()

    raw_count = conn.execute("SELECT COUNT(*) FROM raw_items").fetchone()[0]
    merged = conn.execute(
        "SELECT COUNT(DISTINCT raw_item_id) FROM item_merges"
    ).fetchone()[0]
    assert merged == raw_count == 2


def test_run_is_idempotent(conn, capsys):
    _insert_raw(conn, "arxiv", "https://arxiv.org/abs/5", "Paper Five")
    dedupe.run()
    capsys.readouterr()

    dedupe.run()
    out = capsys.readouterr().out
    assert "0 raw items processed" in out
    assert conn.execute("SELECT COUNT(*) FROM curated_items").fetchone()[0] == 1
    assert conn.execute("SELECT COUNT(*) FROM item_merges").fetchone()[0] == 1


def test_run_uses_blog_category_from_raw_metadata(conn):
    _insert_raw(
        conn,
        "blog",
        "https://bair.berkeley.edu/blog/post",
        "A New Benchmark",
        {"category": "academic"},
    )
    dedupe.run()

    tier, label = conn.execute(
        "SELECT tier, tier_label FROM curated_items"
    ).fetchone()
    assert (tier, label) == (2, "Lab/vendor primary source")


def test_run_handles_null_metadata(conn):
    """raw_metadata can be NULL for rows inserted outside insert_item."""
    conn.execute(
        "INSERT INTO raw_items (scout, source_url, title, raw_metadata)"
        " VALUES ('hn', 'https://e.example/y', 'An AI story', NULL)"
    )
    conn.commit()
    dedupe.run()

    assert conn.execute("SELECT COUNT(*) FROM curated_items").fetchone()[0] == 1
