#!/usr/bin/env bash
# ════════════════════════════════════════════════════════
#  OpenThai AI × Claude — ONE-COMMAND LAUNCH
#  ใช้งาน: bash scripts/launch.sh
#  ทำทุกอย่างอัตโนมัติ: build → git → Railway deploy
# ════════════════════════════════════════════════════════
set -e

G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; N='\033[0m'
ok()   { echo -e "${G}✅ $1${N}"; }
info() { echo -e "${B}▶  $1${N}"; }
warn() { echo -e "${Y}⚠️  $1${N}"; }
die()  { echo -e "${R}❌ $1${N}"; exit 1; }
bar()  { echo -e "${Y}════════════════════════════════════════${N}"; }

clear
bar
echo -e "${Y}   ✦ OpenThai AI × Claude — AUTO LAUNCH 🚀${N}"
bar
echo ""

# ── Step 1: Check dependencies ──────────────────────────
info "ตรวจสอบ dependencies..."
command -v git  >/dev/null 2>&1 || die "ต้องติดตั้ง git"
command -v node >/dev/null 2>&1 || die "ต้องติดตั้ง node"
command -v npm  >/dev/null 2>&1 || die "ต้องติดตั้ง npm"
ok "git $(git --version | cut -d' ' -f3) · node $(node -v) · npm $(npm -v)"

# ── Step 2: Ask for 3 required values ───────────────────
bar
echo -e "${Y}  ต้องการข้อมูล 3 อย่าง (กรอกครั้งเดียว ไม่ต้องทำซ้ำ)${N}"
echo ""

read -p "  📧 ANTHROPIC_API_KEY (sk-ant-...): " ANT_KEY
[[ -z "$ANT_KEY" ]] && die "API Key จำเป็น"

read -p "  📧 Admin Email: " ADM_EMAIL
[[ -z "$ADM_EMAIL" ]] && die "Admin Email จำเป็น"

read -sp "  🔐 Admin Password: " ADM_PASS
echo ""
[[ -z "$ADM_PASS" ]] && die "Admin Password จำเป็น"

read -p "  🐙 GitHub username (occylthailand-ai): " GH_USER
GH_USER="${GH_USER:-occylthailand-ai}"

ok "รับข้อมูลครบ"

# ── Step 3: Build ────────────────────────────────────────
bar
info "Build production..."
npm install --silent
npm run build
ok "Build สำเร็จ!"

# ── Step 4: Write .env.production ───────────────────────
info "สร้าง .env.production..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
ADMIN_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")

cat > .env.production.local << ENVEOF
ANTHROPIC_API_KEY=${ANT_KEY}
ADMIN_EMAIL=${ADM_EMAIL}
ADMIN_PASSWORD=${ADM_PASS}
JWT_SECRET=${JWT_SECRET}
ADMIN_SECRET=${ADMIN_SECRET}
WEBHOOK_SECRET=${WEBHOOK_SECRET}
NEXT_PUBLIC_APP_URL=https://openthai-unified-production.up.railway.app
ENVEOF
ok ".env.production.local สร้างแล้ว (ไม่ commit)"

# ── Step 5: Git ──────────────────────────────────────────
bar
info "ตั้งค่า Git..."
git config user.email "$ADM_EMAIL" 2>/dev/null || true
git config user.name  "OpenThai AI" 2>/dev/null || true

REPO="https://github.com/${GH_USER}/openthai-unified.git"

if [ ! -d ".git" ]; then
  git init -q && git branch -M main
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REPO"
fi

git add --all
git diff-index --quiet HEAD 2>/dev/null || \
  git commit -q -m "feat: OpenThai AI × Claude LAUNCH 🚀 $(date '+%Y-%m-%d %H:%M')"

info "Push to GitHub: $REPO"
git push -u origin main --force
ok "GitHub push สำเร็จ!"

# ── Step 6: Railway ──────────────────────────────────────
bar
info "Railway CLI..."
if ! command -v railway >/dev/null 2>&1; then
  warn "ติดตั้ง Railway CLI..."
  npm install -g @railway/cli --silent
  ok "Railway CLI ติดตั้งแล้ว"
fi

info "Login Railway (browser จะเปิด)..."
railway login

info "เชื่อม project..."
if ! railway status >/dev/null 2>&1; then
  railway init --name openthai-unified
fi

# Set env vars on Railway
info "ตั้ง Environment Variables บน Railway..."
while IFS='=' read -r key val; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  railway variables set "${key}=${val}" 2>/dev/null && echo "   ✓ $key" || true
done < .env.production.local

info "Deploy to Railway..."
railway up --detach
ok "Railway deploy เริ่มแล้ว!"

# ── Step 7: Get domain ───────────────────────────────────
bar
info "สร้าง domain..."
DOMAIN=$(railway domain 2>/dev/null | grep -oE '[a-z0-9-]+\.up\.railway\.app' | head -1 || echo "")

if [[ -n "$DOMAIN" ]]; then
  railway variables set "NEXT_PUBLIC_APP_URL=https://${DOMAIN}" 2>/dev/null || true
  ok "Domain: https://${DOMAIN}"
else
  warn "ตั้ง domain ใน Railway Dashboard → Settings → Networking → Generate Domain"
fi

# ── Done ─────────────────────────────────────────────────
bar
echo -e "${G}"
echo "   🎉 OpenThai AI × Claude — LIVE!"
echo ""
[[ -n "$DOMAIN" ]] && echo "   🌐 https://${DOMAIN}"
echo "   🐙 https://github.com/${GH_USER}/openthai-unified"
echo "   🚂 https://railway.app/dashboard"
echo ""
echo "   หลัง deploy เสร็จ (2-3 นาที):"
echo "   /           → Landing Page"
echo "   /app         → Unified Platform"
echo "   /admin       → Admin Dashboard (ใช้ Email+Password ที่ตั้ง)"
echo "   /sitemap.xml → SEO Sitemap"
echo -e "${N}"
bar

# ── Post-launch reminders ────────────────────────────────
echo -e "${Y}  ขั้นตอนเพิ่มเติม (ทำทีหลังได้):${N}"
echo "  1. Google Sheets → deploy scripts/google-apps-script.js"
echo "  2. Import n8n workflows จาก n8n-workflows/"
echo "  3. ตั้ง LINE_NOTIFY_TOKEN ใน Railway Variables"
echo "  4. Submit sitemap: https://search.google.com/search-console"
bar
