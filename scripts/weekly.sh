#!/usr/bin/env bash
# Invoked by the multiagentedustack-synthesis.timer systemd user unit.
# Runs the LLM-driven half of the pipeline via headless Claude Code:
# synthesis-digest first (it assigns topics new items need), then
# trend-forecast (reads those topics to score velocity).
#
# Does NOT run curriculum-scaffold, lab-generation, or editorial-review --
# those stay interactive by design (curriculum/lab drafting is a judgment
# call worth being in the loop for, and editorial-review is explicitly
# human-gated and refuses to auto-approve anything). Run those by hand:
#   claude -p "/curriculum-scaffold" --allowedTools "Bash Read Write Edit"

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$DIR/logs"
mkdir -p "$LOG_DIR" "$DIR/digests"
LOG="$LOG_DIR/synthesis-$(date +%Y%m%d).log"

cd "$DIR"

{
    echo "=== MultiAgentEDUstack weekly synthesis -- $(date -Is) ==="

    echo "--- synthesis-digest ---"
    claude -p "/synthesis-digest" --allowedTools "Bash Read Write Edit Glob Grep"

    echo "--- trend-forecast ---"
    claude -p "/trend-forecast" --allowedTools "Bash Read Write Edit Glob Grep"

    echo "=== weekly synthesis complete ==="
} >> "$LOG" 2>&1

STATUS=$?
ls -1t "$LOG_DIR"/synthesis-*.log 2>/dev/null | tail -n +9 | xargs -r rm --
exit $STATUS
