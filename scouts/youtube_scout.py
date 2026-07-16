#!/usr/bin/env python3
"""YouTube/Podcast Scout.

Treats video as a corpus to pipeline, not a viewing habit: resolve each
curated channel's latest uploads, pull auto-generated captions via yt-dlp
(no YouTube Data API key needed for this), strip them to plain text, and
land the transcript as a searchable item. Full transcripts are written to
transcripts/ (gitignored -- runtime data, not source) and referenced by
path; only a preview goes in the database row itself.

Channels come from data/sources.yaml (category: video). Requires yt-dlp
on PATH (`pip install yt-dlp`); no other credentials.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

from base import REPO_ROOT, get_connection, insert_item, report

SOURCES_PATH = REPO_ROOT / "data" / "sources.yaml"
TRANSCRIPTS_DIR = REPO_ROOT / "transcripts"
VIDEOS_PER_CHANNEL = 3


def _load_video_channels() -> list[dict]:
    data = yaml.safe_load(SOURCES_PATH.read_text())
    return [item for item in data["items"] if item.get("category") == "video"]


def _run_yt_dlp(args: list[str]) -> str:
    result = subprocess.run(
        ["yt-dlp", *args],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip()[-500:])
    return result.stdout


def latest_video_ids(channel_url: str, limit: int = VIDEOS_PER_CHANNEL) -> list[dict]:
    videos_url = channel_url.rstrip("/") + "/videos"
    out = _run_yt_dlp(
        [
            "--flat-playlist",
            "--playlist-end", str(limit),
            "--print", "%(id)s|||%(title)s|||%(upload_date)s",
            videos_url,
        ]
    )
    videos = []
    for line in out.strip().splitlines():
        parts = line.split("|||")
        if len(parts) != 3:
            continue
        video_id, title, upload_date = parts
        videos.append({"id": video_id, "title": title, "upload_date": upload_date})
    return videos


def _vtt_to_text(vtt_text: str) -> str:
    """Strip WEBVTT cue timing/markup down to plain, deduplicated text."""
    lines = []
    seen = set()
    for line in vtt_text.splitlines():
        line = line.strip()
        if not line or line == "WEBVTT" or "-->" in line or line.isdigit():
            continue
        line = re.sub(r"<[^>]+>", "", line)  # inline timing tags
        if line and line not in seen:
            seen.add(line)
            lines.append(line)
    return " ".join(lines)


def fetch_transcript(video_id: str) -> str | None:
    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    out_template = str(TRANSCRIPTS_DIR / f"{video_id}.%(ext)s")
    try:
        _run_yt_dlp(
            [
                "--skip-download",
                "--write-auto-sub",
                "--sub-lang", "en",
                "--sub-format", "vtt",
                "-o", out_template,
                f"https://www.youtube.com/watch?v={video_id}",
            ]
        )
    except RuntimeError as exc:
        print(f"[youtube] no captions for {video_id}: {exc}", file=sys.stderr)
        return None

    vtt_path = TRANSCRIPTS_DIR / f"{video_id}.en.vtt"
    if not vtt_path.exists():
        return None

    text = _vtt_to_text(vtt_path.read_text(errors="ignore"))
    txt_path = TRANSCRIPTS_DIR / f"{video_id}.txt"
    txt_path.write_text(text)
    vtt_path.unlink(missing_ok=True)  # keep the cleaned .txt, drop the raw .vtt
    return text


def run(limit_per_channel: int = VIDEOS_PER_CHANNEL) -> None:
    conn = get_connection()
    inserted = skipped = 0
    channels = _load_video_channels()

    for channel in channels:
        channel_url = channel["url"]
        try:
            videos = latest_video_ids(channel_url, limit=limit_per_channel)
        except RuntimeError as exc:
            print(f"[youtube] FAILED to list videos for {channel['name']}: {exc}", file=sys.stderr)
            continue

        for video in videos:
            video_url = f"https://www.youtube.com/watch?v={video['id']}"
            transcript = fetch_transcript(video["id"])
            preview = (transcript[:500] + "...") if transcript and len(transcript) > 500 else transcript

            ok = insert_item(
                conn,
                scout="youtube",
                source_url=video_url,
                title=video["title"],
                summary=preview,
                author=channel["name"],
                published_at=video.get("upload_date"),
                raw_metadata={
                    "channel_url": channel_url,
                    "transcript_path": str(TRANSCRIPTS_DIR / f"{video['id']}.txt") if transcript else None,
                    "has_transcript": transcript is not None,
                },
            )
            inserted += int(ok)
            skipped += int(not ok)

    conn.close()
    report("youtube", inserted, skipped, note=f"{len(channels)} curated channels")


if __name__ == "__main__":
    run()
