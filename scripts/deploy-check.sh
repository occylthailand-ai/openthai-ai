#!/usr/bin/env bash
# deploy-check.sh — Verify required environment variables before deploy
# Usage: ./scripts/deploy-check.sh
# Exit 0: all critical variables present
# Exit 1: one or more critical variables missing

set -uo pipefail

# Colors (disable when not a TTY)
if [ -t 1 ]; then
  GREEN="\033[0;32m"
  RED="\033[0;31m"
  YELLOW="\033[0;33m"
  RESET="\033[0m"
else
  GREEN="" RED="" YELLOW="" RESET=""
fi

ERRORS=0
WARNINGS=0

check_required() {
  local var_name="$1"
  local description="$2"
  if [ -z "${!var_name:-}" ]; then
    printf "${RED}[MISSING]${RESET}  %s — %s\n" "$var_name" "$description"
    ERRORS=$((ERRORS + 1))
  else
    printf "${GREEN}[OK]${RESET}       %s\n" "$var_name"
  fi
}

check_one_of() {
  local description="$1"
  shift
  local vars=("$@")
  local found=0

  for var_name in "${vars[@]}"; do
    if [ -n "${!var_name:-}" ]; then
      printf "${GREEN}[OK]${RESET}       %s (satisfies: %s)\n" "$var_name" "$description"
      found=1
      break
    fi
  done

  if [ "$found" -eq 0 ]; then
    printf "${RED}[MISSING]${RESET}  At least one of [%s] required — %s\n" \
      "$(IFS=' | '; echo "${vars[*]}")" "$description"
    ERRORS=$((ERRORS + 1))
  fi
}

check_optional() {
  local var_name="$1"
  local description="$2"
  if [ -z "${!var_name:-}" ]; then
    printf "${YELLOW}[WARN]${RESET}     %s not set — %s\n" "$var_name" "$description"
    WARNINGS=$((WARNINGS + 1))
  else
    printf "${GREEN}[OK]${RESET}       %s\n" "$var_name"
  fi
}

echo "============================================"
echo "  OpenThai AI — Pre-Deploy Environment Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "============================================"
echo ""

echo "--- Critical (AI Provider) ---"
check_one_of "AI API key" ANTHROPIC_API_KEY GEMINI_API_KEY

echo ""
echo "--- Critical (App) ---"
check_required JWT_SECRET       "Used for signing JWT tokens"
check_required FRONTEND_URL     "CORS origin for the frontend"

echo ""
echo "--- Optional (Notifications) ---"
check_optional SLACK_WEBHOOK_URL  "Morning report & weekly summary alerts"
check_optional LINE_NOTIFY_TOKEN  "LINE Notify for morning health reports"

echo ""
echo "--------------------------------------------"
if [ "$ERRORS" -gt 0 ]; then
  printf "${RED}Pre-deploy check FAILED — %d critical variable(s) missing.${RESET}\n" "$ERRORS"
  [ "$WARNINGS" -gt 0 ] && printf "${YELLOW}  (%d optional variable(s) not set)${RESET}\n" "$WARNINGS"
  exit 1
else
  printf "${GREEN}Pre-deploy check PASSED${RESET}"
  if [ "$WARNINGS" -gt 0 ]; then
    printf " ${YELLOW}(with %d warning(s))${RESET}" "$WARNINGS"
  fi
  echo ""
  exit 0
fi
