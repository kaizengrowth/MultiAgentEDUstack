#!/usr/bin/env python3
"""X/Bluesky Scout.

Curated list of individual researchers/lab accounts, not an aggregator or
firehose -- see Part 1 of the blog post for why. Two real adapters, both
credential-gated, both skip cleanly (log + exit 0) rather than fail the
pipeline when their credentials are absent:

- Bluesky (AT Protocol): free, no paid tier, just a handle + app password
  (create one at https://bsky.app/settings/app-passwords, don't use your
  real account password). NOTE: this sandbox's network got a 403 from
  Bluesky's public API while building this -- likely an edge/IP block on
  this host, not a code problem -- so treat this adapter as implemented-but-
  not-fully-verified-from-here until you've run it from your own machine.

- X/Twitter: the v2 API requires a paid tier for any meaningful read access
  as of 2026. This is a real adapter against the real endpoint, but it will
  not do anything without X_BEARER_TOKEN, and this repo doesn't assume
  you're paying for that tier.

Both are equally "curated list of accounts," configured below rather than
pulled from data/sources.yaml, since the source database tracks *platforms*
to watch, not the specific researcher handles (that curation is yours to
maintain and is more volatile than a source list).
"""

from __future__ import annotations

import os
import sys

import requests

from base import get_connection, insert_item, report

# Fill in the researcher/lab handles you actually want to track.
BLUESKY_ACCOUNTS: list[str] = []
X_ACCOUNTS: list[str] = []

BSKY_API = "https://bsky.social/xrpc"


def _bluesky_session(handle: str, app_password: str) -> dict | None:
    resp = requests.post(
        f"{BSKY_API}/com.atproto.server.createSession",
        json={"identifier": handle, "password": app_password},
        timeout=20,
    )
    if resp.status_code != 200:
        print(f"[bluesky] auth failed: {resp.status_code} {resp.text[:200]}", file=sys.stderr)
        return None
    return resp.json()


def _bluesky_author_feed(actor: str, access_jwt: str, limit: int = 10) -> list[dict]:
    resp = requests.get(
        f"{BSKY_API}/app.bsky.feed.getAuthorFeed",
        params={"actor": actor, "limit": limit},
        headers={"Authorization": f"Bearer {access_jwt}"},
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json().get("feed", [])


def run_bluesky() -> tuple[int, int]:
    handle = os.environ.get("BLUESKY_HANDLE")
    app_password = os.environ.get("BLUESKY_APP_PASSWORD")
    if not handle or not app_password:
        print("[bluesky] skipped: BLUESKY_HANDLE/BLUESKY_APP_PASSWORD not set (see .env.example)")
        return 0, 0
    if not BLUESKY_ACCOUNTS:
        print("[bluesky] skipped: BLUESKY_ACCOUNTS list is empty, add handles to social_scout.py")
        return 0, 0

    session = _bluesky_session(handle, app_password)
    if not session:
        return 0, 0

    conn = get_connection()
    inserted = skipped = 0
    for actor in BLUESKY_ACCOUNTS:
        try:
            feed = _bluesky_author_feed(actor, session["accessJwt"])
        except requests.RequestException as exc:
            print(f"[bluesky] FAILED for {actor}: {exc}", file=sys.stderr)
            continue
        for entry in feed:
            post = entry["post"]
            ok = insert_item(
                conn,
                scout="bluesky",
                source_url=post["uri"],
                title=post["record"].get("text", "")[:200],
                author=post["author"]["handle"],
                published_at=post["record"].get("createdAt"),
                raw_metadata={"likes": post.get("likeCount"), "reposts": post.get("repostCount")},
            )
            inserted += int(ok)
            skipped += int(not ok)
    conn.close()
    return inserted, skipped


def run_x() -> tuple[int, int]:
    token = os.environ.get("X_BEARER_TOKEN")
    if not token:
        print("[x] skipped: X_BEARER_TOKEN not set -- X's v2 API needs a paid tier for this")
        return 0, 0
    if not X_ACCOUNTS:
        print("[x] skipped: X_ACCOUNTS list is empty, add handles to social_scout.py")
        return 0, 0

    conn = get_connection()
    inserted = skipped = 0
    for username in X_ACCOUNTS:
        try:
            user_resp = requests.get(
                f"https://api.x.com/2/users/by/username/{username}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=20,
            )
            user_resp.raise_for_status()
            user_id = user_resp.json()["data"]["id"]

            tweets_resp = requests.get(
                f"https://api.x.com/2/users/{user_id}/tweets",
                params={"max_results": 10, "exclude": "replies,retweets"},
                headers={"Authorization": f"Bearer {token}"},
                timeout=20,
            )
            tweets_resp.raise_for_status()
            tweets = tweets_resp.json().get("data", [])
        except requests.RequestException as exc:
            print(f"[x] FAILED for @{username}: {exc}", file=sys.stderr)
            continue

        for tweet in tweets:
            ok = insert_item(
                conn,
                scout="x",
                source_url=f"https://x.com/{username}/status/{tweet['id']}",
                title=tweet.get("text", "")[:200],
                author=username,
                raw_metadata={"tweet_id": tweet["id"]},
            )
            inserted += int(ok)
            skipped += int(not ok)
    conn.close()
    return inserted, skipped


def run() -> None:
    bsky_inserted, bsky_skipped = run_bluesky()
    x_inserted, x_skipped = run_x()
    report("social", bsky_inserted + x_inserted, bsky_skipped + x_skipped, note="bluesky + x combined")


if __name__ == "__main__":
    run()
