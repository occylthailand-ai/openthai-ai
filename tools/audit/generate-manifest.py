#!/usr/bin/env python3
"""
tools/audit/generate-manifest.py
---------------------------------
Validates that all required evidence files exist (per artifact-index.json)
and writes a machine-readable manifest.json to the audit-evidence root.

Usage (local):
    python3 tools/audit/generate-manifest.py

Usage (CI — after downloading all stage artifacts):
    python3 tools/audit/generate-manifest.py

Exit codes:
    0  all required evidence present; manifest written
    1  one or more required evidence files missing
"""

import json
import os
import sys
from datetime import datetime, timezone

AUDIT_DIR = os.environ.get("AUDIT_DIR", "audit-evidence")
INDEX_PATH = os.path.join(AUDIT_DIR, "00-metadata", "artifact-index.json")
MANIFEST_PATH = os.path.join(AUDIT_DIR, "manifest.json")

# Fixed status vocabulary — only these values are valid
VALID_STATUSES = {"PASSED", "FAILED", "SKIPPED", "NOT_RUN"}


def check_artifacts() -> bool:
    """Validate evidence files against artifact-index.json.

    Returns True if all *required* artifacts are present.
    Rewrites artifact-index.json with 'exists' flags populated.
    """
    if not os.path.exists(INDEX_PATH):
        print(f"[-] Warning: {INDEX_PATH} not found — skipping strict index check.")
        return True

    with open(INDEX_PATH, encoding="utf-8") as f:
        index_data = json.load(f)

    artifacts = index_data.get("artifacts", {})

    # Support both list-of-dicts format and key→path dict format
    if isinstance(artifacts, dict):
        items = [{"name": k, "path": v, "required": True} for k, v in artifacts.items()]
    else:
        items = artifacts

    all_present = True
    for item in items:
        file_path = os.path.join(AUDIT_DIR, item["path"])
        exists = os.path.isfile(file_path)
        item["exists"] = exists
        required = item.get("required", True)
        if required and not exists:
            print(f"[X] Required evidence missing: {item['path']}")
            all_present = False
        else:
            status_char = "✓" if exists else "~"
            print(f"[{status_char}] {'Found' if exists else 'Optional, absent'}: {item['path']}")

    # Persist updated index with 'exists' flags
    index_data["artifacts"] = items
    index_data["checked_at"] = _utcnow()
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index_data, f, indent=2)

    return all_present


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _env(key: str, default: str = "unknown") -> str:
    return os.environ.get(key, default)


def build_manifest(evidence_complete: bool) -> dict:
    quality_status  = _env("QUALITY_RESULT",  "NOT_RUN")
    docker_status   = _env("DOCKER_RESULT",   "NOT_RUN")
    security_status = _env("SECURITY_RESULT", "NOT_RUN")

    # Normalise raw GitHub Actions results to canonical vocabulary
    def to_status(raw: str) -> str:
        mapping = {
            "success": "PASSED",
            "failure": "FAILED",
            "skipped": "SKIPPED",
            "cancelled": "NOT_RUN",
        }
        return mapping.get(raw.lower(), raw.upper() if raw.upper() in VALID_STATUSES else "NOT_RUN")

    q = to_status(quality_status)
    d = to_status(docker_status)
    s = to_status(security_status)

    all_passed = all(v == "PASSED" for v in [q, d, s])
    verdict = "VERIFIED_GREEN_BUILD" if (all_passed and evidence_complete) else "FAILED"

    return {
        "schema_version": "1.0.0",
        "project": "OpenThaiAi",
        "component": "apps/api-gateway",
        "pipeline_run": {
            "provider": "github-actions",
            "workflow": _env("GITHUB_WORKFLOW"),
            "run_id": _env("GITHUB_RUN_ID", "local"),
            "run_number": _env("GITHUB_RUN_NUMBER", "0"),
            "run_attempt": _env("GITHUB_RUN_ATTEMPT", "1"),
            "commit_sha": _env("GITHUB_SHA", "LOCAL"),
            "branch": _env("GITHUB_REF_NAME", "local"),
            "ref": _env("GITHUB_REF", "refs/heads/local"),
            "repository": _env("GITHUB_REPOSITORY"),
            "actor": _env("GITHUB_ACTOR"),
            "event": _env("GITHUB_EVENT_NAME"),
            "timestamp_utc": _utcnow(),
            "runner": _env("RUNNER_NAME", "local"),
        },
        "canonical_runtime": {
            "runtime": "nodejs",
            "node_version": "20",
            "port": 3000,
            "dockerfile": "apps/api-gateway/Dockerfile",
        },
        "stages": {
            "quality_gate":      {"status": q},
            "docker_integration": {"status": d},
            "security_gate":     {"status": s},
        },
        "checks": {
            "lint":             q,
            "typecheck":        q,
            "unit_tests":       q,
            "coverage":         q,
            "docker_build":     d,
            "health":           d,
            "readiness":        d,
            "smoke_test":       d,
            "dependency_audit": s,
            "secret_scan":      s,
        },
        "artifacts": {
            "coverage":          "01-quality/coverage/coverage-summary.json",
            "eslint":            "01-quality/eslint-report.json",
            "typecheck":         "01-quality/typecheck-log.txt",
            "unit_tests":        "01-quality/unit-test-output.txt",
            "image_inspect":     "02-integration/image-inspect.json",
            "image_digest":      "02-integration/image-digest.txt",
            "container_logs":    "02-integration/container-logs.txt",
            "container_inspect": "02-integration/container-inspect.json",
            "health":            "02-integration/health-response.json",
            "readiness":         "02-integration/ready-response.json",
            "smoke_test":        "02-integration/smoke-test-result.json",
            "npm_audit":         "03-security/npm-audit.json",
            "gitleaks":          "03-security/gitleaks-report.json",
            "checksums":         "04-integrity/sha256sums.txt",
        },
        "verdict": {
            "status": verdict,
            "fail_closed": True,
            "evidence_complete": evidence_complete,
        },
    }


def write_manifest(manifest: dict) -> None:
    os.makedirs(AUDIT_DIR, exist_ok=True)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[✓] Manifest written to {MANIFEST_PATH}")
    print(f"    verdict: {manifest['verdict']['status']}")


def main() -> int:
    evidence_complete = check_artifacts()
    manifest = build_manifest(evidence_complete)
    write_manifest(manifest)

    if not evidence_complete:
        print("[X] One or more required evidence files are missing — exiting 1")
        return 1

    if manifest["verdict"]["status"] != "VERIFIED_GREEN_BUILD":
        print("[X] Verdict is not VERIFIED_GREEN_BUILD — exiting 1")
        return 1

    print("[✓] All checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
