# OpenThai.ai — Makefile
# Wave 9, Task 9.4 | สร้าง: 14 ก.ย. 2569
#
# วิธีใช้: make <target>
# ดู targets ทั้งหมด: make help

.PHONY: help dev frontend backend test test-backend test-frontend eval \
        monitoring-up monitoring-down monitoring-status monitoring-backup \
        build clean check-secrets lint

# ── Default target ──────────────────────────────────────────────────────────
.DEFAULT_GOAL := help

# ── Paths ───────────────────────────────────────────────────────────────────
FRONTEND_DIR := frontend
BACKEND_DIR  := backend
TOOLS_DIR    := tools
OPS_DIR      := ops

# ── Development ──────────────────────────────────────────────────────────────

## รัน frontend + backend พร้อมกัน (ต้องการ tmux หรือ Windows Terminal)
dev:
	@echo "=== รัน Frontend + Backend ==="
	@echo "เปิด 2 terminal แยก:"
	@echo "  Terminal 1: make frontend"
	@echo "  Terminal 2: make backend"

## รัน frontend dev server (Next.js หรือ Vite)
frontend:
	@echo "=== Frontend Dev Server ==="
	cd $(FRONTEND_DIR) && npm run dev

## รัน backend (FastAPI + uvicorn)
backend:
	@echo "=== Backend Dev Server ==="
	cd $(BACKEND_DIR) && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# ── Testing ──────────────────────────────────────────────────────────────────

## รัน tests ทั้งหมด (backend + frontend)
test: test-backend test-frontend
	@echo "=== ทุก test เสร็จ ==="

## รัน pytest สำหรับ backend
test-backend:
	@echo "=== Backend Tests (pytest) ==="
	cd $(BACKEND_DIR) && python -m pytest tests/ -v

## รัน tests สำหรับ frontend
test-frontend:
	@echo "=== Frontend Tests ==="
	cd $(FRONTEND_DIR) && npm test -- --passWithNoTests

## รัน Thai Eval Suite
## ต้องมี ANTHROPIC_API_KEY: export ANTHROPIC_API_KEY=sk-ant-...
eval:
	@echo "=== Thai Eval Suite ==="
	@if [ -z "$(ANTHROPIC_API_KEY)" ]; then \
		echo "⚠️  ยังไม่มี ANTHROPIC_API_KEY — รัน dry-run mode"; \
		python $(TOOLS_DIR)/thai_eval_runner.py --limit 3 --dry-run 2>/dev/null || \
		python $(TOOLS_DIR)/thai_eval_runner.py --help; \
	else \
		python $(TOOLS_DIR)/thai_eval_runner.py --model claude-haiku-4-5-20251001 --anthropic; \
	fi

## รัน commission engine self-test
test-commission:
	@echo "=== Commission Engine Tests ==="
	python backend/affiliate/commission_engine.py

# ── Monitoring ───────────────────────────────────────────────────────────────

## เริ่ม uptime-kuma monitoring stack
monitoring-up:
	@echo "=== Starting Monitoring Stack ==="
	docker compose -f $(OPS_DIR)/docker-compose.monitoring.yml up -d
	@echo "เปิดหน้าเว็บ: http://localhost:3001"

## หยุด monitoring stack
monitoring-down:
	@echo "=== Stopping Monitoring Stack ==="
	docker compose -f $(OPS_DIR)/docker-compose.monitoring.yml down

## ดู status และ logs ของ monitoring
monitoring-status:
	docker compose -f $(OPS_DIR)/docker-compose.monitoring.yml ps
	docker compose -f $(OPS_DIR)/docker-compose.monitoring.yml logs --tail=20 uptime-kuma

## backup ข้อมูล monitoring
monitoring-backup:
	@echo "=== Backup Monitoring Data ==="
	@mkdir -p backup
	docker run --rm \
		-v openthai-monitoring-data:/data \
		-v $(shell pwd)/backup:/backup \
		alpine tar czf /backup/uptime-kuma-$(shell date +%Y%m%d).tar.gz /data
	@echo "✅ Backup saved to backup/"

