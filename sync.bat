@echo off
chcp 65001 >nul
title OpenThai AI -- Mobile + 3-Way Sync

echo ============================================================
echo   OpenThai AI -- Mobile + 3-Way Sync
echo ============================================================
echo.

REM --- Config ---
set REPO_DIR=%~dp0
set ONEDRIVE_DIR=%USERPROFILE%\OneDrive\openthai-ai
set LOG_FILE=%REPO_DIR%sync.log
set TIMESTAMP=%DATE% %TIME%

echo [INFO] Repo   : %REPO_DIR%
echo [INFO] OneDrive: %ONEDRIVE_DIR%
echo [INFO] Log    : %LOG_FILE%
echo.

REM === [1/4] Git status check ===
echo [1/4] Checking git status...
cd /d "%REPO_DIR%"
git status --short >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not a git repository: %REPO_DIR%
    goto :done
)

REM === [2/4] Local git commit ===
echo [2/4] Local Commit...
git add -A
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "sync: auto-save %TIMESTAMP%"
    echo [OK] Local commit done.
) else (
    echo [SKIP] Nothing new to commit locally.
)
echo.

REM === [3/4] GitHub Push ===
echo [3/4] GitHub Push...
git push origin HEAD 2>&1
if errorlevel 1 (
    echo [WARN] GitHub push failed. Check remote/auth.
) else (
    echo [OK] Pushed to GitHub.
)
echo.

REM === [4/4] OneDrive Copy ===
echo [4/4] OneDrive Sync...
if not exist "%ONEDRIVE_DIR%" (
    mkdir "%ONEDRIVE_DIR%" 2>nul
    if errorlevel 1 (
        echo [WARN] Cannot create OneDrive folder: %ONEDRIVE_DIR%
        goto :log
    )
)

robocopy "%REPO_DIR%" "%ONEDRIVE_DIR%" /MIR /XD ".git" "node_modules" /XF "*.log" /NFL /NDL /NJH /NJS /nc /ns /np >nul 2>&1
if errorlevel 8 (
    echo [WARN] OneDrive copy had errors (robocopy code: %ERRORLEVEL%).
) else (
    echo [OK] OneDrive copy done.
)
echo.

:log
REM === Summary ===
echo ============================================================
echo   Sync Summary -- %TIMESTAMP%
echo ============================================================
echo   Local   : %REPO_DIR%
echo   OneDrive: %ONEDRIVE_DIR%
echo   GitHub  : https://github.com/occylthailand-ai/openthai-ai
echo ============================================================
echo.

REM Append to log
echo %TIMESTAMP% - Sync complete >> "%LOG_FILE%"

:done
echo.
echo Press any key to close...
pause >nul
