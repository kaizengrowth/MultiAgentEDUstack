#!/usr/bin/env python3
"""Semantic Scholar Scout: recent peer-reviewed AI papers.

The arXiv scout only sees papers whose authors registered the published
version back onto arXiv, which many never do. Semantic Scholar's Graph API
indexes the venues themselves, so this scout is the primary source for
recent non-preprint research: it queries the bulk search endpoint sorted by
publication date and keeps only records that name a real venue with a
JournalArticle or Conference publication type. Records whose only home is
arXiv are preprints and are dropped here on purpose.

No API key required (shared public rate limit; an S2_API_KEY env var is
honored if present for a dedicated allowance).
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone

import requests

from base import get_connection, insert_item, report

S2_API = "https://api.semanticscholar.org/graph/v1/paper/search/bulk"
S2_FIELDS = "title,abstract,url,venue,publicationTypes,publicationDate,authors,externalIds"

# Narrow queries beat one broad "AI" query, same argument as the arXiv
# scout's per-subfield categories.
DEFAULT_QUERIES = [
    "large language models",
    "AI agents",
    "generative AI education",
]

DEFAULT_MAX_RESULTS = 50

RECENT_DAYS = 30

PEER_REVIEWED_TYPES = {"JournalArticle", "Conference"}

# Venues that mean "this record is itself a preprint server".
PREPRINT_VENUES = {"arxiv.org", "arxiv", "biorxiv", "ssrn"}


def _is_peer_reviewed(record: dict) -> bool:
    venue = (record.get("venue") or "").strip()
    if not venue or venue.lower() in PREPRINT_VENUES:
        return False
    types = record.get("publicationTypes") or []
    return bool(PEER_REVIEWED_TYPES.intersection(types))


def _to_item(paper: dict) -> dict:
    authors = [a.get("name", "") for a in paper.get("authors") or []]
    url = paper.get("url") or f"https://www.semanticscholar.org/paper/{paper.get('paperId', '')}"
    external_ids = paper.get("externalIds") or {}
    return {
        "title": (paper.get("title") or "").strip(),
        "url": url,
        "summary": paper.get("abstract") or None,
        "author": ", ".join(a for a in authors if a) or None,
        "published_at": paper.get("publicationDate"),
        "venue": paper.get("venue"),
        "publicationTypes": paper.get("publicationTypes"),
        "doi": external_ids.get("DOI"),
    }


def fetch_query(
    query: str,
    recent_days: int = RECENT_DAYS,
    max_results: int = DEFAULT_MAX_RESULTS,
) -> list[dict]:
    since = (datetime.now(timezone.utc) - timedelta(days=recent_days)).strftime("%Y-%m-%d")
    params = {
        "query": query,
        "fields": S2_FIELDS,
        "sort": "publicationDate:desc",
        # Open-ended range "YYYY-MM-DD:" means "from that date onward".
        "publicationDateOrYear": f"{since}:",
    }
    api_key = os.environ.get("S2_API_KEY")
    headers = {"x-api-key": api_key} if api_key else None
    resp = requests.get(S2_API, params=params, timeout=30, headers=headers)
    resp.raise_for_status()
    papers = (resp.json() or {}).get("data") or []
    return [_to_item(p) for p in papers[:max_results]]


def run(
    queries: list[str] | None = None,
    recent_days: int = RECENT_DAYS,
    max_results: int = DEFAULT_MAX_RESULTS,
) -> None:
    queries = queries or DEFAULT_QUERIES
    conn = get_connection()
    inserted = skipped = dropped = 0

    for query in queries:
        try:
            items = fetch_query(query, recent_days=recent_days, max_results=max_results)
        except (requests.RequestException, ValueError) as exc:
            print(f"[semantic_scholar] FAILED for '{query}': {exc}", file=sys.stderr)
            continue

        for item in items:
            if not _is_peer_reviewed(item):
                dropped += 1
                continue
            ok = insert_item(
                conn,
                scout="semantic_scholar",
                source_url=item["url"],
                title=item["title"],
                summary=item["summary"],
                author=item["author"],
                published_at=item["published_at"],
                raw_metadata={
                    "venue": item["venue"],
                    "publication_types": item["publicationTypes"],
                    "doi": item["doi"],
                    "query": query,
                },
            )
            inserted += int(ok)
            skipped += int(not ok)

    conn.close()
    report(
        "semantic_scholar",
        inserted,
        skipped,
        note=f"queries={len(queries)}, {dropped} non-peer-reviewed dropped",
    )


if __name__ == "__main__":
    run()
