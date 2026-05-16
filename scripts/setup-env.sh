#!/usr/bin/env bash
set -euo pipefail

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found, installing..."
  curl -fsSL https://get.pnpm.io/install.sh | SHELL=/bin/zsh sh -
fi

export PNPM_HOME="$HOME/Library/pnpm"
export PATH="$PNPM_HOME:$PATH"

pnpm -v
pnpm install
pnpm exec playwright install chromium
node ./scripts/doctor.mjs

echo "Environment setup complete."
