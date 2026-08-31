#!/usr/bin/env python3
"""
tools/audit/redact-secrets.py
-------------------------------
Redacts sensitive values (passwords, tokens, API keys) from audit-evidence
files before they are packaged into a CI artifact or stored long-term.

Sensitive patterns are matched case-insensitively.  Matching values are
replaced with [REDACTED] so the file remains structurally valid.

Usage:
    # Redact default target files
    python3 tools/audit/redact-secrets.py

    # Redact specific files
    python3 tools/audit/redact-secrets.py path/to/file1 path/to/file2

Exit codes:
    0  all target files processed (or absent — absent files are skipped)
    1  unexpected error during processing
"""

import os
import re
import sys

# Keys whose values should be redacted wherever they appear in plain text
SENSITIVE_KEYS = [
    "DATABASE_URL",
    "REDIS_URL",
    "API_KEY",
    "APIKEY",
    "TOKEN",
    "PASSWORD",
    "SECRET",
    "PRIVATE_KEY",
    "ACCESS_KEY",
    "AUTH",
]

# Default files to redact when no CLI arguments are given
DEFAULT_TARGETS = [
    "audit-evidence/02-integration/container-inspect.json",
    "audit-evidence/02-integration/container-logs.txt",
    "audit-evidence/00-metadata/run-info.json",
]

# Compiled pattern: KEY=value or "KEY": "value" (JSON style)
_KEY_PATTERN = re.compile(
    r"(?P<key>"
    + "|".join(re.escape(k) for k in SENSITIVE_KEYS)
    + r")(?P<sep>=|\":\s*\")(?P<val>[^\s\"'\n\\]+)",
    re.IGNORECASE,
)


def redact_text(text: str) -> str:
    """Replace sensitive values with [REDACTED]."""
    return _KEY_PATTERN.sub(r"\g<key>\g<sep>[REDACTED]", text)


def redact_file(filepath: str) -> None:
    if not os.path.isfile(filepath):
        print(f"[-] Skipping (not found): {filepath}")
        return

    with open(filepath, encoding="utf-8", errors="ignore") as f:
        original = f.read()

    sanitised = redact_text(original)

    if sanitised == original:
        print(f"[~] No sensitive values found: {filepath}")
        return

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(sanitised)

    redacted_count = original.count(original) - sanitised.count(original)
    print(f"[✓] Redacted: {filepath}")


def main() -> int:
    targets = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_TARGETS
    errors = 0
    for target in targets:
        try:
            redact_file(target)
        except Exception as exc:  # noqa: BLE001
            print(f"[X] Error processing {target}: {exc}", file=sys.stderr)
            errors += 1
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