# ── Maintenance ───────────────────────────────────────────────────────────────

## ตรวจหา secrets ที่อาจหลุดใน repo
check-secrets:
	@echo "=== Secret Scanner ==="
	@echo "ค้นหา pattern: ghp_, gho_, sk-, AKIA, AIza..."
	-rg "ghp_|gho_|sk-ant-|AKIA|AIza|api_key\s*=" \
		--glob "!node_modules" --glob "!.git" --glob "!*.lock" \
		--glob "!docs" \
		. 2>/dev/null || grep -r "ghp_\|gho_\|sk-ant-\|AKIA\|AIza" \
		--exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null || \
		echo "ไม่พบ pattern ที่น่าสงสัย ✅"

## ลบ cache และ build artifacts
clean:
	@echo "=== Cleaning build artifacts ==="
	-find . -type d -name "__pycache__" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null
	-find . -name "*.pyc" -not -path "*/node_modules/*" -delete 2>/dev/null
	-rm -rf $(FRONTEND_DIR)/.next 2>/dev/null
	-rm -rf $(FRONTEND_DIR)/node_modules/.cache 2>/dev/null
	@echo "✅ Clean เสร็จ"

## ตรวจ code style (ถ้ามี linter ติดตั้งแล้ว)
lint:
	@echo "=== Linting ==="
	-cd $(BACKEND_DIR) && ruff check . 2>/dev/null || echo "ruff ไม่ได้ติดตั้ง — ข้าม"
	-cd $(FRONTEND_DIR) && npm run lint 2>/dev/null || echo "eslint ไม่ได้ตั้งค่า — ข้าม"

# ── Build (ต้องขออนุมัติ Mythos ก่อน deploy) ──────────────────────────────

## Build production artifacts (ยังไม่ deploy — ต้องขออนุมัติ Mythos)
build:
	@echo "=== Build Production Artifacts ==="
	@echo "⚠️  Build เสร็จแล้วจะไม่ deploy อัตโนมัติ — ต้องขออนุมัติ Mythos ก่อน"
	cd $(FRONTEND_DIR) && npm run build
	@echo "✅ Build เสร็จ — artifact อยู่ใน frontend/.next/"

# deploy ถูก disable โดยเจตนา ตาม CLAUDE.md ข้อ 6
# make deploy → ต้องขออนุมัติ Mythos โดยตรง

# ── Help ──────────────────────────────────────────────────────────────────────

## แสดง targets ทั้งหมด
help:
	@echo ""
	@echo "OpenThai.ai — Available Commands"
	@echo "================================="
	@echo ""
	@echo "  Development:"
	@echo "    make dev              รัน frontend + backend (แยก terminal)"
	@echo "    make frontend         frontend dev server"
	@echo "    make backend          backend dev server (port 8000)"
	@echo ""
	@echo "  Testing:"
	@echo "    make test             รัน tests ทั้งหมด"
	@echo "    make test-backend     pytest backend/"
	@echo "    make test-frontend    npm test"
	@echo "    make eval             Thai Eval Suite (ต้องการ API key)"
	@echo "    make test-commission  Commission engine self-test"
	@echo ""
	@echo "  Monitoring:"
	@echo "    make monitoring-up    เริ่ม uptime-kuma (port 3001)"
	@echo "    make monitoring-down  หยุด monitoring"
	@echo "    make monitoring-status ดู logs"
	@echo "    make monitoring-backup backup ข้อมูล"
	@echo ""
	@echo "  Maintenance:"
	@echo "    make check-secrets    ตรวจหา leaked secrets"
	@echo "    make clean            ลบ cache และ build artifacts"
	@echo "    make lint             ตรวจ code style"
	@echo ""
	@echo "  Build:"
	@echo "    make build            build production (ต้องขออนุมัติ Mythos ก่อน deploy)"
	@echo ""
