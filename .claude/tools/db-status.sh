#!/usr/bin/env bash
# ตรวจสอบว่า Supabase env vars พร้อมใช้และ URL ถูกต้อง
# ใช้: bash .claude/tools/db-status.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

echo "🗄️  Database config check"
echo ""

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ backend/.env not found"
  echo "   Copy backend/.env.example → backend/.env and fill in values"
  exit 1
fi

# โหลด env ชั่วคราว (ไม่ export ออกนอก script)
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

check_var() {
  local name="$1"
  local val="${!name:-}"
  if [[ -z "$val" ]]; then
    echo "  ❌ $name — missing"
    return 1
  else
    # แสดงแค่ prefix เพื่อความปลอดภัย
    echo "  ✅ $name = ${val:0:20}..."
  fi
}

MISSING=0
check_var SUPABASE_URL      || MISSING=1
check_var SUPABASE_SERVICE_KEY || MISSING=1
check_var JWT_SECRET        || MISSING=1
check_var ANTHROPIC_API_KEY || MISSING=1

echo ""
if [[ "$MISSING" -eq 1 ]]; then
  echo "⚠️  Some env vars are missing — backend will fail to start"
  exit 1
fi

# Ping Supabase URL
SUPABASE_URL="${SUPABASE_URL:-}"
if [[ -n "$SUPABASE_URL" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$SUPABASE_URL/rest/v1/" 2>/dev/null || echo "ERR")
  if [[ "$CODE" == "200" || "$CODE" == "401" ]]; then
    echo "✅ Supabase reachable (HTTP $CODE)"
  else
    echo "⚠️  Supabase returned HTTP $CODE — check SUPABASE_URL"
  fi
fi

echo ""
echo "✅ DB config looks good"
