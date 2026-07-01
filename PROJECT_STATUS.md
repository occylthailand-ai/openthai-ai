# OpenThaiAi — PROJECT STATUS (single source of truth)

Generated: 2026-07-01T12:58:07.029Z · branch `claude/ai-coalition-protocol-hp3rga` (1 commit(s) ahead of main)

> Paste this whole file at the start of a Claude / Gemini / Grok conversation about this project
> so all three start from the same facts, pulled directly from the repo — not from memory.

## Recent commits
- 56cdb64 Add order dispute + escrow arbitration system (19 minutes ago)
- 08a5306 Revenue & Marketing Engine — Affiliate, QuickPay, Content/Scheduler, Attribution (#66) (3 days ago)
- 92648be feat: S35 Broadcast & Re-engagement Writer — ดึงลูกค้าเก่ากลับมาซื้อซ้ำ (#65) (4 days ago)
- 1eb171d feat: S34 FAQ & Auto-Reply Builder — คลังคำถาม-คำตอบ + ตอบแชทอัตโนมัติ (#64) (4 days ago)
- a8282e6 feat: S33 Bundle & Upsell Designer — จัดเซ็ต + ขายพ่วง เพิ่มยอดต่อบิล (#63) (4 days ago)
- 7fc6be2 feat: S32 Review Responder — ตอบรีวิวลูกค้าอย่างมืออาชีพ (#62) (4 days ago)
- 62262f8 feat: S31 Product Listing Writer — สร้างหน้าสินค้า Shopee/Lazada/TikTok Shop (#61) (4 days ago)
- 0df824c feat: AI ที่ปรึกษาธุรกิจ (Chat Assistant) — แชทสตรีมสด + จำข้ามอุปกรณ์ (#60) (4 days ago)

## Production health (⚠️ HTTP 403)

## Skills registry (35 total, 33 active, 2 need setup)
| ID | Name | Endpoint | Status |
|---|---|---|---|
| S1 | RCCF Prompt | `/api/generate` | active |
| S2 | Taste Check | `/api/generate` | active |
| S3 | Master Prompt | `/api/generate` | active |
| S4 | Image Analysis | `/api/analyze-image` | active |
| S5 | TTS Voice | `/api/tts` | needs_key (needs `ELEVENLABS_API_KEY`) |
| S6 | AI Critic | `/api/generate` | active |
| S7 | Context Card | `/api/generate` | active |
| S8 | LINE OA Connect | `/api/line/send` | needs_key (needs `LINE_CHANNEL_TOKEN`) |
| S9 | Learning Layer | `/api/skills/learning/patterns` | active |
| S10 | Trend Analyzer | `/api/skills/trend` | active |
| S11 | Hashtag Generator | `/api/skills/hashtag` | active |
| S12 | SEO Thai | `/api/skills/seo` | active |
| S13 | Sentiment Scanner | `/api/skills/sentiment` | active |
| S14 | Video Script | `/api/skills/video-script` | active |
| S15 | Multi-Language | `/api/skills/translate` | active |
| S16 | Prompt Builder | `/api/skills/prompt-builder` | active |
| S17 | Cultural Wisdom | `/api/skills/cultural-wisdom` | active |
| S18 | Sales Conversion Engine | `/api/skills/promo-engine` | active |
| S19 | Supply Chain AI | `/api/skills/supply-chain` | active |
| S20 | Pricing Optimizer | `/api/skills/pricing` | active |
| S21 | Customer Service AI | `/api/skills/customer-service` | active |
| S22 | Ad Budget Planner | `/api/skills/ad-budget` | active |
| S23 | Break-even Planner | `/api/skills/break-even` | active |
| S24 | Campaign Calendar | `/api/skills/campaign-calendar` | active |
| S25 | Live Selling Script | `/api/skills/live-script` | active |
| S26 | Omni-Solver | `/api/skills/omni-solver` | active |
| S27 | Negotiation Coach | `/api/skills/negotiation` | active |
| S28 | Conflict Mediator | `/api/skills/mediation` | active |
| S29 | Crisis Manager | `/api/skills/crisis` | active |
| S30 | Persona Builder | `/api/skills/persona` | active |
| S31 | Product Listing Writer | `/api/skills/listing` | active |
| S32 | Review Responder | `/api/skills/review-reply` | active |
| S33 | Bundle & Upsell Designer | `/api/skills/bundle` | active |
| S34 | FAQ & Auto-Reply Builder | `/api/skills/faq` | active |
| S35 | Broadcast & Re-engagement | `/api/skills/broadcast` | active |

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

