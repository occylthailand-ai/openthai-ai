#!/usr/bin/env bash
set -euo pipefail

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

# Change to repo root (directory containing this script)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo -e "${CYAN}========================================${RESET}"
echo -e "${CYAN}  OpenThai AI — Git Sync${RESET}"
echo -e "${CYAN}========================================${RESET}"
echo ""

# Check git is available
if ! command -v git &>/dev/null; then
  echo -e "${RED}[ERROR] git is not installed or not in PATH.${RESET}"
  exit 1
fi

# Show current branch
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>&1)"
echo -e "${YELLOW}[INFO] Branch: ${BRANCH}${RESET}"

# Pull latest changes
echo -e "${YELLOW}[INFO] Pulling latest changes...${RESET}"
if ! git pull origin "$BRANCH"; then
  echo -e "${RED}[ERROR] git pull failed. Resolve conflicts then re-run.${RESET}"
  exit 1
fi

# Check for changes
STATUS="$(git status --porcelain)"
if [[ -z "$STATUS" ]]; then
  echo -e "${GREEN}[INFO] Nothing to commit — working tree clean.${RESET}"
  exit 0
fi

echo ""
echo -e "${YELLOW}Changed files:${RESET}"
git status --short

echo ""
read -r -p "Commit message (leave blank to skip push): " MSG
if [[ -z "${MSG// }" ]]; then
  echo -e "${YELLOW}[INFO] Skipped commit.${RESET}"
  exit 0
fi

git add -A
if ! git commit -m "$MSG"; then
  echo -e "${RED}[ERROR] git commit failed.${RESET}"
  exit 1
fi

echo -e "${YELLOW}[INFO] Pushing to origin/${BRANCH}...${RESET}"
if git push origin "$BRANCH"; then
  echo ""
  echo -e "${GREEN}[OK] Sync complete.${RESET}"
else
  echo -e "${RED}[ERROR] git push failed.${RESET}"
  exit 1
fi
