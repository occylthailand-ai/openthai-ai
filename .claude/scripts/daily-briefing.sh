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

── สถานะโปรเจค ────────────────────────────
✅ Frontend : React + Vite — ธีมสีขาว/ขาว
✅ Backend  : Express ES Modules — Vercel Serverless
✅ AI Router: Claude (Anthropic) → Gemini → Mock fallback
✅ Auth     : JWT — login/dashboard ป้องกันแล้ว
✅ Payment  : Omise PromptPay + Card
✅ DB       : Supabase PostgreSQL

── 16-Skills AI Framework (S1–S16) ─────────
S1  RCCF Prompt       ✅ /api/generate
S2  Taste Check       ✅ /api/generate
S3  Master Prompt     ✅ /api/generate
S4  Image Analysis    ✅ /api/analyze-image
S5  TTS Voice         ⚠️  ต้องการ ELEVENLABS_API_KEY
S6  AI Critic         ✅ /api/critic
S7  Context Card      ✅ /api/context-card
S8  LINE OA Connect   ⚠️  ต้องการ LINE_CHANNEL_TOKEN
S9  Learning Layer    ⚠️  partial
S10 Trend Analyzer    ✅ /api/skills/trend
S11 Hashtag Generator ✅ /api/skills/hashtag
S12 SEO Thai          ✅ /api/skills/seo
S13 Sentiment Scanner ✅ /api/skills/sentiment
S14 Video Script      ✅ /api/skills/video-script
S15 Multi-Language    ✅ /api/skills/translate
S16 Prompt Builder    ✅ /api/skills/prompt-builder
    (Zero-shot · Few-shot · CoT · ToT · Role · Instruction)

── Route Map ───────────────────────────────
/              LandingPage    (public)
/login         LoginPage      (public)
/dashboard     DashboardPage  (auth)
/ai-generator  AIGeneratorPage (auth)
/ai-tools      AIToolsHub     (auth)
/skills        AISkillsPage   (auth) ← S10–S16
/agent         AgentPage      (auth)
/voice         VoiceCommandPage (public)
/video         VideoGeneratorPage (auth)
/corporate/*   Corporate suite (auth)
/portals/*     Portal Hub     (public)
/payment       PaymentPage    (public)

── ACTION ITEMS ────────────────────────────
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

❸ Skills ที่ยังต้องการ API Key:
   S5 TTS   → ELEVENLABS_API_KEY
   S8 LINE  → LINE_CHANNEL_TOKEN

❹ ตรวจสอบ deploy:
   https://www.openthai-ai.com/api/health

── งานที่ทำไปแล้ว (session ล่าสุด) ─────────
✅ เพิ่ม S10-S15 AI Skills Hub (Trend/Hashtag/SEO/Sentiment/Video/Translate)
✅ เพิ่ม S16 Prompt Builder (Zero-shot/Few-shot/CoT/ToT/Role/Instruction)
✅ ธีมสีขาวทั้งระบบ
✅ branch claude/thai-session-1atnql merge เข้า main แล้ว

── งานที่รอดำเนินการ ─────────────────────
⏳ S17 Cultural Wisdom — ปรัชญาจีน/ไทย/พุทธ
   (ข้อมูล: 八德 忠孝仁爱礼义廉耻, 四书五经, พระไตรปิฎก)
══════════════════════════════════════════
INSTRUCTION: สรุปสถานะสั้นๆ และถามว่าวันนี้ต้องการทำอะไรต่อ"

# Output JSON for the hook system
printf '%s' "$CONTEXT" | jq -Rs '{
  systemMessage: ("📋 openthai-ai — โหลดสถานะโปรเจคแล้ว branch: '"$BRANCH"' | 16 Skills Active"),
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: .
  }
}'
