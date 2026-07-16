#!/usr/bin/env bash
# Invoked by the multiagentedustack-digest.timer systemd user unit.
# Daily LLM brief: summarize newly curated articles into
# published/digests/YYYY-MM-DD.md, then push published/ to GitHub.
#
# Weekly rollup (wiki) and trend-forecast stay on Sunday via weekly.sh.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$DIR/logs"
mkdir -p "$LOG_DIR" "$DIR/published/digests"
LOG="$LOG_DIR/digest-$(date +%Y%m%d).log"

cd "$DIR"

{
    echo "=== MultiAgentEDUstack daily digest -- $(date -Is) ==="

    echo "--- synthesis-digest ---"
    claude -p "/synthesis-digest" --allowedTools "Bash Read Write Edit Glob Grep"

    echo "--- publish-output ---"
    bash "$DIR/scripts/publish-output.sh" || echo "publish-output reported failure"

    echo "=== daily digest complete ==="
} >> "$LOG" 2>&1

STATUS=$?
ls -1t "$LOG_DIR"/digest-*.log 2>/dev/null | tail -n +15 | xargs -r rm --
exit $STATUS
