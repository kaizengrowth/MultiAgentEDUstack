#!/usr/bin/env bash
# Invoked by the multiagentedustack-weekly.timer systemd user unit.
# Sunday LLM half of the pipeline:
#   1. weekly-wiki  -- roll daily digests into published/wiki/
#   2. trend-forecast -- velocity signals + published/forecasts/
#   3. publish-output -- commit and push published/ to GitHub
#
# Daily article digests run separately via daily-digest.sh.
# curriculum-scaffold, lab-generation, and editorial-review stay manual
# (run publish-output.sh after those by hand, or rely on the next scheduled push).

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$DIR/logs"
mkdir -p "$LOG_DIR" "$DIR/published/digests" "$DIR/published/wiki" "$DIR/published/forecasts"
LOG="$LOG_DIR/weekly-$(date +%Y%m%d).log"

cd "$DIR"

{
    echo "=== MultiAgentEDUstack weekly wiki + forecast -- $(date -Is) ==="

    echo "--- weekly-wiki ---"
    claude -p "/weekly-wiki" --allowedTools "Bash Read Write Edit Glob Grep"

    echo "--- trend-forecast ---"
    claude -p "/trend-forecast" --allowedTools "Bash Read Write Edit Glob Grep"

    echo "--- publish-output ---"
    bash "$DIR/scripts/publish-output.sh" || echo "publish-output reported failure"

    echo "--- deploy-dashboard ---"
    bash "$DIR/scripts/deploy-dashboard.sh" || echo "deploy-dashboard reported failure"

    echo "=== weekly run complete ==="
} >> "$LOG" 2>&1

STATUS=$?
ls -1t "$LOG_DIR"/weekly-*.log 2>/dev/null | tail -n +9 | xargs -r rm --
ls -1t "$LOG_DIR"/synthesis-*.log 2>/dev/null | tail -n +5 | xargs -r rm --
exit $STATUS
