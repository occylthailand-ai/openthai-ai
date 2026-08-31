#!/usr/bin/env bash
# tools/audit/generate-checksums.sh
# ----------------------------------
# Computes SHA-256 checksums for every file under audit-evidence/,
# excluding the checksums file itself, and writes them to
# audit-evidence/04-integrity/sha256sums.txt.
#
# Usage:
#   bash tools/audit/generate-checksums.sh [AUDIT_DIR]
#
# Environment:
#   AUDIT_DIR  path to the audit-evidence root (default: audit-evidence)
set -euo pipefail

AUDIT_DIR="${1:-${AUDIT_DIR:-audit-evidence}}"
INTEGRITY_DIR="${AUDIT_DIR}/04-integrity"
CHECKSUMS_FILE="${INTEGRITY_DIR}/sha256sums.txt"

if [ ! -d "${AUDIT_DIR}" ]; then
  echo "[X] Audit directory not found: ${AUDIT_DIR}"
  exit 1
fi

mkdir -p "${INTEGRITY_DIR}"

echo "[*] Computing SHA-256 checksums under ${AUDIT_DIR}/ ..."

find "${AUDIT_DIR}" \
  -type f \
  ! -path "*/${CHECKSUMS_FILE}" \
  -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  > "${CHECKSUMS_FILE}"

COUNT=$(wc -l < "${CHECKSUMS_FILE}")
echo "[✓] ${COUNT} file(s) hashed → ${CHECKSUMS_FILE}"

# Append the manifest hash last so it covers all other files
MANIFEST="${AUDIT_DIR}/manifest.json"
if [ -f "${MANIFEST}" ]; then
  sha256sum "${MANIFEST}" >> "${CHECKSUMS_FILE}"
  echo "[✓] manifest.json hash appended"
fi
