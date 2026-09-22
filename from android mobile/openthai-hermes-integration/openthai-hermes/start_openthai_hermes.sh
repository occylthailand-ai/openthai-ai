#!/bin/bash
# start_openthai_hermes.sh
# รัน Hermes Agent + Bridge พร้อมกันทุกครั้ง
# Usage: bash start_openthai_hermes.sh

set -e

echo "🤖 Starting OpenThai AI × Hermes Agent..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check .env
if [ ! -f ~/.hermes/.env ]; then
  echo "❌ ไม่พบ ~/.hermes/.env — กรุณาตั้งค่า API keys ก่อน"
  exit 1
fi

source ~/.hermes/.env

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ ไม่พบ ANTHROPIC_API_KEY ใน ~/.hermes/.env"
  exit 1
fi

echo "✅ API Keys พร้อม"

# Start Hermes Gateway in background (OpenAI server mode)
echo ""
echo "🚀 Starting Hermes Agent Gateway (port 8642)..."
hermes gateway start --openai-server &
HERMES_PID=$!
echo "   PID: $HERMES_PID"

# Wait for Hermes to be ready
sleep 3
if curl -sf http://localhost:8642/health > /dev/null 2>&1; then
  echo "✅ Hermes Gateway พร้อม → http://localhost:8642"
else
  echo "⚠️  Hermes Gateway ยังไม่พร้อม — รอเพิ่ม..."
  sleep 5
fi

# Start Bridge
echo ""
echo "🌉 Starting Hermes Bridge (port 8001)..."
BRIDGE_DIR="$(dirname "$0")/../bridge"
if [ -f "$BRIDGE_DIR/hermes_bridge.py" ]; then
  uvicorn bridge.hermes_bridge:app --host 0.0.0.0 --port 8001 --app-dir "$BRIDGE_DIR/.." &
  BRIDGE_PID=$!
  echo "   PID: $BRIDGE_PID"
else
  echo "❌ ไม่พบ bridge/hermes_bridge.py"
  kill $HERMES_PID 2>/dev/null
  exit 1
fi

sleep 2
if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
  echo "✅ Hermes Bridge พร้อม → http://localhost:8001"
else
  echo "⚠️  Bridge ยังไม่พร้อม — ตรวจสอบ log"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ OpenThai AI × Hermes พร้อมใช้งาน!"
echo ""
echo "🔗 Endpoints:"
echo "   Hermes Gateway: http://localhost:8642/v1"
echo "   Hermes Bridge:  http://localhost:8001"
echo "   Health Check:   http://localhost:8001/health"
echo ""
echo "📝 ทดสอบ:"
echo "   curl -X POST http://localhost:8001/api/generate \\"
echo "     -H 'X-API-Key: $BRIDGE_API_KEY' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"product_name\": \"สบู่มะขาม\"}'"
echo ""
echo "กด Ctrl+C เพื่อหยุดทุก service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Trap Ctrl+C
cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  kill $HERMES_PID $BRIDGE_PID 2>/dev/null
  echo "✅ Stopped."
}
trap cleanup EXIT INT TERM

# Keep running
wait
