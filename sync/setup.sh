#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# setup.sh — OpenThaiAi Auto-Sync Installer
# ติดตั้ง Auto-Sync ครบทุกอย่างในคำสั่งเดียว
#
# วิธีรัน:
#   git clone https://github.com/occylthailand-ai/openthai-ai.git
#   cd openthai-ai
#   git checkout claude/pending-tasks-kcx852
#   bash sync/setup.sh
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$SCRIPT_DIR/config.env"
LOG_FILE="$SCRIPT_DIR/sync.log"
OS="$(uname -s 2>/dev/null || echo 'unknown')"
BRANCH="claude/pending-tasks-kcx852"

# ── สี Terminal ───────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}  ✅  $*${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️   $*${NC}"; }
err()  { echo -e "${RED}  ❌  $*${NC}"; }
info() { echo -e "${CYAN}  ℹ️   $*${NC}"; }
step() { echo -e "\n${BOLD}${BLUE}── $* ─────────────────────────────────────────${NC}"; }

# ── Banner ────────────────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${BLUE}"
cat <<'BANNER'
  ╔══════════════════════════════════════════════════╗
  ║   🚀 OpenThaiAi Auto-Sync Installer              ║
  ║   ติดตั้ง Auto-Sync 4 จุดในคำสั่งเดียว           ║
  ╚══════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"
echo -e "  OS: ${CYAN}$OS${NC} | Repo: ${CYAN}$REPO_DIR${NC}"
echo ""

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1: ตรวจสอบ dependencies
# ══════════════════════════════════════════════════════════════════════════════
step "1/6 ตรวจสอบ Dependencies"

# git
if command -v git &>/dev/null; then
  ok "git $(git --version | awk '{print $3}')"
else
  err "ไม่พบ git — กรุณาติดตั้งก่อน: https://git-scm.com"
  exit 1
fi

# node.js
if command -v node &>/dev/null; then
  ok "Node.js $(node --version)"
else
  warn "ไม่พบ Node.js — sync-drive.js จะไม่ทำงาน"
  warn "ติดตั้ง Node.js ที่: https://nodejs.org"
fi

# curl
if command -v curl &>/dev/null; then
  ok "curl พร้อมใช้"
else
  warn "ไม่พบ curl — Slack notification จะไม่ทำงาน"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2: ติดตั้ง rclone (สำหรับ OneDrive sync)
# ══════════════════════════════════════════════════════════════════════════════
step "2/6 ติดตั้ง rclone (OneDrive Sync)"

if command -v rclone &>/dev/null; then
  ok "rclone $(rclone version --check 2>/dev/null | head -1 || echo 'installed')"
else
  info "กำลังติดตั้ง rclone..."
  if [[ "$OS" == "Darwin" ]]; then
    if command -v brew &>/dev/null; then
      brew install rclone 2>/dev/null && ok "rclone ติดตั้งสำเร็จ (Homebrew)" || warn "brew install rclone ล้มเหลว — ลองใช้ curl แทน"
    fi
    if ! command -v rclone &>/dev/null; then
      curl -fsSL https://rclone.org/install.sh | sudo bash 2>/dev/null && ok "rclone ติดตั้งสำเร็จ" || warn "ติดตั้ง rclone ล้มเหลว — ดาวน์โหลดที่ rclone.org/downloads"
    fi
  elif [[ "$OS" == "Linux" ]]; then
    # ลองหลายวิธี
    if command -v apt-get &>/dev/null; then
      sudo apt-get install -y rclone 2>/dev/null && ok "rclone ติดตั้งสำเร็จ (apt)" || true
    fi
    if ! command -v rclone &>/dev/null; then
      if command -v yum &>/dev/null; then
        sudo yum install -y rclone 2>/dev/null && ok "rclone ติดตั้งสำเร็จ (yum)" || true
      fi
    fi
    if ! command -v rclone &>/dev/null; then
      curl -fsSL https://rclone.org/install.sh | sudo bash 2>/dev/null && ok "rclone ติดตั้งสำเร็จ (curl)" || warn "ติดตั้ง rclone ล้มเหลว — ดาวน์โหลดที่ rclone.org/downloads"
    fi
  else
    warn "ไม่สามารถติดตั้ง rclone อัตโนมัติบน $OS — ดาวน์โหลดเองที่ rclone.org/downloads"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3: สร้าง config.env จาก template
# ══════════════════════════════════════════════════════════════════════════════
step "3/6 ตั้งค่า config.env"

if [[ -f "$CONFIG_FILE" ]]; then
  ok "config.env มีอยู่แล้ว"
else
  cp "$SCRIPT_DIR/config.env.example" "$CONFIG_FILE"
  # ใส่ค่า defaults ที่รู้แล้ว
  sed -i.bak "s|GIT_REPO_DIR=\"/path/to/openthai-ai\"|GIT_REPO_DIR=\"$REPO_DIR\"|" "$CONFIG_FILE"
  sed -i.bak "s|GIT_BRANCH=\"claude/pending-tasks-kcx852\"|GIT_BRANCH=\"$BRANCH\"|" "$CONFIG_FILE"
  rm -f "$CONFIG_FILE.bak"
  ok "สร้าง config.env แล้ว → $CONFIG_FILE"
fi

