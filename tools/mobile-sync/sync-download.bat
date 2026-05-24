@echo off
chcp 65001 >nul
title OpenThai AI — ดาวน์โหลดไฟล์จากโทรศัพท์สู่ PC

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   OpenThai AI — Sync: โทรศัพท์ → PC               ║
echo ╚══════════════════════════════════════════════════════╝
echo.

where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ ADB กรุณารัน check-device.bat ก่อน
    pause
    exit /b 1
)

:: สร้างโฟลเดอร์ปลายทางบน PC
set DEST=%USERPROFILE%\Downloads\PhoneSync\%DATE:~0,4%-%DATE:~5,2%-%DATE:~8,2%
if not exist "%DEST%" mkdir "%DEST%"

echo ปลายทาง: %DEST%
echo.
echo เลือกประเภทไฟล์ที่ต้องการ sync:
echo   [1] รูปภาพทั้งหมด (DCIM + Pictures)
echo   [2] วิดีโอทั้งหมด
echo   [3] เอกสาร (Documents + Downloads)
echo   [4] WhatsApp / LINE Media
echo   [5] ทุกไฟล์ใน Internal Storage
echo   [6] เลือก folder เอง
echo.
set /p choice=เลือก (1-6):

if "%choice%"=="1" (
    echo กำลัง sync รูปภาพ...
    adb pull /sdcard/DCIM "%DEST%\DCIM"
    adb pull /sdcard/Pictures "%DEST%\Pictures"
    goto done
)
if "%choice%"=="2" (
    echo กำลัง sync วิดีโอ...
    adb pull /sdcard/Movies "%DEST%\Movies"
    adb pull /sdcard/DCIM "%DEST%\DCIM"
    goto done
)
if "%choice%"=="3" (
    echo กำลัง sync เอกสาร...
    adb pull /sdcard/Documents "%DEST%\Documents"
    adb pull /sdcard/Download "%DEST%\Downloads"
    goto done
)
if "%choice%"=="4" (
    echo กำลัง sync WhatsApp + LINE...
    adb pull /sdcard/WhatsApp/Media "%DEST%\WhatsApp"
    adb pull /sdcard/Android/data/jp.naver.line.android/files/linedata "%DEST%\LINE" 2>nul
    goto done
)
if "%choice%"=="5" (
    echo กำลัง sync ทุกไฟล์ (อาจใช้เวลานาน)...
    adb pull /sdcard/ "%DEST%\AllFiles"
    goto done
)
if "%choice%"=="6" (
    set /p src=พิมพ์ path บนโทรศัพท์ (เช่น /sdcard/DCIM):
    adb pull %src% "%DEST%\Custom"
    goto done
)

echo ตัวเลือกไม่ถูกต้อง
goto end

:done
echo.
echo ✅ Sync เสร็จสิ้น!
echo ไฟล์อยู่ที่: %DEST%
explorer "%DEST%"

:end
echo.
pause
