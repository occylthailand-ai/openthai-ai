#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-computer.sh — OpenThaiAi Auto-Sync สำหรับคอมพิวเตอร์
# ดึงโค้ดล่าสุดจาก Git อัตโนมัติ + ติดตั้ง dependencies ถ้า package เปลี่ยน
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.env"
LOG_FILE="$SCRIPT_DIR/sync.log"

# โหลด config
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

REPO_DIR="${GIT_REPO_DIR:-$(dirname "$SCRIPT_DIR")}"
BRANCH="${GIT_BRANCH:-claude/pending-tasks-kcx852}"
REMOTE="${GIT_REMOTE:-origin}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() { echo "[$TIMESTAMP] $*" | tee -a "$LOG_FILE"; }

log "═══════════════════════════════════════════"
log "🖥️  OpenThaiAi Computer Sync เริ่มต้น"
log "📂 Dir: $REPO_DIR"
log "🔀 Branch: $BRANCH"

# ตรวจสอบ git
if ! command -v git &>/dev/null; then
  log "❌ ไม่พบ git — กรุณาติดตั้ง git ก่อน"
  exit 1
fi

cd "$REPO_DIR"

# ตรวจสอบว่าเป็น git repo
if ! git rev-parse --git-dir &>/dev/null; then
  log "❌ ไม่ใช่ git repository: $REPO_DIR"
  exit 1
fi

# บันทึก commit ก่อน pull
BEFORE_HASH=$(git rev-parse HEAD 2>/dev/null || echo "none")

# Fetch + pull
log "📡 กำลัง fetch จาก $REMOTE..."
if git fetch "$REMOTE" "$BRANCH" 2>&1 | tee -a "$LOG_FILE"; then
  log "✅ Fetch สำเร็จ"
else
  log "⚠️  Fetch ล้มเหลว — ตรวจสอบ network หรือ credentials"
  exit 1
fi

# ตรวจสอบว่ามีอะไรใหม่หรือไม่
LOCAL=$(git rev-parse HEAD)
UPSTREAM=$(git rev-parse "$REMOTE/$BRANCH" 2>/dev/null || echo "$LOCAL")

if [[ "$LOCAL" == "$UPSTREAM" ]]; then
  log "✅ โค้ดเป็นเวอร์ชั่นล่าสุดแล้ว — ไม่ต้อง pull"
else
  log "🔄 พบการอัปเดต กำลัง pull..."

  # Stash local changes ถ้ามี
  if ! git diff --quiet || ! git diff --cached --quiet; then
    log "📦 Stash การเปลี่ยนแปลงชั่วคราว..."
    git stash push -m "auto-sync stash $TIMESTAMP" 2>&1 | tee -a "$LOG_FILE"
    STASHED=true
  else
    STASHED=false
  fi

  # Pull
  git pull "$REMOTE" "$BRANCH" 2>&1 | tee -a "$LOG_FILE"
  AFTER_HASH=$(git rev-parse HEAD)

  # Pop stash ถ้าเคย stash ไว้
  if [[ "$STASHED" == "true" ]]; then
    log "📦 คืน local changes..."
    git stash pop 2>&1 | tee -a "$LOG_FILE" || log "⚠️  Stash pop ล้มเหลว — ตรวจสอบ conflicts"
  fi

  log "✅ Pull สำเร็จ: $BEFORE_HASH → $AFTER_HASH"

  # ตรวจสอบว่า package.json เปลี่ยนหรือไม่
  if git diff "$BEFORE_HASH" HEAD -- package.json backend/package.json frontend/package.json 2>/dev/null | grep -q '^[+-]'; then
    log "📦 Package.json เปลี่ยน กำลังติดตั้ง dependencies..."

    if [[ -f "$REPO_DIR/backend/package.json" ]]; then
      log "📦 npm install (backend)..."
      cd "$REPO_DIR/backend" && npm install --silent 2>&1 | tee -a "$LOG_FILE"
      cd "$REPO_DIR"
    fi

    if [[ -f "$REPO_DIR/frontend/package.json" ]]; then
      log "📦 npm install (frontend)..."
      cd "$REPO_DIR/frontend" && npm install --silent 2>&1 | tee -a "$LOG_FILE"
      cd "$REPO_DIR"
    fi

    log "✅ Dependencies อัปเดตแล้ว"
  fi
fi

# Notify Slack ถ้ามี webhook
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    -d "{\"text\":\"🖥️ *OpenThaiAi Computer Sync* เสร็จแล้ว\\nBranch: \`$BRANCH\`\\nTime: $TIMESTAMP\"}" \
    &>/dev/null || true
fi

log "🎉 Computer Sync เสร็จสมบูรณ์"
log "═══════════════════════════════════════════"
