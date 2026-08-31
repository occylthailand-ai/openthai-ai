# OpenThaiAi — Tools & Utilities

Central toolkit for CI/CD quality gates, audit evidence generation,
and security scanning. All scripts are designed to work both locally
and inside GitHub Actions runners.

---

## Directory layout

```
tools/
├── audit/
│   ├── generate-manifest.py    Generate and validate audit-evidence/manifest.json
│   ├── generate-checksums.sh   SHA-256 checksums for 04-integrity/sha256sums.txt
│   └── redact-secrets.py       Redact sensitive values before packaging artifacts
├── ci/
│   ├── validate-gates.sh       Fail-closed gate validator (local + CI)
│   └── templates/
│       └── workflow-ci.yml     Canonical GitHub Actions workflow template
├── security/
│   ├── run-gitleaks.sh         Local and CI secret scanning via gitleaks
│   └── run-audit.sh            Dependency audit via pnpm/npm
└── README.md                   This file
```

---

## Quick start

### Run all audit tools after a local build

```bash
# 1. Generate checksums for all evidence files
bash tools/audit/generate-checksums.sh

# 2. Redact secrets from container logs before archiving
python3 tools/audit/redact-secrets.py

# 3. Generate manifest (validates artifact-index.json and writes manifest.json)
QUALITY_RESULT=PASSED DOCKER_RESULT=PASSED SECURITY_RESULT=PASSED \
  python3 tools/audit/generate-manifest.py

# 4. Validate all gates are green
QUALITY_RESULT=PASSED DOCKER_RESULT=PASSED SECURITY_RESULT=PASSED \
  bash tools/ci/validate-gates.sh
```

---

## tools/audit/generate-manifest.py

Reads `audit-evidence/00-metadata/artifact-index.json`, checks every listed
file exists, and writes `audit-evidence/manifest.json` with the canonical
schema (schema_version 1.0.0).

**Environment variables consumed:**

| Variable | Source | Default |
|---|---|---|
| `GITHUB_RUN_ID` | GitHub Actions | `local` |
| `GITHUB_SHA` | GitHub Actions | `LOCAL` |
| `GITHUB_REF_NAME` | GitHub Actions | `local` |
| `GITHUB_REPOSITORY` | GitHub Actions | `unknown-repo` |
| `GITHUB_ACTOR` | GitHub Actions | `unknown` |
| `QUALITY_RESULT` | set by caller | `NOT_RUN` |
| `DOCKER_RESULT` | set by caller | `NOT_RUN` |
| `SECURITY_RESULT` | set by caller | `NOT_RUN` |
| `AUDIT_DIR` | optional override | `audit-evidence` |

**Verdict values (machine-readable):**

| Value | Meaning |
|---|---|
| `VERIFIED_GREEN_BUILD` | All stages PASSED + all required evidence present |
| `FAILED` | Any stage did not PASSED, or required evidence missing |

---

## tools/audit/generate-checksums.sh

Computes SHA-256 for every file under `audit-evidence/` (excluding the
checksums file itself) then appends `manifest.json` last so its hash
covers all other files.

```bash
# Default: operates on audit-evidence/
bash tools/audit/generate-checksums.sh

# Custom audit dir:
bash tools/audit/generate-checksums.sh /path/to/my-audit-dir
```

---

## tools/audit/redact-secrets.py

Masks sensitive values matching `DATABASE_URL`, `REDIS_URL`, `TOKEN`,
`PASSWORD`, `SECRET`, `API_KEY`, `PRIVATE_KEY`, `ACCESS_KEY`, `AUTH`
from named files.  Replaces matched values with `[REDACTED]`.

```bash
# Redact default target files (container inspect + logs + run-info)
python3 tools/audit/redact-secrets.py

# Redact specific files
python3 tools/audit/redact-secrets.py \
  audit-evidence/02-integration/container-inspect.json \
  audit-evidence/00-metadata/run-info.json
```

---

## tools/ci/validate-gates.sh

Fail-closed validator: exits 1 unless all stage results are `PASSED` and
`manifest.json` carries a `VERIFIED_GREEN_BUILD` verdict.

```bash
QUALITY_RESULT=PASSED \
DOCKER_RESULT=PASSED \
SECURITY_RESULT=PASSED \
  bash tools/ci/validate-gates.sh

# Local dry-run (skips manifest file check)
DRY_RUN=1 \
QUALITY_RESULT=PASSED \
DOCKER_RESULT=PASSED \
SECURITY_RESULT=PASSED \
  bash tools/ci/validate-gates.sh
```

---

## tools/security/run-gitleaks.sh

Runs `gitleaks detect` on the repository and writes a JSON report.

```bash
bash tools/security/run-gitleaks.sh

# Custom report path
bash tools/security/run-gitleaks.sh \
  --report-path audit-evidence/03-security/gitleaks-report.json
```

**Prerequisites:** `gitleaks` binary must be on `PATH`.
Install: `brew install gitleaks` / download from
[github.com/gitleaks/gitleaks/releases](https://github.com/gitleaks/gitleaks/releases).

---

## tools/security/run-audit.sh

Runs `pnpm audit` (falls back to `npm audit`) and writes JSON + text
reports.  Fails if vulnerabilities at or above `--level` are found.

```bash
bash tools/security/run-audit.sh

# Custom output directory and threshold
bash tools/security/run-audit.sh \
  --output-dir audit-evidence/03-security \
  --level high
```

---

## Status vocabulary

All tools use the same fixed vocabulary.  **Do not use** alternative strings
such as `OK`, `GREEN`, `SUCCESS`, or `SUCCESSFUL`.

| Value | Meaning |
|---|---|
| `PASSED` | Stage or check completed successfully |
| `FAILED` | Stage or check failed |
| `SKIPPED` | Stage was deliberately skipped |
| `NOT_RUN` | Stage did not run (e.g. upstream dependency cancelled) |

---

## Canonical workflow template

`tools/ci/templates/workflow-ci.yml` is the authoritative source for the
API Gateway CI/CD pipeline.  Copy it to `.github/workflows/` when creating
a new service, then adjust `GATEWAY_IMAGE`, `GATEWAY_PORT`, and the
`paths:` trigger filter.
