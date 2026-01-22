#!/usr/bin/env bash
set -euo pipefail

# Removes common Replit/IDE artifacts from the repository.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

rm -rf .local node_modules dist build out .vercel || true

# Optional: remove attached_assets if present (Replit uploads)
rm -rf attached_assets || true

echo "Cleanup complete."
