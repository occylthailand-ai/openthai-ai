#!/usr/bin/env bash
# tools/audit/generate-checksums.sh
# ----------------------------------
# Generates deterministic SHA-256 checksums for every file under
# audit-evidence/, excluding sha256sums.txt itself, and writes them to
# audit-evidence/05-integrity/sha256sums.txt.
#
# Usage:
#   bash tools/audit/generate-checksums.sh [AUDIT_DIR]
#
# Arguments:
#   AUDIT_DIR  path to the audit-evidence root (default: audit-evidence)
set -euo pipefail

AUDIT_DIR="${1:-${AUDIT_DIR:-audit-evidence}}"
INTEGRITY_DIR="${AUDIT_DIR}/05-integrity"
CHECKSUM_FILE="${INTEGRITY_DIR}/sha256sums.txt"

if [ ! -d "${AUDIT_DIR}" ]; then
  echo "[X] Audit directory not found: ${AUDIT_DIR}"
  exit 1
fi

mkdir -p "${INTEGRITY_DIR}"

echo "[*] Generating deterministic SHA-256 integrity checksums..."

# Exclude the checksums file by filename to prevent circular self-reference.
# sort -z ensures deterministic ordering regardless of filesystem order.
find "${AUDIT_DIR}" \
    -type f \
    ! -name "sha256sums.txt" \
    -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    > "${CHECKSUM_FILE}"

COUNT=$(wc -l < "${CHECKSUM_FILE}")
echo "[✓] Integrity checksums successfully written to ${CHECKSUM_FILE} (${COUNT} files)"
