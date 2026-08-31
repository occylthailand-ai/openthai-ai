#!/usr/bin/env python3
"""
tools/audit/redact-secrets.py
-------------------------------
Redacts sensitive secrets from audit evidence files before they are
packaged into a CI artifact or stored long-term.

Usage:
    # Redact a single file
    python3 tools/audit/redact-secrets.py --input path/to/file.json

    # Redact an entire directory recursively
    python3 tools/audit/redact-secrets.py --input audit-evidence/ --recursive

Exit codes:
    0  processing completed (including graceful skips)
    1  unexpected error during processing
"""

import argparse
import os
import re
import sys

SENSITIVE_KEYS = [
    "PASSWORD",
    "PASSWD",
    "SECRET",
    "TOKEN",
    "API_KEY",
    "APIKEY",
    "ACCESS_KEY",
    "PRIVATE_KEY",
    "DATABASE_URL",
    "AUTHORIZATION",
    "COOKIE",
    "SESSION",
    "POSTGRES_PASSWORD",
    "REDIS_URL",
    "AUTH",
]

# shell/env style:  KEY=value  or  KEY="value"
_PATTERN_ENV = re.compile(
    r"(?P<key>" + "|".join(re.escape(k) for k in SENSITIVE_KEYS) + r")"
    r"(?P<eq>\s*=\s*)(?P<val>['\"]?[^'\"\n\s]+['\"]?)",
    re.IGNORECASE,
)
# JSON style:  "key": "value"
_PATTERN_JSON = re.compile(
    r'(?P<key>"(?:' + "|".join(re.escape(k) for k in SENSITIVE_KEYS) + r')"'
    r"\s*:\s*\")(?P<val>[^\"]*)(?P<close>\")",
    re.IGNORECASE,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Redact sensitive secrets from audit evidence files"
    )
    parser.add_argument(
        "--input", required=True,
        help="Path to audit-evidence directory or a single file"
    )
    parser.add_argument(
        "--recursive", action="store_true",
        help="Recursively process all files in the directory"
    )
    return parser.parse_args()


def redact_content(text: str) -> str:
    text = _PATTERN_ENV.sub(r"\g<key>\g<eq>[REDACTED]", text)
    text = _PATTERN_JSON.sub(r"\g<key>[REDACTED]\g<close>", text)
    return text


def process_file(filepath: str) -> None:
    try:
        with open(filepath, encoding="utf-8", errors="ignore") as f:
            original = f.read()
    except OSError as exc:
        print(f"[-] Cannot read {filepath}: {exc}")
        return

    sanitised = redact_content(original)
    if sanitised == original:
        print(f"[~] No sensitive values found: {filepath}")
        return

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(sanitised)
    print(f"[✓] Redacted secrets in file: {filepath}")


def main() -> int:
    args = parse_args()
    errors = 0

    if os.path.isfile(args.input):
        try:
            process_file(args.input)
        except Exception as exc:  # noqa: BLE001
            print(f"[X] Error: {exc}", file=sys.stderr)
            errors += 1

    elif os.path.isdir(args.input):
        if not args.recursive:
            print(
                f"[!] {args.input} is a directory — use --recursive to process all files."
            )
            return 1
        for root, dirs, files in os.walk(args.input):
            # Skip integrity directory to avoid corrupting checksums
            dirs[:] = [d for d in dirs if d not in ("05-integrity", "04-integrity")]
            for filename in files:
                filepath = os.path.join(root, filename)
                try:
                    process_file(filepath)
                except Exception as exc:  # noqa: BLE001
                    print(f"[-] Skipping {filepath}: {exc}")

    else:
        print(f"[X] Path not found: {args.input}", file=sys.stderr)
        return 1

    print("[✓] Secret redaction process completed.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
