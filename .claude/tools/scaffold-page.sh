#!/usr/bin/env bash
# Scaffold หน้าใหม่ React ตาม pattern ของโปรเจกต์
# ใช้: bash .claude/tools/scaffold-page.sh PageName
# ตัวอย่าง: bash .claude/tools/scaffold-page.sh ProductCatalog

set -euo pipefail

PAGE_NAME="${1:-}"

if [[ -z "$PAGE_NAME" ]]; then
  echo "❌ ต้องระบุชื่อหน้า"
  echo "   ใช้: bash .claude/tools/scaffold-page.sh PageName"
  echo "   เช่น: bash .claude/tools/scaffold-page.sh ProductCatalog"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PAGES_DIR="$ROOT/frontend/src/pages"
OUT="$PAGES_DIR/${PAGE_NAME}.jsx"

if [[ -f "$OUT" ]]; then
  echo "❌ ไฟล์ $OUT มีอยู่แล้ว"
  exit 1
fi

# แปลง PascalCase เป็น kebab-case สำหรับ route
ROUTE_NAME=$(echo "$PAGE_NAME" | sed 's/\([A-Z]\)/-\1/g' | tr '[:upper:]' '[:lower:]' | sed 's/^-//')

cat > "$OUT" <<TEMPLATE
import { useState, useEffect } from 'react'
import { apiFetch } from '../apiBase'
import { useLanguage } from '../i18n'

export default function ${PAGE_NAME}() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch('/api/TODO')
      .then(r => r.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4">Loading...</div>
  if (error)   return <div className="p-4 text-red-500">{error}</div>

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t('${ROUTE_NAME}_title')}</h1>
      {/* TODO: implement ${PAGE_NAME} */}
      <pre className="text-xs text-gray-400">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
TEMPLATE

echo "✅ สร้างไฟล์: frontend/src/pages/${PAGE_NAME}.jsx"
echo ""
echo "ขั้นตอนต่อไป:"
echo "  1. เพิ่ม route ใน frontend/src/App.jsx:"
echo "       import ${PAGE_NAME} from './pages/${PAGE_NAME}'"
echo "       <Route path=\"/${ROUTE_NAME}\" element={<${PAGE_NAME} />} />"
echo ""
echo "  2. เพิ่ม translation key '${ROUTE_NAME}_title' ใน frontend/src/i18n/"
echo ""
echo "  3. แก้ /api/TODO ให้เป็น endpoint ที่ถูกต้อง"
