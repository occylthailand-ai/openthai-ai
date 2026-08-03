#!/usr/bin/env bash
# ถอน Boot Alert (เจ้าของเครื่อง/admin ทำได้เสมอ)
# ใช้: sudo ./uninstall-linux.sh
set -euo pipefail
systemctl disable --now boot-alert.service 2>/dev/null || true
rm -f /etc/systemd/system/boot-alert.service
systemctl daemon-reload
echo "✅ ถอน Boot Alert เรียบร้อย"
