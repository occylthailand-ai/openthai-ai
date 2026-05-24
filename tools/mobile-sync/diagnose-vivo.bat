@echo off
chcp 65001 >nul
title OpenThai AI — วินิจฉัยโทรศัพท์ vivo

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   OpenThai AI — Diagnostics: vivo Android           ║
echo ╚══════════════════════════════════════════════════════╝
echo.

where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ ADB กรุณารัน check-device.bat ก่อน
    pause
    exit /b 1
)

set LOG=%USERPROFILE%\Downloads\vivo-diag-%DATE:~0,4%%DATE:~5,2%%DATE:~8,2%.txt
echo กำลังสร้างรายงาน: %LOG%
echo.

(
echo === OpenThai AI — vivo Diagnostic Report ===
echo Date: %DATE% %TIME%
echo.

echo --- Device Info ---
adb shell getprop ro.product.brand
adb shell getprop ro.product.model
adb shell getprop ro.product.device
adb shell getprop ro.build.version.release
adb shell getprop ro.build.version.sdk
adb shell getprop ro.build.display.id
echo.

echo --- Battery ---
adb shell dumpsys battery
echo.

echo --- Storage ---
adb shell df -h
echo.

echo --- Memory ---
adb shell cat /proc/meminfo | findstr "MemTotal\|MemAvailable\|MemFree"
echo.

echo --- Running Processes (Top 20) ---
adb shell ps | head -20 2>nul
echo.

echo --- Network ---
adb shell ip addr show wlan0 2>nul
adb shell getprop net.wifi.interface 2>nul
echo.

echo --- App List (installed) ---
adb shell pm list packages -3
echo.

echo --- Recent Crash Logs ---
adb logcat -d -b crash --line-count 50 2>nul

echo.
echo === End of Report ===
) > "%LOG%" 2>&1

echo.
echo ✅ รายงานครบแล้ว!
echo ไฟล์: %LOG%
echo.
notepad "%LOG%"
pause
