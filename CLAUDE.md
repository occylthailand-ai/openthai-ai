# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**OpenThai AI** — AI-powered social content generator for Thai OTOP/SME products, targeting TikTok, Xiaohongshu, Shopee, Taobao, and TEMU. Supports Thai, Chinese, and English content generation, with an OTA token (BEP-20 on BSC) Earn-to-Create mechanic.

---

## Development Commands

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then add ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000
```

Interactive API docs: `http://localhost:8000/docs`

### Vercel Serverless API (api/index.py)

The `api/` directory is a **separate, simpler v1.0** of the backend, deployed as a Vercel serverless function. It does not share code with `backend/`. Test it locally via Vercel CLI:

```bash
vercel dev   # serves landing/ + api/ together
```

### Test API endpoints manually

```bash
# Health check
curl http://localhost:8000/health

# Generate content
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"product_name": "ผ้าไหมมัดหมี่", "product_category": "textile", "hook_type": "story"}'

# List MCP tools (Cursor integration)
curl http://localhost:8000/mcp/tools/list
```

There is **no automated test suite**. Manual curl tests and `GET /health` are the primary verification methods.

---

## Architecture

### Two Separate Backends

There are **two distinct backend versions** — do not confuse them:

| Path | Purpose | Deployment |
|------|---------|------------|
| `api/index.py` | v1.0 — Vercel serverless, Supabase-integrated, handles auth/quota/payments | Vercel (`/api/*` routes) |
| `backend/main.py` | v2.0 — Full FastAPI, multi-platform, streaming, Hermes/B2G/OTA endpoints | Railway / Render / local |

The `vercel.json` routes `/api/*` to `api/index.py` and static HTML from `landing/`.

### Backend Module Layout (`backend/`)

- **`main.py`** — FastAPI app. Imports `mcp_router` from `mcp_server.py` and `get_mythos_router` from `mythos_router.py`. All product content generation, streaming, Hermes agent, B2G, and OTA webhook endpoints live here.
- **`mcp_server.py`** — MCP (Model Context Protocol) server. Exposes 8 tools to Cursor IDE via `GET /mcp/tools/list` and `POST /mcp/tools/call`. Mounted as an `APIRouter` with prefix `/mcp`.
- **`mythos_router.py`** — Multi-provider AI router. Tries Anthropic → AWS Bedrock → Google Vertex AI → fallback (`claude-sonnet-4-5`) in order. Used by `/mythos/*` endpoints.

### Frontend (`landing/`)

Pure HTML/CSS/Vanilla JS. No build step. Key files:

- `js/config.js` — `OPENTHAI_CONFIG` global: Supabase URL/anonKey, PromptPay, plan pricing.
- API calls use the pattern: `localhost:8000` in dev, `/api` in production (Vercel).
- `admin.html` — payment review dashboard, talks to `api/index.py` admin endpoints.

### Supabase (Database & Auth)

Used only in `api/index.py` (the Vercel serverless version). Key tables:
- `profiles` — user metadata
- `subscriptions` — plan, status, expires_at
- `content_history` — generated content log (fire-and-forget writes)
- `payment_notifications` — manual PromptPay payment records
- `check_free_limit` — RPC that enforces 3 generations/month for free tier

Admin access checks `ADMIN_EMAILS` env var. All admin endpoints in `api/index.py` require `Authorization: Bearer <token>` from a matching admin email.

### n8n Automation

`n8n-workflows/openthai-ai-workflow.json` implements the **9-Skills framework**: prompt assembly (RCCF), taste check, AI critic (scores ≥ 7/10), context card compression, knowledge base lookup, and learning layer. Import into n8n and set the `x-api-key` credential.

---

## Key Conventions

### AI Model
- Always use `claude-sonnet-4-5` — the string is defined as `MODEL = "claude-sonnet-4-5"` at the top of each backend file. Never use dated suffixes or other model names.
- Every system prompt must include `"cache_control": {"type": "ephemeral"}` to enable prompt caching (~80% input token savings).
- Combine generate + critique into **1 API call** wherever possible. Never loop Claude calls more than necessary.

### JSON Safety
Always use `parse_json_safe()` (in `backend/main.py`) or `parse_json_response()` (in `api/index.py`) — never call `json.loads()` directly on Claude output. These functions handle markdown code-fenced responses and extract JSON with regex fallback.

### Endpoint Naming
`/verb/noun` in kebab-case. Every endpoint is dual-registered in `api/index.py` (both `/api/foo` and `/foo`) to support Vercel routing.

### Pydantic Models
All endpoints have a Pydantic input model with `Field(..., description="...")` on every field. Optional fields must have sensible defaults.

### Frontend API URL Pattern
```javascript
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : '/api';
```

### OTA Token Events
Any content-creation action in the frontend must call `showOTAToast(amount, reason)`. Earn amounts: +5 base, +15 quality bonus (score > 8), +25 viral bonus.

### Blockchain
MetaMask integration always checks `typeof window.ethereum === 'undefined'` first. Target network: BNB Smart Chain (chainId `0x38`), testnet (`0x61`).

### CORS
`ALLOWED_ORIGINS` in `backend/main.py` is an explicit whitelist. Do not use `allow_origins=["*"]` in production. `api/index.py` currently uses `["*"]` (v1.0 legacy); do not expand this pattern.

### Webhook Security
The OTA blockchain webhook (`/blockchain/webhook`) uses `hmac.compare_digest` on `X-Webhook-Secret`. The admin key (`/admin/*`) likewise uses timing-safe comparison. Never use plain `==` for secret comparison.

### Commit Convention
`feat:` / `fix:` / `perf:` / `docs:` / `style:` / `refactor:` prefixes. Thai is acceptable for commit message descriptions.

---

## Environment Variables

Required in `backend/.env` (and as Vercel/Railway env vars in production):

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...          # server-side only
ADMIN_KEY=...                         # for backend/main.py admin endpoint
ADMIN_EMAILS=...                      # comma-separated, for api/index.py admin
BLOCKCHAIN_WEBHOOK_SECRET=...
```

Optional (for Mythos multi-provider router):
```
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION
GCP_PROJECT_ID / GCP_REGION / GOOGLE_APPLICATION_CREDENTIALS
MYTHOS_ENABLED=true
```

---

## Database Schema

`backend/supabase_schema.sql` and `database/supabase_schema.sql` contain the Supabase schema. The GitHub Actions workflow `.github/workflows/migrate.yml` runs migrations manually (trigger: `workflow_dispatch` with input `"run"`).
