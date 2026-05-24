#Requires -Version 5.1
<#
.SYNOPSIS
    OpenThai AI - Mobile + 3-Way Sync (Local / OneDrive / GitHub)
.DESCRIPTION
    1. Git commit any local changes
    2. Push to GitHub
    3. Mirror to OneDrive via Robocopy
#>

$Host.UI.RawUI.WindowTitle = "OpenThai AI - Mobile + 3-Way Sync"

$RepoDir    = $PSScriptRoot
$OneDriveDir = "$env:USERPROFILE\OneDrive\openthai-ai"
$LogFile    = Join-Path $RepoDir "sync.log"
$Timestamp  = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Write-Step($n, $total, $msg) {
    Write-Host ""
    Write-Host "[$n/$total] $msg" -ForegroundColor Cyan
}

function Write-Ok($msg)   { Write-Host "  [OK]   $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "  [SKIP] $msg" -ForegroundColor Yellow }
function Write-Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  [ERR]  $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host "  OpenThai AI -- Mobile + 3-Way Sync" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host "  Repo    : $RepoDir"
Write-Host "  OneDrive: $OneDriveDir"
Write-Host "  GitHub  : https://github.com/occylthailand-ai/openthai-ai"
Write-Host "  Time    : $Timestamp"
Write-Host "============================================================" -ForegroundColor DarkCyan

Set-Location $RepoDir

# === [1/4] Verify git repo ===
Write-Step 1 4 "Checking git repository..."
$gitCheck = git rev-parse --is-inside-work-tree 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Err "Not a git repository: $RepoDir"
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Ok "Git repo confirmed."

# === [2/4] Local commit ===
Write-Step 2 4 "Local Commit..."
git add -A 2>&1 | Out-Null
$diff = git diff --cached --name-only
if ($diff) {
    $commitMsg = "sync: auto-save $Timestamp"
    git commit -m $commitMsg 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Committed: $commitMsg"
        $diff | ForEach-Object { Write-Host "    + $_" -ForegroundColor DarkGray }
    } else {
        Write-Warn "Commit failed — check git config (user.email / user.name)."
    }
} else {
    Write-Skip "No changes to commit."
}

# === [3/4] GitHub Push ===
Write-Step 3 4 "GitHub Push..."
$pushOut = git push origin HEAD 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Ok "Pushed to GitHub successfully."
} else {
    Write-Warn "Push failed. Output:"
    $pushOut | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkYellow }
    Write-Warn "Check SSH key / PAT token and remote URL."
}

# === [4/4] OneDrive Copy ===
Write-Step 4 4 "OneDrive Sync..."
$oneDriveOk = $true
if (-not (Test-Path $OneDriveDir)) {
    try {
        New-Item -ItemType Directory -Path $OneDriveDir -Force | Out-Null
        Write-Ok "Created OneDrive folder: $OneDriveDir"
    } catch {
        Write-Warn "Cannot create OneDrive folder: $OneDriveDir"
        Write-Warn "Skipping OneDrive sync."
        $oneDriveOk = $false
    }
}

if ($oneDriveOk) {
    $roboArgs = @($RepoDir, $OneDriveDir, "/MIR", "/XD", ".git", "node_modules", "/XF", "*.log", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np")
    robocopy @roboArgs | Out-Null
    $rc = $LASTEXITCODE
    if ($rc -lt 8) {
        Write-Ok "OneDrive copy complete (robocopy code: $rc)."
    } else {
        Write-Warn "OneDrive copy had errors (robocopy code: $rc)."
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host "  Sync complete: $Timestamp" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host ""

# Append to log
"$Timestamp - Sync complete" | Add-Content -Path $LogFile

Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
