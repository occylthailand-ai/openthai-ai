# ============================================================
#  ติดตั้งระบบซิงค์อัตโนมัติ (ทุก 30 นาที) ผ่าน Windows Task Scheduler
#  รันไฟล์นี้ครั้งเดียว -> เครื่องจะซิงค์เองตลอดเวลาที่เปิดคอม
#  วิธีรัน: คลิกขวาไฟล์นี้ -> Run with PowerShell (ต้องเป็น Administrator)
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptPath = Join-Path $PSScriptRoot "sync-openthai.ps1"
if (-not (Test-Path $ScriptPath)) {
    Write-Host "[X] ไม่พบไฟล์ sync-openthai.ps1 ในโฟลเดอร์เดียวกัน" -ForegroundColor Red
    Read-Host "กด Enter เพื่อปิด"
    exit 1
}

$TaskName = "OpenThaiAI-AutoSync"
$Action   = New-ScheduledTaskAction -Execute "powershell.exe" `
            -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""
$Trigger  = New-ScheduledTaskTrigger -Once -At (Get-Date) `
            -RepetitionInterval (New-TimeSpan -Minutes 30) `
            -RepetitionDuration ([TimeSpan]::MaxValue)
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings | Out-Null

Write-Host ""
Write-Host "[สำเร็จ] ติดตั้งระบบซิงค์อัตโนมัติเรียบร้อย" -ForegroundColor Green
Write-Host "         เครื่องจะซิงค์ C:\OPENTHAI AI ขึ้น Google Drive ทุก 30 นาที" -ForegroundColor Green
Write-Host ""
Write-Host "ยกเลิกได้ทุกเมื่อด้วยคำสั่ง:" -ForegroundColor DarkGray
Write-Host "  Unregister-ScheduledTask -TaskName $TaskName" -ForegroundColor DarkGray
Write-Host ""
Read-Host "กด Enter เพื่อปิด"