# ── ถามผู้ใช้ว่าต้องการตั้งค่า Vercel Deploy Hook หรือไม่ ────────────────────
echo ""
echo -e "${YELLOW}  📱 Vercel Deploy Hook (สำหรับซิ้งมือถือ)${NC}"
echo "     สร้างได้ที่: Vercel Dashboard → Project → Settings → Git → Deploy Hooks"
echo -n "     ใส่ Vercel Deploy Hook URL (Enter เพื่อข้าม): "
read -r VERCEL_URL
if [[ -n "$VERCEL_URL" ]]; then
  sed -i.bak "s|VERCEL_DEPLOY_HOOK_URL=\"\"|VERCEL_DEPLOY_HOOK_URL=\"$VERCEL_URL\"|" "$CONFIG_FILE"
  rm -f "$CONFIG_FILE.bak"
  ok "บันทึก Vercel Deploy Hook URL แล้ว"
else
  info "ข้าม Vercel Hook — ซิ้งมือถือจะทำงานเมื่อ push ขึ้น git"
fi

# ── ถาม Slack Webhook ─────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}  💬 Slack Notification (optional)${NC}"
echo -n "     ใส่ Slack Webhook URL (Enter เพื่อข้าม): "
read -r SLACK_URL
if [[ -n "$SLACK_URL" ]]; then
  sed -i.bak "s|SLACK_WEBHOOK_URL=\"\"|SLACK_WEBHOOK_URL=\"$SLACK_URL\"|" "$CONFIG_FILE"
  rm -f "$CONFIG_FILE.bak"
  ok "บันทึก Slack Webhook URL แล้ว"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4: ให้สิทธิ์ execute แก่ scripts ทั้งหมด
# ══════════════════════════════════════════════════════════════════════════════
step "4/6 ตั้งค่าสิทธิ์ Scripts"

chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null && ok "chmod +x sync/*.sh"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 5: ตั้งค่า OneDrive (rclone)
# ══════════════════════════════════════════════════════════════════════════════
step "5/6 ตั้งค่า OneDrive (rclone)"

if command -v rclone &>/dev/null; then
  if rclone listremotes 2>/dev/null | grep -q "^onedrive:"; then
    ok "rclone remote 'onedrive' ตั้งค่าแล้ว"
  else
    echo ""
    echo -e "${YELLOW}  🔷 ต้องตั้งค่า OneDrive ใน rclone${NC}"
    echo ""
    echo "  วิธีตั้งค่า:"
    echo "  1. รัน: rclone config"
    echo "  2. กด n (new remote)"
    echo "  3. ชื่อ: onedrive"
    echo "  4. เลือก Storage: Microsoft OneDrive"
    echo "  5. กด Enter ข้าม client_id, client_secret"
    echo "  6. Use auto config? → y"
    echo "  7. เปิด browser → Login Microsoft account"
    echo "  8. เลือก OneDrive Personal หรือ Business"
    echo "  9. กด y เพื่อบันทึก"
    echo ""
    echo -n "  ต้องการตั้งค่า OneDrive ตอนนี้เลยไหม? (y/N): "
    read -r SETUP_RCLONE
    if [[ "${SETUP_RCLONE,,}" == "y" ]]; then
      rclone config || warn "ตั้งค่า rclone ยังไม่เสร็จ — รัน rclone config อีกครั้ง"
    else
      info "ข้าม OneDrive setup — รัน rclone config เองในภายหลัง"
    fi
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 6: ติดตั้ง Cron / LaunchAgent
# ══════════════════════════════════════════════════════════════════════════════
step "6/6 ติดตั้ง Auto-Sync อัตโนมัติ"

echo -n "  ต้องการให้ซิ้งอัตโนมัติทุก 6 ชั่วโมง? (Y/n): "
read -r INSTALL_CRON
if [[ "${INSTALL_CRON,,}" != "n" ]]; then
  bash "$SCRIPT_DIR/install-cron.sh"
else
  info "ข้าม auto-sync — รัน bash sync/sync-all.sh เองได้ตลอดเวลา"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 7: ทดสอบ Sync ครั้งแรก
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║  ✅ OpenThaiAi Auto-Sync ติดตั้งสำเร็จ!      ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# แสดงสถานะ
echo -e "${CYAN}  📊 สถานะ Sync ปัจจุบัน:${NC}"
node "$SCRIPT_DIR/sync-status.js" 2>/dev/null || echo "  (ต้องการ Node.js)"
echo ""

echo -n "  ต้องการทดสอบ Sync ทั้ง 4 จุดตอนนี้เลยไหม? (Y/n): "
read -r RUN_NOW
if [[ "${RUN_NOW,,}" != "n" ]]; then
  echo ""
  bash "$SCRIPT_DIR/sync-all.sh"
fi

echo ""
echo -e "${BOLD}  📋 คำสั่งที่ใช้บ่อย:${NC}"
echo "  ซิ้งทันที:        bash sync/sync-all.sh"
echo "  ดูสถานะ:          node sync/sync-status.js"
echo "  ดู log:           tail -f sync/sync.log"
echo "  ตั้งค่า OneDrive: rclone config"
echo ""
echo -e "${BOLD}${GREEN}  🎉 พร้อมใช้งาน! ระบบจะซิ้งอัตโนมัติทุก 6 ชั่วโมง${NC}"
