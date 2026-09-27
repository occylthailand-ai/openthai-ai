# ติดตั้ง Boot Alert บน Windows — Scheduled Task ตอนบูต (รันด้วยสิทธิ์ SYSTEM)
# เปิด PowerShell แบบ Administrator แล้วรัน:  .\install-windows.ps1
$ErrorActionPreference = "Stop"

$dir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { Write-Error "ไม่พบ node — ติดตั้ง Node.js 18+ ก่อน"; exit 1 }
if (-not (Test-Path "$dir\.env")) { Write-Error "ยังไม่มีไฟล์ .env — คัดลอกจาก .env.example แล้วเติมค่าก่อน"; exit 1 }

$taskName = "OpenthaiBootAlert"

# action: รัน notify.js, working dir = โฟลเดอร์นี้
$action  = New-ScheduledTaskAction -Execute $node -Argument "`"$dir\notify.js`"" -WorkingDirectory $dir
# trigger: ตอนบูตเครื่อง
$trigger = New-ScheduledTaskTrigger -AtStartup
# settings: รีสตาร์ตเองถ้าพัง + ไม่หยุดเอง
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
            -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
# principal: รันด้วย SYSTEM (ทำงานแม้ยังไม่มีใคร login)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Write-Host "✅ ติดตั้งแล้ว — Task '$taskName' จะเริ่มทุกบูตและรีสตาร์ตเองถ้าถูกปิด"
Write-Host "   ถอน: Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false"
