#!/usr/bin/env python3
"""Scholar/arXiv Scout (partial: the arXiv half).

Google Scholar has no public API and scraping it violates its terms of
service, so "Scholar alerts" in this repo means what it means in the
author's own digital-brain setup: alert emails routed to a Gmail label and
read via an MCP/Gmail integration, not automated here. This script covers
the half that *does* have a real public API: arXiv's Atom feed, queried per
subfield rather than one broad category, matching the credibility argument
in the blog post (narrow alerts surface more useful signal).

No API key required.
"""

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

import requests

from base import get_connection, insert_item, report

ARXIV_API = "http://export.arxiv.org/api/query"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}

# Narrow subfields, not one broad "AI" query -- see Part 3 of the blog post
# on why per-subfield alerts beat a single broad one.
DEFAULT_CATEGORIES = ["cs.CL", "cs.AI", "cs.LG"]


def fetch_category(category: str, max_results: int = 25) -> list[dict]:
    params = {
        "search_query": f"cat:{category}",
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "max_results": max_results,
    }
    resp = requests.get(ARXIV_API, params=params, timeout=30)
    resp.raise_for_status()
    root = ET.fromstring(resp.text)

    items = []
    for entry in root.findall("atom:entry", ATOM_NS):
        title = entry.findtext("atom:title", default="", namespaces=ATOM_NS).strip()
        link = entry.findtext("atom:id", default="", namespaces=ATOM_NS).strip()
        summary = entry.findtext("atom:summary", default="", namespaces=ATOM_NS).strip()
        published = entry.findtext("atom:published", default="", namespaces=ATOM_NS).strip()
        authors = [
            a.findtext("atom:name", default="", namespaces=ATOM_NS)
            for a in entry.findall("atom:author", ATOM_NS)
        ]
        items.append(
            {
                "title": title,
                "url": link,
                "summary": summary,
                "author": ", ".join(a for a in authors if a) or None,
                "published_at": published or None,
                "category": category,
            }
        )
    return items


def run(categories: list[str] | None = None, max_results: int = 25) -> None:
    categories = categories or DEFAULT_CATEGORIES
    conn = get_connection()
    inserted = skipped = 0

    for category in categories:
        try:
            entries = fetch_category(category, max_results=max_results)
        except (requests.RequestException, ET.ParseError) as exc:
            print(f"[arxiv] FAILED for {category}: {exc}", file=sys.stderr)
            continue

        for entry in entries:
            ok = insert_item(
                conn,
                scout="arxiv",
                source_url=entry["url"],
                title=entry["title"],
                summary=entry["summary"],
                author=entry["author"],
                published_at=entry["published_at"],
                raw_metadata={"category": entry["category"]},
            )
            inserted += int(ok)
            skipped += int(not ok)

    conn.close()
    report("arxiv", inserted, skipped, note=f"categories={','.join(categories)}")


if __name__ == "__main__":
    run()
