# OpenThaiAi — PROJECT STATUS (single source of truth)

Generated: 2026-07-01T13:25:53.027Z · branch `claude/ai-coalition-protocol-hp3rga` (0 commit(s) ahead of main)

> Paste this whole file at the start of a Claude / Gemini / Grok conversation about this project
> so all three start from the same facts, pulled directly from the repo — not from memory.

## What this project actually is (read this before anything else)
- Git history: 1 commits, earliest 2026-07-01 — this is the entire real history, there is no earlier "locked" architecture beyond what's in this repo.
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
- ✅ **Route components exist on disk** — all 79 route components resolved
- ✅ **No duplicate skill IDs** — all skill IDs unique
- ✅ **No duplicate route paths** — all route paths unique
- ℹ️ **7 numbered migration file(s) present** — 001_pgvector.sql, 001_users_auth.sql, 002_subscriptions_payments.sql, 003_ai_usage_log.sql, 004_affiliate_tracking.sql, 005_user_sync.sql, 006_order_disputes.sql

## Recent commits
- 41984f3 chore: regenerate PROJECT_STATUS.md after rebase (12 seconds ago)

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
  "memory_mb": "19.3",
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

## Route map (79 routes)
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
| /portals/gov-thai | GovThaiPortalPage | public |
| /portals/gov-intl | GovIntlPortalPage | public |
| /portals/intl-org | IntlOrgPortalPage | public |
| /portals/foundation | FoundationPortalPage | public |
| * | NotFoundPage | public |

## Backend modules (backend/*.js — 22 files)
| File | Lines | Purpose (from header comment) |
|---|---|---|
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
| `pr-communications.js` | 166 | Press Room · Media Center · Crisis Comms · KOL · Newsletter · Global Campaigns |
| `preflight.js` | 230 | ═══════════════════════════════════════════════════════════════════════════════ |
| `producers.js` | 157 | Producer / Supplier onboarding — รับสมัครผู้ผลิตมาสังกัดแพลตฟอร์ม |
| `progress-tracker.js` | 322 | 360° Progress Tracker — OpenThai.ai |
| `sdk-gen.js` | 201 | Openthai.ai — SDK Generator (Stainless-style) |
| `server.js` | 7628 | Vercel serverless detection |
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

## Environment variables (56 referenced in backend code, 48 documented in .env.example)
⚠️ Referenced in code but missing from `backend/.env.example`:
- ADMIN_USERS
- AI_DAILY_BUDGET_USD
- CANVA_API_KEY
- DISABLE_RATE_LIMIT
- SMTP_PORT
- TIKTOK_SHOP_KEY
- VERCEL
- XAI_API_KEY
- XAI_MODEL

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
- FULL-MIGRATION.sql
- credits-schema.sql
- orders-schema.sql
- producers-schema.sql

