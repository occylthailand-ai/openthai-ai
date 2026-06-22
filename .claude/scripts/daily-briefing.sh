#!/usr/bin/env bash
# SessionStart hook — openthai-ai daily briefing
# Outputs JSON with additionalContext injected into Claude's system prompt

REPO="/home/user/openthai-ai"
cd "$REPO" 2>/dev/null || true

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
AHEAD=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l | tr -d ' ')
LAST=$(git log -1 --format="%s (%ar)" 2>/dev/null || echo "-")
DATE=$(date '+%d/%m/%Y %H:%M')

CONTEXT="══════════════════════════════════════════
openthai-ai — SESSION BRIEFING ($DATE)
══════════════════════════════════════════
Branch : $BRANCH
Commits ahead of main : $AHEAD
Last   : $LAST

── ACTION ITEMS (แจ้งผู้ใช้ทันที) ─────────
❶ ตั้ง Environment Variables ใน Vercel Dashboard:
   JWT_SECRET, ADMIN_KEY, ADMIN_USERNAME, ADMIN_PASSWORD_PLAIN
   GEMINI_API_KEY (หรือ ANTHROPIC_API_KEY)
   SUPABASE_URL + SUPABASE_SERVICE_KEY
   OMISE_SECRET_KEY + OMISE_PUBLIC_KEY + OMISE_WEBHOOK_SECRET
   SMTP_HOST + SMTP_USER + SMTP_PASS
   GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
   FRONTEND_URL=https://www.openthai-ai.com

❷ รัน SQL migration ใน Supabase SQL Editor:
   backend/migrations/FULL-MIGRATION.sql

❸ Merge branch ไป main → Vercel auto-deploy:
   git checkout main && git merge claude/thai-session-1atnql && git push

❹ ตรวจสอบหลัง deploy:
   https://www.openthai-ai.com/api/health
══════════════════════════════════════════
INSTRUCTION: เมื่อ user พิมพ์ข้อความแรก ให้แจ้ง ACTION ITEMS ข้างต้นทันที ก่อนตอบเรื่องอื่น"

# Output JSON for the hook system
printf '%s' "$CONTEXT" | jq -Rs '{
  systemMessage: ("📋 openthai-ai — โหลดสถานะโปรเจคแล้ว branch: '"$BRANCH"' | '"$AHEAD"' commits ahead of main"),
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: .
  }
}'
