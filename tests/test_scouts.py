"""Spec tests for the scouts' parsing and filtering logic.

No network anywhere: HTTP, feedparser, and yt-dlp are all stubbed. What is
under test is the judgment each scout encodes (relevance filters, feed
parsing, transcript cleanup) and the resilience contract from ingest.sh:
one broken source must not take down the rest of a run.

The relevance filters match keywords on word boundaries (with an optional
plural), never as bare substrings; the rejects-embedded-substrings tests
pin that down for both hn and github_trending.
"""

from __future__ import annotations

import json
import types

import pytest
import requests

import arxiv_scout
import base
import blog_scout
import github_trending_scout
import hn_scout
import youtube_scout


# --- arxiv_scout -------------------------------------------------------------

ARXIV_ATOM = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2507.00001v1</id>
    <title>Attention Is Still All You Need</title>
    <summary>We revisit attention with fresh eyes.</summary>
    <published>2026-07-01T00:00:00Z</published>
    <author><name>Ada Lovelace</name></author>
    <author><name>Alan Turing</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2507.00002v1</id>
    <title>Second Paper</title>
    <summary>Another abstract.</summary>
    <published>2026-07-02T00:00:00Z</published>
    <author><name>Grace Hopper</name></author>
  </entry>
</feed>
"""


def test_arxiv_fetch_category_parses_atom(monkeypatch, fake_response):
    captured = {}

    def fake_get(url, params=None, timeout=None):
        captured["url"] = url
        captured["params"] = params
        return fake_response(text=ARXIV_ATOM)

    monkeypatch.setattr(arxiv_scout.requests, "get", fake_get)
    items = arxiv_scout.fetch_category("cs.CL", max_results=25)

    assert captured["url"] == arxiv_scout.ARXIV_API
    assert captured["params"]["search_query"] == "cat:cs.CL"
    assert len(items) == 2

    first = items[0]
    assert first["title"] == "Attention Is Still All You Need"
    assert first["url"] == "http://arxiv.org/abs/2507.00001v1"
    assert first["author"] == "Ada Lovelace, Alan Turing"
    assert first["published_at"] == "2026-07-01T00:00:00Z"
    assert first["category"] == "cs.CL"


def test_arxiv_run_survives_one_failing_category(db_path, monkeypatch, capsys):
    def fake_fetch(category, max_results=25):
        if category == "cs.CL":
            raise requests.RequestException("boom")
        return [
            {
                "title": "Survivor Paper",
                "url": "https://arxiv.org/abs/9",
                "summary": "s",
                "author": None,
                "published_at": None,
                "category": category,
            }
        ]

    monkeypatch.setattr(arxiv_scout, "fetch_category", fake_fetch)
    arxiv_scout.run(categories=["cs.CL", "cs.AI"])

    assert "FAILED for cs.CL" in capsys.readouterr().err

    conn = base.get_connection()
    rows = conn.execute("SELECT title FROM raw_items").fetchall()
    conn.close()
    assert rows == [("Survivor Paper",)]


# --- hn_scout ----------------------------------------------------------------


@pytest.mark.parametrize(
    "title",
    [
        "Claude Code now runs in the terminal",
        "Show HN: An LLM eval harness",
        "OpenAI announces a new model",
        "Fine-tuning diffusion models on one GPU",
        "Machine learning for protein folding",
    ],
)
def test_hn_relevance_accepts_ai_titles(title):
    assert hn_scout._is_ai_relevant(title)


@pytest.mark.parametrize(
    "title",
    [
        "PostgreSQL 18 performance notes",
        "The history of the telephone network",
        "Show HN: My side project tracker",
    ],
)
def test_hn_relevance_rejects_unrelated_titles(title):
    assert not hn_scout._is_ai_relevant(title)


@pytest.mark.parametrize(
    "title",
    [
        "Email is broken",
        "How we maintain a 20-year-old codebase",
        "Startup raised $10M for solar panels",
    ],
)
def test_hn_relevance_rejects_embedded_keyword_substrings(title):
    """'ai' inside 'email'/'maintain'/'raised' is not AI relevance; keywords
    must match on word boundaries."""
    assert not hn_scout._is_ai_relevant(title)


def test_hn_fetch_top_stories_filters_and_falls_back(monkeypatch, fake_response):
    story_ai = {
        "type": "story",
        "title": "New LLM benchmark drops",
        "score": 120,
        "descendants": 40,
        "time": 1752624000,
        "by": "pg",
    }  # no "url" key: a text post, must fall back to the discussion link
    story_offtopic = {
        "type": "story",
        "title": "PostgreSQL 18 performance notes",
        "url": "https://example.com/pg",
    }
    job = {"type": "job", "title": "AI startup hiring"}

    responses = {
        f"{hn_scout.HN_BASE}/topstories.json": [1, 2, 3, 4],
        f"{hn_scout.HN_BASE}/item/1.json": story_ai,
        f"{hn_scout.HN_BASE}/item/2.json": story_offtopic,
        f"{hn_scout.HN_BASE}/item/3.json": job,
        f"{hn_scout.HN_BASE}/item/4.json": None,  # deleted item
    }

    monkeypatch.setattr(
        hn_scout.requests,
        "get",
        lambda url, timeout=None: fake_response(json_data=responses[url]),
    )
    items = hn_scout.fetch_top_stories(limit=4)

    assert len(items) == 1
    assert items[0]["title"] == "New LLM benchmark drops"
    assert items[0]["url"] == "https://news.ycombinator.com/item?id=1"


def test_hn_run_survives_network_failure(db_path, monkeypatch, capsys):
    def fake_fetch(limit=200):
        raise requests.RequestException("offline")

    monkeypatch.setattr(hn_scout, "fetch_top_stories", fake_fetch)
    hn_scout.run()

    assert "FAILED" in capsys.readouterr().err
    conn = base.get_connection()
    assert conn.execute("SELECT COUNT(*) FROM raw_items").fetchone()[0] == 0
    conn.close()


# --- github_trending_scout ----------------------------------------------------

TRENDING_HTML = """
<article class="Box-row">
  <h2><a href="/acme/llm-toolkit">acme / llm-toolkit</a></h2>
  <p>An agent framework for LLM apps</p>
  <a href="/acme/llm-toolkit/stargazers">1,234</a>
  <span class="d-inline-block float-sm-right">120 stars today</span>
