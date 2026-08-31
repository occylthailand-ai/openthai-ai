#!/usr/bin/env bash
# tools/ci/validate-gates.sh
# ---------------------------
# Fail-closed gate validator with three-tier exit-code contract:
#   0  VERIFIED_GREEN_BUILD — all gates success
#   1  FAILED               — one or more gates failed/skipped
#   2  CONFIG_ERROR         — gate status unresolved (unknown)
#
# Usage (positional args):
#   bash tools/ci/validate-gates.sh <quality_result> <docker_result> <security_result>
#
# Usage (environment variables):
#   QUALITY_GATE=success DOCKER_GATE=success SECURITY_GATE=success \
#     bash tools/ci/validate-gates.sh
set -euo pipefail

QUALITY_GATE="${1:-${QUALITY_GATE:-unknown}}"
DOCKER_GATE="${2:-${DOCKER_GATE:-unknown}}"
SECURITY_GATE="${3:-${SECURITY_GATE:-unknown}}"

echo "========================================="
echo " OpenThaiAi Fail-Closed Gate Engine      "
echo "========================================="
echo "Quality Gate       : ${QUALITY_GATE}"
echo "Docker Integration : ${DOCKER_GATE}"
echo "Security Gate      : ${SECURITY_GATE}"
echo "-----------------------------------------"

# Exit 2 — CONFIG_ERROR: any gate status is unresolved
if [ "${QUALITY_GATE}" = "unknown" ] || \
   [ "${DOCKER_GATE}"   = "unknown" ] || \
   [ "${SECURITY_GATE}" = "unknown" ]; then
  echo "[-] Configuration/Execution Error: Gate status unresolved (unknown)."
  echo "FINAL VERDICT: CONFIG_ERROR"
  echo "========================================="
  exit 2
fi

FAIL=0

if [ "${QUALITY_GATE}" != "success" ]; then
  echo "[X] Quality Gate failed or skipped (got: ${QUALITY_GATE})"
  FAIL=1
else
  echo "[✓] Quality Gate: ${QUALITY_GATE}"
fi

if [ "${DOCKER_GATE}" != "success" ]; then
  echo "[X] Docker Integration Gate failed or skipped (got: ${DOCKER_GATE})"
  FAIL=1
else
  echo "[✓] Docker Integration: ${DOCKER_GATE}"
fi

if [ "${SECURITY_GATE}" != "success" ]; then
  echo "[X] Security Gate failed or skipped (got: ${SECURITY_GATE})"
  FAIL=1
else
  echo "[✓] Security Gate: ${SECURITY_GATE}"
fi

echo "========================================="
if [ "${FAIL}" -eq 0 ]; then
  echo "FINAL VERDICT: VERIFIED_GREEN_BUILD"
  echo "========================================="
  exit 0
else
  echo "[X] Gate failure detected."
  echo "FINAL VERDICT: FAILED"
  echo "========================================="
  exit 1
fi
