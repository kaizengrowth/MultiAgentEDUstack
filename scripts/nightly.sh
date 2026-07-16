#!/usr/bin/env bash
# Invoked by the multiagentedustack-ingest.timer systemd user unit.
# Runs the deterministic scout + dedup pass and rotates logs. No LLM call
# in this path, so no Ollama/claude dependency to check for -- unlike the
# author's OB1 nightly.sh, which does need to ensure Ollama is up first.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$DIR/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/ingest-$(date +%Y%m%d).log"

"$DIR/scripts/ingest.sh" >> "$LOG" 2>&1
STATUS=$?

# Keep the last 14 logs
ls -1t "$LOG_DIR"/ingest-*.log 2>/dev/null | tail -n +15 | xargs -r rm --

exit $STATUS
