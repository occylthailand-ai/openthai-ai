@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM sync-onedrive.bat — OpenThaiAi Auto-Sync สำหรับ OneDrive (Windows)
REM รันบน Windows: ดับเบิ้ลคลิก หรือ Task Scheduler
REM ─────────────────────────────────────────────────────────────────────────────

setlocal EnableDelayedExpansion

REM ── ตั้งค่า ─────────────────────────────────────────────────────────────────
set "REPO_DIR=%~dp0.."
set "ONEDRIVE_FOLDER=%USERPROFILE%\OneDrive\OpenThaiAi"
set "LOG_FILE=%~dp0sync.log"
set "TIMESTAMP=%date% %time%"

echo [%TIMESTAMP%] ═══════════════════════════════════════════ >> "%LOG_FILE%"
echo [%TIMESTAMP%] 🔷 OpenThaiAi OneDrive Sync (Windows) เริ่มต้น >> "%LOG_FILE%"
echo [%TIMESTAMP%] 📂 Repo: %REPO_DIR% >> "%LOG_FILE%"

REM ── ตรวจสอบ OneDrive folder ─────────────────────────────────────────────────
if not exist "%ONEDRIVE_FOLDER%" (
  mkdir "%ONEDRIVE_FOLDER%"
  echo [%TIMESTAMP%] 📁 สร้าง folder: %ONEDRIVE_FOLDER% >> "%LOG_FILE%"
)

REM ── วิธี 1: ใช้ rclone ──────────────────────────────────────────────────────
where rclone >nul 2>&1
if %errorlevel% == 0 (
  echo [%TIMESTAMP%] ✅ พบ rclone — กำลังซิ้งไปยัง OneDrive... >> "%LOG_FILE%"

  rclone sync "%REPO_DIR%" "onedrive:OpenThaiAi/code-backup" ^
    --exclude "node_modules/**" ^
    --exclude ".git/**" ^
    --exclude "**/.env" ^
    --exclude "**/dist/**" ^
    --log-file="%LOG_FILE%" ^
    --log-level INFO

  if %errorlevel% == 0 (
    echo [%TIMESTAMP%] ✅ rclone sync สำเร็จ >> "%LOG_FILE%"
  ) else (
    echo [%TIMESTAMP%] ❌ rclone sync ล้มเหลว >> "%LOG_FILE%"
  )
  goto :done
)

REM ── วิธี 2: robocopy ไปยัง OneDrive local folder ────────────────────────────
echo [%TIMESTAMP%] 📋 ใช้ robocopy → %ONEDRIVE_FOLDER% >> "%LOG_FILE%"

robocopy "%REPO_DIR%" "%ONEDRIVE_FOLDER%" /MIR /XD node_modules .git dist .next /XF .env sync.log /NFL /NDL /NJH /NJS >> "%LOG_FILE%" 2>&1

if %errorlevel% leq 7 (
  echo [%TIMESTAMP%] ✅ robocopy สำเร็จ → %ONEDRIVE_FOLDER% >> "%LOG_FILE%"
) else (
  echo [%TIMESTAMP%] ❌ robocopy ล้มเหลว (error: %errorlevel%) >> "%LOG_FILE%"
)

:done
echo [%TIMESTAMP%] 🎉 OneDrive Sync เสร็จสมบูรณ์ >> "%LOG_FILE%"
echo [%TIMESTAMP%] ═══════════════════════════════════════════ >> "%LOG_FILE%"

REM แสดง notification (Windows Toast)
powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('OpenThaiAi OneDrive Sync เสร็จแล้ว!', 'Auto-Sync', 'OK', 'Information')" 2>nul

echo ✅ OneDrive Sync เสร็จสมบูรณ์!
pause
