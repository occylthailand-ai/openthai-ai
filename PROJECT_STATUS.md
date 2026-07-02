# OpenThaiAi — PROJECT STATUS (single source of truth)

Generated: 2026-07-02T09:36:28.823Z · branch `claude/ai-coalition-protocol-hp3rga` (0 commit(s) ahead of main)

> Paste this whole file at the start of a Claude / Gemini / Grok conversation about this project
> so all three start from the same facts, pulled directly from the repo — not from memory.

## What this project actually is (read this before anything else)
- Git history: 1 commits, earliest 2026-07-02 — this is the entire real history, there is no earlier "locked" architecture beyond what's in this repo.
- README.md tagline (may be stale — see "Known stale documentation" below): "AI-powered TikTok content generator สำหรับสินค้าไทยและสินค้าทั่วโลก"
- Verified real backend stack (from backend/package.json): @anthropic-ai/sdk, @google/generative-ai, bcryptjs, cors, dotenv, express, express-rate-limit, jsonwebtoken, node-cron, node-fetch, nodemailer
- Payments: Omise (PromptPay + card), THB only. Database: Supabase Postgres only (no graph DB). Deploy: Vercel serverless, auto-deploy on push to `main` via Vercel's GitHub integration.
- If something you're reading (from any AI assistant, including this one) describes Neo4j, Stripe, USD/cross-border escrow, PCI DSS scope, or vessel/shipment tracking as part of this project — it is wrong. See DECISIONS_LOG.md below: those exact proposals were made and explicitly rejected on 2026-07-01.

## Decisions log (full history in DECISIONS_LOG.md — append-only, don't delete old entries)
# OpenThaiAi — Decisions Log

Append-only record of real architecture decisions **and rejected proposals**,
so Claude / Gemini / Grok (and any human) can check a claim about this
project's direction against what was actually decided, instead of trusting
whichever assistant last generated a confident-sounding paragraph.

Add a new dated entry at the top when a real decision is made or a scope-creep
proposal is rejected. Do not delete old entries — a wrong idea that was already
rejected once is worth remembering so it doesn't get silently re-proposed.

---

### 2026-07-02 — Completed the 5-category outreach set (in order): consumer, middleman, affiliate copy added; products clarified as derivative of producers
Continuing the 5 categories in order using the legitimate, consent-based method
confirmed the same day (real marketing copy pointing at real forms, not
scraping): added `docs/outreach/consumer-recruitment-post.md` and
`middleman-recruitment-post.md`, matching the same grounded-in-real-benefits
pattern as `producer-recruitment-post.md`. Added `affiliate-recruitment-post.md`
too, using the real commission tiers already live on `/portals/affiliate`
(Starter 10% / Pro 20% at ฿50k / Elite 30% at ฿200k — verified against
`AffiliatePortalPage.jsx`, not invented numbers).

Category 4 ("products") has no separate signup path by design — products enter
the platform through producer onboarding (`/portals/producer` →
`backend/inventory.js`), each approved producer adds their own catalog. So
"more products" is a direct consequence of "more producers," not a distinct
process needing its own outreach content — documented this in the affiliate
outreach file so it's not silently missed as "not done."

All four files explicitly state: for posting in real public groups or sending
to people you actually know, not for scraped contact lists — same boundary as
the rejected daemon proposal above. This remains manual/human-posted content;
no auto-posting or auto-contact automation was built, consistent with "never
take irreversible/external-facing action without a human in the loop."

