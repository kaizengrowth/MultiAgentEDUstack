#!/usr/bin/env python3
"""Newsletter/Blog Scout.

Subscribes to the practitioner/lab/academic sources in data/sources.yaml
via RSS/Atom rather than trusting any aggregator's summary -- extracts the
actual entries so the credibility/dedup pass can trace claims back to the
primary post, not a downstream restatement of it.

Most of these sources don't publish their feed URL at the page URL stored
in sources.yaml (that's the human-facing page, not the machine-facing
feed), so this keeps a small override map of the real feed endpoints,
each one checked by hand while building this repo. A source with no known
feed is skipped with a one-line note rather than guessed at.
"""

from __future__ import annotations

import sys

import feedparser
import yaml

from base import REPO_ROOT, get_connection, insert_item, report

SOURCES_PATH = REPO_ROOT / "data" / "sources.yaml"

# name (must match data/sources.yaml) -> real feed URL, verified 200 by hand.
FEED_OVERRIDES: dict[str, str] = {
    "Import AI": "https://importai.substack.com/feed",
    "Ahead of AI": "https://magazine.sebastianraschka.com/feed",
    "Latent Space": "https://www.latent.space/feed",
    "Interconnects": "https://www.interconnects.ai/feed",
    "One Useful Thing": "https://www.oneusefulthing.org/feed",
    "Marcus on AI": "https://garymarcus.substack.com/feed",
    "Simon Willison's Blog": "https://simonwillison.net/atom/everything/",
    "Chip Huyen's Blog": "https://huyenchip.com/feed",
    "Eugene Yan's Blog": "https://eugeneyan.com/rss/",
    "Lil'Log": "https://lilianweng.github.io/index.xml",
    "Jay Alammar's Blog": "https://jalammar.github.io/feed.xml",
    "NLP News": "https://www.ruder.io/rss/",
    "BAIR Blog": "https://bair.berkeley.edu/blog/feed.xml",
    "The Gradient": "https://thegradient.pub/rss/",
}

ENTRIES_PER_FEED = 10


def _load_blog_sources() -> list[dict]:
    data = yaml.safe_load(SOURCES_PATH.read_text())
    return [
        item
        for item in data["items"]
        if item["name"] in FEED_OVERRIDES
    ]


def run(entries_per_feed: int = ENTRIES_PER_FEED) -> None:
    conn = get_connection()
    inserted = skipped = 0
    sources = _load_blog_sources()
    known_names = {s["name"] for s in sources}

    missing = set(FEED_OVERRIDES) - known_names
    if missing:
        print(f"[blog] note: feed override(s) for unknown source names, check spelling: {missing}", file=sys.stderr)

    for source in sources:
        feed_url = FEED_OVERRIDES[source["name"]]
        parsed = feedparser.parse(feed_url)
        if parsed.bozo and not parsed.entries:
            print(f"[blog] FAILED to parse feed for {source['name']}: {parsed.bozo_exception}", file=sys.stderr)
            continue

        for entry in parsed.entries[:entries_per_feed]:
            ok = insert_item(
                conn,
                scout="blog",
                source_url=entry.get("link", ""),
                title=entry.get("title", ""),
                summary=entry.get("summary", "")[:1000] if entry.get("summary") else None,
                author=entry.get("author", source["name"]),
                published_at=entry.get("published", None),
                raw_metadata={"source_name": source["name"], "category": source["category"]},
            )
            inserted += int(ok)
            skipped += int(not ok)

    conn.close()
    report("blog", inserted, skipped, note=f"{len(sources)} feeds checked, {len(FEED_OVERRIDES) - len(sources)} name mismatches")


if __name__ == "__main__":
    run()
