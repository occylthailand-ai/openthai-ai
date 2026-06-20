#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-all.sh — OpenThaiAi Master Sync Script
# รันซิ้งทั้ง 4 จุดพร้อมกัน: Computer + Mobile + Google Drive + OneDrive
# รัน: bash sync/sync-all.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/sync.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() { echo "[$TIMESTAMP] $*" | tee -a "$LOG_FILE"; }

log "╔════════════════════════════════════════════╗"
log "║  🚀 OpenThaiAi Auto-Sync — ทั้ง 4 จุด     ║"
log "║  เวลา: $TIMESTAMP              ║"
log "╚════════════════════════════════════════════╝"

ERRORS=()
SUCCESS=()

# ── 1. Computer Sync (Git Pull) ───────────────────────────────────────────────
log ""
log "━━━ [1/4] 💻 Computer Sync ━━━━━━━━━━━━━━━━━"
if bash "$SCRIPT_DIR/sync-computer.sh"; then
  SUCCESS+=("💻 Computer (Git)")
  log "✅ Computer Sync สำเร็จ"
else
  ERRORS+=("💻 Computer (Git)")
  log "❌ Computer Sync ล้มเหลว"
fi

# ── 2. Mobile Sync (Vercel Deploy) ───────────────────────────────────────────
log ""
log "━━━ [2/4] 📱 Mobile Sync (Vercel) ━━━━━━━━━━"
if bash "$SCRIPT_DIR/sync-mobile.sh"; then
  SUCCESS+=("📱 Mobile (Vercel)")
  log "✅ Mobile Sync สำเร็จ"
else
  ERRORS+=("📱 Mobile (Vercel)")
  log "⚠️  Mobile Sync — ตรวจสอบ VERCEL_DEPLOY_HOOK_URL"
fi

# ── 3. Google Drive Sync ──────────────────────────────────────────────────────
log ""
log "━━━ [3/4] ☁️  Google Drive Sync ━━━━━━━━━━━━━"
if node "$SCRIPT_DIR/sync-drive.js"; then
  SUCCESS+=("☁️  Google Drive")
  log "✅ Google Drive Sync สำเร็จ"
else
  ERRORS+=("☁️  Google Drive")
  log "⚠️  Google Drive Sync — ตรวจสอบ GOOGLE_OAUTH_TOKEN"
fi

# ── 4. OneDrive Sync ──────────────────────────────────────────────────────────
log ""
log "━━━ [4/4] 🔷 OneDrive Sync ━━━━━━━━━━━━━━━━━"
if bash "$SCRIPT_DIR/sync-onedrive.sh"; then
  SUCCESS+=("🔷 OneDrive")
  log "✅ OneDrive Sync สำเร็จ"
else
  ERRORS+=("🔷 OneDrive")
  log "⚠️  OneDrive Sync — ตรวจสอบ rclone config"
fi

# ── สรุปผล ────────────────────────────────────────────────────────────────────
log ""
log "╔════════════════════════════════════════════╗"
log "║  📊 สรุปผล Auto-Sync                       ║"
log "╠════════════════════════════════════════════╣"

for s in "${SUCCESS[@]}"; do
  log "║  ✅ $s"
done

for e in "${ERRORS[@]}"; do
  log "║  ❌ $e"
done

TOTAL=$((${#SUCCESS[@]} + ${#ERRORS[@]}))
log "╠════════════════════════════════════════════╣"
log "║  สำเร็จ: ${#SUCCESS[@]}/$TOTAL จุด"
log "║  เวลา: $TIMESTAMP"
log "╚════════════════════════════════════════════╝"

# Notify Slack summary
CONFIG_FILE="$SCRIPT_DIR/config.env"
if [[ -f "$CONFIG_FILE" ]]; then source "$CONFIG_FILE"; fi

if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
  STATUS_TEXT="✅ ${#SUCCESS[@]} สำเร็จ"
  [[ ${#ERRORS[@]} -gt 0 ]] && STATUS_TEXT="$STATUS_TEXT / ⚠️ ${#ERRORS[@]} ต้องตรวจสอบ"
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    -d "{\"text\":\"🚀 *OpenThaiAi Auto-Sync* เสร็จแล้ว\\n$STATUS_TEXT\\nTime: $TIMESTAMP\"}" \
    &>/dev/null || true
fi

[[ ${#ERRORS[@]} -gt 0 ]] && exit 1 || exit 0
