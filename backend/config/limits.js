/**
 * OpenThaiAi — Central Limits Configuration
 *
 * Single source of truth for every numeric limit in the system.
 * Edit here; never hardcode limits in individual modules.
 *
 * Groups:
 *   RATE      — express-rate-limit windows + max counts
 *   PLANS     — per-plan tenant entitlements
 *   AI        — max_tokens for each call site
 *   CREDITS   — gamification caps
 *   QUERY     — Supabase row-fetch ceilings
 *   BODY      — HTTP request body size limits
 *   TIMEOUT   — network / external-API timeouts (ms)
 *   AFFILIATE — MLM / chain rules
 *   MATCHING  — matching engine result caps
 */

// ── Rate limits ───────────────────────────────────────────────────────────────
export const RATE = {
  // AI content generation (per IP)
  generate: { windowMs: 60_000, max: 10 },

  // Affiliate application (per IP)
  affiliate: { windowMs: 15 * 60_000, max: 5 },

  // Auth / login (per IP)
  auth: { windowMs: 15 * 60_000, max: 20 },

  // Admin endpoints (per IP)
  admin: { windowMs: 15 * 60_000, max: 30 },

  // Matching suggestions (per IP)
  match: { windowMs: 60_000, max: 30 },

  // Match requests / POST (per IP)
  matchRequest: { windowMs: 60_000, max: 5 },

  // Dispute open (per IP)
  disputeOpen: { windowMs: 15 * 60_000, max: 10 },

  // Dispute status poll (per IP)
  disputeTrack: { windowMs: 60_000, max: 30 },

  // Producer application (per IP)
  producerApply: { windowMs: 15 * 60_000, max: 5 },

  // Blueprint / content tool (per IP) — reuses generateLimiter logic
  blueprint: { windowMs: 60_000, max: 30 },

  // First-party shop checkout (per IP)
  shop: { windowMs: 10 * 60_000, max: 12 },

  // LINE broadcast (per IP)
  broadcast: { windowMs: 60 * 60_000, max: 6 },

  // Affiliate link click tracking (per IP)
  affClick: { windowMs: 60_000, max: 60 },

  // Affiliate payout withdrawal (per IP)
  withdraw: { windowMs: 60 * 60_000, max: 10 },

  // Contact form (per IP)
  contact: { windowMs: 60 * 60_000, max: 5 },

  // Waitlist signup (per IP)
  waitlist: { windowMs: 60 * 60_000, max: 3 },

  // GDPR/PDPA erasure requests (per IP)
  privacyErasure: { windowMs: 60 * 60_000, max: 5 },

  // MCP protocol endpoint (per IP)
  mcp: { windowMs: 60_000, max: 60 },

  // PromptPay QR generation (per IP)
  quickpay: { windowMs: 10 * 60_000, max: 20 },

  // Credit ledger reads/writes (per IP)
  credits: { windowMs: 60_000, max: 40 },

  // Order placement (per IP)
  order: { windowMs: 10 * 60_000, max: 10 },

  // Order status polling (per IP)
  orderTrack: { windowMs: 60_000, max: 30 },

  // AI Worker job CRUD (per IP)
  aiWorker: { windowMs: 60_000, max: 30 },

  // AI Worker manual "run now" (per IP) — separate/tighter, this triggers a real AI call
  aiWorkerRun: { windowMs: 60_000, max: 6 },
};

// ── Plan entitlements ─────────────────────────────────────────────────────────
export const PLANS = {
  free:       { agents: 1,  generates_per_day: 10,   memory_slots: 100,  webhooks: 1,  price_thb: 0    },
  starter:    { agents: 3,  generates_per_day: 100,  memory_slots: 500,  webhooks: 3,  price_thb: 299  },
  pro:        { agents: 10, generates_per_day: 500,  memory_slots: 2000, webhooks: 10, price_thb: 799  },
  enterprise: { agents: 99, generates_per_day: 9999, memory_slots: 9999, webhooks: 50, price_thb: 2499 },
};

// ── AI token limits ───────────────────────────────────────────────────────────
export const AI = {
  // General content generation (server.js generateWithClaude)
  generate: 1024,

  // Voice command processing (voice-commander.js)
  voice: 512,

  // Video script generation (video-generator.js)
  video: 2048,

  // Blueprint /develop endpoint (content-blueprint.js)
  blueprint: 1024,

  // Dispute AI resolution (disputes.js)
  dispute: 1024,

  // MCP agent tool calls (mcp-handler.js)
  mcp: 4096,

  // AI Worker scheduled/manual run (ai-worker.js) — kept small: these run unattended
  worker: 800,
};

// ── AI Worker — recurring automated task limits, gated by SUBSCRIPTION_PLANS ───
// (plan keys must match omise-payment.js SUBSCRIPTION_PLANS: free/pro/premier)
export const AI_WORKER = {
  free:    { maxJobs: 1,  minIntervalMinutes: 1440 }, // 1 งาน, รันได้ถี่สุดวันละครั้ง (ใช้เครดิตฟรีที่มี)
  pro:     { maxJobs: 5,  minIntervalMinutes: 60   }, // 5 งาน, รันได้ถี่สุดทุกชั่วโมง
  premier: { maxJobs: 20, minIntervalMinutes: 15   }, // 20 งาน, รันได้ถี่สุดทุก 15 นาที
};

// ── Credit / gamification caps ────────────────────────────────────────────────
export const CREDITS = {
  // Maximum credit balance a user can hold
  maxBalance: 200,

  // Maximum streak bonus credits per day
  streakMaxBonus: 5,

  // Maximum credits claimable in a single claim call
  maxClaim: 50,
};

// ── Supabase query ceilings ───────────────────────────────────────────────────
export const QUERY = {
  producers: 1000,
  orders: 1000,
  disputes: 1000,
  products: 1000,
  stockMovements: 500,
  matchRequests: 1000,
  webhookLogs: 50,
  memories: 50,
};

// ── HTTP body size limits ─────────────────────────────────────────────────────
export const BODY = {
  // General JSON payloads
  json: '50kb',

  // Image upload endpoint (/api/analyze-image)
  image: '5mb',

  // TTS text input (/api/tts)
  tts: '10kb',

  // Cloud sync payload (/api/sync)
  sync: '1mb',
};

// ── Timeouts (milliseconds) ───────────────────────────────────────────────────
export const TIMEOUT = {
  // Webhook delivery to tenant endpoints
  webhookDelivery: 8_000,

  // Preflight checks (health / Supabase ping)
  preflight: 8_000,

  // RSS / external news feed fetch
  rssFetch: 5_000,
};

// ── Affiliate / chain rules ───────────────────────────────────────────────────
export const AFFILIATE = {
  // Maximum MLM chain depth (Non-MLM compliance)
  chainDepthMax: 2,
};

// ── Matching engine caps ──────────────────────────────────────────────────────
export const MATCHING = {
  // Default results per API call
  defaultLimit: 20,

  // Hard ceiling — query param ?limit cannot exceed this
  maxLimit: 100,

  // suggestForProducer default
  suggestDefault: 10,

  // suggestForProducer ceiling
  suggestMax: 50,
};
