#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-mobile.sh — OpenThaiAi Auto-Sync สำหรับมือถือ (Vercel Deploy Trigger)
# มือถือ = web app ที่เปิดผ่าน Vercel URL
# เมื่อ push code ขึ้น git แล้ว Vercel จะ build + deploy อัตโนมัติ
# Script นี้ trigger manual redeploy ผ่าน Vercel Deploy Hook URL
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
log() { echo "[$TIMESTAMP] $*" | tee -a "$LOG_FILE"; }

log "═══════════════════════════════════════════"
log "📱 OpenThaiAi Mobile Sync (Vercel Deploy)"

# ── กรณี 1: มี Vercel Deploy Hook URL ────────────────────────────────────────
if [[ -n "${VERCEL_DEPLOY_HOOK_URL:-}" ]]; then
  log "🚀 Trigger Vercel Deploy Hook..."
  RESPONSE=$(curl -s -X POST "$VERCEL_DEPLOY_HOOK_URL" 2>&1)
  log "✅ Vercel deploy triggered: $RESPONSE"

# ── กรณี 2: ใช้ Vercel CLI ───────────────────────────────────────────────────
elif command -v vercel &>/dev/null; then
  log "🚀 Vercel CLI deploy..."
  REPO_DIR="${GIT_REPO_DIR:-$(dirname "$SCRIPT_DIR")}"
  cd "$REPO_DIR"
  vercel deploy --prod 2>&1 | tee -a "$LOG_FILE"
  log "✅ Vercel CLI deploy สำเร็จ"

# ── กรณี 3: Push to main branch (Vercel auto-deploys) ───────────────────────
else
  log "ℹ️  ไม่มี VERCEL_DEPLOY_HOOK_URL หรือ Vercel CLI"
  log "📋 วิธีตั้งค่า Vercel Deploy Hook อัตโนมัติ:"
  log "   1. เปิด vercel.com → Project → Settings → Git"
  log "   2. เลื่อนลง 'Deploy Hooks' → Create Hook"
  log "   3. ชื่อ: 'auto-sync' → Branch: claude/pending-tasks-kcx852"
  log "   4. Copy URL ที่ได้ → ใส่ใน sync/config.env"
  log "      VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/..."
  log ""
  log "📱 ตอนนี้มือถือซิ้งอัตโนมัติทุกครั้งที่ push code ขึ้น git แล้วครับ"
  log "   เพราะ Vercel เชื่อมกับ GitHub repository โดยตรง"
fi

# Notify Slack
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    -d "{\"text\":\"📱 *OpenThaiAi Mobile Sync* — Vercel deploy triggered\\nTime: $TIMESTAMP\"}" \
    &>/dev/null || true
fi

log "🎉 Mobile Sync เสร็จสมบูรณ์"
log "═══════════════════════════════════════════"
