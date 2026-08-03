#!/usr/bin/env bash
# ติดตั้ง Boot Alert เป็น launchd (LaunchDaemon) บน macOS — เริ่มทุกบูต + เด้งกลับเมื่อถูกปิด
# ใช้: sudo ./install-macos.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$(command -v node || true)"
[ -z "$NODE" ] && { echo "❌ ไม่พบ node — ติดตั้ง Node.js 18+ ก่อน"; exit 1; }
[ -f "$DIR/.env" ] || { echo "❌ ยังไม่มีไฟล์ .env — คัดลอกจาก .env.example แล้วเติมค่าก่อน"; exit 1; }

PLIST=/Library/LaunchDaemons/com.openthai.bootalert.plist
echo "→ สร้าง $PLIST"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.openthai.bootalert</string>
  <key>ProgramArguments</key>
  <array><string>$NODE</string><string>$DIR/notify.js</string></array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardErrorPath</key><string>$DIR/boot-alert.err.log</string>
  <key>StandardOutPath</key><string>$DIR/boot-alert.out.log</string>
</dict>
</plist>
EOF

chown root:wheel "$PLIST"
launchctl load -w "$PLIST"
echo "✅ ติดตั้งแล้ว — เริ่มทุกบูตและเด้งกลับเมื่อถูกปิด (KeepAlive)"
echo "   ถอน: sudo launchctl unload -w $PLIST && sudo rm $PLIST"