</article>
<article class="Box-row">
  <h2><a href="/features/copilot/plans/extra">not a repo link</a></h2>
</article>
<article class="Box-row">
  <h2><a href="/chef/recipe-book">chef / recipe-book</a></h2>
  <p>Sourdough and pasta recipes</p>
</article>
"""


def test_github_fetch_trending_parses_and_filters(monkeypatch, fake_response):
    monkeypatch.setattr(
        github_trending_scout.requests,
        "get",
        lambda url, params=None, headers=None, timeout=None: fake_response(
            text=TRENDING_HTML
        ),
    )
    items = github_trending_scout.fetch_trending()

    assert len(items) == 1
    repo = items[0]
    assert repo["repo"] == "acme/llm-toolkit"
    assert repo["url"] == "https://github.com/acme/llm-toolkit"
    assert repo["description"] == "An agent framework for LLM apps"
    assert repo["stars_total"] == "1,234"
    assert repo["stars_today"] == "120 stars today"


def test_github_relevance_checks_name_and_description():
    assert github_trending_scout._is_ai_relevant("", "acme/rag-server")
    assert github_trending_scout._is_ai_relevant("A diffusion model zoo", "acme/zoo")
    assert not github_trending_scout._is_ai_relevant(
        "A static site generator", "acme/website"
    )


def test_github_relevance_rejects_embedded_keyword_substrings():
    """'ml' inside 'html' is not ML relevance; keywords must match on word
    boundaries. Hyphenated repo names still count as boundaries."""
    assert not github_trending_scout._is_ai_relevant(
        "A fast html templating engine", "acme/templates"
    )
    assert github_trending_scout._is_ai_relevant("", "acme/ml-experiments")


# --- youtube_scout -------------------------------------------------------------

VTT_SAMPLE = """WEBVTT
Kind: captions
Language: en

1
00:00:00.000 --> 00:00:02.000
Hello <c.colorE5E5E5>world</c>

