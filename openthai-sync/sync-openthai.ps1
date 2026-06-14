# ============================================================
#  OpenThai.ai Sync Tool v1.0
#  ซิงค์ข้อมูล 3 ส่วน: คอมพิวเตอร์ -> Google Drive -> มือถือ + Claude
#  ผู้ใช้งาน: นาย ซื่อใจ แซ่หย่าง / MR. ZUEJAI SAEYANG / 杨世再
# ============================================================
#  วิธีทำงาน:
#  1. คัดลอกทุกไฟล์จาก C:\OPENTHAI AI ไปยังโฟลเดอร์ Google Drive บนเครื่อง
#  2. Google Drive for Desktop จะอัปโหลดขึ้นคลาวด์อัตโนมัติ
#  3. มือถือเปิดดูผ่านแอป Google Drive / Claude อ่านผ่าน Drive connector
# ============================================================

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ---------- ตั้งค่า ----------
$SourceDir = "C:\OPENTHAI AI"
$LogDir    = "C:\OPENTHAI AI\_sync-logs"

Write-Host ""
Write-Host "============================================" -ForegroundColor DarkYellow
Write-Host "   OpenThai.ai Sync Tool v1.0" -ForegroundColor Yellow
Write-Host "   Computer -> Google Drive -> Mobile + Claude" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor DarkYellow
Write-Host ""

# ---------- 1) ตรวจสอบโฟลเดอร์ต้นทาง ----------
if (-not (Test-Path $SourceDir)) {
    Write-Host "[X] ไม่พบโฟลเดอร์ต้นทาง: $SourceDir" -ForegroundColor Red
    Write-Host "    กรุณาตรวจสอบว่าโฟลเดอร์มีอยู่จริง แล้วรันใหม่อีกครั้ง" -ForegroundColor Red
    Read-Host "กด Enter เพื่อปิด"
    exit 1
}
Write-Host "[OK] พบโฟลเดอร์ต้นทาง: $SourceDir" -ForegroundColor Green

# ---------- 2) ค้นหาโฟลเดอร์ Google Drive บนเครื่องอัตโนมัติ ----------
$DriveCandidates = @()

# แบบ Drive letter (G:, H:, ...) ที่ Google Drive for Desktop สร้าง
foreach ($letter in 67..90) {  # C..Z
    $d = [char]$letter + ":\My Drive"
    if (Test-Path $d) { $DriveCandidates += $d }
    $d2 = [char]$letter + ":\ไดรฟ์ของฉัน"
    if (Test-Path $d2) { $DriveCandidates += $d2 }
}
# แบบโฟลเดอร์ใน user profile (Drive รุ่นเก่า / Backup and Sync)
$ProfileCandidates = @(
    "$env:USERPROFILE\Google Drive",
    "$env:USERPROFILE\GoogleDrive",
    "$env:USERPROFILE\My Drive"
)
foreach ($p in $ProfileCandidates) {
    if (Test-Path $p) { $DriveCandidates += $p }
}

if ($DriveCandidates.Count -eq 0) {
    Write-Host ""
    Write-Host "[X] ไม่พบโฟลเดอร์ Google Drive บนเครื่องนี้" -ForegroundColor Red
    Write-Host ""
    Write-Host "    ต้องติดตั้ง Google Drive for Desktop ก่อนครับ:" -ForegroundColor Yellow
    Write-Host "    1. ดาวน์โหลดจาก https://www.google.com/drive/download/" -ForegroundColor Yellow
    Write-Host "    2. ติดตั้งและล็อกอินด้วยบัญชี occylthailand@gmail.com" -ForegroundColor Yellow
    Write-Host "    3. รอจนเห็นไดรฟ์ G: (My Drive) ใน File Explorer" -ForegroundColor Yellow
    Write-Host "    4. รันสคริปต์นี้ใหม่อีกครั้ง" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "กด Enter เพื่อปิด"
    exit 1
}

$DriveRoot = $DriveCandidates[0]
$TargetDir = Join-Path $DriveRoot "OPENTHAI AI"
Write-Host "[OK] พบ Google Drive ที่: $DriveRoot" -ForegroundColor Green
Write-Host "[OK] ปลายทางซิงค์: $TargetDir" -ForegroundColor Green
Write-Host ""

# ---------- 3) เตรียม log ----------
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$Stamp   = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LogFile = Join-Path $LogDir "sync_$Stamp.log"

# ---------- 4) ซิงค์ด้วย Robocopy (mirror) ----------
Write-Host "เริ่มซิงค์ข้อมูล... (ครั้งแรกอาจใช้เวลาหลายนาทีตามขนาดไฟล์)" -ForegroundColor Cyan
Write-Host ""

# /MIR  = ทำให้ปลายทางเหมือนต้นทางทุกประการ
# /XD   = ข้ามโฟลเดอร์ที่ไม่จำเป็น (node_modules, .git, logs)
# /R:2 /W:3 = ลองใหม่ 2 ครั้ง รอ 3 วินาที ถ้าไฟล์ติดล็อก
robocopy $SourceDir $TargetDir /MIR /XD "node_modules" ".git" ".next" "_sync-logs" /R:2 /W:3 /NP /TEE /UNILOG+:$LogFile

$RC = $LASTEXITCODE
Write-Host ""
if ($RC -le 7) {
    Write-Host "============================================" -ForegroundColor DarkGreen
    Write-Host "[สำเร็จ] ซิงค์ข้อมูลเรียบร้อย!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor DarkGreen
    Write-Host ""
    Write-Host "ขั้นตอนถัดไปของข้อมูลทั้ง 3 ส่วน:" -ForegroundColor Yellow
    Write-Host "  1. คอมพิวเตอร์  : ข้อมูลอยู่ที่ $SourceDir (ต้นฉบับ)"
    Write-Host "  2. มือถือ       : เปิดแอป Google Drive -> โฟลเดอร์ 'OPENTHAI AI'"
    Write-Host "  3. Claude       : บอก Claude ว่า 'อ่านโฟลเดอร์ OPENTHAI AI ใน Drive'"
    Write-Host ""
    Write-Host "หมายเหตุ: Google Drive จะใช้เวลาอัปโหลดขึ้นคลาวด์สักครู่" -ForegroundColor DarkGray
    Write-Host "ดูสถานะได้จากไอคอน Drive มุมขวาล่างของจอ (System Tray)" -ForegroundColor DarkGray
} else {
    Write-Host "[!] ซิงค์เสร็จแต่มีบางไฟล์ติดปัญหา (รหัส: $RC)" -ForegroundColor Yellow
    Write-Host "    ดูรายละเอียดได้ที่ log: $LogFile" -ForegroundColor Yellow
}
Write-Host ""
Read-Host "กด Enter เพื่อปิดหน้าต่าง"
