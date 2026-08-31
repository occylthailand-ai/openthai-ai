# OpenThaiAi — Tools & Utilities

Central toolkit for CI/CD quality gates, audit evidence generation,
and security scanning.  All scripts run both locally and inside
GitHub Actions runners — making this an **Executable Policy**, not just
a document.

---

## Directory layout

```
tools/
├── audit/
│   ├── generate-manifest.py    Generate and validate audit-evidence/manifest.json
│   ├── generate-checksums.sh   SHA-256 checksums for 05-integrity/sha256sums.txt
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

## Quick start — run all tools after a local build

```bash
# 1. Checksums for every evidence file
bash tools/audit/generate-checksums.sh audit-evidence

# 2. Redact secrets from container logs before archiving
python3 tools/audit/redact-secrets.py \
  --input audit-evidence/02-integration \
  --recursive

# 3. Generate manifest (validates artifact-index.json; writes manifest.json)
QUALITY_RESULT=PASSED DOCKER_RESULT=PASSED SECURITY_RESULT=PASSED \
python3 tools/audit/generate-manifest.py \
  --component apps/api-gateway \
  --evidence-dir audit-evidence \
  --output audit-evidence/manifest.json

# 4. Fail-closed gate validation
bash tools/ci/validate-gates.sh success success success
```

---

## tools/audit/generate-manifest.py

Reads `audit-evidence/00-metadata/artifact-index.json`, checks every listed
file exists, and writes `audit-evidence/manifest.json` with the canonical
schema (schema_version 1.0.0).

**CLI arguments:**

| Argument | Required | Description |
|---|---|---|
| `--component` | yes | Component path, e.g. `apps/api-gateway` |
| `--evidence-dir` | yes | Root of the audit-evidence directory |
| `--output` | yes | Destination path for `manifest.json` |

**Environment variables consumed (auto-populated in GitHub Actions):**

| Variable | Default |
|---|---|
| `GITHUB_ACTIONS` | _(not set = local)_ |
| `GITHUB_RUN_ID` | `local-run` |
| `GITHUB_SHA` | `LOCAL_COMMIT` |
| `GITHUB_REF_NAME` | `main` |
| `GITHUB_REPOSITORY` | `unknown` |
| `GITHUB_ACTOR` | `system` |
| `QUALITY_RESULT` | `NOT_RUN` |
| `DOCKER_RESULT` | `NOT_RUN` |
| `SECURITY_RESULT` | `NOT_RUN` |

---

## tools/audit/generate-checksums.sh

Computes SHA-256 for every file under `audit-evidence/` (excluding the
checksums file itself) and writes results to `05-integrity/sha256sums.txt`.

```bash
# Default: operates on audit-evidence/
bash tools/audit/generate-checksums.sh

# Custom audit dir
bash tools/audit/generate-checksums.sh /path/to/audit-evidence
```

---

## tools/audit/redact-secrets.py

Masks `DATABASE_URL`, `REDIS_URL`, `TOKEN`, `PASSWORD`, `SECRET`,
`API_KEY`, `POSTGRES_PASSWORD`, `AUTHORIZATION`, `COOKIE`, `SESSION`,
`PRIVATE_KEY`, `ACCESS_KEY`, `PASSWD`, and `AUTH` from files.
Supports both shell (`KEY=value`) and JSON (`"key": "value"`) formats.

**CLI arguments:**

| Argument | Description |
|---|---|
| `--input` | File or directory to redact |
| `--recursive` | Walk the directory recursively (required when `--input` is a dir) |

```bash
# Single file
python3 tools/audit/redact-secrets.py \
  --input audit-evidence/02-integration/container-inspect.json

# Entire directory
python3 tools/audit/redact-secrets.py \
  --input audit-evidence \
  --recursive
```

The `05-integrity/` and `04-integrity/` subdirectories are automatically
skipped to avoid corrupting checksum files.

---

## tools/ci/validate-gates.sh

Fail-closed validator: exits 1 unless all three stage results equal `success`
(raw GitHub Actions `needs.*.result` values).

```bash
# Positional arguments
bash tools/ci/validate-gates.sh <quality_result> <docker_result> <security_result>

# Environment variables (alternative)
QUALITY_GATE=success DOCKER_GATE=success SECURITY_GATE=success \
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

Detects lockfile type (`pnpm-lock.yaml` → pnpm, `package-lock.json` → npm)
and runs a dependency audit.  Writes JSON report to `audit-evidence/04-security/`.

```bash
bash tools/security/run-audit.sh

# Custom output directory and threshold
bash tools/security/run-audit.sh \
  --output-dir audit-evidence/04-security \
  --level high
```

---

## Status vocabulary

All tools use the same fixed vocabulary.  **Do not use** alternative strings
such as `OK`, `GREEN`, `SUCCESS`, or `SUCCESSFUL`.

| Value | Meaning |
|---|---|
| `PASSED` | Stage or check completed successfully (manifest / generate-manifest) |
| `FAILED` | Stage or check failed |
| `SKIPPED` | Stage was deliberately skipped |
| `NOT_RUN` | Stage did not run (e.g. upstream dependency cancelled) |
| `success` | Raw GitHub Actions `needs.*.result` — used in validate-gates.sh |
| `VERIFIED_GREEN_BUILD` | Final verdict when all stages PASSED + evidence complete |

> **Note:** `validate-gates.sh` uses the raw `success`/`failure` strings that
> GitHub Actions writes into `needs.*.result`.  All other tools use the
> canonical `PASSED`/`FAILED`/… vocabulary.

---

## Canonical workflow template

`tools/ci/templates/workflow-ci.yml` is the authoritative source for the
API Gateway CI/CD pipeline.  Copy it to `.github/workflows/` when setting up
a new service, then adjust `GATEWAY_IMAGE`, `GATEWAY_PORT`, and the `paths:`
trigger filter.
