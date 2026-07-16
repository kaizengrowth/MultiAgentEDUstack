#!/usr/bin/env bash
# Invoked by the multiagentedustack-weekly.timer systemd user unit.
# Sunday LLM half of the pipeline:
#   1. weekly-wiki  -- roll daily digests into a durable wiki page
#   2. trend-forecast -- velocity signals for the watchlist
#
# Daily article digests run separately via daily-digest.sh.
# curriculum-scaffold, lab-generation, and editorial-review stay manual.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$DIR/logs"
mkdir -p "$LOG_DIR" "$DIR/digests" "$DIR/wiki"
LOG="$LOG_DIR/weekly-$(date +%Y%m%d).log"

cd "$DIR"

{
    echo "=== MultiAgentEDUstack weekly wiki + forecast -- $(date -Is) ==="

    echo "--- weekly-wiki ---"
    claude -p "/weekly-wiki" --allowedTools "Bash Read Write Edit Glob Grep"

    echo "--- trend-forecast ---"
    claude -p "/trend-forecast" --allowedTools "Bash Read Write Edit Glob Grep"

    echo "=== weekly run complete ==="
} >> "$LOG" 2>&1

STATUS=$?
ls -1t "$LOG_DIR"/weekly-*.log 2>/dev/null | tail -n +9 | xargs -r rm --
# Keep legacy synthesis-*.log cleanup during the rename window.
ls -1t "$LOG_DIR"/synthesis-*.log 2>/dev/null | tail -n +5 | xargs -r rm --
exit $STATUS
