#!/usr/bin/env bash
# รัน test suite ของ backend
# ใช้: bash .claude/tools/run-tests.sh [suite]
# suite: smoke | affiliate | revenue | all (default: smoke)

set -euo pipefail

SUITE="${1:-smoke}"
BACKEND_DIR="$(cd "$(dirname "$0")/../../backend" && pwd)"

echo "🧪 Running backend tests: $SUITE"
echo ""

cd "$BACKEND_DIR"

case "$SUITE" in
  health)    npm run test:health ;;
  smoke)     npm run test:smoke ;;
  affiliate) npm run test:affiliate ;;
  revenue)   npm run test:revenue ;;
  all)       npm run test:all ;;
  *)
    echo "❌ Unknown suite: $SUITE"
    echo "   Valid: health | smoke | affiliate | revenue | all"
    exit 1
    ;;
esac

echo ""
echo "✅ Tests done"
