#!/usr/bin/env bash
# Commit and push tracked markdown under published/ so pipeline output
# lands on GitHub, not only on this machine.
#
# Safe to call when nothing changed (exits 0). Intended for daily-digest.sh,
# weekly.sh, and manual skill runs after writing under published/.

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

if [[ ! -d published ]]; then
    echo "publish-output: no published/ directory" >&2
    exit 0
fi

git add published/

if git diff --cached --quiet; then
    echo "publish-output: nothing new under published/"
    exit 0
fi

STAMP="$(date -u +%Y-%m-%dT%H:%MZ)"
MSG="Publish pipeline output ${STAMP}

Sync generated digests, forecasts, wiki, curriculum, and labs under published/.
"

# Prefer a trailer-free commit even if a local hook tries to append one.
TREE=$(git write-tree)
PARENT=$(git rev-parse HEAD)
COMMIT=$(git commit-tree "$TREE" -p "$PARENT" -m "$MSG")
git reset --soft "$COMMIT"

echo "publish-output: commit $(git rev-parse --short HEAD)"

if git push origin HEAD; then
    echo "publish-output: pushed to origin"
else
    echo "publish-output: commit created but push failed; push manually" >&2
    exit 1
fi
