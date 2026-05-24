#!/usr/bin/env bash
# health-check.sh — OpenThai AI endpoint health checker
# Usage: ./scripts/health-check.sh
# Exit 0: all endpoints healthy
# Exit 1: one or more endpoints unhealthy

set -euo pipefail

BASE_URL="${BASE_URL:-https://www.openthai-ai.com}"
TIMEOUT="${TIMEOUT:-15}"

# Colors (disable when not a TTY)
if [ -t 1 ]; then
  GREEN="\033[0;32m"
  RED="\033[0;31m"
  YELLOW="\033[0;33m"
  RESET="\033[0m"
else
  GREEN="" RED="" YELLOW="" RESET=""
fi

PASS=0
FAIL=0

check_endpoint() {
  local label="$1"
  local url="$2"

  local start end elapsed http_code
  start=$(date +%s%3N)
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time "$TIMEOUT" \
    "$url" 2>/dev/null || echo "000")
  end=$(date +%s%3N)
  elapsed=$((end - start))

  if [ "$http_code" = "200" ]; then
    printf "${GREEN}[OK]${RESET}   %-30s  HTTP %s  %dms\n" "$label" "$http_code" "$elapsed"
    PASS=$((PASS + 1))
  elif [ "$http_code" = "000" ]; then
    printf "${RED}[FAIL]${RESET} %-30s  Connection error / timeout\n" "$label"
    FAIL=$((FAIL + 1))
  else
    printf "${YELLOW}[WARN]${RESET} %-30s  HTTP %s  %dms\n" "$label" "$http_code" "$elapsed"
    FAIL=$((FAIL + 1))
  fi
}

echo "============================================"
echo "  OpenThai AI — Health Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "============================================"
echo ""

check_endpoint "/api/health"  "${BASE_URL}/api/health"
check_endpoint "/api/warmup"  "${BASE_URL}/api/warmup"

echo ""
echo "--------------------------------------------"
echo "  Passed: $PASS  |  Failed: $FAIL"
echo "--------------------------------------------"

if [ "$FAIL" -gt 0 ]; then
  printf "${RED}Result: UNHEALTHY${RESET}\n"
  exit 1
else
  printf "${GREEN}Result: HEALTHY${RESET}\n"
  exit 0
fi
