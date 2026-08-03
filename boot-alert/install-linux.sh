#!/usr/bin/env bash
# ติดตั้ง Boot Alert เป็น systemd service — เริ่มทุกบูต + เด้งกลับเมื่อถูกปิด
# ใช้: sudo ./install-linux.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$(command -v node || true)"
[ -z "$NODE" ] && { echo "❌ ไม่พบ node — ติดตั้ง Node.js 18+ ก่อน"; exit 1; }
[ -f "$DIR/.env" ] || { echo "❌ ยังไม่มีไฟล์ .env — คัดลอกจาก .env.example แล้วเติมค่า SMS ก่อน"; exit 1; }

RUN_USER="${SUDO_USER:-$USER}"
UNIT=/etc/systemd/system/boot-alert.service

echo "→ สร้าง $UNIT"
cat > "$UNIT" <<EOF
[Unit]
Description=Boot Alert — SMS notify on power-on
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$DIR
ExecStart=$NODE $DIR/notify.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable boot-alert.service
systemctl restart boot-alert.service
echo "✅ ติดตั้งแล้ว — service จะเริ่มทุกบูตและรีสตาร์ตเองถ้าถูกปิด"
echo "   ดูสถานะ: systemctl status boot-alert"
echo "   ดู log : journalctl -u boot-alert -f"
echo "   ถอน    : sudo $DIR/uninstall-linux.sh"
