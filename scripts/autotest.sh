#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# autotest.sh — รันเทส + ตรวจ + บูตทั้งโปรเจกต์ "วนซ้ำอัตโนมัติ" จนกว่าจะผ่าน 100%
#
# โหมดการใช้งาน:
#   ./scripts/autotest.sh                 # วนจนกว่าทุกอย่างเขียว แล้วหยุด (default)
#   ./scripts/autotest.sh --once          # รันรอบเดียวแล้วออก (ใช้ใน CI / pre-commit)
#   ./scripts/autotest.sh --watch         # 24/7: รันต่อเนื่องทุก ๆ INTERVAL วินาที ไม่หยุด
#   INTERVAL=300 ./scripts/autotest.sh --watch
#
# Exit code: 0 = ผ่านหมด, 1 = ยังมี check ที่ตก (เฉพาะ --once)
# ──────────────────────────────────────────────────────────────────────────────
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-until-green}"
INTERVAL="${INTERVAL:-600}"      # ช่วงห่างรอบใน --watch (วินาที) — default 10 นาที
MAX_LOOPS="${MAX_LOOPS:-50}"     # กันลูปไม่รู้จบในโหมด until-green

c_green=$'\e[32m'; c_red=$'\e[31m'; c_yellow=$'\e[33m'; c_blue=$'\e[36m'; c_off=$'\e[0m'
ts() { date -u '+%Y-%m-%d %H:%M:%S UTC'; }
pass=0; fail=0
step() { # step "ชื่อ" "คำสั่ง..."
  local name="$1"; shift
  printf '  %s▶ %-34s%s' "$c_blue" "$name" "$c_off"
  if "$@" >/tmp/autotest_step.log 2>&1; then
    printf '%s✅ PASS%s\n' "$c_green" "$c_off"; pass=$((pass+1)); return 0
  else
    printf '%s❌ FAIL%s\n' "$c_red" "$c_off"; fail=$((fail+1))
    sed 's/^/      /' /tmp/autotest_step.log | tail -15
    return 1
  fi
}

ensure_deps() {
  [ -d frontend/node_modules ] || (cd frontend && npm ci >/dev/null 2>&1 || npm install >/dev/null 2>&1)
  [ -d backend/node_modules ]  || (cd backend  && npm ci >/dev/null 2>&1 || npm install >/dev/null 2>&1)
}

# บูตเซิร์ฟเวอร์ชั่วคราวแล้วเช็ค /api/health → 200
backend_smoke() {
  local port=8987
  ( cd backend && PORT=$port node server.js >/tmp/autotest_srv.log 2>&1 & echo $! >/tmp/autotest_srv.pid )
  local pid; pid="$(cat /tmp/autotest_srv.pid)"
  local ok=1
  for _ in $(seq 1 20); do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api/health" 2>/dev/null)" = "200" ]; then ok=0; break; fi
    sleep 1
  done
  kill "$pid" 2>/dev/null; pkill -P "$pid" 2>/dev/null
  return $ok
}

run_all() {
  pass=0; fail=0
  echo "${c_yellow}━━━ autotest @ $(ts) ━━━${c_off}"
  ensure_deps
  step "backend: unit+integration"  bash -c 'cd backend && npm test'
  step "backend: prod audit (high)" bash -c 'cd backend && npm audit --omit=dev --audit-level=high'
  step "backend: syntax check"      bash -c 'cd backend && node --check server.js'
  step "backend: boot health smoke" backend_smoke
  step "frontend: vitest"           bash -c 'cd frontend && npm test -- --run'
  step "frontend: prod audit (high)" bash -c 'cd frontend && npm audit --omit=dev --audit-level=high'
  step "frontend: build"            bash -c 'cd frontend && npm run build'
  echo "  ${c_blue}สรุป:${c_off} ${c_green}ผ่าน $pass${c_off} / ${c_red}ตก $fail${c_off}"
  [ "$fail" -eq 0 ]
}

case "$MODE" in
  --once)
    run_all; exit $? ;;
  --watch)
    echo "🔁 โหมด 24/7 — รันทุก ${INTERVAL}s (Ctrl-C เพื่อหยุด)"
    while true; do
      if run_all; then echo "${c_green}✅ เขียวทั้งหมด${c_off}"; else echo "${c_red}⚠️  ยังมีจุดตก${c_off}"; fi
      echo "💤 รอ ${INTERVAL}s ..."; sleep "$INTERVAL"
    done ;;
  *)  # until-green
    n=0
    while [ "$n" -lt "$MAX_LOOPS" ]; do
      n=$((n+1)); echo "${c_yellow}[รอบที่ $n]${c_off}"
      if run_all; then echo "${c_green}🎉 ผ่าน 100% — หยุดลูป${c_off}"; exit 0; fi
      echo "🔁 ยังไม่ผ่าน — ลองใหม่ใน 15s ..."; sleep 15
    done
    echo "${c_red}⛔ ครบ $MAX_LOOPS รอบแล้วยังไม่เขียว${c_off}"; exit 1 ;;
esac
