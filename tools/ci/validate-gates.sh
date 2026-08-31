#!/usr/bin/env bash
# tools/ci/validate-gates.sh
# ---------------------------
# Fail-closed gate validator.  Checks that all required CI stage results
# equal PASSED and that the audit manifest exists and carries a
# VERIFIED_GREEN_BUILD verdict.
#
# Usage (GitHub Actions production-gate job):
#   QUALITY_RESULT=PASSED DOCKER_RESULT=PASSED SECURITY_RESULT=PASSED \
#     bash tools/ci/validate-gates.sh
#
# Usage (local dry-run — skips manifest check):
#   DRY_RUN=1 bash tools/ci/validate-gates.sh
#
# Environment variables:
#   QUALITY_RESULT    PASSED | FAILED | SKIPPED | NOT_RUN
#   DOCKER_RESULT     PASSED | FAILED | SKIPPED | NOT_RUN
#   SECURITY_RESULT   PASSED | FAILED | SKIPPED | NOT_RUN
#   AUDIT_DIR         path to audit-evidence root (default: audit-evidence)
#   DRY_RUN           set to 1 to skip manifest file validation
set -euo pipefail

AUDIT_DIR="${AUDIT_DIR:-audit-evidence}"
MANIFEST="${AUDIT_DIR}/manifest.json"

QUALITY_RESULT="${QUALITY_RESULT:-NOT_RUN}"
DOCKER_RESULT="${DOCKER_RESULT:-NOT_RUN}"
SECURITY_RESULT="${SECURITY_RESULT:-NOT_RUN}"
DRY_RUN="${DRY_RUN:-0}"

FAILED=0

check_stage() {
  local name="$1"
  local result="$2"
  if [ "${result}" != "PASSED" ]; then
    echo "[X] ${name}: ${result} (expected PASSED)"
    FAILED=1
  else
    echo "[✓] ${name}: ${result}"
  fi
}

echo "=== Gate validation ==="
check_stage "quality-gate"      "${QUALITY_RESULT}"
check_stage "docker-integration" "${DOCKER_RESULT}"
check_stage "security-gate"     "${SECURITY_RESULT}"

if [ "${DRY_RUN}" != "1" ]; then
  echo ""
  echo "=== Manifest validation ==="
  if [ ! -f "${MANIFEST}" ]; then
    echo "[X] Manifest not found: ${MANIFEST}"
    FAILED=1
  else
    VERDICT=$(python3 - <<PYEOF
import json, sys
try:
    d = json.load(open("${MANIFEST}"))
    print(d.get("verdict", {}).get("status", "MISSING"))
except Exception as e:
    print("PARSE_ERROR")
    sys.exit(1)
PYEOF
)
    if [ "${VERDICT}" = "VERIFIED_GREEN_BUILD" ]; then
      echo "[✓] manifest.json verdict: ${VERDICT}"
    else
      echo "[X] manifest.json verdict: ${VERDICT} (expected VERIFIED_GREEN_BUILD)"
      FAILED=1
    fi
  fi
fi

echo ""
if [ "${FAILED}" -eq 1 ]; then
  echo "[X] Gate validation FAILED — pipeline is fail-closed."
  exit 1
fi

echo "[✓] All gates passed — production gate VERIFIED_GREEN_BUILD."
