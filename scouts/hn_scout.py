#!/usr/bin/env python3
"""GitHub/HN/Trending Scout (the HN half).

Not a news source in its own right -- a social proof-of-relevance signal.
Something already flagged credible by arxiv_scout or a lab blog that's
*also* on the HN front page is a stronger "teach this now" candidate than
either signal alone (see the credibility-tier diagram in the blog post).

Public Firebase API, no key required.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone

import requests

from base import get_connection, insert_item, report

HN_BASE = "https://hacker-news.firebaseio.com/v0"
AI_KEYWORDS = (
    "ai", "llm", "gpt", "claude", "gemini", "anthropic", "openai", "deepmind",
    "agent", "rag", "transformer", "diffusion", "mistral", "llama", "ollama",
    "machine learning", "neural", "hugging face", "huggingface",
)


def _is_ai_relevant(title: str) -> bool:
    lowered = title.lower()
    return any(keyword in lowered for keyword in AI_KEYWORDS)


def fetch_top_stories(limit: int = 200) -> list[dict]:
    ids = requests.get(f"{HN_BASE}/topstories.json", timeout=20).json()[:limit]
    items = []
    for story_id in ids:
        item = requests.get(f"{HN_BASE}/item/{story_id}.json", timeout=20).json()
        if not item or item.get("type") != "story":
            continue
        title = item.get("title", "")
        if not _is_ai_relevant(title):
            continue
        items.append(
            {
                "id": story_id,
                "title": title,
                "url": item.get("url") or f"https://news.ycombinator.com/item?id={story_id}",
                "score": item.get("score", 0),
                "descendants": item.get("descendants", 0),
                "time": item.get("time"),
                "by": item.get("by"),
            }
        )
    return items


def run(limit: int = 200) -> None:
    conn = get_connection()
    inserted = skipped = 0

    try:
        stories = fetch_top_stories(limit=limit)
    except requests.RequestException as exc:
        print(f"[hn] FAILED: {exc}", file=sys.stderr)
        conn.close()
        return

    for story in stories:
        published_at = (
            datetime.fromtimestamp(story["time"], tz=timezone.utc).isoformat()
            if story.get("time")
            else None
        )
        ok = insert_item(
            conn,
            scout="hn",
            source_url=story["url"],
            title=story["title"],
            author=story.get("by"),
            published_at=published_at,
            raw_metadata={
                "hn_id": story["id"],
                "score": story["score"],
                "comments": story["descendants"],
                "discussion_url": f"https://news.ycombinator.com/item?id={story['id']}",
            },
        )
        inserted += int(ok)
        skipped += int(not ok)

    conn.close()
    report("hn", inserted, skipped, note=f"scanned={len(stories)} front-page AI-relevant stories")


if __name__ == "__main__":
    run()