### 2026-07-02 — Rejected: autonomous scraping daemon for producers/consumers/middlemen/products/affiliates
Pasted content (same pattern as the earlier "Grok" messages) claimed a background
daemon (`src/pipeline/ecosystem_growth_daemon.py`, `asyncio`) was already
"installed & locked," running 24/7, scanning e-commerce platforms/social media
for real people's business identities (named individual, Facebook pages, TikTok
handles, LINE contacts) and auto-drafting outreach to them, with results
"stored" at `data/ecosystem/...json`. **None of this exists or was built.**
Verified: no `data/ecosystem/` directory, no `ecosystem_growth_daemon.py`
anywhere in the repo, no Python runtime in this project at all (`backend/`
is Node/Express — `backend/package.json` has zero Python deps), no background
process running. The message itself half-admits this ("จัดเก็บ...ในรูปแบบสมมติ
เนื่องจากยังไม่มี access จริง" — "stored in hypothetical form, since there's no
real access yet") while presenting a "🛡️ IMMUTABLE ENGINE ENGAGED / LOCKED"
status banner as if it were a real completed system.

Beyond the fabrication, the underlying proposal — scrape real people's names/
contact info off the internet and auto-generate outreach to them without their
consent — is a legal/consent problem (PDPA), not just an engineering one, and
is a different and much bigger decision than what was actually confirmed
earlier the same day ("ดูสถานะจริงของแต่ละกลุ่มตอนนี้" — check current real
status, not scrape). Asked the project owner directly; confirmed: no scraping
without consent, recommended path stands. Instead: real, legitimate growth for
the producer/consumer/middleman categories should go through the actual
consent-based path that already exists — people submit themselves via
`/portals/producer` (and the new `/portals/consumer`, `/portals/middleman`) —
grown by real marketing/outreach content pointing at that real form, not by
autonomous scraping. See the outreach copy drafted the same day as a concrete
example of the legitimate version of this idea.

### 2026-07-02 — Membership status audit: producers/products/affiliates real, consumers/middlemen didn't exist — built the missing two
Asked to check real status of 5 membership categories (producers, consumers,
middlemen, products, affiliates) and build whatever was missing. Checked code
before reporting anything:
- **Producers** (`backend/producers.js`), **products** (`backend/inventory.js` +
  producer catalog), **affiliates** (`/api/affiliate/*`) all have real,
  established systems already.
- **Consumers** and **middlemen/distributors** had zero real membership
  infrastructure — "consumer" and "distributor" only existed as audience-type
  labels inside an AI marketing-copy prompt (S18), not an actual signup path.

Built both using the exact tested pattern from earlier this session
(`backend/portal-leads.js`, the module that fixed the "7 portals silently drop
submissions" bug): new `ConsumerPortalPage.jsx` and `MiddlemanPortalPage.jsx`,
registered at `/portals/consumer` and `/portals/middleman`, added to
`PortalHubPage.jsx`'s grid (all 3 languages), added `consumer`/`middleman` to
`portal-leads.js`'s `KNOWN_TYPES` and the Admin Panel's type/label/color maps.

Verified end-to-end against a running server: submitted both new lead types
through the real `/api/leads/submit` endpoint, confirmed both appear correctly
in `/api/leads/admin/search` as `portal:consumer` / `portal:middleman` with
the right fields — not just "should work," actually observed working.

For the 3 categories that already have real systems: I don't have production
DB access from this sandbox (network to www.openthai-ai.com is blocked — see
earlier entries), so I can't report live counts. Check `/api/producers/admin/summary`,
`/api/inventory/admin/summary`, and `/api/affiliate/list` (all Admin Key gated)
directly for current real numbers.

### 2026-07-02 — Autonomous hourly scan (job 3d2a78bd): fixed 2 unauthenticated deletes, flagged a 3rd for human review
First run of the recurring `/loop` scan set up this session (hourly, always opens a PR,
never auto-merges — see the CLAUDE.md standing rule). Systematically checked every
`app.delete(...)` route in `server.js` for the same class of bug fixed earlier
(`DELETE /api/memory`): no auth, no rate limit.

**Fixed** (safe — verified nothing legitimate currently calls these unauthenticated):
- `DELETE /api/webhooks/:id` — nothing in the frontend or `n8n-workflows/*.json` calls
  it at all; gating it live 401→200-with-key had zero regression risk.
- `DELETE /api/scheduler/:id` — `AdminPage.jsx`'s `schDelete` called it with no
  `x-admin-key`, so gating the backend alone would have broken the Admin Panel's own
  delete button. Fixed both sides together. Left `POST/GET /api/scheduler/process`
  unauthenticated on purpose — `vercel.json` has Vercel Cron hitting it via GET with no
  custom headers, so gating it would break the real daily cron job.

**Found but deliberately NOT fixed — needs a human decision:** `/api/agent/*` (GET
list, POST create, PATCH, DELETE, `/run`) has zero server-side auth despite
`frontend/src/pages/AgentPage.jsx` living behind an `(auth)` route per the route map.
Checked why: `AgentPage.jsx` never sends an `Authorization: Bearer` header on any of
these calls, and `apiBase.js`'s `authHeaders()` only attaches `x-device-id`/
`x-user-email`, never a JWT — so the page's "auth required" is enforced client-side
only (a React Router redirect), with nothing server-side backing it. Adding
`requireAuth` to `/api/agent/*` the way it's used everywhere else in this file would
break the real page for real logged-in users, since it never sends a token to check.
Also: agent records have no owner/tenant field at all — `GET /api/agent` returns
every agent's data to anyone, including `lineUserId` (PII). This needs a real decision
(should the frontend start attaching JWTs? should agents be scoped by device-id like
`vector-memory.js` does? was public access intentional for a "try without login"
flow?) — not a guess baked into an unsupervised autonomous commit.

### 2026-07-02 — Scoped /api/council to OpenThaiAi-only, structurally not by convention
User asked for a "command room" where Gemini and Grok can join, restricted to
OpenThaiAi only. The room already existed (`/api/council`, live at `/council`)
and already lets them join for real once `XAI_API_KEY` is set — but the `topic`
field was pure free text with zero grounding, so nothing stopped it being used
to discuss anything unrelated to this project. Fixed by having `/api/council`
inject the same real runtime context `buildScanContext()` produces (used by
`/api/council/scan`) into every request, with an explicit instruction to
decline topics that aren't about OpenThaiAi. This can't be verified against a
live model from this sandbox (no real API keys here) — only that the context
is correctly built and included; whether a live model actually honors the
"stay on topic" instruction needs testing with real credentials.

### 2026-07-02 — Closed the env-var documentation gap fully + fixed a real SMTP bug found while doing it
Documented the remaining 7 vars the audit had flagged since the first session
(`ADMIN_USERS`, `CANVA_API_KEY`, `DISABLE_RATE_LIMIT`, `PORTAL_LEAD_NOTIFY_EMAIL`,
`SMTP_PORT`, `TIKTOK_SHOP_KEY`, `VERCEL`) in `backend/.env.example`.
`PROJECT_STATUS.md`'s env audit now reads "every env var referenced in backend
code is documented" for the first time this session.

While documenting `SMTP_PORT`, found it was real code with a real bug: `preflight.js`
(the diagnostic script) correctly reads `SMTP_PORT` and sets `secure: port === 465`,
but the actual production mailer in `server.js` — used for every real order/dispute/
portal-lead email — hardcoded `port: 587, secure: false` and ignored `SMTP_PORT`
entirely. Anyone setting `SMTP_PORT=465` would see `preflight.js` report success
while real emails silently used the wrong port/security settings. Fixed: `server.js`'s
mailer now reads `SMTP_PORT` the same way `preflight.js` does, defaulting to 587
(unchanged behavior when unset). Verified the port→secure logic against 587/465/2525.

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


## Consistency checks (✅ all passing)
- ✅ **Skill endpoints resolve to real routes** — all 35 skill endpoints found in backend source
- ✅ **Route components exist on disk** — all 81 route components resolved
- ✅ **No duplicate skill IDs** — all skill IDs unique
- ✅ **No duplicate route paths** — all route paths unique
- ℹ️ **8 numbered migration file(s) present** — 001_pgvector.sql, 001_users_auth.sql, 002_subscriptions_payments.sql, 003_ai_usage_log.sql, 004_affiliate_tracking.sql, 005_user_sync.sql, 006_order_disputes.sql, 007_portal_leads.sql

## Recent commits
- 9642742 chore: regenerate PROJECT_STATUS.md after rebase (31 seconds ago)

## Production health (✅ reachable)
```json
{
  "status": "ok",
  "version": "2.1.0",
  "charter_version": 2,
  "charter_title": "นโยบายระบบถาวร — Openthai.ai Operations Charter",
  "ai_primary": "✅ Claude Haiku",
  "ai_fallback": "✅ Gemini Flash Latest",
  "ai_active": "claude-haiku-4-5-20251001",
  "google_oauth": true,
  "affiliates": 0,
  "waitlist": 0,
  "agents": 0,
  "active_agents": 0,
  "line_oa": true,
  "elevenlabs": false,
  "watchdog": "idle",
  "last_watchdog": null,
  "system_logs": 2,
  "uptime_sec": 0,
  "memory_mb": "19.4",
  "services": {
    "news_rag": "✅ Active",
    "news_rag_refresh": "✅ Auto cache clear every 4h",
    "competitor_analysis": "✅ Active",
    "tts": "⚠️ No API Key",
    "line_oa": "✅ Active",
    "auto_heal": "✅ Active (every 30 min)",
    "agent_cron": "✅ Active (every hour)",
    "watchdog": "✅ Active",
    "diagnostics": "✅ Active",
    "persistence": "✅ system_log + agents.json + agent_checkpoint",
    "vector_memory": "✅ Active (semantic long-term memory)",
    "webhook_system": "✅ Active (0 registered)",
    "multi_tenant": "✅ Active (0 tenants)"
  }
}
```

## Skills registry (35 total, 33 active, 2 need setup)
| ID | Name | Endpoint | Status |
|---|---|---|---|
| S1 | RCCF Prompt | `POST /api/generate` | active |
| S2 | Taste Check | `POST /api/generate` | active |
| S3 | Master Prompt | `POST /api/generate` | active |
| S4 | Image Analysis | `POST /api/analyze-image` | active |
| S5 | TTS Voice | `POST /api/tts` | needs_key (needs `ELEVENLABS_API_KEY`) |
| S6 | AI Critic | `POST /api/generate` | active |
| S7 | Context Card | `POST /api/generate` | active |
| S8 | LINE OA Connect | `POST /api/line/send` | needs_key (needs `LINE_CHANNEL_TOKEN`) |
| S9 | Learning Layer | `GET /api/skills/learning/patterns` | active |
| S10 | Trend Analyzer | `POST /api/skills/trend` | active |
| S11 | Hashtag Generator | `POST /api/skills/hashtag` | active |
| S12 | SEO Thai | `POST /api/skills/seo` | active |
| S13 | Sentiment Scanner | `POST /api/skills/sentiment` | active |
| S14 | Video Script | `POST /api/skills/video-script` | active |
| S15 | Multi-Language | `POST /api/skills/translate` | active |
| S16 | Prompt Builder | `POST /api/skills/prompt-builder` | active |
| S17 | Cultural Wisdom | `POST /api/skills/cultural-wisdom` | active |
| S18 | Sales Conversion Engine | `POST /api/skills/promo-engine` | active |
| S19 | Supply Chain AI | `POST /api/skills/supply-chain` | active |
| S20 | Pricing Optimizer | `POST /api/skills/pricing` | active |
| S21 | Customer Service AI | `POST /api/skills/customer-service` | active |
| S22 | Ad Budget Planner | `POST /api/skills/ad-budget` | active |
| S23 | Break-even Planner | `POST /api/skills/break-even` | active |
| S24 | Campaign Calendar | `POST /api/skills/campaign-calendar` | active |
| S25 | Live Selling Script | `POST /api/skills/live-script` | active |
| S26 | Omni-Solver | `POST /api/skills/omni-solver` | active |
| S27 | Negotiation Coach | `POST /api/skills/negotiation` | active |
| S28 | Conflict Mediator | `POST /api/skills/mediation` | active |
| S29 | Crisis Manager | `POST /api/skills/crisis` | active |
| S30 | Persona Builder | `POST /api/skills/persona` | active |
| S31 | Product Listing Writer | `POST /api/skills/listing` | active |
| S32 | Review Responder | `POST /api/skills/review-reply` | active |
| S33 | Bundle & Upsell Designer | `POST /api/skills/bundle` | active |
| S34 | FAQ & Auto-Reply Builder | `POST /api/skills/faq` | active |
| S35 | Broadcast & Re-engagement | `POST /api/skills/broadcast` | active |

## Route map (81 routes)
| Path | Component | Access |
|---|---|---|
| /login | LoginPage | auth |
| /dashboard | DashboardPage | auth |
| /tiktok | TikTokFeedPage | auth |
| /facebook | FacebookFeedPage | auth |
| /ai-generator | AIGeneratorPage | auth |
| /ai-tools | AIToolsHub | auth |
| /agent | AgentPage | auth |
| /skills | AISkillsPage | auth |
| /skills-catalog | SkillsCatalogPage | auth |
| /starter | StarterKitPage | auth |
| /assistant | AssistantPage | auth |
| /supply-chain | SupplyChainPage | auth |
| /promo-engine | PromoEnginePage | auth |
| /daily-pr | DailyPRPage | auth |
| /ultra-promo | UltraPromoPage | auth |
| /global-pr | GlobalPRPage | auth |
| /benchmark | ContentBenchmarkPage | auth |
| /scheduler | SchedulerPage | auth |
| /analytics-pro | AnalyticsDashboardPage | auth |
| /image-prompt | ImagePromptPage | auth |
| /catalog-ai | CatalogAIPage | auth |
| /kol-brief | KOLBriefPage | auth |
| /strategy | StrategyCenterPage | auth |
| /pitch | PitchDeckPage | auth |
| /integrations | IntegrationHubPage | auth |
| / | LandingPage | public |
| /pricing | PricingPage | public |
| /join | ProducerJoinPage | public |
| /producers | ProducerJoinPage | public |
| /catalog | CatalogPage | public |
| /shop | CatalogPage | public |
| /find-producers | ProducerDirectoryPage | public |
| /find | ProducerDirectoryPage | public |
| /track | TrackOrderPage | public |
| /store | StorePage | public |
| /admin | AdminPage | public |
| /affiliate | AffiliatePage | public |
| /affiliate/dashboard | AffiliateDashboard | public |
| /privacy | PrivacyPage | public |
| /terms | TermsPage | public |
| /contact | ContactPage | public |
| /trending | TrendingPage | public |
| /calendar | ContentCalendarPage | public |
| /brand | BrandMemoryPage | public |
| /voice | VoiceCommandPage | public |
| /video | VideoGeneratorPage | auth |
| /payment | PaymentPage | public |
| /pay | QuickPayPage | public |
| /quickpay | QuickPayPage | public |
| /earn | EarnHubPage | public |
| /income | EarnHubPage | public |
| /affiliate-programs | AffiliateProgramsPage | public |
| /programs | AffiliateProgramsPage | public |
| /content-studio | ContentStudioPage | public |
| /captions | ContentStudioPage | public |
| /council | CouncilPage | public |
| /openthaiai | CouncilPage | public |
| /leaderboard | LeaderboardPage | public |
| /router | RouterStatusPage | public |
| /corporate | CorporateDashboard | auth |
| /corporate/board | BoardPage | auth |
| /corporate/ir | InvestorRelationsPage | auth |
| /corporate/compliance | CompliancePage | auth |
| /corporate/esg | ESGPage | auth |
| /corporate/hr | HRPage | auth |
| /corporate/finance | FinancePage | auth |
| /corporate/global | GlobalOpsPage | auth |
| /corporate/pr | PRCommsPage | auth |
| /corporate/command | CommandCenterPage | auth |
| /progress | ProgressDashboard | public |
| /portals | PortalHubPage | public |
| /portals/producer | ProducerPortalPage | public |
| /portals/affiliate | AffiliatePortalPage | public |
| /portals/creator | CreatorPortalPage | public |
| /portals/consumer | ConsumerPortalPage | public |
| /portals/middleman | MiddlemanPortalPage | public |
| /portals/gov-thai | GovThaiPortalPage | public |
| /portals/gov-intl | GovIntlPortalPage | public |
| /portals/intl-org | IntlOrgPortalPage | public |
| /portals/foundation | FoundationPortalPage | public |
| * | NotFoundPage | public |

## Backend modules (backend/*.js — 24 files)
| File | Lines | Purpose (from header comment) |
|---|---|---|
| `agent-tools.js` | 92 | Agent Tools — Thai Function Calling schema, wired to real backend functions |
| `auth.js` | 190 | JWT |
| `corporate-system.js` | 196 | Global Standard: SET/MAI · SEC Thailand · IFRS · ESG · Governance |
| `credits.js` | 202 | Credit ledger — เครดิตจริงจากรางวัล (spin / streak) ใช้ generate เกินโควต้าฟรีได้ |
| `disputes.js` | 279 | Order Disputes — เปิดข้อพิพาท + AI-assist arbitration + ปล่อย/คืนเงินประกัน (escrow) |
| `integrations.js` | 249 | ══════════════════════════════════════════════════════════════════════════════ |
| `inventory.js` | 163 | Inventory — คลังสินค้า first-party ครบทุกมิติ (สินค้า + บัญชีเคลื่อนไหวสต๊อก) |
| `mcp-handler.js` | 249 | Implements Model Context Protocol (MCP) so Claude and other AI agents |
| `omise-payment.js` | 170 | PromptPay QR · Credit Card · Subscription Billing |
| `openapi.js` | 651 | Auto-served at GET /api/openapi.json | Interactive docs at GET /api-docs |
| `orders.js` | 184 | Orders — สั่งซื้อ + ติดตามสถานะจัดส่ง (สต๊อก→แพ็ค→ส่ง→ถึงปลายทาง→เซ็นรับ) |
| `portal-leads.js` | 98 | Portal Leads — captures submissions from the /portals/* landing pages |
| `pr-communications.js` | 166 | Press Room · Media Center · Crisis Comms · KOL · Newsletter · Global Campaigns |
| `preflight.js` | 230 | ═══════════════════════════════════════════════════════════════════════════════ |
| `producers.js` | 157 | Producer / Supplier onboarding — รับสมัครผู้ผลิตมาสังกัดแพลตฟอร์ม |
| `progress-tracker.js` | 322 | 360° Progress Tracker — OpenThai.ai |
| `sdk-gen.js` | 201 | Openthai.ai — SDK Generator (Stainless-style) |
| `server.js` | 7851 | Vercel serverless detection |
| `tenant-manager.js` | 254 | Each tenant (store/business) gets: |
| `vector-memory-supabase.js` | 194 | Drop-in replacement สำหรับ vector-memory.js เมื่อ Supabase พร้อม |
| `vector-memory.js` | 212 | Long-term semantic memory for AI agents. |
| `video-generator.js` | 204 | รองรับ: RunwayML Gen-3 · Pika Labs · Kling AI · Luma Dream Machine · Mock (script-only) |
| `voice-commander.js` | 259 | รับ transcript จาก Web Speech API → AI แปล intent → รัน command → คืน speak_text |
| `webhook-system.js` | 223 | Push events to registered subscriber endpoints instead of polling. |

## Admin panel tabs (frontend/src/i18n/admin.js)
- 📊 ภาพรวม
- 📈 วิเคราะห์
- 💰 ยอดขาย
- 🎁 เครดิต
- 🏭 ผู้ผลิต
- 📨 เชิญผู้ผลิต
- 📦 ออเดอร์
- ⚠️ ข้อพิพาท
- 🧑‍⚖️ ตรวจสอบคุณภาพ
- 🎯 ลูกค้า
- 📦 คลังสินค้า
- 👥 ผู้ใช้
- 🤝 Affiliates
- ⚡ คอนเทนต์
- ⚙️ ตั้งค่า

## Scheduled jobs (vercel.json crons)
- `0 6 * * *` → /api/system/watchdog
- `0 4 * * *` → /api/system/news-rag-clear
- `0 12 * * *` → /api/autopost/process
- `30 16 * * *` → /api/progress/daily-report
- `0 9 * * *` → /api/scheduler/process

## Environment variables (57 referenced in backend code, 58 documented in .env.example)
✅ every env var referenced in backend code is documented in `.env.example`

## Migration files present (backend/migrations/)
Presence here means the SQL exists in the repo — it does **not** mean it has been run against the live Supabase project. Verify in the Supabase SQL Editor.
- 000-all-in-one.sql
- 001-shipping-stock.sql
- 001_pgvector.sql
- 001_users_auth.sql
- 002-inventory.sql
- 002_subscriptions_payments.sql
- 003-movement-platform.sql
- 003_ai_usage_log.sql
- 004_affiliate_tracking.sql
- 005_user_sync.sql
- 006_order_disputes.sql
- 007_portal_leads.sql
- FULL-MIGRATION.sql
- credits-schema.sql
- orders-schema.sql
- producers-schema.sql

