#!/usr/bin/env bash
# tools/security/run-gitleaks.sh
# --------------------------------
# Runs gitleaks to detect committed secrets, locally or in CI.
#
# Usage:
#   bash tools/security/run-gitleaks.sh [--report-path PATH]
#
# Options:
#   --report-path  where to write the JSON report
#                  (default: audit-evidence/03-security/gitleaks-report.json)
#
# Prerequisites:
#   gitleaks must be installed (brew install gitleaks  /  apt install gitleaks
#   / https://github.com/gitleaks/gitleaks/releases)
set -euo pipefail

REPORT_PATH="${GITLEAKS_REPORT:-audit-evidence/03-security/gitleaks-report.json}"

# Parse --report-path argument
while [[ $# -gt 0 ]]; do
  case "$1" in
    --report-path) REPORT_PATH="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

if ! command -v gitleaks &>/dev/null; then
  echo "[X] gitleaks not found. Install from https://github.com/gitleaks/gitleaks/releases"
  exit 1
fi

mkdir -p "$(dirname "${REPORT_PATH}")"

echo "[*] Running gitleaks detect..."

if gitleaks detect \
    --source . \
    --report-format json \
    --report-path "${REPORT_PATH}" \
    --no-banner \
    --exit-code 1; then
  echo "[✓] No secrets detected."
else
  echo "[X] gitleaks found secrets. See report: ${REPORT_PATH}"
  exit 1
fi
