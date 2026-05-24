@echo off
chcp 65001 >nul
title OpenThai AI — ตรวจสอบอุปกรณ์ Android

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║     OpenThai AI — Mobile Sync Tool                  ║
echo ║     ตรวจสอบการเชื่อมต่อโทรศัพท์ Android            ║
echo ╚══════════════════════════════════════════════════════╝
echo.

:: ตรวจว่า adb มีในระบบหรือไม่
where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ ADB ในระบบ
    echo.
    echo วิธีติดตั้ง ADB:
    echo   1. ดาวน์โหลด Platform Tools จาก:
    echo      https://developer.android.com/studio/releases/platform-tools
    echo   2. แตกไฟล์ไปที่ C:\adb\
    echo   3. เพิ่ม C:\adb\ เข้า PATH ใน Environment Variables
    echo.
    pause
    exit /b 1
)

echo [OK] พบ ADB ในระบบ
echo.
echo กำลังตรวจสอบอุปกรณ์ที่เชื่อมต่อ...
echo.
adb devices -l
echo.

:: นับจำนวนอุปกรณ์
for /f "skip=1 tokens=1" %%i in ('adb devices') do (
    if not "%%i"=="" (
        echo ✅ พบอุปกรณ์: %%i
    )
)

echo.
echo ข้อมูลอุปกรณ์:
adb shell getprop ro.product.manufacturer 2>nul && (
    set /p brand=< con
    echo   ยี่ห้อ:   & adb shell getprop ro.product.manufacturer
    echo   รุ่น:     & adb shell getprop ro.product.model
    echo   Android:  & adb shell getprop ro.build.version.release
    echo   SDK:      & adb shell getprop ro.build.version.sdk
    echo   Storage:  & adb shell df /sdcard 2>nul
) 2>nul

echo.
echo ════════════════════════════════════════════════════════
echo หากไม่พบอุปกรณ์ ให้ตรวจสอบ:
echo   1. เปิด Developer Options บนโทรศัพท์
echo   2. เปิด USB Debugging
echo   3. เลือก "File Transfer / MTP" บนโทรศัพท์
echo   4. กด Allow บน popup "Allow USB Debugging"
echo ════════════════════════════════════════════════════════
echo.
pause
