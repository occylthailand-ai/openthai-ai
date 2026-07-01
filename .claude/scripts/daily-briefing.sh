#!/usr/bin/env bash
# SessionStart hook — openthai-ai daily briefing
# Outputs JSON with additionalContext injected into Claude's system prompt.
#
# This delegates to scripts/generate-project-status.mjs, which derives every
# fact (skills, routes, migrations, git log, live health) straight from the
# repo instead of a hand-maintained summary that silently goes stale. The
# same script also writes PROJECT_STATUS.md — the copy-paste "single source
# of truth" doc for keeping other AI assistants (Gemini, Grok, ...) aligned
# on the same real facts.

REPO="/home/user/openthai-ai"
cd "$REPO" 2>/dev/null || true

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

STATUS_MD=$(node scripts/generate-project-status.mjs 2>/dev/null)
if [ -z "$STATUS_MD" ]; then
  STATUS_MD="⚠️ generate-project-status.mjs failed to run — falling back to git state only.
Branch: $BRANCH"
fi

CONTEXT="$STATUS_MD

── ACTION ITEMS (static — cannot be verified from this sandbox) ──
❶ ตั้ง Environment Variables ใน Vercel Dashboard:
   JWT_SECRET, ADMIN_KEY, ADMIN_USERNAME, ADMIN_PASSWORD_PLAIN
   GEMINI_API_KEY (หรือ ANTHROPIC_API_KEY)
   SUPABASE_URL + SUPABASE_SERVICE_KEY
   OMISE_SECRET_KEY + OMISE_PUBLIC_KEY + OMISE_WEBHOOK_SECRET
   SMTP_HOST + SMTP_USER + SMTP_PASS
   GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
   FRONTEND_URL=https://www.openthai-ai.com

❷ ยืนยันว่ารัน migration files ล่าสุดใน Supabase SQL Editor แล้ว (ดูรายชื่อไฟล์ด้านบน)

❸ Skills ที่ยังต้องการ API Key แสดงในตาราง Skills registry ด้านบน (status: needs_key)

INSTRUCTION: สรุปสถานะสั้นๆ (อ้างอิงตัวเลขจริงด้านบน ไม่ใช่ความจำเดิม) และถามว่าวันนี้ต้องการทำอะไรต่อ"

# Output JSON for the hook system
printf '%s' "$CONTEXT" | jq -Rs '{
  systemMessage: ("📋 openthai-ai — โหลดสถานะจริงจาก repo แล้ว branch: '"$BRANCH"'"),
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: .
  }
}'
