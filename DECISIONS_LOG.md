# OpenThaiAi — Decisions Log

Append-only record of real architecture decisions **and rejected proposals**,
so Claude / Gemini / Grok (and any human) can check a claim about this
project's direction against what was actually decided, instead of trusting
whichever assistant last generated a confident-sounding paragraph.

Add a new dated entry at the top when a real decision is made or a scope-creep
proposal is rejected. Do not delete old entries — a wrong idea that was already
rejected once is worth remembering so it doesn't get silently re-proposed.

---

### 2026-07-02 — Added: Council Scan Room + fixed real security gap it surfaced
Extended the existing `/api/council` feature (Claude+Gemini+Grok, real API calls,
already the genuine mechanism for "three AI platforms working together" — see the
entry below) with `POST /api/council/scan`: instead of an open-ended topic string
the model has to guess context for, it's fed real runtime facts (`buildScanContext()`
— actual skill/order/dispute/lead counts, which AI/DB/payment keys are configured)
with an explicit "do not invent facts beyond this" rule baked into the prompt.

Running this scan surfaced a real finding: `DELETE /api/memory` and
`DELETE /api/memory/:id` had no auth and no rate limit at all — worse than
`POST /api/memory/store` (already flagged in `docs/ai-memory/INTEGRATION_GUIDE.md`),
since destructive rather than additive. Made worse by that same guide naming
`tenantId=core-philosophy` explicitly in a file meant to become public. Fixed:
both DELETE routes now require `x-admin-key`, verified live (401 without the key,
200 + correct deletion with it). `POST /api/memory/store` intentionally left open —
the existing `n8n-workflows/openthai-ai-automation.json` depends on it being
unauthenticated, and a write has a much smaller blast radius than a delete.

### 2026-07-02 — Fixed + verified in production: all 7 /portals/* pages were silently dropping submissions
`POST /api/leads/submit` didn't exist in the backend — every one of GovThaiPortalPage,
GovIntlPortalPage, IntlOrgPortalPage, FoundationPortalPage, CreatorPortalPage,
AffiliatePortalPage, and ProducerPortalPage called it and silently failed via an
empty try/catch, showing a fake success message. Fixed by `backend/portal-leads.js`
+ migration `007_portal_leads.sql`. **Verified end-to-end in production, not just
locally**: project owner ran the migration in Supabase, submitted a real form on
the live site, and confirmed the row appeared in the `portal_leads` table with all
submitted fields intact. This is the standard to hold future "it should work" claims
to — a claim isn't verified until someone (human or AI) actually observed the real
outcome, not just absence of an error during development.

### 2026-07-02 — Rejected: OpenThaiAi described as a foundation-model / tokenizer project
Pasted content (same style as the earlier "Grok" messages) described OpenThaiAi as
having its own Thai tokenizer, Hugging Face-compatible model weights, vLLM
high-throughput serving, and an RLHF/RLAIF training pipeline. **None of this
exists.** Verified: `backend/package.json` depends on `@anthropic-ai/sdk` and
`@google/generative-ai`; `backend/server.js` calls `anthropic.messages.create({
model: 'claude-haiku-4-5-20251001', ... })` and `GoogleGenerativeAI(...)` —
hosted API calls to Claude and Gemini, not a self-hosted/trained model. A
repo-wide grep for "tokenizer", "vLLM", "huggingface", "RLHF", "fine-tun" found
zero real hits (one unrelated match inside the `nodemailer` dependency). This
description sounds like it's conflating OpenThaiAi with a different, actual
open-source Thai foundation-model project — not this repo, which is a SaaS
orchestration layer over hosted third-party LLM APIs.

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
