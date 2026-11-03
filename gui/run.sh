#!/usr/bin/env bash
# Boot the GUI in production mode: serves the built frontend from the same
# Python process that hosts the API + WebSocket. One port, one process.
#
# Usage:
#   gui/run.sh <project-path> <sdk-path> [extra renpy-mcp-gui flags…]

set -euo pipefail

if [[ $# -lt 2 ]]; then
    echo "usage: $0 <project-path> <sdk-path> [extra flags]" >&2
    exit 2
fi

PROJECT="$1"
SDK="$2"
shift 2

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$REPO_ROOT/gui/frontend/dist"

if [[ ! -d "$DIST" ]]; then
    echo "Frontend hasn't been built yet. Building now…" >&2
    (cd "$REPO_ROOT/gui/frontend" && npm install && npm run build)
fi

# venv layout differs per platform: POSIX uses `bin/`, Windows uses `Scripts/`.
if [[ -x "$REPO_ROOT/.venv/bin/python" ]]; then
    DEFAULT_PYTHON="$REPO_ROOT/.venv/bin/python"
elif [[ -x "$REPO_ROOT/.venv/Scripts/python.exe" ]]; then
    DEFAULT_PYTHON="$REPO_ROOT/.venv/Scripts/python.exe"
else
    DEFAULT_PYTHON="python3"
fi
PYTHON="${PYTHON:-$DEFAULT_PYTHON}"

exec "$PYTHON" -m renpy_mcp_gui \
    --project "$PROJECT" \
    --sdk "$SDK" \
    --static-dir "$DIST" \
    "$@"
