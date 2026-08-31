#!/usr/bin/env python3
"""
tools/audit/redact-secrets.py
-------------------------------
Redacts sensitive secrets from audit evidence files before they are
packaged into a CI artifact or stored long-term.

Covers: general KEY=value / JSON pairs, Bearer/JWT tokens, GitHub tokens,
OpenAI API keys, AWS Access Key IDs, and PEM private keys.

Usage:
    # Single file
    python3 tools/audit/redact-secrets.py --input path/to/file.json

    # Entire directory (recursive)
    python3 tools/audit/redact-secrets.py --input audit-evidence/ --recursive

Exit codes:
    0  processing completed
    1  path not found or unexpected error
"""

import argparse
import os
import re
import sys

# Each entry: (compiled_pattern, replacement_string_or_None)
# None = use the group-preserving replacer for KEY=value patterns
_PATTERNS: list[tuple[re.Pattern, str | None]] = [
    # General keywords: KEY=value, KEY = value, "KEY": "value", KEY: 'value'
    (
        re.compile(
            r"(?i)(password|passwd|secret|token|api_key|apikey|access_key"
            r"|database_url|authorization|cookie|session|postgres_password"
            r"|redis_url|private_key|auth)"
            # Optional closing key-quote handles JSON "KEY": "value" format
            # where PASSWORD is followed by " (key closing quote) before :
            r"\"?(\s*=\s*|\s*:\s*['\"]?)([^'\"\n\s}]+)",
        ),
        None,  # group-preserving
    ),
    # ****** JWT tokens
    (re.compile(r"(?i)bearer\s+[a-zA-Z0-9_\-.]+"), "[REDACTED_BEARER]"),
    # GitHub tokens: ghp_, gho_, ghu_, ghs_, ghr_
    (re.compile(r"gh[pousr]_[a-zA-Z0-9]{36,}"), "[REDACTED_GH_TOKEN]"),
    # OpenAI API keys
    (re.compile(r"sk-[a-zA-Z0-9]{20,}"), "[REDACTED_OPENAI_KEY]"),
    # AWS Access Key IDs
    (re.compile(r"AKIA[0-9A-Z]{16}"), "[REDACTED_AWS_KEY]"),
    # PEM private keys (multi-line)
    (
        re.compile(
            r"-----BEGIN[A-Z\s]+PRIVATE KEY-----[\s\S]*?-----END[A-Z\s]+PRIVATE KEY-----",
            re.DOTALL,
        ),
        "[REDACTED_PRIVATE_KEY]",
    ),
]

# Directories to always skip (integrity checksums must not be modified)
_SKIP_DIRS = {"05-integrity", "04-integrity"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Redact sensitive secrets from audit evidence files"
    )
    parser.add_argument(
        "--input", required=True,
        help="Path to audit-evidence directory or a single file",
    )
    parser.add_argument(
        "--recursive", action="store_true",
        help="Recursively process all files in the directory",
    )
    return parser.parse_args()


def _group_replacer(match: re.Match) -> str:
    groups = match.groups()
    if len(groups) >= 3:
        return f"{groups[0]}{groups[1]}[REDACTED]"
    return "[REDACTED]"


def redact_content(text: str) -> str:
    for pattern, replacement in _PATTERNS:
        if replacement is None:
            text = pattern.sub(_group_replacer, text)
        else:
            text = pattern.sub(replacement, text)
    return text


def process_file(path: str) -> None:
    try:
        with open(path, encoding="utf-8", errors="ignore") as f:
            original = f.read()
    except OSError as exc:
        print(f"[-] Cannot read {path}: {exc}")
        return

    sanitised = redact_content(original)
    if sanitised == original:
        print(f"[~] No sensitive values found: {path}")
        return

    with open(path, "w", encoding="utf-8") as f:
        f.write(sanitised)
    print(f"[✓] Redacted secrets in file: {path}")


def process_path(path: str, recursive: bool) -> None:
    if os.path.isfile(path):
        # Skip integrity directories even for single-file calls
        if any(skip in path for skip in _SKIP_DIRS):
            print(f"[-] Skipping integrity dir file: {path}")
            return
        process_file(path)

    elif os.path.isdir(path):
        if not recursive:
            print(f"[!] {path} is a directory — use --recursive to process all files.")
            sys.exit(1)
        for root, dirs, files in os.walk(path):
            # Prune skip dirs in-place so os.walk doesn't descend into them
            dirs[:] = [d for d in dirs if d not in _SKIP_DIRS]
            for filename in files:
                filepath = os.path.join(root, filename)
                try:
                    process_file(filepath)
                except Exception as exc:  # noqa: BLE001
                    print(f"[-] Skipping {filepath}: {exc}")
    else:
        print(f"[X] Path not found: {path}", file=sys.stderr)
        sys.exit(1)


def main() -> int:
    args = parse_args()
    process_path(args.input, args.recursive)
    print("[✓] Secret redaction process completed safely.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
