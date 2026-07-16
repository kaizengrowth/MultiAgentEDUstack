#!/usr/bin/env python3
"""GitHub/HN/Trending Scout (the GitHub half).

GitHub trending has no public API; this scrapes the public trending page,
which has no login wall and no rate-limit-sensitive auth to worry about.
Filtered to repos whose description matches AI/ML keywords, per the "not
for news, but as a social proof-of-relevance signal" framing in the blog
post: tooling adoption velocity, not story discovery.
"""

from __future__ import annotations

import sys

import requests
from bs4 import BeautifulSoup

from base import get_connection, insert_item, report

TRENDING_URL = "https://github.com/trending"
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) MultiAgentEDUstack/0.1"

AI_KEYWORDS = (
    "ai", "llm", "gpt", "agent", "rag", "transformer", "diffusion", "ml",
    "machine learning", "deep learning", "neural", "claude", "gemini",
    "mistral", "llama", "ollama", "embedding", "vector", "inference",
)


def _is_ai_relevant(description: str, repo_name: str) -> bool:
    text = f"{repo_name} {description}".lower()
    return any(keyword in text for keyword in AI_KEYWORDS)


def fetch_trending(since: str = "daily") -> list[dict]:
    resp = requests.get(
        TRENDING_URL,
        params={"since": since},
        headers={"User-Agent": USER_AGENT},
        timeout=30,
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    items = []
    for article in soup.select("article.Box-row"):
        link = article.select_one("h2 a")
        if not link or not link.get("href"):
            continue
        repo_path = link["href"].strip("/")
        if repo_path.count("/") != 1:
            continue  # skip non-repo links (sponsors, /trending/developers, etc.)

        desc_el = article.select_one("p")
        description = desc_el.get_text(strip=True) if desc_el else ""
        if not _is_ai_relevant(description, repo_path):
            continue

        stars_el = article.select_one('a[href$="/stargazers"]')
        stars_today_el = article.select_one("span.d-inline-block.float-sm-right")

        items.append(
            {
                "repo": repo_path,
                "url": f"https://github.com/{repo_path}",
                "description": description,
                "stars_total": stars_el.get_text(strip=True) if stars_el else None,
                "stars_today": stars_today_el.get_text(strip=True) if stars_today_el else None,
            }
        )
    return items


def run(since: str = "daily") -> None:
    conn = get_connection()
    inserted = skipped = 0

    try:
        repos = fetch_trending(since=since)
    except requests.RequestException as exc:
        print(f"[github_trending] FAILED: {exc}", file=sys.stderr)
        conn.close()
        return

    for repo in repos:
        ok = insert_item(
            conn,
            scout="github_trending",
            source_url=repo["url"],
            title=repo["repo"],
            summary=repo["description"],
            raw_metadata={
                "stars_total": repo["stars_total"],
                "stars_today": repo["stars_today"],
                "since": since,
            },
        )
        inserted += int(ok)
        skipped += int(not ok)

    conn.close()
    report("github_trending", inserted, skipped, note=f"{len(repos)} AI/ML-relevant repos found")


if __name__ == "__main__":
    run()
