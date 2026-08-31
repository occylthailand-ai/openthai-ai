#!/usr/bin/env bash
# tools/security/run-audit.sh
# ----------------------------
# Runs pnpm (or npm) dependency audit and writes JSON + text reports.
# Fails the script if any HIGH or CRITICAL vulnerabilities are found.
#
# Usage:
#   bash tools/security/run-audit.sh [--output-dir DIR] [--level LEVEL]
#
# Options:
#   --output-dir  directory for audit reports
#                 (default: audit-evidence/03-security)
#   --level       minimum severity to fail on: low | moderate | high | critical
#                 (default: high)
#
# Prerequisites:
#   pnpm or npm must be installed and node_modules present.
set -euo pipefail

OUTPUT_DIR="${AUDIT_OUTPUT_DIR:-audit-evidence/03-security}"
LEVEL="${AUDIT_LEVEL:-high}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    --level)      LEVEL="$2";      shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

mkdir -p "${OUTPUT_DIR}"

echo "[*] Running dependency audit (--audit-level ${LEVEL})..."

if command -v pnpm &>/dev/null; then
  PKG_MGR="pnpm"
elif command -v npm &>/dev/null; then
  PKG_MGR="npm"
else
  echo "[X] Neither pnpm nor npm found."
  exit 1
fi

echo "[*] Using package manager: ${PKG_MGR}"

# JSON report (best-effort — some versions may not support --json)
"${PKG_MGR}" audit \
  --audit-level "${LEVEL}" \
  --json \
  > "${OUTPUT_DIR}/npm-audit.json" 2>/dev/null \
  || true

# Human-readable report + enforce exit code
if "${PKG_MGR}" audit --audit-level "${LEVEL}" \
   2>&1 | tee "${OUTPUT_DIR}/npm-audit-output.txt"; then
  echo "[✓] No ${LEVEL}+ vulnerabilities found."
else
  echo "[X] Vulnerabilities at level ${LEVEL}+ detected. See ${OUTPUT_DIR}/npm-audit-output.txt"
  exit 1
fi
