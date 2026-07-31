---
name: repo
type: repo
---

# OpenThaiAi — Repo Overview

AI-powered B2B/B2C/B2G commerce platform for Thai market. Live at openthai.ai.

## Stack
- **Frontend**: React 18 + Vite, plain JSX (no TypeScript), deployed to Vercel
- **Backend**: Express 4 + ES modules, deployed to Vercel serverless via `api/index.js`
- **Database**: Supabase Postgres (pgvector enabled), no local DB
- **AI**: Anthropic Claude (primary) + Google Gemini (fallback)
- **Payments**: Omise only — THB, PromptPay + card
- **Auth**: JWT + Google OAuth, `x-user-email` / `x-device-id` headers

## Key rules
1. **No TypeScript** — plain JS/JSX throughout
2. **No Neo4j, Stripe, USD** — Supabase + Omise + THB only (see DECISIONS_LOG.md)
3. Always use `apiFetch()` from `frontend/src/apiBase.js` for API calls — never raw `fetch()`
4. Always verify claims against the real code before building on them

## Directory layout
```
frontend/    React app (src/pages/, src/components/, src/i18n/)
backend/     Express server (server.js + domain files)
database/    Migration files (apply manually via Supabase dashboard)
api/         Vercel serverless entry (proxies to backend/server.js)
.claude/     Claude Code config + tool scripts
scripts/     generate-project-status.mjs
```

## Subsystem context
- `frontend/CLAUDE.md` — React patterns, apiBase, i18n
- `backend/CLAUDE.md` — Express, Supabase, auth, AI, Omise
- `database/CLAUDE.md` — migrations, pgvector, schema

## Built-in tools
```bash
bash .claude/tools/health-check.sh        # check API health
bash .claude/tools/run-tests.sh           # run backend tests
bash .claude/tools/refresh-status.sh      # regenerate PROJECT_STATUS.md
bash .claude/tools/lint-check.sh          # ESLint on changed files
bash .claude/tools/db-status.sh           # verify Supabase env
bash .claude/tools/scaffold-page.sh Name  # scaffold new React page
```
