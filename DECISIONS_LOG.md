# OpenThaiAi — Decisions Log

Append-only record of real architecture decisions **and rejected proposals**,
so Claude / Gemini / Grok (and any human) can check a claim about this
project's direction against what was actually decided, instead of trusting
whichever assistant last generated a confident-sounding paragraph.

Add a new dated entry at the top when a real decision is made or a scope-creep
proposal is rejected. Do not delete old entries — a wrong idea that was already
rejected once is worth remembering so it doesn't get silently re-proposed.

---

### 2026-07-01 — Rejected: Neo4j graph database
A pasted "Grok" message proposed adding Neo4j (graph DB) alongside Postgres,
including Cypher queries and a graph schema, and later even described it as
already "locked" architecture. **Rejected twice, explicitly, by the project
owner.** OpenThaiAi uses Supabase Postgres only. No graph database exists or
is planned. If graph-shaped queries are ever genuinely needed (e.g. affiliate
referral trees), evaluate Postgres recursive CTEs first — don't reach for a
second database without a concrete query pattern Postgres can't handle.

### 2026-07-01 — Rejected: cross-border USD/Stripe/PCI-DSS escrow platform
Multiple pasted "Grok" messages described OpenThaiAi as an "Autonomous Trade +
Escrow Monetization Platform" using Stripe Connect, USD settlement, PCI DSS
SAQ-A scope, shipment/vessel tracking, and Slack alerting. **None of this
exists in the repo and none of it was requested by the project owner.**
OpenThaiAi is a Thai SME marketing/AI-content platform. Payments are Omise
(PromptPay + card) in THB. There is no cross-border trade, no Stripe
integration, and no vessel/shipment domain anywhere in this codebase.

### 2026-07-01 — Added: order dispute + escrow ledger system
Real feature, built and merged into PR #67: `backend/disputes.js` (dual-mode
Supabase/file, same pattern as `orders.js`/`producers.js`). Buyers/producers
open a contact-verified dispute on an order; the non-opening party can submit
counter-evidence; an admin makes the final call (AI only suggests, never
auto-resolves — there is no real fund-transfer automation in this codebase,
so "release/refund escrow" is a ledger-status change, same as affiliate
payouts today). Both parties are emailed at every stage. Disputes open >48h
are flagged as overdue in the Admin Panel.

### 2026-07-01 — Added: repo-derived "single source of truth" tooling
`scripts/generate-project-status.mjs` generates `PROJECT_STATUS.md` from the
actual repo (skills registry, route map, migrations, env vars, git log) —
replacing a hand-maintained `.claude/scripts/daily-briefing.sh` that had gone
stale and was repeating the same claims every session regardless of what was
actually true. The generator also runs consistency checks (dead skill
endpoints, missing route components, duplicate IDs) and fails CI
(`.github/workflows/project-status.yml`) on every PR if they don't pass.

### Known stale documentation (do not treat as current)
- `README.md` describes an earlier version of this project: FastAPI + Python
  backend, Google Sheets as the database, n8n workflow automation. **None of
  that is the current stack.** The real stack (verified from `backend/package.json`
  and the actual source files) is: Express (ES modules) on Vercel serverless,
  Supabase Postgres (accessed via REST, not an ORM), React + Vite frontend,
  Omise for payments. `README.md` needs a rewrite; until then, trust
  `PROJECT_STATUS.md` over it for anything about the current architecture.
