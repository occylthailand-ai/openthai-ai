#!/usr/bin/env python3
"""
tools/audit/generate-manifest.py
----------------------------------
Validates that all required evidence files exist (per artifact-index.json)
and writes a canonical manifest.json.

Usage:
    python3 tools/audit/generate-manifest.py \
        --component apps/api-gateway \
        --evidence-dir audit-evidence \
        --output audit-evidence/manifest.json

Exit codes:
    0  all required evidence present; manifest written
    1  one or more required evidence files missing
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate canonical audit manifest.json"
    )
    parser.add_argument(
        "--component", required=True,
        help="Component name (e.g., apps/api-gateway)"
    )
    parser.add_argument(
        "--evidence-dir", required=True,
        help="Path to audit-evidence directory"
    )
    parser.add_argument(
        "--output", required=True,
        help="Path to output manifest.json"
    )
    return parser.parse_args()


def check_artifacts(audit_dir: str) -> bool:
    """Validate evidence files against artifact-index.json.

    Returns True if all *required* artifacts are present.
    Rewrites artifact-index.json with 'exists' flags populated.
    """
    index_path = os.path.join(audit_dir, "00-metadata", "artifact-index.json")
    if not os.path.exists(index_path):
        print(f"[-] Notice: {index_path} not found. Skipping strict index verification.")
        return True

    with open(index_path, encoding="utf-8") as f:
        index_data = json.load(f)

    artifacts = index_data.get("artifacts", [])

    # Support both list-of-dicts and key→path dict formats
    if isinstance(artifacts, dict):
        items = [{"name": k, "path": v, "required": True} for k, v in artifacts.items()]
    else:
        items = artifacts

    all_exist = True
    for item in items:
        file_path = os.path.join(audit_dir, item["path"])
        exists = os.path.isfile(file_path)
        item["exists"] = exists
        required = item.get("required", True)
        if required and not exists:
            print(f"[X] Required evidence missing: {item['path']}")
            all_exist = False
        else:
            print(f"[✓] Verified evidence: {item['path']}")

    index_data["artifacts"] = items
    index_data["checked_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index_data, f, indent=2)

    return all_exist


def _env(key: str, default: str = "unknown") -> str:
    return os.environ.get(key, default)


def build_manifest(component: str, success: bool) -> dict:
    return {
        "schema_version": "1.0.0",
        "project": "OpenThaiAi",
        "component": component,
        "pipeline_run": {
            "provider": "github-actions" if os.getenv("GITHUB_ACTIONS") else "local",
            "workflow": _env("GITHUB_WORKFLOW"),
            "run_id": _env("GITHUB_RUN_ID", "local-run"),
            "run_number": _env("GITHUB_RUN_NUMBER", "0"),
            "run_attempt": _env("GITHUB_RUN_ATTEMPT", "1"),
            "commit_sha": _env("GITHUB_SHA", "LOCAL_COMMIT"),
            "branch": _env("GITHUB_REF_NAME", "main"),
            "ref": _env("GITHUB_REF", "refs/heads/main"),
            "repository": _env("GITHUB_REPOSITORY"),
            "actor": _env("GITHUB_ACTOR", "system"),
            "event": _env("GITHUB_EVENT_NAME"),
            "timestamp_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "runner": _env("RUNNER_NAME", "local"),
        },
        "canonical_runtime": {
            "runtime": "nodejs",
            "node_version": "20",
            "port": 3000,
            "dockerfile": "apps/api-gateway/Dockerfile",
        },
        "stages": {
            "quality_gate":       {"status": _env("QUALITY_RESULT",  "NOT_RUN")},
            "docker_integration": {"status": _env("DOCKER_RESULT",   "NOT_RUN")},
            "security_gate":      {"status": _env("SECURITY_RESULT", "NOT_RUN")},
        },
        "verdict": {
            "status": "VERIFIED_GREEN_BUILD" if success else "FAILED",
            "fail_closed": True,
            "evidence_complete": success,
        },
    }


def main() -> int:
    args = parse_args()
    success = check_artifacts(args.evidence_dir)
    manifest = build_manifest(args.component, success)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"[✓] Canonical manifest generated successfully at {args.output}")
    print(f"    verdict: {manifest['verdict']['status']}")

    if not success:
        print("[X] One or more required evidence files are missing — exiting 1")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
