#!/usr/bin/env bash
# ตรวจสอบสถานะ backend API (local dev หรือ production)
# ใช้: bash .claude/tools/health-check.sh [URL] [--endpoints]
#   --endpoints  เช็ค key API endpoints เพิ่มเติม
# ตัวอย่าง:
#   bash .claude/tools/health-check.sh
#   bash .claude/tools/health-check.sh https://api.openthai.ai
#   bash .claude/tools/health-check.sh http://localhost:8000 --endpoints

set -euo pipefail

TARGET="${1:-http://localhost:8000}"
CHECK_ENDPOINTS=false
[[ "${2:-}" == "--endpoints" ]] && CHECK_ENDPOINTS=true

BASE="${TARGET%/}"
HEALTH_URL="$BASE/api/health"

check_url() {
  local label="$1" url="$2"
  local code body
  body=$(curl -s -o /tmp/hc_tmp.json -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url" 2>/dev/null) || body=""
  code="$body"
  if [[ "$code" == "200" ]]; then
    echo "  ✅ $label (200)"
  elif [[ -z "$code" ]]; then
    echo "  ❌ $label — no response"
  else
    echo "  ⚠️  $label (HTTP $code)"
  fi
}

echo "🔍 Health check: $BASE"
echo ""

HTTP_CODE=$(curl -s -o /tmp/health_body.json -w "%{http_code}" \
  --connect-timeout 5 --max-time 10 \
  "$HEALTH_URL" 2>/dev/null) || true

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "✅ Backend is UP (HTTP $HTTP_CODE)"
  echo ""
  python3 -m json.tool /tmp/health_body.json 2>/dev/null || cat /tmp/health_body.json
elif [[ -z "$HTTP_CODE" ]]; then
  echo "❌ Cannot connect to $BASE"
  echo "   → Is the backend running? Try: cd backend && npm run dev"
  exit 1
else
  echo "⚠️  Backend responded HTTP $HTTP_CODE"
  cat /tmp/health_body.json 2>/dev/null || true
  exit 1
fi

if [[ "$CHECK_ENDPOINTS" == "true" ]]; then
  echo ""
  echo "📋 Key endpoints:"
  check_url "GET /api/health"         "$BASE/api/health"
  check_url "GET /api/openapi.json"   "$BASE/api/openapi.json"
  check_url "GET /api/skills"         "$BASE/api/skills"
fi
