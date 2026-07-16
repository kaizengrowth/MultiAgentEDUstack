#!/usr/bin/env python3
"""Credibility + Dedup Agent.

Scores every un-merged raw_item against the five-tier rubric from the blog
post, then merges items describing the same underlying story (exact URL
match across scouts, or high title similarity within a short time window)
into a single curated_item -- a model release announced by a lab blog,
picked up by a practitioner newsletter, and trending on HN should collapse
to one row, not three.

Deliberately rule-based, no LLM call: tier assignment here is a lookup by
scout/category, and dedup is exact-URL-then-title-similarity. The genuinely
judgment-heavy synthesis (what does this mean, is it worth teaching) is the
Synthesis/Digest agent's job, not this one's -- see .claude/skills/synthesis-digest.
"""

from __future__ import annotations

import sys
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scouts"))
from base import get_connection  # noqa: E402

TIER_LABELS = {
    1: "Primary research",
    2: "Lab/vendor primary source",
    3: "Named practitioner synthesis",
    4: "Aggregator/newsletter digest",
    5: "Social/community chatter",
}

# scout -> tier, for scouts whose tier doesn't depend on source category.
SCOUT_TIER = {
    "arxiv": 1,
    "hn": 5,
    "github_trending": 5,
    "reddit": 5,
    "bluesky": 5,
    "x": 5,
    "youtube": 3,
}

# blog scout's tier depends on the source's category in data/sources.yaml.
BLOG_CATEGORY_TIER = {
    "lab": 2,
    "academic": 2,
    "practitioner": 3,
}

TITLE_SIMILARITY_THRESHOLD = 0.72


def _tier_for(scout: str, raw_metadata: dict) -> int:
    if scout == "blog":
        category = raw_metadata.get("category", "practitioner")
        return BLOG_CATEGORY_TIER.get(category, 3)
    return SCOUT_TIER.get(scout, 4)


def _title_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _find_matching_curated_item(conn, title: str, canonical_url: str) -> int | None:
    exact = conn.execute(
        "SELECT id FROM curated_items WHERE canonical_url = ?", (canonical_url,)
    ).fetchone()
    if exact:
        return exact[0]

    # Only compare against recent curated items (last 200) -- old stories
    # re-covered isn't the same event, it's a new one worth its own row.
    candidates = conn.execute(
        "SELECT id, title FROM curated_items ORDER BY id DESC LIMIT 200"
    ).fetchall()
    for curated_id, curated_title in candidates:
        if _title_similarity(title, curated_title) >= TITLE_SIMILARITY_THRESHOLD:
            return curated_id
    return None


def run() -> None:
    import json

    conn = get_connection()

    unmerged = conn.execute(
        """
        SELECT r.id, r.scout, r.source_url, r.title, r.raw_metadata
        FROM raw_items r
        LEFT JOIN item_merges m ON m.raw_item_id = r.id
        WHERE m.raw_item_id IS NULL
        """
    ).fetchall()

    new_curated = updated_curated = 0

    for raw_id, scout, url, title, raw_metadata_json in unmerged:
        raw_metadata = json.loads(raw_metadata_json or "{}")
        tier = _tier_for(scout, raw_metadata)

        curated_id = _find_matching_curated_item(conn, title, url)

        if curated_id is None:
            cur = conn.execute(
                """
                INSERT INTO curated_items (title, canonical_url, tier, tier_label)
                VALUES (?, ?, ?, ?)
                """,
                (title, url, tier, TIER_LABELS[tier]),
            )
            curated_id = cur.lastrowid
            new_curated += 1
        else:
            # A story already on file got picked up by another source --
            # strengthen its tier (lower number wins) and bump mention count.
            row = conn.execute(
                "SELECT tier FROM curated_items WHERE id = ?", (curated_id,)
            ).fetchone()
            best_tier = min(row[0], tier)
            conn.execute(
                """
                UPDATE curated_items
                SET tier = ?, tier_label = ?, mention_count = mention_count + 1,
                    last_seen_at = datetime('now')
                WHERE id = ?
                """,
                (best_tier, TIER_LABELS[best_tier], curated_id),
            )
            updated_curated += 1

        conn.execute(
            "INSERT OR IGNORE INTO item_merges (raw_item_id, curated_item_id) VALUES (?, ?)",
            (raw_id, curated_id),
        )

    conn.commit()
    conn.close()
    print(
        f"[dedupe] {len(unmerged)} raw items processed: "
        f"{new_curated} new stories, {updated_curated} corroborated existing stories"
    )


if __name__ == "__main__":
    run()
