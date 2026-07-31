#!/usr/bin/env bash
# ตรวจสอบสถานะ backend API (local dev หรือ production)
# ใช้: bash .claude/tools/health-check.sh [URL]
# ตัวอย่าง: bash .claude/tools/health-check.sh https://api.openthai.ai

set -euo pipefail

TARGET="${1:-http://localhost:8000}"
HEALTH_URL="${TARGET%/}/api/health"

echo "🔍 Checking: $HEALTH_URL"
echo ""

HTTP_CODE=$(curl -s -o /tmp/health_body.json -w "%{http_code}" \
  --connect-timeout 5 --max-time 10 \
  "$HEALTH_URL" 2>/dev/null) || true

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "✅ Backend is UP (HTTP $HTTP_CODE)"
  echo ""
  cat /tmp/health_body.json | python3 -m json.tool 2>/dev/null || cat /tmp/health_body.json
elif [[ -z "$HTTP_CODE" ]]; then
  echo "❌ Cannot connect to $TARGET"
  echo "   → Is the backend running? Try: cd backend && npm run dev"
  exit 1
else
  echo "⚠️  Backend responded HTTP $HTTP_CODE"
  cat /tmp/health_body.json 2>/dev/null || true
  exit 1
fi
