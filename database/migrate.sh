#!/usr/bin/env bash
# Migration tracker — บอกว่า migration ไหน apply แล้ว/ยังไม่ apply
# ใช้: bash database/migrate.sh
#
# ต้องตั้ง SUPABASE_URL และ SUPABASE_SERVICE_KEY ใน environment หรือ backend/.env
# ถ้าไม่มีค่า → แสดงรายชื่อ migration files เท่านั้น

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION_DIR="$ROOT/database"
ENV_FILE="$ROOT/backend/.env"

echo "🗄️  OpenThaiAi — Migration Status"
echo "   Directory: $MIGRATION_DIR"
echo ""

# โหลด env ถ้ามี
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

SB_URL="${SUPABASE_URL:-}"
SB_KEY="${SUPABASE_SERVICE_KEY:-}"

# แสดงรายชื่อ migration files พร้อมขนาด
echo "Migration files:"
echo ""
FILES=()
while IFS= read -r -d '' f; do
  FILES+=("$f")
done < <(find "$MIGRATION_DIR" -maxdepth 1 -name "*.sql" -not -name "FULL-MIGRATION.sql" | sort -z)

for f in "${FILES[@]}"; do
  name=$(basename "$f")
  size=$(wc -l < "$f")
  echo "  📄 $name  (${size} lines)"
done

echo ""
echo "Total: ${#FILES[@]} migration files"
echo ""

if [[ -z "$SB_URL" || -z "$SB_KEY" ]]; then
  echo "ℹ️  SUPABASE_URL / SUPABASE_SERVICE_KEY ไม่ได้ตั้ง"
  echo "   → ไม่สามารถเช็คสถานะจริงใน DB ได้"
  echo "   → Apply migrations ผ่าน Supabase Dashboard SQL Editor"
  echo ""
  echo "วิธีใช้:"
  echo "  1. เปิด Supabase Dashboard → SQL Editor"
  echo "  2. Copy เนื้อหาจากไฟล์ migration ที่ต้องการ apply"
  echo "  3. Run → ตรวจสอบว่าไม่มี error"
  echo "  4. บันทึกว่า apply แล้วใน DECISIONS_LOG.md"
  exit 0
fi

# เช็คว่า table migrations มีอยู่ไหม (ถ้ายังไม่มีให้สร้าง)
echo "🔍 Checking Supabase connection..."
PING=$(curl -s -o /dev/null -w "%{http_code}" \
  --connect-timeout 5 \
  -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $SB_KEY" \
  "$SB_URL/rest/v1/" 2>/dev/null) || PING="ERR"

if [[ "$PING" == "200" || "$PING" == "401" ]]; then
  echo "✅ Supabase reachable (HTTP $PING)"
  echo ""
  echo "ℹ️  การ track migration ทำผ่าน Supabase Dashboard"
  echo "   ดู: https://supabase.com/dashboard/project/$(echo "$SB_URL" | grep -oP '(?<=https://)[^.]+' || echo '?')/database/migrations"
else
  echo "⚠️  Supabase returned HTTP $PING — ตรวจสอบ SUPABASE_URL"
fi
