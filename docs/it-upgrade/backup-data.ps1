# backup-data.ps1
# สำรองข้อมูลสำคัญก่อนลง Windows ใหม่
# รันด้วย: PowerShell -ExecutionPolicy Bypass -File backup-data.ps1

param(
    [string]$BackupDrive = "D:",
    [string]$BackupFolder = "WindowsReinstallBackup"
)

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$destination = "$BackupDrive\$BackupFolder\$timestamp"
$user = $env:USERNAME
$source = "C:\Users\$user"

Write-Host "=== OpenThai AI - สำรองข้อมูลก่อนลง Windows ใหม่ ===" -ForegroundColor Cyan
Write-Host "ผู้ใช้: $user"
Write-Host "บันทึกไปที่: $destination"
Write-Host ""

New-Item -ItemType Directory -Path $destination -Force | Out-Null

function Backup-Folder {
    param([string]$Name, [string]$Path)
    if (Test-Path $Path) {
        $dest = "$destination\$Name"
        Write-Host "  สำรอง: $Path ..." -NoNewline
        robocopy $Path $dest /E /R:2 /W:1 /NFL /NDL /NJH /NJS | Out-Null
        Write-Host " [เสร็จ]" -ForegroundColor Green
    } else {
        Write-Host "  ข้าม: $Path (ไม่พบ)" -ForegroundColor Yellow
    }
}

Write-Host "[1/6] สำรองโฟลเดอร์ผู้ใช้..." -ForegroundColor White
Backup-Folder "Documents" "$source\Documents"
Backup-Folder "Desktop"   "$source\Desktop"
Backup-Folder "Downloads" "$source\Downloads"
Backup-Folder "Pictures"  "$source\Pictures"

Write-Host ""
Write-Host "[2/6] สำรอง SSH Keys และ Credentials..." -ForegroundColor White
Backup-Folder "SSH_Keys"    "$source\.ssh"
Backup-Folder "Git_Config"  "$source\.gitconfig"

Write-Host ""
Write-Host "[3/6] สำรองโปรเจกต์ Dev..." -ForegroundColor White
$devPaths = @("C:\dev", "C:\projects", "C:\workspace", "$source\source\repos")
foreach ($p in $devPaths) {
    $name = Split-Path $p -Leaf
    Backup-Folder "Dev_$name" $p
}

Write-Host ""
Write-Host "[4/6] สำรอง Environment Variables และ API Keys..." -ForegroundColor White
$envFiles = Get-ChildItem -Path "C:\" -Recurse -Filter ".env" -Depth 5 -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch "node_modules|.git" }
if ($envFiles) {
    $envDest = "$destination\ENV_Files"
    New-Item -ItemType Directory -Path $envDest -Force | Out-Null
    foreach ($f in $envFiles) {
        $rel = $f.FullName -replace "C:\\", ""
        $relDir = Split-Path $rel -Parent
        $targetDir = "$envDest\$relDir"
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        Copy-Item $f.FullName $targetDir -ErrorAction SilentlyContinue
    }
    Write-Host "  พบ .env files: $($envFiles.Count) ไฟล์ [เสร็จ]" -ForegroundColor Green
}

Write-Host ""
Write-Host "[5/6] Export รายชื่อซอฟต์แวร์ที่ติดตั้ง..." -ForegroundColor White
$softwareList = "$destination\installed-software.txt"
Get-ItemProperty HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*,
                 HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
    Select-Object DisplayName, DisplayVersion, Publisher |
    Where-Object { $_.DisplayName } |
    Sort-Object DisplayName |
    Format-Table -AutoSize |
    Out-File $softwareList -Encoding UTF8
Write-Host "  บันทึกรายชื่อซอฟต์แวร์แล้ว [เสร็จ]" -ForegroundColor Green

Write-Host ""
Write-Host "[6/6] Export รายชื่อ Python packages..." -ForegroundColor White
$pipList = "$destination\python-packages.txt"
if (Get-Command pip -ErrorAction SilentlyContinue) {
    pip list --format=freeze | Out-File $pipList -Encoding UTF8
    Write-Host "  บันทึก pip packages แล้ว [เสร็จ]" -ForegroundColor Green
} else {
    Write-Host "  ไม่พบ pip (ข้าม)" -ForegroundColor Yellow
}

$condaList = "$destination\conda-packages.txt"
if (Get-Command conda -ErrorAction SilentlyContinue) {
    conda list --export | Out-File $condaList -Encoding UTF8
    Write-Host "  บันทึก conda packages แล้ว [เสร็จ]" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "สำรองข้อมูลเสร็จสมบูรณ์!" -ForegroundColor Green
Write-Host "ตำแหน่ง: $destination"
$size = (Get-ChildItem $destination -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
Write-Host ("ขนาด: {0:N2} GB" -f $size)
Write-Host ""
Write-Host "ขั้นตอนต่อไป: ตรวจสอบว่าข้อมูลครบ แล้วค่อยเริ่มอัปเกรดฮาร์ดแวร์" -ForegroundColor Yellow
