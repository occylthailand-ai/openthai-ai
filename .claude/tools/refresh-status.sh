#!/usr/bin/env bash
# Regenerate PROJECT_STATUS.md from the real repo state
# ใช้: bash .claude/tools/refresh-status.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "🔄 Regenerating PROJECT_STATUS.md..."
cd "$ROOT"
node scripts/generate-project-status.mjs

echo ""
echo "✅ Done — PROJECT_STATUS.md updated"
echo ""
echo "Changed lines:"
git diff --stat PROJECT_STATUS.md 2>/dev/null || echo "(no git diff available)"
