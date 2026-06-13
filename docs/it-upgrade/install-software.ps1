# install-software.ps1
# ติดตั้งซอฟต์แวร์อัตโนมัติหลังลง Windows ใหม่
# สำหรับทีม AI/Data ของ OpenThai AI
# รันด้วย: PowerShell -ExecutionPolicy Bypass -File install-software.ps1

param(
    [ValidateSet("all","basic","dev","ai","tools")]
    [string]$Profile = "all"
)

Write-Host "=== OpenThai AI - ติดตั้งซอฟต์แวร์หลัง Windows Reinstall ===" -ForegroundColor Cyan
Write-Host ""

# ตรวจสอบว่ามี Winget
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "ติดตั้ง Winget (App Installer)..." -ForegroundColor Yellow
    Start-Process "ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1" -Wait
    Write-Host "กรุณาติดตั้ง App Installer จาก Store แล้วรันสคริปต์ใหม่" -ForegroundColor Red
    exit 1
}

function Install-App {
    param([string]$Name, [string]$Id)
    Write-Host "  ติดตั้ง: $Name ..." -NoNewline
    winget install --id $Id --silent --accept-source-agreements --accept-package-agreements 2>&1 | Out-Null
    Write-Host " [เสร็จ]" -ForegroundColor Green
}

# ===== ซอฟต์แวร์พื้นฐาน (ทุกระดับ) =====
if ($Profile -in @("all","basic")) {
    Write-Host "[1] ซอฟต์แวร์พื้นฐาน (ทุกเจ้าหน้าที่)" -ForegroundColor White
    Install-App "Google Chrome"        "Google.Chrome"
    Install-App "Microsoft Edge"       "Microsoft.Edge"
    Install-App "7-Zip"                "7zip.7zip"
    Install-App "Notepad++"            "Notepad++.Notepad++"
    Install-App "VLC Media Player"     "VideoLAN.VLC"
    Install-App "Adobe Acrobat Reader" "Adobe.Acrobat.Reader.64-bit"
    Install-App "Microsoft Teams"      "Microsoft.Teams"
    Install-App "Zoom"                 "Zoom.Zoom"
    Install-App "LINE"                 "LINE.LINE"
    Write-Host ""
}

# ===== ซอฟต์แวร์ Developer =====
if ($Profile -in @("all","dev")) {
    Write-Host "[2] ซอฟต์แวร์สำหรับ Developer" -ForegroundColor White
    Install-App "Git"                  "Git.Git"
    Install-App "Visual Studio Code"   "Microsoft.VisualStudioCode"
    Install-App "Node.js LTS"          "OpenJS.NodeJS.LTS"
    Install-App "Python 3.11"          "Python.Python.3.11"
    Install-App "Docker Desktop"       "Docker.DockerDesktop"
    Install-App "Windows Terminal"     "Microsoft.WindowsTerminal"
    Install-App "PowerShell 7"         "Microsoft.PowerShell"
    Install-App "Postman"              "Postman.Postman"
    Install-App "GitHub Desktop"       "GitHub.GitHubDesktop"
    Install-App "DBeaver"              "dbeaver.dbeaver"
    Write-Host ""
}

# ===== ซอฟต์แวร์ AI/Data Science =====
if ($Profile -in @("all","ai")) {
    Write-Host "[3] ซอฟต์แวร์ AI/Data Science" -ForegroundColor White
    Install-App "Anaconda"             "Anaconda.Anaconda3"
    Install-App "CUDA Toolkit"         "Nvidia.CUDA"
    Install-App "Ollama (Local AI)"    "Ollama.Ollama"
    Install-App "LM Studio"            "ElementLabs.LMStudio"

    Write-Host ""
    Write-Host "  ติดตั้ง Python AI packages..." -ForegroundColor Cyan
    $packages = @(
        "torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121",
        "transformers",
        "datasets",
        "accelerate",
        "peft",
        "bitsandbytes",
        "langchain langchain-community",
        "openai anthropic",
        "pandas numpy matplotlib seaborn",
        "jupyter jupyterlab",
        "fastapi uvicorn",
        "python-dotenv"
    )
    foreach ($pkg in $packages) {
        Write-Host "    pip install $pkg ..." -NoNewline
        Invoke-Expression "pip install $pkg --quiet" 2>&1 | Out-Null
        Write-Host " [เสร็จ]" -ForegroundColor Green
    }
    Write-Host ""
}

# ===== เครื่องมือ Productivity =====
if ($Profile -in @("all","tools")) {
    Write-Host "[4] เครื่องมือ Productivity" -ForegroundColor White
    Install-App "Notion"               "Notion.Notion"
    Install-App "Slack"                "SlackTechnologies.Slack"
    Install-App "ShareX (Screenshot)"  "ShareX.ShareX"
    Install-App "CPU-Z"                "CPUID.CPU-Z"
    Install-App "GPU-Z"                "TechPowerUp.GPU-Z"
    Install-App "HWiNFO"               "REALiX.HWiNFO"
    Install-App "CrystalDiskMark"      "CrystalDewWorld.CrystalDiskMark"
    Write-Host ""
}

# ===== ตั้งค่า VS Code Extensions =====
if ($Profile -in @("all","dev","ai") -and (Get-Command code -ErrorAction SilentlyContinue)) {
    Write-Host "[5] ติดตั้ง VS Code Extensions" -ForegroundColor White
    $extensions = @(
        "ms-python.python",
        "ms-python.vscode-pylance",
        "ms-toolsai.jupyter",
        "ms-vscode-remote.remote-containers",
        "GitHub.copilot",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "PKief.material-icon-theme",
        "wayou.vscode-todo-highlight"
    )
    foreach ($ext in $extensions) {
        code --install-extension $ext 2>&1 | Out-Null
        Write-Host "  $ext [เสร็จ]" -ForegroundColor Green
    }
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "ติดตั้งซอฟต์แวร์เสร็จสมบูรณ์!" -ForegroundColor Green
Write-Host ""
Write-Host "สิ่งที่ต้องทำต่อ:" -ForegroundColor Yellow
Write-Host "  1. Restart เครื่อง"
Write-Host "  2. ตั้งค่า Git: git config --global user.name 'ชื่อ' && git config --global user.email 'email'"
Write-Host "  3. Restore ข้อมูลจาก backup folder"
Write-Host "  4. ทดสอบ GPU: python -c 'import torch; print(torch.cuda.is_available())'"
