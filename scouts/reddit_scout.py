#!/usr/bin/env python3
"""GitHub/HN/Trending Scout (the Reddit half): r/MachineLearning, r/LocalLLaMA.

Reddit's unauthenticated .json endpoints now 403 from most IPs (their API
lock-down since 2023) -- verified directly against this environment's
network egress while building this repo, not assumed. This is a real OAuth
adapter against Reddit's official API, not a scraper working around the
lock-down. Without REDDIT_CLIENT_ID/SECRET in the environment, it logs
why it's skipping and exits 0 rather than failing the whole pipeline run.

Register a "script" app at https://www.reddit.com/prefs/apps to get
credentials, then set them in .env (see .env.example).
"""

from __future__ import annotations

import os
import sys

import requests

from base import get_connection, insert_item, report

SUBREDDITS = ["MachineLearning", "LocalLLaMA"]
TOKEN_URL = "https://www.reddit.com/api/v1/access_token"


def _get_token(client_id: str, client_secret: str, user_agent: str) -> str | None:
    resp = requests.post(
        TOKEN_URL,
        auth=(client_id, client_secret),
        data={"grant_type": "client_credentials"},
        headers={"User-Agent": user_agent},
        timeout=20,
    )
    if resp.status_code != 200:
        print(f"[reddit] auth failed: {resp.status_code} {resp.text[:200]}", file=sys.stderr)
        return None
    return resp.json().get("access_token")


def fetch_hot(subreddit: str, token: str, user_agent: str, limit: int = 25) -> list[dict]:
    resp = requests.get(
        f"https://oauth.reddit.com/r/{subreddit}/hot",
        params={"limit": limit},
        headers={"Authorization": f"Bearer {token}", "User-Agent": user_agent},
        timeout=20,
    )
    resp.raise_for_status()
    children = resp.json()["data"]["children"]
    return [c["data"] for c in children if not c["data"].get("stickied")]


def run(limit: int = 25) -> None:
    client_id = os.environ.get("REDDIT_CLIENT_ID")
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET")
    user_agent = os.environ.get("REDDIT_USER_AGENT", "MultiAgentEDUstack/0.1")

    if not client_id or not client_secret:
        print(
            "[reddit] skipped: REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET not set "
            "(see .env.example). Reddit requires an OAuth app registration "
            "since its 2023 API lock-down, unauthenticated access 403s."
        )
        return

    token = _get_token(client_id, client_secret, user_agent)
    if not token:
        print("[reddit] skipped: could not obtain an access token")
        return

    conn = get_connection()
    inserted = skipped = 0

    for subreddit in SUBREDDITS:
        try:
            posts = fetch_hot(subreddit, token, user_agent, limit=limit)
        except requests.RequestException as exc:
            print(f"[reddit] FAILED for r/{subreddit}: {exc}", file=sys.stderr)
            continue

        for post in posts:
            url = post.get("url_overridden_by_dest") or f"https://reddit.com{post['permalink']}"
            ok = insert_item(
                conn,
                scout="reddit",
                source_url=url,
                title=post.get("title", ""),
                author=post.get("author"),
                raw_metadata={
                    "subreddit": subreddit,
                    "score": post.get("score"),
                    "num_comments": post.get("num_comments"),
                    "discussion_url": f"https://reddit.com{post['permalink']}",
                },
            )
            inserted += int(ok)
            skipped += int(not ok)

    conn.close()
    report("reddit", inserted, skipped, note=f"subreddits={','.join(SUBREDDITS)}")


if __name__ == "__main__":
    run()
