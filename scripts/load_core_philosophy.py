#!/usr/bin/env python3
"""Load docs/ai-memory/core-philosophy.json into OpenThaiAi's existing vector
memory store (backend/vector-memory.js via /api/memory/store) — no new RAG
infrastructure, this reuses what's already deployed.

Idempotent: vector-memory.js rejects near-duplicate stores (cosine > 0.97
within the same tenant+type), so re-running this after no real change is a
safe no-op. See docs/ai-memory/INTEGRATION_GUIDE.md for the full picture,
including a known auth gap on this endpoint.

Usage:
    python3 scripts/load_core_philosophy.py
    python3 scripts/load_core_philosophy.py --api-base https://www.openthai-ai.com
    python3 scripts/load_core_philosophy.py --api-base http://localhost:8000 --dry-run
"""
import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CORE_PHILOSOPHY_PATH = REPO_ROOT / "docs" / "ai-memory" / "core-philosophy.json"
TENANT_ID = "core-philosophy"


def load_entries(data: dict) -> list[dict]:
    """Flatten core-philosophy.json into a list of {text, type, metadata} memory entries."""
    entries = []

    cp = data["core_philosophy"]
    entries.append({
        "text": cp["statement"],
        "type": "philosophy",
        "metadata": {
            "source_id": data["id"],
            "version": data["version"],
            "one_line": cp["one_line"],
        },
    })

    for lesson in data["key_lessons"]:
        entries.append({
            "text": f"{lesson['title']}: {lesson['statement']}",
            "type": "lesson",
            "metadata": {
                "lesson_id": lesson["id"],
                "why_it_matters": lesson["why_it_matters"],
                "evidence": lesson["evidence"],
            },
        })

    return entries


def store_memory(api_base: str, tenant_id: str, entry: dict, dry_run: bool) -> dict:
    payload = json.dumps({
        "tenantId": tenant_id,
        "text": entry["text"],
        "type": entry["type"],
        "metadata": entry["metadata"],
    }).encode("utf-8")

    if dry_run:
        return {"stored": "dry-run", "type": entry["type"], "text_preview": entry["text"][:60]}

    req = urllib.request.Request(
        f"{api_base}/api/memory/store",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"stored": False, "error": f"HTTP {e.code}: {e.read().decode('utf-8', 'ignore')}"}
    except urllib.error.URLError as e:
        return {"stored": False, "error": f"unreachable: {e.reason}"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api-base", default="http://localhost:8000", help="Backend base URL (default: local dev server)")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be sent without calling the API")
    args = parser.parse_args()

    if not CORE_PHILOSOPHY_PATH.exists():
        print(f"❌ {CORE_PHILOSOPHY_PATH} not found", file=sys.stderr)
        return 1

    data = json.loads(CORE_PHILOSOPHY_PATH.read_text(encoding="utf-8"))
    entries = load_entries(data)

    print(f"Loading {len(entries)} memories into tenantId='{TENANT_ID}' at {args.api_base} "
          f"({'DRY RUN' if args.dry_run else 'LIVE'})\n")

    failures = 0
    for entry in entries:
        result = store_memory(args.api_base, TENANT_ID, entry, args.dry_run)
        # stored=False with reason=near-duplicate is the *expected* idempotent outcome
        # (already present, same content) — only a real error ("error" key present) counts as failure.
        ok = "error" not in result
        status = "already present (near-duplicate)" if result.get("reason") == "near-duplicate" else result
        icon = "✅" if ok else "❌"
        print(f"{icon} [{entry['type']}] {entry['text'][:70]}... -> {status}")
        if not ok:
            failures += 1

    if failures:
        print(f"\n⚠️  {failures}/{len(entries)} entries failed to store", file=sys.stderr)
        return 1

    print(f"\n🎉 All {len(entries)} entries stored (or already present as near-duplicates).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
