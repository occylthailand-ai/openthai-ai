# ════════════════════════════════════════════════════════
#  OpenThai AI × Claude — ONE-COMMAND LAUNCH (Windows)
#  ใช้งาน: pwsh scripts/launch.ps1
# ════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

function ok   { Write-Host "✅ $args" -ForegroundColor Green }
function info { Write-Host "▶  $args" -ForegroundColor Cyan }
function warn { Write-Host "⚠️  $args" -ForegroundColor Yellow }

Clear-Host
Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "   ✦ OpenThai AI × Claude — AUTO LAUNCH 🚀" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# ── Step 1: Dependencies ────────────────────────────────
info "ตรวจสอบ dependencies..."
if (-not (Get-Command git  -EA SilentlyContinue)) { throw "ติดตั้ง git ก่อน" }
if (-not (Get-Command node -EA SilentlyContinue)) { throw "ติดตั้ง node ก่อน" }
if (-not (Get-Command npm  -EA SilentlyContinue)) { throw "ติดตั้ง npm ก่อน" }
ok "git, node, npm พร้อม"

# ── Step 2: Input 3 values ──────────────────────────────
Write-Host ""
Write-Host "  ต้องการข้อมูล 3 อย่าง:" -ForegroundColor Yellow
Write-Host ""

$ANT_KEY   = Read-Host "  📧 ANTHROPIC_API_KEY (sk-ant-...)"
$ADM_EMAIL = Read-Host "  📧 Admin Email"
$ADM_PASS  = Read-Host "  🔐 Admin Password" -AsSecureString
$ADM_PASS  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
               [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ADM_PASS))
$GH_USER   = Read-Host "  🐙 GitHub username (ว่างไว้ = occylthailand-ai)"
if (-not $GH_USER) { $GH_USER = "occylthailand-ai" }
ok "รับข้อมูลครบ"

# ── Step 3: Build ────────────────────────────────────────
Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
info "ติดตั้ง dependencies และ build..."
npm install --silent
npm run build
ok "Build สำเร็จ!"

# ── Step 4: Write env ────────────────────────────────────
info "สร้าง .env.production.local..."
$JWT      = node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))"
$ADMSCRT  = node -e "process.stdout.write(require('crypto').randomBytes(24).toString('hex'))"
$WHSECRET = node -e "process.stdout.write(require('crypto').randomBytes(24).toString('hex'))"

$envContent = @"
ANTHROPIC_API_KEY=$ANT_KEY
ADMIN_EMAIL=$ADM_EMAIL
ADMIN_PASSWORD=$ADM_PASS
JWT_SECRET=$JWT
ADMIN_SECRET=$ADMSCRT
WEBHOOK_SECRET=$WHSECRET
NEXT_PUBLIC_APP_URL=https://openthai-unified-production.up.railway.app
"@
$envContent | Out-File ".env.production.local" -Encoding utf8
ok ".env.production.local สร้างแล้ว"

# ── Step 5: Git ──────────────────────────────────────────
Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
info "ตั้งค่า Git..."
$REPO = "https://github.com/$GH_USER/openthai-unified.git"

if (-not (Test-Path ".git")) {
  git init -q; git branch -M main
}

$remotes = git remote 2>$null
if ($remotes -notcontains "origin") {
  git remote add origin $REPO
}

git add --all
$status = git status --porcelain
if ($status) {
  git commit -q -m "feat: OpenThai AI x Claude LAUNCH $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

info "Push to GitHub..."
git push -u origin main --force
ok "GitHub push สำเร็จ!"

# ── Step 6: Railway ──────────────────────────────────────
Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
if (-not (Get-Command railway -EA SilentlyContinue)) {
  info "ติดตั้ง Railway CLI..."
  npm install -g @railway/cli --silent
}

info "Login Railway (browser จะเปิด)..."
railway login

info "เชื่อม project..."
try { railway status *>$null }
catch { railway init --name openthai-unified }

info "ตั้ง Environment Variables..."
Get-Content ".env.production.local" | ForEach-Object {
  if ($_ -match "^([^#][^=]+)=(.+)$") {
    $k = $matches[1]; $v = $matches[2]
    railway variables set "$k=$v" *>$null
    Write-Host "   ✓ $k" -ForegroundColor Green
  }
}

info "Deploy to Railway..."
railway up --detach
ok "Railway deploy เริ่มแล้ว!"

# ── Done ─────────────────────────────────────────────────
Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "   🎉 OpenThai AI × Claude — LIVE!" -ForegroundColor Green
Write-Host ""
Write-Host "   🐙 https://github.com/$GH_USER/openthai-unified"
Write-Host "   🚂 https://railway.app/dashboard"
Write-Host ""
Write-Host "   Routes หลัง deploy (2-3 นาที):" -ForegroundColor Yellow
Write-Host "   /app    → Unified Platform"
Write-Host "   /admin  → Admin Dashboard"
Write-Host "   /login  → Login"
Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
