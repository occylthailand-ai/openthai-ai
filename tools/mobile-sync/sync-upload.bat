@echo off
chcp 65001 >nul
title OpenThai AI — อัปโหลดไฟล์จาก PC สู่โทรศัพท์

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   OpenThai AI — Sync: PC → โทรศัพท์               ║
echo ╚══════════════════════════════════════════════════════╝
echo.

where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ ADB กรุณารัน check-device.bat ก่อน
    pause
    exit /b 1
)

echo เลือกโฟลเดอร์ปลายทางบนโทรศัพท์:
echo   [1] รูปภาพ (/sdcard/Pictures/FromPC)
echo   [2] วิดีโอ (/sdcard/Movies/FromPC)
echo   [3] เอกสาร (/sdcard/Documents/FromPC)
echo   [4] Downloads (/sdcard/Download)
echo   [5] กำหนดเอง
echo.
set /p dest_choice=เลือก (1-5):

if "%dest_choice%"=="1" set PHONE_DEST=/sdcard/Pictures/FromPC
if "%dest_choice%"=="2" set PHONE_DEST=/sdcard/Movies/FromPC
if "%dest_choice%"=="3" set PHONE_DEST=/sdcard/Documents/FromPC
if "%dest_choice%"=="4" set PHONE_DEST=/sdcard/Download
if "%dest_choice%"=="5" (
    set /p PHONE_DEST=พิมพ์ path บนโทรศัพท์:
)

echo.
set /p SRC=พิมพ์ path ไฟล์หรือโฟลเดอร์บน PC ที่ต้องการส่ง:
echo.

if not exist "%SRC%" (
    echo [ERROR] ไม่พบไฟล์หรือโฟลเดอร์: %SRC%
    pause
    exit /b 1
)

echo กำลังสร้างโฟลเดอร์บนโทรศัพท์...
adb shell mkdir -p "%PHONE_DEST%" 2>nul

echo กำลัง upload: %SRC% → %PHONE_DEST%
adb push "%SRC%" "%PHONE_DEST%"

echo.
echo ✅ Upload เสร็จสิ้น!
echo ไฟล์อยู่ที่ (โทรศัพท์): %PHONE_DEST%
echo.
pause
