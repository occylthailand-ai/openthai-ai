#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-onedrive.sh — OpenThaiAi Auto-Sync สำหรับ OneDrive (Linux/Mac)
# ใช้ rclone เพื่อ copy ไฟล์ไปยัง OneDrive อัตโนมัติ
# ติดตั้ง rclone: curl https://rclone.org/install.sh | sudo bash
# ตั้งค่า: rclone config → เลือก OneDrive → ตั้งชื่อ remote ว่า "onedrive"
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.env"
LOG_FILE="$SCRIPT_DIR/sync.log"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
REPO_DIR="${GIT_REPO_DIR:-$(dirname "$SCRIPT_DIR")}"
RCLONE_REMOTE="${RCLONE_ONEDRIVE_REMOTE:-onedrive}"
ONEDRIVE_PATH="${ONEDRIVE_TARGET_PATH:-OpenThaiAi/code-backup}"
BACKUP_DIR="$SCRIPT_DIR/.backup"

log() { echo "[$TIMESTAMP] $*" | tee -a "$LOG_FILE"; }

log "═══════════════════════════════════════════"
log "🔷 OpenThaiAi OneDrive Sync เริ่มต้น"
log "📂 Repo: $REPO_DIR"
log "☁️  OneDrive path: $RCLONE_REMOTE:$ONEDRIVE_PATH"

# ── วิธี 1: ใช้ rclone (แนะนำ) ───────────────────────────────────────────────
if command -v rclone &>/dev/null; then
  log "✅ พบ rclone — กำลังซิ้งไปยัง OneDrive..."

  # ตรวจสอบว่า remote ตั้งค่าแล้ว
  if ! rclone listremotes 2>/dev/null | grep -q "^${RCLONE_REMOTE}:"; then
    log "❌ ไม่พบ rclone remote '$RCLONE_REMOTE'"
    log "📋 วิธีตั้งค่า OneDrive กับ rclone:"
    log "   1. รัน: rclone config"
    log "   2. กด n (new remote)"
    log "   3. ชื่อ: onedrive"
    log "   4. เลือก Type: Microsoft OneDrive (ตัวเลข ~26)"
    log "   5. กด Enter ผ่าน client_id, client_secret"
    log "   6. เลือก auth → เปิด browser → login Microsoft"
    log "   7. เลือก OneDrive Personal / Business"
    log "   8. กด y เพื่อบันทึก"
    log "   จากนั้นรัน script นี้ใหม่"
    exit 1
  fi

  # ไฟล์/โฟลเดอร์ที่จะซิ้ง (exclude node_modules, .git, tmp)
  rclone sync "$REPO_DIR" "${RCLONE_REMOTE}:${ONEDRIVE_PATH}" \
    --exclude "node_modules/**" \
    --exclude ".git/**" \
    --exclude "**/.env" \
    --exclude "**/dist/**" \
    --exclude "**/.next/**" \
    --exclude "sync/.backup/**" \
    --exclude "sync/sync.log" \
    --progress \
    --log-file="$LOG_FILE" \
    --log-level INFO \
    2>&1 | grep -v "^$" || true

  log "✅ OneDrive Sync สำเร็จ → ${RCLONE_REMOTE}:${ONEDRIVE_PATH}"

# ── วิธี 2: ไม่มี rclone — สร้าง zip แล้วแนะนำ upload ด้วยตัวเอง ─────────────
else
  log "⚠️  ไม่พบ rclone — สร้าง zip file แทน"
  mkdir -p "$BACKUP_DIR"

  ZIP_NAME="openthai-ai-$(date '+%Y%m%d-%H%M%S').zip"
  ZIP_PATH="$BACKUP_DIR/$ZIP_NAME"

  log "📦 กำลัง zip โค้ด..."
  cd "$REPO_DIR"
  zip -r "$ZIP_PATH" . \
    --exclude "*/node_modules/*" \
    --exclude "*/.git/*" \
    --exclude "*/.env" \
    --exclude "*/dist/*" \
    --exclude "sync/.backup/*" \
    --exclude "sync/sync.log" \
    -q

  ZIP_SIZE=$(du -h "$ZIP_PATH" | cut -f1)
  log "✅ สร้าง zip แล้ว: $ZIP_PATH ($ZIP_SIZE)"
  log ""
  log "📋 วิธี upload ไป OneDrive:"
  log "   1. เปิด onedrive.live.com"
  log "   2. Upload file: $ZIP_PATH"
  log "   3. หรือ copy ไปไว้ใน OneDrive folder บนเครื่อง"
  log ""
  log "💡 แนะนำ: ติดตั้ง rclone เพื่อซิ้งอัตโนมัติ"
  log "   curl https://rclone.org/install.sh | sudo bash"
fi

# Notify Slack
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    -d "{\"text\":\"🔷 *OpenThaiAi OneDrive Sync* เสร็จแล้ว\\nPath: ${ONEDRIVE_PATH}\\nTime: $TIMESTAMP\"}" \
    &>/dev/null || true
fi

log "🎉 OneDrive Sync เสร็จสมบูรณ์"
log "═══════════════════════════════════════════"
