#!/usr/bin/env python3
"""
tools/audit/generate-manifest.py
----------------------------------
Validates required evidence files, computes per-file SHA-256 + size, and
writes a canonical manifest.json (schema_version 1.1.0).

Usage:
    python3 tools/audit/generate-manifest.py \
        --component apps/api-gateway \
        --evidence-dir audit-evidence \
        --output audit-evidence/manifest.json

Exit codes:
    0  all required evidence present; manifest written
    1  one or more required evidence files missing or index unreadable
"""

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate canonical audit manifest.json"
    )
    parser.add_argument(
        "--component", required=True,
        help="Component name (e.g., apps/api-gateway)",
    )
    parser.add_argument(
        "--evidence-dir", required=True,
        help="Path to audit-evidence directory",
    )
    parser.add_argument(
        "--output", required=True,
        help="Path to output manifest.json",
    )
    return parser.parse_args()


def calculate_sha256(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def check_artifacts(audit_dir: str) -> tuple[bool, dict]:
    """Validate evidence files against artifact-index.json.

    Returns (all_required_present, enriched_index_data).
    Rewrites artifact-index.json with exists/size_bytes/sha256 populated.
    """
    index_path = os.path.join(audit_dir, "00-metadata", "artifact-index.json")

    if not os.path.exists(index_path):
        print(f"[-] Configuration/Execution Error: {index_path} not found.")
        return False, {}

    try:
        with open(index_path, encoding="utf-8") as f:
            index_data = json.load(f)
    except Exception as exc:
        print(f"[-] Configuration/Execution Error: Failed to parse artifact-index.json: {exc}")
        return False, {}

    artifacts = index_data.get("artifacts", [])
    # Support both list-of-dicts and key→path dict formats
    if isinstance(artifacts, dict):
        artifacts = [{"name": k, "path": v, "required": True} for k, v in artifacts.items()]

    all_exist = True
    enriched: list[dict] = []

    for item in artifacts:
        rel_path = item["path"]
        file_path = os.path.join(audit_dir, rel_path)
        # Guard against symlink traversal
        exists = os.path.isfile(file_path) and not os.path.islink(file_path)
        required = item.get("required", True)

        entry: dict = {
            "path": rel_path,
            "type": item.get("type", "unknown"),
            "required": required,
            "exists": exists,
        }

        if exists:
            entry["size_bytes"] = os.path.getsize(file_path)
            entry["sha256"] = calculate_sha256(file_path)
            print(f"[✓] Verified evidence: {rel_path}")
        else:
            if required:
                print(f"[X] Gate Failure: Required evidence missing or invalid symlink: {rel_path}")
                all_exist = False
            else:
                print(f"[-] Optional evidence missing: {rel_path}")

        enriched.append(entry)

    index_data["artifacts"] = enriched
    index_data["checked_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index_data, f, indent=2)

    return all_exist, index_data


def _env(key: str, default: str = "unknown") -> str:
    return os.environ.get(key, default)


def build_manifest(component: str, success: bool, index_data: dict) -> dict:
    return {
        "schema_version": "1.1.0",
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
        "artifact_summary": index_data.get("artifacts", []),
        "verdict": {
            "status": "VERIFIED_GREEN_BUILD" if success else "FAILED",
            "fail_closed": True,
            "evidence_complete": success,
        },
    }


def main() -> int:
    args = parse_args()
    success, index_data = check_artifacts(args.evidence_dir)
    manifest = build_manifest(args.component, success, index_data)

    out_dir = os.path.dirname(os.path.abspath(args.output))
    os.makedirs(out_dir, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"[✓] Canonical manifest generated successfully at {args.output}")
    print(f"    schema_version: {manifest['schema_version']}")
    print(f"    verdict: {manifest['verdict']['status']}")

    if not success:
        print("[X] One or more required evidence files are missing — exiting 1")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
