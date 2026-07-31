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
  smoke)     npm run test:smoke ;;
  affiliate) npm run test:affiliate ;;
  revenue)   npm run test:revenue ;;
  all)
    echo "--- smoke ---"
    npm run test:smoke
    echo ""
    echo "--- affiliate ---"
    npm run test:affiliate
    echo ""
    echo "--- revenue ---"
    npm run test:revenue
    ;;
  *)
    echo "❌ Unknown suite: $SUITE"
    echo "   Valid: smoke | affiliate | revenue | all"
    exit 1
    ;;
esac

echo ""
echo "✅ Tests done"
