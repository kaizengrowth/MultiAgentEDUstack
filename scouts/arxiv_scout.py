#!/usr/bin/env python3
"""Scholar/arXiv Scout (partial: the arXiv half).

Google Scholar has no public API and scraping it violates its terms of
service, so "Scholar alerts" in this repo means what it means in the
author's own digital-brain setup: alert emails routed to a Gmail label and
read via an MCP/Gmail integration, not automated here. This script covers
the half that *does* have a real public API: arXiv's Atom feed, queried per
subfield rather than one broad category, matching the credibility argument
in the blog post (narrow alerts surface more useful signal).

Policy: peer-reviewed only. Everything on arXiv starts as a preprint, so
this scout keeps an entry only when the authors have registered a published
version (a journal_ref or DOI in the Atom metadata) and the entry is recent
(published or metadata-updated within RECENT_DAYS). Queries sort by
lastUpdatedDate because the journal ref lands as a metadata update, often
months after submission; sorting by submittedDate would never see it.
Recent pure preprints still reach the pipeline through the venues that
vouch for them (HN, lab blogs, social), just not through this scout.

No API key required.
"""

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

import requests

from base import get_connection, insert_item, report

ARXIV_API = "http://export.arxiv.org/api/query"
ATOM_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}

# Narrow subfields, not one broad "AI" query -- see Part 3 of the blog post
# on why per-subfield alerts beat a single broad one.
DEFAULT_CATEGORIES = ["cs.CL", "cs.AI", "cs.LG"]

# Only a small fraction of entries carry a journal_ref/DOI, so fetch a
# deeper page than the old preprint scout needed.
DEFAULT_MAX_RESULTS = 100

RECENT_DAYS = 30


def fetch_category(category: str, max_results: int = DEFAULT_MAX_RESULTS) -> list[dict]:
    params = {
        "search_query": f"cat:{category}",
        "sortBy": "lastUpdatedDate",
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
        updated = entry.findtext("atom:updated", default="", namespaces=ATOM_NS).strip()
        journal_ref = entry.findtext("arxiv:journal_ref", default="", namespaces=ATOM_NS).strip()
        doi = entry.findtext("arxiv:doi", default="", namespaces=ATOM_NS).strip()
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
                "updated_at": updated or None,
                "journal_ref": journal_ref or None,
                "doi": doi or None,
                "category": category,
            }
        )
    return items


def _is_published_and_recent(entry: dict, cutoff: datetime) -> bool:
    """Keep only entries with a registered published version (journal_ref or
    DOI) whose latest activity (update, else submission) is after cutoff."""
    if not (entry.get("journal_ref") or entry.get("doi")):
        return False
    stamp = entry.get("updated_at") or entry.get("published_at")
    if not stamp:
        return False
    try:
        when = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    except ValueError:
        return False
    return when >= cutoff


def run(
    categories: list[str] | None = None,
    max_results: int = DEFAULT_MAX_RESULTS,
    recent_days: int = RECENT_DAYS,
) -> None:
    categories = categories or DEFAULT_CATEGORIES
    cutoff = datetime.now(timezone.utc) - timedelta(days=recent_days)
    conn = get_connection()
    inserted = skipped = dropped = 0

    for category in categories:
        try:
            entries = fetch_category(category, max_results=max_results)
        except (requests.RequestException, ET.ParseError) as exc:
            print(f"[arxiv] FAILED for {category}: {exc}", file=sys.stderr)
            continue

        for entry in entries:
            if not _is_published_and_recent(entry, cutoff):
                dropped += 1
                continue
            ok = insert_item(
                conn,
                scout="arxiv",
                source_url=entry["url"],
                title=entry["title"],
                summary=entry["summary"],
                author=entry["author"],
                published_at=entry["published_at"],
                raw_metadata={
                    "category": entry["category"],
                    "journal_ref": entry["journal_ref"],
                    "doi": entry["doi"],
                },
            )
            inserted += int(ok)
            skipped += int(not ok)

    conn.close()
    report(
        "arxiv",
        inserted,
        skipped,
        note=f"categories={','.join(categories)}, "
        f"{dropped} preprint/stale entries dropped",
    )


if __name__ == "__main__":
    run()
