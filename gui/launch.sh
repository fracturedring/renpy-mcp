#!/usr/bin/env bash
# Double-clickable launcher for RPBuilder.
#
# Activates the repo's .venv (creating one if it doesn't exist),
# ensures the GUI deps are installed, then runs the rpbuilder
# console script. The launcher itself handles SDK + project picking
# and remembers your choices.
#
# If you've already done `pip install -e ".[gui]"` and your venv
# is on PATH, just run `rpbuilder` directly — same effect.

set -e

here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
repo="$(cd -- "$here/.." && pwd)"
cd "$repo"

if [ ! -d ".venv" ]; then
  echo "Creating .venv (one-time, ~30 seconds)…"
  if command -v python3 >/dev/null 2>&1; then
    python3 -m venv .venv
  else
    python -m venv .venv
  fi
fi

# venv layout differs per platform: POSIX uses `bin/`, Windows uses `Scripts/`.
# Git Bash on Windows reports a Windows venv, so probe rather than assume.
if [ -f ".venv/bin/activate" ]; then
  venv_bin=".venv/bin"
elif [ -f ".venv/Scripts/activate" ]; then
  venv_bin=".venv/Scripts"
else
  echo "error: .venv exists but has no activate script — remove it and re-run." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$venv_bin/activate"
export PATH="$PWD/$venv_bin:$PATH"

# Install the package + GUI extras if rpbuilder isn't on PATH yet.
if ! command -v rpbuilder >/dev/null 2>&1; then
  echo "Installing renpy-mcp[gui] (one-time, ~1-2 minutes)…"
  if command -v uv >/dev/null 2>&1; then
    # uv manages the venv it created; pip isn't installed inside it.
    uv pip install -q -e ".[gui]"
  else
    python -m pip install -q -e ".[gui]"
  fi
fi

# Pre-build the frontend so the editor renders even on first run.
if [ ! -f gui/frontend/dist/index.html ]; then
  if command -v npm >/dev/null 2>&1; then
    echo "Building the editor frontend (one-time, ~1 minute)…"
    (cd gui/frontend && npm install --silent && npm run build)
  else
    echo "warning: npm not found — the GUI server will start but no UI will render."
    echo "         install Node.js (https://nodejs.org) and re-run this script."
  fi
fi

exec rpbuilder "$@"
