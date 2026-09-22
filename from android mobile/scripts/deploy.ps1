# ════════════════════════════════════════════════════════
#  OpenThai AI × Claude — Deploy Script (Windows PowerShell)
#  ใช้งาน: Right-click → Run with PowerShell
#          หรือ: pwsh scripts/deploy.ps1
# ════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

function Write-Gold  { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Ok    { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info  { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warn  { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }

Write-Gold "════════════════════════════════════════"
Write-Gold "  ✦ OpenThai AI × Claude — Deploy v6"
Write-Gold "════════════════════════════════════════"

# ── 0. Preflight ────────────────────────────────────────
Write-Info "ตรวจสอบ dependencies..."
if (-not (Get-Command git  -ErrorAction SilentlyContinue)) { throw "ต้องติดตั้ง git ก่อน" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "ต้องติดตั้ง node ก่อน" }
if (-not (Get-Command npm  -ErrorAction SilentlyContinue)) { throw "ต้องติดตั้ง npm ก่อน" }
Write-Ok "git, node, npm พร้อม"

# ── 1. Build ────────────────────────────────────────────
Write-Info "ติดตั้ง dependencies..."
npm install --silent
Write-Ok "npm install เสร็จ"

Write-Info "Build production..."
npm run build
Write-Ok "Build ผ่าน!"

# ── 2. Git ──────────────────────────────────────────────
Write-Gold "════════════════════════════════════════"
$REPO_URL = "https://github.com/occylthailand-ai/openthai-unified.git"

if (-not (Test-Path ".git")) {
  git init; git branch -M main
  Write-Ok "Git init เสร็จ"
}

$remotes = git remote 2>$null
if ($remotes -notcontains "origin") {
  git remote add origin $REPO_URL
  Write-Ok "เพิ่ม remote"
}

git add .
git commit -m "feat: OpenThai AI x Claude Unified v6 - Auth + SEO + Notifications" --allow-empty
Write-Info "กำลัง push ไป GitHub..."
git push -u origin main --force
Write-Ok "Push to GitHub สำเร็จ!"

# ── 3. Railway ──────────────────────────────────────────
Write-Gold "════════════════════════════════════════"
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
  Write-Warn "ติดตั้ง Railway CLI..."
  npm install -g @railway/cli
}

Write-Info "Login Railway..."
railway login

Write-Info "Deploy..."
railway up --detach
Write-Ok "Railway deploy เริ่มต้น!"

# ── 4. Summary ──────────────────────────────────────────
Write-Gold "════════════════════════════════════════"
Write-Host ""
Write-Host "  🎉 Deploy สำเร็จ!" -ForegroundColor Green
Write-Host ""
Write-Host "  ENV Variables ที่ต้องตั้งใน Railway:" -ForegroundColor Yellow
Write-Host "  ANTHROPIC_API_KEY, JWT_SECRET, ADMIN_EMAIL"
Write-Host "  ADMIN_PASSWORD, ADMIN_SECRET"
Write-Host "  LINE_NOTIFY_TOKEN, RESEND_API_KEY"
Write-Host "  GOOGLE_APPS_SCRIPT_URL, NEXT_PUBLIC_APP_URL"
Write-Host ""
Write-Gold "════════════════════════════════════════"
