#!/usr/bin/env bash
# ════════════════════════════════════════════════════════
#  OpenThai AI × Claude — Deploy Script
#  ใช้งาน: bash scripts/deploy.sh
#  ต้องการ: git, node, npm (Railway CLI จะ install ให้)
# ════════════════════════════════════════════════════════

set -e  # Exit on any error

# ── Colors ──────────────────────────────────────────────
GREEN='\033[0;32m'; GOLD='\033[0;33m'
BLUE='\033[0;34m';  RED='\033[0;31m'; NC='\033[0m'

info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn()    { echo -e "${GOLD}⚠️  $1${NC}"; }
error()   { echo -e "${RED}❌ $1${NC}"; exit 1; }
divider() { echo -e "${GOLD}════════════════════════════════════════${NC}"; }

divider
echo -e "${GOLD}  ✦ OpenThai AI × Claude — Deploy v6${NC}"
divider

# ── 0. Preflight checks ──────────────────────────────────
info "ตรวจสอบ dependencies..."
command -v git  >/dev/null 2>&1 || error "ต้องติดตั้ง git ก่อน"
command -v node >/dev/null 2>&1 || error "ต้องติดตั้ง node ก่อน"
command -v npm  >/dev/null 2>&1 || error "ต้องติดตั้ง npm ก่อน"
success "git, node, npm พร้อม"

# ── 1. Install deps & build ──────────────────────────────
info "ติดตั้ง dependencies..."
npm install --silent
success "npm install เสร็จ"

info "Build production..."
npm run build
success "Build ผ่าน!"

# ── 2. Git setup ─────────────────────────────────────────
divider
info "ตั้งค่า Git..."

REPO_URL="https://github.com/occylthailand-ai/openthai-unified.git"

if [ ! -d ".git" ]; then
  git init
  git branch -M main
  success "Git init เสร็จ"
else
  success "Git repo มีอยู่แล้ว"
fi

# Add remote if not exists
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REPO_URL"
  success "เพิ่ม remote: $REPO_URL"
fi

git add .
git commit -m "feat: OpenThai AI × Claude Unified v6 — Auth + Rate Limit + SEO + Notifications" \
  --allow-empty

info "กำลัง push ไป GitHub..."
git push -u origin main --force
success "Push to GitHub สำเร็จ! 🎉"

# ── 3. Railway deploy ────────────────────────────────────
divider
info "ตรวจสอบ Railway CLI..."

if ! command -v railway >/dev/null 2>&1; then
  warn "Railway CLI ยังไม่ได้ติดตั้ง — กำลังติดตั้ง..."
  npm install -g @railway/cli
  success "Railway CLI ติดตั้งเสร็จ"
fi

info "Login Railway (จะเปิด browser)..."
railway login

info "เชื่อม project กับ Railway..."
# ถ้ายังไม่มี project → สร้างใหม่
if ! railway status >/dev/null 2>&1; then
  info "สร้าง Railway project ใหม่..."
  railway init --name openthai-unified
fi

info "Deploy to Railway..."
railway up --detach
success "Deploy เริ่มต้นแล้ว! Railway กำลัง build..."

# ── 4. Set environment variables ─────────────────────────
divider
info "ตั้งค่า Environment Variables..."
warn "ต้องใส่ค่าเหล่านี้ใน Railway Dashboard → Variables:"
echo ""
echo -e "${GOLD}  ANTHROPIC_API_KEY${NC}   = sk-ant-api03-xxxxx"
echo -e "${GOLD}  JWT_SECRET${NC}          = (random 64 chars)"
echo -e "${GOLD}  ADMIN_EMAIL${NC}         = your@email.com"
echo -e "${GOLD}  ADMIN_PASSWORD${NC}      = your_strong_password"
echo -e "${GOLD}  ADMIN_SECRET${NC}        = your_admin_dashboard_secret"
echo -e "${GOLD}  LINE_NOTIFY_TOKEN${NC}   = (จาก notify-bot.line.me)"
echo -e "${GOLD}  RESEND_API_KEY${NC}      = re_xxxx (จาก resend.com)"
echo -e "${GOLD}  GOOGLE_APPS_SCRIPT_URL${NC} = (จาก script.google.com)"
echo -e "${GOLD}  NEXT_PUBLIC_APP_URL${NC} = https://your-app.railway.app"
echo ""

# ── 5. Generate domain ───────────────────────────────────
info "สร้าง Railway domain..."
railway domain 2>/dev/null || warn "ตั้งค่า domain ใน Railway Dashboard → Settings → Networking"

# ── 6. Summary ───────────────────────────────────────────
divider
echo -e "${GREEN}"
echo "  🎉 Deploy สำเร็จ!"
echo ""
echo "  📦 GitHub   : $REPO_URL"
echo "  🚀 Railway  : https://railway.app/dashboard"
echo ""
echo "  🌐 Routes:"
echo "     /           → Landing Page"
echo "     /app         → Unified Platform"
echo "     /admin       → Admin Dashboard"
echo "     /login       → Login"
echo "     /sitemap.xml → SEO Sitemap"
echo "     /robots.txt  → Robots"
echo -e "${NC}"
divider
echo -e "${GOLD}  ขั้นตอนหลัง deploy:${NC}"
echo "  1. ตั้งค่า ENV Variables ใน Railway Dashboard"
echo "  2. Deploy Google Apps Script (scripts/google-apps-script.js)"
echo "  3. Import n8n workflows (n8n-workflows/*.json)"
echo "  4. ทดสอบ LINE Notify ที่ /admin → Notification Test"
echo "  5. Submit sitemap ที่ Google Search Console"
divider
