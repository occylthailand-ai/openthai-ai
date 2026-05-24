$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenThai AI — Git Sync" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check git is available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] git is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Show current branch
$branch = git rev-parse --abbrev-ref HEAD 2>&1
Write-Host "[INFO] Branch: $branch" -ForegroundColor Yellow

# Pull latest changes
Write-Host "[INFO] Pulling latest changes..." -ForegroundColor Yellow
git pull origin $branch

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] git pull failed. Resolve conflicts then re-run." -ForegroundColor Red
    exit 1
}

# Stage all changes
$status = git status --porcelain
if (-not $status) {
    Write-Host "[INFO] Nothing to commit — working tree clean." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Changed files:" -ForegroundColor Yellow
git status --short

Write-Host ""
$msg = Read-Host "Commit message (leave blank to skip push)"
if ([string]::IsNullOrWhiteSpace($msg)) {
    Write-Host "[INFO] Skipped commit." -ForegroundColor Yellow
    exit 0
}

git add -A
git commit -m $msg

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] git commit failed." -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Pushing to origin/$branch..." -ForegroundColor Yellow
git push origin $branch

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Sync complete." -ForegroundColor Green
} else {
    Write-Host "[ERROR] git push failed." -ForegroundColor Red
    exit 1
}
