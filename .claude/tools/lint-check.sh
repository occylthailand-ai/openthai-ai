#!/usr/bin/env bash
# รัน ESLint บนไฟล์ที่ระบุ หรือไฟล์ที่เปลี่ยนใน git
# ใช้: bash .claude/tools/lint-check.sh [file|dir]
# ถ้าไม่ระบุ: lint ไฟล์ที่ staged ใน git

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET="${1:-}"

if [[ -n "$TARGET" ]]; then
  LINT_PATH="$TARGET"
else
  # ไฟล์ที่ staged ใน git
  STAGED=$(git -C "$ROOT" diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '\.(js|jsx|ts|tsx)$' || true)
  if [[ -z "$STAGED" ]]; then
    # ถ้าไม่มี staged ใช้ไฟล์ที่ modified
    STAGED=$(git -C "$ROOT" diff --name-only HEAD 2>/dev/null | grep -E '\.(js|jsx|ts|tsx)$' || true)
  fi
  if [[ -z "$STAGED" ]]; then
    echo "ℹ️  No JS/JSX files to lint"
    exit 0
  fi
  echo "📋 Files to lint:"
  echo "$STAGED" | sed 's/^/  /'
  echo ""
  LINT_PATH="$STAGED"
fi

# หา ESLint ใน frontend หรือ backend
ESLINT=""
if [[ -f "$ROOT/frontend/node_modules/.bin/eslint" ]]; then
  ESLINT="$ROOT/frontend/node_modules/.bin/eslint"
elif [[ -f "$ROOT/backend/node_modules/.bin/eslint" ]]; then
  ESLINT="$ROOT/backend/node_modules/.bin/eslint"
else
  echo "⚠️  ESLint not found — skipping lint"
  echo "   Run: cd frontend && npm install  (or backend)"
  exit 0
fi

echo "🔍 Running ESLint..."
cd "$ROOT"
# shellcheck disable=SC2086
"$ESLINT" $LINT_PATH --max-warnings=0 2>&1 || {
  echo ""
  echo "❌ Lint errors found — fix before committing"
  exit 1
}
echo "✅ Lint passed"
