#!/usr/bin/env bash
# Runs every scout, then the credibility/dedup pass. Deterministic, no LLM
# call anywhere in this script -- safe to run on a tight, frequent cadence
# without spending any model tokens. Mirrors the OB1 compile.sh pattern:
# one script, one clear phase list, failures counted but non-fatal so one
# broken scout doesn't take down the rest of the run.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "=== MultiAgentEDUstack ingest -- $(date -Is) ==="
FAILURES=0

run_scout() {
    local name="$1"
    echo
    echo "--- $name ---"
    python3 "scouts/${name}.py" || { echo "$name FAILED"; FAILURES=$((FAILURES+1)); }
}

run_scout "arxiv_scout"
run_scout "semantic_scholar_scout"
run_scout "hn_scout"
run_scout "github_trending_scout"
run_scout "blog_scout"
run_scout "youtube_scout"

# Credential-gated; these log why they're skipping and exit 0 on their own
# when REDDIT_CLIENT_ID/BLUESKY_HANDLE/X_BEARER_TOKEN aren't set, so they
# never count as a failure just for being unconfigured.
run_scout "reddit_scout"
run_scout "social_scout"

echo
echo "--- credibility + dedup ---"
python3 pipeline/dedupe.py || { echo "dedupe FAILED"; FAILURES=$((FAILURES+1)); }

echo
if [[ $FAILURES -gt 0 ]]; then
    echo "=== Ingest finished with $FAILURES failed phase(s) ==="
    exit 1
fi
echo "=== Ingest complete ==="
