#!/usr/bin/env bash
# รัน test suite
# ใช้: bash .claude/tools/run-tests.sh [suite]
# suite: unit | middleware | smoke | affiliate | revenue | e2e | all (default: unit)

set -euo pipefail

SUITE="${1:-unit}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

echo "🧪 Running tests: $SUITE"
echo ""

case "$SUITE" in
  unit)
    cd "$FRONTEND_DIR"
    npm test
    ;;
  middleware)
    cd "$ROOT"
    node --test backend/middleware/__tests__/*.mjs
    ;;
  smoke)
    cd "$BACKEND_DIR"
    npm run test:smoke
    ;;
  affiliate)
    cd "$BACKEND_DIR"
    npm run test:affiliate
    ;;
  revenue)
    cd "$BACKEND_DIR"
    npm run test:revenue
    ;;
  e2e)
    cd "$ROOT"
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npx --prefix frontend playwright test
    ;;
  all)
    echo "--- unit (frontend vitest) ---"
    cd "$FRONTEND_DIR" && npm test && cd "$ROOT"
    echo ""
    echo "--- middleware (node --test) ---"
    node --test backend/middleware/__tests__/*.mjs
    echo ""
    echo "--- smoke ---"
    cd "$BACKEND_DIR" && npm run test:smoke && cd "$ROOT"
    echo ""
    echo "--- affiliate ---"
    cd "$BACKEND_DIR" && npm run test:affiliate && cd "$ROOT"
    echo ""
    echo "--- revenue ---"
    cd "$BACKEND_DIR" && npm run test:revenue && cd "$ROOT"
    ;;
  *)
    echo "❌ Unknown suite: $SUITE"
    echo "   Valid: unit | middleware | smoke | affiliate | revenue | e2e | all"
    exit 1
    ;;
esac

echo ""
echo "✅ Tests done"
