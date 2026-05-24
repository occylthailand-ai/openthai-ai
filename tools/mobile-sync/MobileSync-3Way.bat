@echo off
chcp 65001 >nul
title OpenThai AI — Mobile + 3-Way Sync

:: ══════════════════════════════════════════════════════════
::  ตั้งค่า paths (แก้ให้ตรงกับเครื่องของท่าน)
:: ══════════════════════════════════════════════════════════
set LOCAL_DIR=C:\OPENTHAI AI\docs
set ONEDRIVE_DIR=C:\Users\%USERNAME%\OneDrive\OPENTHAI AI\docs
set GITHUB_DIR=C:\OPENTHAI AI
set LOG_FILE=%LOCAL_DIR%\sync-log.txt
set DATE_TAG=%DATE:~0,4%-%DATE:~5,2%-%DATE:~8,2%
set TIME_TAG=%TIME:~0,2%:%TIME:~3,2%

:: ══════════════════════════════════════════════════════════
::  โฟลเดอร์รับไฟล์จากโทรศัพท์
:: ══════════════════════════════════════════════════════════
set PHONE_DEST=%LOCAL_DIR%\PhoneSync\%DATE_TAG%

cls
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║        OpenThai AI — Mobile + 3-Way Sync                ║
echo  ║   Phone → PC → OneDrive → GitHub → Log                  ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: สร้างโฟลเดอร์ที่จำเป็น
if not exist "%LOCAL_DIR%"   mkdir "%LOCAL_DIR%"
if not exist "%ONEDRIVE_DIR%" mkdir "%ONEDRIVE_DIR%"
if not exist "%PHONE_DEST%"  mkdir "%PHONE_DEST%"

:: ══════════════════════════════════════════════════════════
::  [0/4] ตรวจสอบโทรศัพท์
:: ══════════════════════════════════════════════════════════
echo [0/4] ตรวจสอบโทรศัพท์ Android...
where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo       [SKIP] ไม่พบ ADB — ข้ามขั้นตอน Mobile Sync
    echo              (ติดตั้ง ADB แล้วรันใหม่ หรือกด Enter เพื่อดำเนินการต่อ)
    set ADB_OK=0
    goto STEP1
)

for /f "skip=1 tokens=1" %%d in ('adb devices 2^>nul') do (
    if not "%%d"=="" set DEVICE_ID=%%d
)

if "%DEVICE_ID%"=="" (
    echo       [SKIP] ไม่พบโทรศัพท์ที่เชื่อมต่อ — ข้ามขั้นตอน Mobile Sync
    echo              (เสียบ USB + เปิด USB Debugging แล้วรันใหม่)
    set ADB_OK=0
    goto STEP1
)

echo       OK → พบอุปกรณ์: %DEVICE_ID%
set ADB_OK=1

:: ══════════════════════════════════════════════════════════
::  [1/4] Mobile Sync: โทรศัพท์ → PC
:: ══════════════════════════════════════════════════════════
:STEP1
echo.
echo [1/4] Mobile Sync: โทรศัพท์ → PC...

if "%ADB_OK%"=="0" (
    echo       [SKIP] ไม่มีโทรศัพท์เชื่อมต่อ
    goto STEP2
)

echo       ดึงไฟล์จาก /sdcard/DCIM ...
adb pull /sdcard/DCIM "%PHONE_DEST%\DCIM" >nul 2>&1
if %errorlevel%==0 (
    echo       OK → รูปภาพ DCIM → %PHONE_DEST%\DCIM
) else (
    echo       [WARN] DCIM ดึงไม่ได้ หรือโฟลเดอร์ว่าง
)

echo       ดึงไฟล์จาก /sdcard/Download ...
adb pull /sdcard/Download "%PHONE_DEST%\Download" >nul 2>&1
if %errorlevel%==0 (
    echo       OK → Downloads → %PHONE_DEST%\Download
) else (
    echo       [WARN] Download ดึงไม่ได้
)

