#!/usr/bin/env bash
# Content Blueprint — ตรวจ/สรุป/export พิมพ์เขียวเนื้อหา 8 หมวด
# ใช้: bash .claude/tools/blueprint.sh [validate|stats|coverage|export]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
node "$ROOT/scripts/blueprint-tool.mjs" "${1:-validate}"
