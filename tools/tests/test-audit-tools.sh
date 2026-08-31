#!/usr/bin/env bash
# tools/tests/test-audit-tools.sh
# ---------------------------------
# Unit & Integration tests for the Canonical Audit Tools.
# Run from the repository root:
#   bash tools/tests/test-audit-tools.sh
#
# Exit codes:
#   0  all tests passed
#   1  one or more tests failed
set -euo pipefail

PASS=0
FAIL=0
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "${TEST_DIR}"' EXIT

_pass() { echo "[✓] PASS: $*"; PASS=$((PASS + 1)); }
_fail() { echo "[X] FAIL: $*"; FAIL=$((FAIL + 1)); }

echo "========================================="
echo " OpenThaiAi Audit Tools Test Suite       "
echo "========================================="


# ─── Test 1: Manifest generation — all required artifacts present ───────────
echo ""
echo "--- Test 1: Manifest generation (all artifacts present) ---"
mkdir -p "${TEST_DIR}/00-metadata" "${TEST_DIR}/01-quality"
cat > "${TEST_DIR}/00-metadata/artifact-index.json" << 'IDXEOF'
{
  "artifacts": [
    {"path": "01-quality/report.json", "type": "json", "required": true}
  ]
}
IDXEOF
echo '{"status": "ok"}' > "${TEST_DIR}/01-quality/report.json"

if python3 tools/audit/generate-manifest.py \
     --component "apps/test-comp" \
     --evidence-dir "${TEST_DIR}" \
     --output "${TEST_DIR}/manifest.json" > /dev/null 2>&1; then
  VERDICT=$(python3 -c "import json; d=json.load(open('${TEST_DIR}/manifest.json')); print(d['verdict']['status'])")
  if [ "${VERDICT}" = "VERIFIED_GREEN_BUILD" ]; then
    _pass "Manifest generation with all evidence present"
  else
    _fail "Manifest verdict should be VERIFIED_GREEN_BUILD, got: ${VERDICT}"
  fi
else
  _fail "generate-manifest.py exited non-zero with all evidence present"
fi


# ─── Test 2: Manifest generation — missing required artifact ────────────────
echo ""
echo "--- Test 2: Manifest generation (missing required artifact) ---"
TEST2_DIR="$(mktemp -d)"
mkdir -p "${TEST2_DIR}/00-metadata"
cat > "${TEST2_DIR}/00-metadata/artifact-index.json" << 'IDXEOF'
{
  "artifacts": [
    {"path": "01-quality/missing.json", "type": "json", "required": true}
  ]
}
IDXEOF

if python3 tools/audit/generate-manifest.py \
     --component "apps/test-comp" \
     --evidence-dir "${TEST2_DIR}" \
     --output "${TEST2_DIR}/manifest.json" > /dev/null 2>&1; then
  _fail "generate-manifest.py should exit 1 when required evidence is missing"
else
  EXIT_CODE=$?
  VERDICT=$(python3 -c "import json; d=json.load(open('${TEST2_DIR}/manifest.json')); print(d['verdict']['status'])" 2>/dev/null || echo "NO_MANIFEST")
  if [ "${EXIT_CODE}" -eq 1 ] && [ "${VERDICT}" = "FAILED" ]; then
    _pass "Manifest exits 1 with verdict=FAILED when required evidence is missing"
  else
    _fail "Expected exit 1 + verdict FAILED, got exit=${EXIT_CODE} verdict=${VERDICT}"
  fi
fi
rm -rf "${TEST2_DIR}"


# ─── Test 3: Schema version is 1.1.0 ────────────────────────────────────────
echo ""
echo "--- Test 3: Schema version 1.1.0 ---"
SCHEMA=$(python3 -c "import json; d=json.load(open('${TEST_DIR}/manifest.json')); print(d.get('schema_version',''))" 2>/dev/null || echo "")
if [ "${SCHEMA}" = "1.1.0" ]; then
  _pass "Manifest schema_version is 1.1.0"
else
  _fail "Expected schema_version 1.1.0, got: ${SCHEMA}"
fi


# ─── Test 4: Per-file sha256 in artifact_summary ────────────────────────────
echo ""
echo "--- Test 4: Per-file sha256 in artifact_summary ---"
HAS_SHA=$(python3 - << PYEOF
import json
d = json.load(open("${TEST_DIR}/manifest.json"))
arts = d.get("artifact_summary", [])
print("yes" if arts and "sha256" in arts[0] else "no")
PYEOF
)
if [ "${HAS_SHA}" = "yes" ]; then
  _pass "artifact_summary contains sha256 per file"
else
  _fail "artifact_summary missing sha256 field"
fi


# ─── Test 5: Secret redaction — env KEY=value ────────────────────────────────
echo ""
echo "--- Test 5: Secret redaction (env style) ---"
REDACT_FILE="${TEST_DIR}/secret.env"
# Use a clearly non-sensitive-looking test value to avoid scanner masking
printf 'DATABASE_URL=testpassXYZ789@localhost:5432/db\n' > "${REDACT_FILE}"
python3 tools/audit/redact-secrets.py --input "${REDACT_FILE}" > /dev/null 2>&1
if grep -qF "testpassXYZ789" "${REDACT_FILE}"; then
  _fail "Secret redaction failed to mask DATABASE_URL password"
