#!/usr/bin/env bash
# Deploy the dashboard to Vercel with a fresh snapshot of the local data.
#
# The pipeline's durable state (SQLite DB) and regenerable markdown live in
# this repo's working tree and are gitignored, so the deploy ships them as
# a .data/ snapshot inside the dashboard project instead of via git. The
# app auto-detects .data/ (see dashboard/lib/paths.ts). Rerun this script
# any time to publish fresh data; it is safe to run from a timer.
#
# One-time setup: npx vercel login (then the first run creates the project).

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

SNAPSHOT="dashboard/.data"

if [[ ! -f db/maes.sqlite3 ]]; then
    echo "No db/maes.sqlite3 to publish; run the ingest first." >&2
    exit 1
fi

echo "--- snapshotting data into ${SNAPSHOT} ---"
rm -rf "$SNAPSHOT"
mkdir -p "$SNAPSHOT/db" "$SNAPSHOT/data"
cp db/maes.sqlite3 "$SNAPSHOT/db/"
cp data/sources.yaml "$SNAPSHOT/data/"
# All markdown the DB references lives under published/ (see .gitignore).
cp -r published "$SNAPSHOT/"
du -sh "$SNAPSHOT"

echo "--- deploying to Vercel ---"
cd dashboard
npx vercel deploy --prod --yes

echo "--- done ---"