2
00:00:02.000 --> 00:00:04.000
Hello world
this is a test
"""


def test_vtt_to_text_strips_markup_and_dedupes():
    assert youtube_scout._vtt_to_text(VTT_SAMPLE) == "Hello world this is a test"


def test_vtt_to_text_empty_input():
    assert youtube_scout._vtt_to_text("WEBVTT\n\n") == ""


def test_latest_video_ids_parses_and_skips_malformed(monkeypatch):
    captured = {}

    def fake_run(args):
        captured["args"] = args
        return (
            "abc123|||Intro to Agents|||20260701\n"
            "not a valid line\n"
            "def456|||Eval Deep Dive|||20260702\n"
        )

    monkeypatch.setattr(youtube_scout, "_run_yt_dlp", fake_run)
    videos = youtube_scout.latest_video_ids("https://youtube.com/@somechannel", limit=3)

    assert captured["args"][-1] == "https://youtube.com/@somechannel/videos"
    assert videos == [
        {"id": "abc123", "title": "Intro to Agents", "upload_date": "20260701"},
        {"id": "def456", "title": "Eval Deep Dive", "upload_date": "20260702"},
    ]


# --- blog_scout ----------------------------------------------------------------


def test_blog_feed_overrides_all_match_sources_yaml():
    """Spec from the module docstring: every override key must name a real
    source in data/sources.yaml. Catches spelling drift between the two."""
    import yaml

    data = yaml.safe_load(blog_scout.SOURCES_PATH.read_text())
    names = {item["name"] for item in data["items"]}
    assert set(blog_scout.FEED_OVERRIDES) <= names


def test_blog_sources_map_to_known_dedupe_tiers():
    """Cross-module contract: every blog source's category must have an
    explicit tier in pipeline/dedupe.py, or it silently falls back to 3."""
    import dedupe

    for source in blog_scout._load_blog_sources():
        assert source["category"] in dedupe.BLOG_CATEGORY_TIER, (
            f"{source['name']} has category {source['category']!r} with no "
            "explicit entry in BLOG_CATEGORY_TIER"
        )


def _fake_feed(entries, bozo=False, exc=None):
    return types.SimpleNamespace(bozo=bozo, entries=entries, bozo_exception=exc)


def test_blog_run_inserts_entries_with_category_metadata(db_path, monkeypatch):
    source = {"name": "Import AI", "category": "practitioner"}
    monkeypatch.setattr(blog_scout, "_load_blog_sources", lambda: [source])

    entries = [
        {
            "link": "https://importai.substack.com/p/one",
            "title": "Import AI 400",
            "summary": "x" * 1500,
            "author": "Jack Clark",
            "published": "Mon, 13 Jul 2026 09:00:00 GMT",
        }
    ]
    monkeypatch.setattr(
        blog_scout.feedparser, "parse", lambda url: _fake_feed(entries)
    )
    blog_scout.run()

    conn = base.get_connection()
    scout, title, summary, metadata = conn.execute(
        "SELECT scout, title, summary, raw_metadata FROM raw_items"
    ).fetchone()
    conn.close()

    assert scout == "blog"
    assert title == "Import AI 400"
    assert len(summary) == 1000  # truncation contract
    assert json.loads(metadata) == {
        "source_name": "Import AI",
        "category": "practitioner",
    }


def test_blog_run_caps_entries_per_feed(db_path, monkeypatch):
    source = {"name": "Import AI", "category": "practitioner"}
    monkeypatch.setattr(blog_scout, "_load_blog_sources", lambda: [source])

    entries = [
        {"link": f"https://x.example/{n}", "title": f"post {n}"} for n in range(30)
    ]
    monkeypatch.setattr(
        blog_scout.feedparser, "parse", lambda url: _fake_feed(entries)
    )
    blog_scout.run(entries_per_feed=10)

    conn = base.get_connection()
    assert conn.execute("SELECT COUNT(*) FROM raw_items").fetchone()[0] == 10
    conn.close()


def test_blog_run_skips_unparseable_feed(db_path, monkeypatch, capsys):
    sources = [
        {"name": "Import AI", "category": "practitioner"},
        {"name": "The Gradient", "category": "academic"},
    ]
    monkeypatch.setattr(blog_scout, "_load_blog_sources", lambda: sources)

    good = [{"link": "https://x.example/ok", "title": "fine"}]

    def fake_parse(url):
        if url == blog_scout.FEED_OVERRIDES["Import AI"]:
            return _fake_feed([], bozo=True, exc=ValueError("bad xml"))
        return _fake_feed(good)

    monkeypatch.setattr(blog_scout.feedparser, "parse", fake_parse)
    blog_scout.run()

    assert "FAILED to parse feed for Import AI" in capsys.readouterr().err
    conn = base.get_connection()
    assert conn.execute("SELECT COUNT(*) FROM raw_items").fetchone()[0] == 1
    conn.close()