else
  _pass "Secret redaction masked DATABASE_URL value"
fi


# ─── Test 6: Secret redaction — JSON "key": "value" ─────────────────────────
echo ""
echo "--- Test 6: Secret redaction (JSON style) ---"
JSON_FILE="${TEST_DIR}/container-inspect.json"
printf '{"PASSWORD": "myjsonpassword123"}\n' > "${JSON_FILE}"
python3 tools/audit/redact-secrets.py --input "${JSON_FILE}" > /dev/null 2>&1
if grep -qF "myjsonpassword123" "${JSON_FILE}"; then
  _fail "Secret redaction failed to mask JSON PASSWORD value"
else
  _pass "Secret redaction masked JSON PASSWORD value"
fi


# ─── Test 7: Secret redaction — Authorization header ────────────────────────
echo ""
echo "--- Test 7: Secret redaction (Authorization header) ---"
BEARER_FILE="${TEST_DIR}/bearer.txt"
# Write a non-JWT test value that the CI scanner won't mask
printf 'Authorization: faketoken-abc123XYZ' > "${BEARER_FILE}"
python3 tools/audit/redact-secrets.py --input "${BEARER_FILE}" > /dev/null 2>&1
if grep -qF "faketoken-abc123XYZ" "${BEARER_FILE}"; then
  _fail "Secret redaction failed to mask Authorization value"
else
  _pass "Secret redaction masked Authorization value"
fi


# ─── Test 8: Checksum generation ────────────────────────────────────────────
echo ""
echo "--- Test 8: Checksum generation ---"
bash tools/audit/generate-checksums.sh "${TEST_DIR}" > /dev/null 2>&1
CHECKSUM_FILE="${TEST_DIR}/05-integrity/sha256sums.txt"
if [ -f "${CHECKSUM_FILE}" ]; then
  _pass "Checksum file created at 05-integrity/sha256sums.txt"
else
  _fail "Checksum file not found at 05-integrity/sha256sums.txt"
fi


# ─── Test 9: Checksum file excludes itself ───────────────────────────────────
echo ""
echo "--- Test 9: Checksum self-exclusion ---"
if grep -q "sha256sums.txt" "${CHECKSUM_FILE}"; then
  _fail "sha256sums.txt should not reference itself in checksums"
else
  _pass "sha256sums.txt correctly excludes itself"
fi


# ─── Test 10: Gate validation — all success (exit 0) ────────────────────────
echo ""
echo "--- Test 10: Gate validation — all success ---"
if bash tools/ci/validate-gates.sh success success success > /dev/null 2>&1; then
  _pass "validate-gates.sh exits 0 when all gates are success"
else
  _fail "validate-gates.sh should exit 0 when all gates are success"
fi


# ─── Test 11: Gate validation — one failure (exit 1) ────────────────────────
echo ""
echo "--- Test 11: Gate validation — one failure ---"
if bash tools/ci/validate-gates.sh failure success success > /dev/null 2>&1; then
  _fail "validate-gates.sh should exit 1 when quality gate fails"
else
  EXIT_CODE=$?
  if [ "${EXIT_CODE}" -eq 1 ]; then
    _pass "validate-gates.sh exits 1 when quality gate is failure"
  else
    _fail "Expected exit code 1, got ${EXIT_CODE}"
  fi
fi


# ─── Test 12: Gate validation — unknown status (exit 2) ─────────────────────
echo ""
echo "--- Test 12: Gate validation — CONFIG_ERROR (exit 2) ---"
bash tools/ci/validate-gates.sh unknown success success > /dev/null 2>&1 || EXIT_CODE=$?
if [ "${EXIT_CODE:-0}" -eq 2 ]; then
  _pass "validate-gates.sh exits 2 for CONFIG_ERROR (unknown status)"
else
  _fail "Expected exit code 2 for unknown status, got ${EXIT_CODE:-0}"
fi


# ─── Test 13: Gate FAIL verdict in output ────────────────────────────────────
echo ""
echo "--- Test 13: Gate FAILED verdict in output ---"
OUTPUT=$(bash tools/ci/validate-gates.sh failure success success 2>&1 || true)
if echo "${OUTPUT}" | grep -q "FINAL VERDICT: FAILED"; then
  _pass "validate-gates.sh outputs FINAL VERDICT: FAILED"
else
  _fail "Expected 'FINAL VERDICT: FAILED' in output"
fi


# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo " Test Summary"
echo "========================================="
echo " Passed : ${PASS}"
echo " Failed : ${FAIL}"
echo "========================================="

if [ "${FAIL}" -gt 0 ]; then
  echo "[X] ${FAIL} test(s) failed."
  exit 1
fi
echo "[✓] All ${PASS} audit tools tests passed successfully!"
