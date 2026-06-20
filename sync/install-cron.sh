#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# install-cron.sh — ติดตั้ง Cron Job สำหรับ Auto-Sync อัตโนมัติ (Linux/Mac)
# รัน: bash sync/install-cron.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.env"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

SCHEDULE="${SYNC_CRON_SCHEDULE:-0 */6 * * *}"
SYNC_ALL="$SCRIPT_DIR/sync-all.sh"
LOG_FILE="$SCRIPT_DIR/sync.log"

# ให้สิทธิ์ execute แก่ scripts ทั้งหมด
chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true

echo "═══════════════════════════════════════════"
echo "⏰  ติดตั้ง Auto-Sync Cron Job"
echo "   Script: $SYNC_ALL"
echo "   Schedule: $SCHEDULE"
echo ""

# ตรวจว่ามีอยู่แล้วหรือไม่
CRON_LINE="$SCHEDULE bash $SYNC_ALL >> $LOG_FILE 2>&1"
MARKER="# OpenThaiAi Auto-Sync"

# ตรวจสอบว่ามี crontab command หรือไม่
if ! command -v crontab &>/dev/null; then
  echo "⚠️  ไม่พบ crontab ในระบบนี้"
  echo "   ติดตั้ง cron: sudo apt-get install cron (Ubuntu/Debian)"
  echo "   หรือบน macOS: cron มีอยู่แล้ว ไม่ต้องติดตั้ง"
  echo ""
  echo "   คุณสามารถรัน sync ด้วยตัวเองด้วย: bash $SYNC_ALL"
  exit 0
fi

if crontab -l 2>/dev/null | grep -q "OpenThaiAi Auto-Sync"; then
  echo "ℹ️  Cron job มีอยู่แล้ว — กำลังอัปเดต..."
  crontab -l 2>/dev/null | grep -v "OpenThaiAi" | crontab -
fi

# เพิ่ม cron ใหม่
(crontab -l 2>/dev/null; echo ""; echo "$MARKER"; echo "$CRON_LINE") | crontab -

echo "✅ Cron Job ติดตั้งแล้ว:"
echo "   $CRON_LINE"
echo ""

# ตรวจสอบ cron service (Linux)
if command -v systemctl &>/dev/null; then
  if ! systemctl is-active --quiet cron 2>/dev/null && ! systemctl is-active --quiet crond 2>/dev/null; then
    echo "⚠️  Cron service ไม่ได้ทำงาน — รัน: sudo systemctl enable cron && sudo systemctl start cron"
  else
    echo "✅ Cron service กำลังทำงาน"
  fi
fi

echo ""
echo "📋 ดู Cron Jobs ทั้งหมด:"
echo "   crontab -l"
echo ""
echo "📋 ดู Sync Log:"
echo "   tail -f $LOG_FILE"
echo ""
echo "🧪 ทดสอบทันที:"
echo "   bash $SYNC_ALL"
echo ""

# ── macOS: ตั้ง LaunchAgent เพิ่มเติม (optional) ─────────────────────────────
if [[ "$(uname)" == "Darwin" ]]; then
  PLIST_DIR="$HOME/Library/LaunchAgents"
  PLIST_FILE="$PLIST_DIR/ai.openthai.sync.plist"
  mkdir -p "$PLIST_DIR"

  # แปลง schedule เป็น LaunchAgent interval (ทุก 6 ชั่วโมง = 21600 วินาที)
  INTERVAL=21600

  cat > "$PLIST_FILE" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>ai.openthai.sync</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SYNC_ALL</string>
  </array>
  <key>StartInterval</key>
  <integer>$INTERVAL</integer>
  <key>StandardOutPath</key>
  <string>$LOG_FILE</string>
  <key>StandardErrorPath</key>
  <string>$LOG_FILE</string>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
PLIST

  launchctl unload "$PLIST_FILE" 2>/dev/null || true
  launchctl load "$PLIST_FILE" 2>/dev/null && \
    echo "✅ macOS LaunchAgent ติดตั้งแล้ว: $PLIST_FILE" || \
    echo "⚠️  LaunchAgent load ล้มเหลว — ใช้ cron แทน"
fi

echo "═══════════════════════════════════════════"
echo "🎉 Auto-Sync ติดตั้งสำเร็จ — จะซิ้งทุก 6 ชั่วโมงอัตโนมัติ"