echo       ดึงไฟล์จาก /sdcard/Documents ...
adb pull /sdcard/Documents "%PHONE_DEST%\Documents" >nul 2>&1
if %errorlevel%==0 (
    echo       OK → Documents → %PHONE_DEST%\Documents
)

echo       OK → Phone Sync เสร็จ → %PHONE_DEST%
set MOBILE_STATUS=OK

:: ══════════════════════════════════════════════════════════
::  [2/4] OneDrive Sync: PC → OneDrive
:: ══════════════════════════════════════════════════════════
:STEP2
echo.
echo [2/4] OneDrive Sync...

if not exist "%LOCAL_DIR%" (
    echo       [SKIP] ไม่พบ LOCAL_DIR: %LOCAL_DIR%
    set ONEDRIVE_STATUS=SKIP
    goto STEP3
)

robocopy "%LOCAL_DIR%" "%ONEDRIVE_DIR%" /MIR /NFL /NDL /NJH /NJS /nc /ns /np >nul 2>&1
if %errorlevel% leq 7 (
    echo       OK → %LOCAL_DIR%
    echo            → %ONEDRIVE_DIR%
    set ONEDRIVE_STATUS=OK
) else (
    echo       [ERROR] OneDrive sync ล้มเหลว (errorlevel=%errorlevel%^)
    set ONEDRIVE_STATUS=ERROR
)

:: ══════════════════════════════════════════════════════════
::  [3/4] GitHub Push
:: ══════════════════════════════════════════════════════════
:STEP3
echo.
echo [3/4] GitHub Push...

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo       [SKIP] ไม่พบ Git ในระบบ
    set GIT_STATUS=SKIP
    goto STEP4
)

if not exist "%GITHUB_DIR%\.git" (
    echo       [SKIP] ไม่พบ Git repository ที่: %GITHUB_DIR%
    set GIT_STATUS=SKIP
    goto STEP4
)

cd /d "%GITHUB_DIR%"
git add -A >nul 2>&1

:: ตรวจว่ามีการเปลี่ยนแปลง
git diff --cached --quiet >nul 2>&1
if %errorlevel%==0 (
    echo       [SKIP] ไม่มีการเปลี่ยนแปลงใหม่
    set GIT_STATUS=NO_CHANGE
    goto STEP4
)

git commit -m "sync: auto-save %DATE_TAG% %TIME_TAG%" >nul 2>&1
git push >nul 2>&1
if %errorlevel%==0 (
    for /f %%r in ('git log --oneline -1 2^>nul') do set LAST_COMMIT=%%r
    echo       OK → github.com/occylthailand-ai/openthai-ai
    echo            Commit: %LAST_COMMIT%
    set GIT_STATUS=OK
) else (
    echo       [ERROR] Push ล้มเหลว — ตรวจ internet/credentials
    set GIT_STATUS=ERROR
)

:: ══════════════════════════════════════════════════════════
::  [4/4] Logging
:: ══════════════════════════════════════════════════════════
:STEP4
echo.
echo [4/4] Logging...

(
    echo [%DATE_TAG% %TIME_TAG%] === OpenThai AI Mobile + 3-Way Sync ===
    echo   Mobile  : %MOBILE_STATUS%  (Device: %DEVICE_ID%)
    echo   OneDrive: %ONEDRIVE_STATUS%
    echo   GitHub  : %GIT_STATUS%
    echo   PhoneDest: %PHONE_DEST%
    echo   ─────────────────────────────────────────────────
) >> "%LOG_FILE%" 2>nul

echo       OK → %LOG_FILE%

:: ══════════════════════════════════════════════════════════
::  สรุปผล
:: ══════════════════════════════════════════════════════════
echo.
echo  === SYNC COMPLETE ===
echo.
echo  Mobile  : โทรศัพท์ → %PHONE_DEST%
echo  Local   : %LOCAL_DIR%
echo  OneDrive: %ONEDRIVE_DIR%
echo  GitHub  : github.com/occylthailand-ai/openthai-ai
echo  Log     : %LOG_FILE%
echo.
echo  Press any key to close...
pause >nul
