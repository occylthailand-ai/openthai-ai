@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM install-task.bat — ติดตั้ง Windows Task Scheduler สำหรับ Auto-Sync
REM รัน: ดับเบิ้ลคลิก (ต้องใช้สิทธิ์ Administrator)
REM ─────────────────────────────────────────────────────────────────────────────

echo ═══════════════════════════════════════════
echo ⏰  ติดตั้ง OpenThaiAi Auto-Sync Task
echo ═══════════════════════════════════════════

REM ตรวจสอบสิทธิ์ Admin
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ ต้องการสิทธิ์ Administrator
  echo    คลิกขวา → "Run as administrator"
  pause
  exit /b 1
)

set "SCRIPT_DIR=%~dp0"
set "SYNC_SCRIPT=%SCRIPT_DIR%sync-onedrive.bat"
set "TASK_NAME=OpenThaiAi_AutoSync"
set "LOG_FILE=%SCRIPT_DIR%sync.log"

REM ลบ task เดิมถ้ามี
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

REM สร้าง task ใหม่ — รันทุก 6 ชั่วโมง
schtasks /create /tn "%TASK_NAME%" ^
  /tr "cmd /c \"%SYNC_SCRIPT%\" >> \"%LOG_FILE%\" 2>&1" ^
  /sc HOURLY /mo 6 ^
  /rl HIGHEST ^
  /f

if %errorlevel% == 0 (
  echo ✅ Task "%TASK_NAME%" ติดตั้งแล้ว
  echo    รันทุก 6 ชั่วโมงอัตโนมัติ
) else (
  echo ❌ ติดตั้ง Task ล้มเหลว
  goto :end
)

echo.
echo 📋 ดู Tasks ทั้งหมด:
echo    schtasks /query /tn %TASK_NAME%
echo.
echo 🧪 ทดสอบทันที:
echo    schtasks /run /tn %TASK_NAME%
echo.
echo 🗑️  ลบ Task:
echo    schtasks /delete /tn %TASK_NAME% /f
echo.

REM รันทันทีเพื่อทดสอบ
choice /c YN /m "รัน sync ทันทีตอนนี้เลยไหม"
if %errorlevel% == 1 (
  call "%SYNC_SCRIPT%"
)

:end
echo ═══════════════════════════════════════════
echo 🎉 ติดตั้ง Auto-Sync สำเร็จ
pause
