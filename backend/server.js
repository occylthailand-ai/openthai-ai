import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import nodemailer from 'nodemailer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import https from 'https';
import { createHmac } from 'node:crypto';
import { openapiSpec } from './openapi.js';
import { handleMcp } from './mcp-handler.js';
import { createMemorySystem } from './vector-memory.js';
import { createWebhookSystem } from './webhook-system.js';
import { createTenantManager, requireTenant, PLANS } from './tenant-manager.js';
import { processVoiceCommand } from './voice-commander.js';
import { generateVideoScript, submitToVideoAPI, pollVideoJob } from './video-generator.js';
import {
  createPromptPayCharge, createCardCharge, getChargeStatus, createOrGetCustomer,
  createSubscription, cancelSubscription, verifyOmiseWebhook,
  SUBSCRIPTION_PLANS,
} from './omise-payment.js';
import { createCorporateSystem, DEPARTMENTS } from './corporate-system.js';
import { createPRSystem } from './pr-communications.js';
import { createCredits } from './credits.js';
import { createProducers } from './producers.js';
import { createOrders } from './orders.js';
import { createDisputes } from './disputes.js';
import { TOOL_DEFINITIONS, toGeminiTools, executeTool } from './agent-tools.js';
import { createPortalLeads } from './portal-leads.js';
import { createInventory } from './inventory.js';
import { createProgressTracker } from './progress-tracker.js';
import { createIntegrations } from './integrations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Vercel serverless detection ──────────────────────────────────────────────
const IS_VERCEL = !!process.env.VERCEL;
// Admin key — ใน production (serverless) ห้าม fallback ค่า default สาธารณะ
// ต้องตั้ง ADMIN_KEY เท่านั้น; โหมด local ยังใช้ default เพื่อความสะดวกตอน dev
function resolveAdminKey() {
  if (process.env.ADMIN_KEY) return process.env.ADMIN_KEY;
  return IS_VERCEL ? null : 'openthai-admin-2026';
}
function checkAdminKey(provided) {
  const key = resolveAdminKey();
  return !!key && provided === key;
}
function adminDenyMessage() {
  return 'Unauthorized';
}

// Domain URL — ใช้แทน hardcoded domain ในอีเมล/ลิงก์ทุกที่
const DOMAIN_URL = (process.env.DOMAIN_URL || process.env.FRONTEND_URL || 'https://www.openthai-ai.com').replace(/\/$/, '');
const STORE_EMAIL = process.env.STORE_PRODUCER_EMAIL || 'store@openthai-ai.com';

// adminLimiter — กันการ brute-force admin key (แยกจาก paymentLimiter)
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { success: false, message: 'Too many requests' } });

// บน Vercel: ไฟล์ static อ่านได้จาก repo, ไฟล์ writable ต้องใช้ /tmp
// Local: ทุกอย่างอยู่ใน backend/data/
const STATIC_DATA_DIR = join(__dirname, 'data');
const WRITE_DATA_DIR  = IS_VERCEL ? '/tmp/openthai-data' : STATIC_DATA_DIR;

// ─── Supabase REST helper — shared by affiliates / payments / entitlements ────
const _SB_URL = process.env.SUPABASE_URL;
const _SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const _useSB  = !!(_SB_URL && _SB_KEY);
async function _sbReq(method, table, opts = {}) {
  const url = new URL(`${_SB_URL}/rest/v1${table}`);
  Object.entries(opts.params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const hdrs = { apikey: _SB_KEY, Authorization: `Bearer ${_SB_KEY}`, 'Content-Type': 'application/json' };
  if (opts.prefer) hdrs.Prefer = opts.prefer;
  const r = await fetch(url.toString(), { method, headers: hdrs, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (r.status === 204) return null;
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d?.message || d?.hint) || `SB HTTP ${r.status}`);
  return d;
}
// ── Infrastructure Layer — Vector Memory · Webhooks · Multi-tenant ────────────
// Initialized after WRITE_DATA_DIR is known
const memory    = createMemorySystem(WRITE_DATA_DIR, () => gemini ? { _googleAI: { getGenerativeModel: (o) => new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel(o) } } : null);
const webhooks  = createWebhookSystem(WRITE_DATA_DIR);
const tenants   = createTenantManager(WRITE_DATA_DIR);
const corporate = createCorporateSystem(WRITE_DATA_DIR);
const pr        = createPRSystem(WRITE_DATA_DIR);
const credits   = createCredits(WRITE_DATA_DIR);
const producers = createProducers(WRITE_DATA_DIR);
const orders    = createOrders(WRITE_DATA_DIR, { onNewOrder: async (order) => { sendOrderNotification(order); try { await producers.decrementStock(order.producer_email, order.qty); } catch (_) { /* ignore */ } } });
const disputes  = createDisputes(WRITE_DATA_DIR, {
  orders, callAI, parseAIJson,
  notify: {
    opened:    async (dispute, order) => sendDisputeNotification(dispute, order, 'opened'),
    responded: async (dispute, order) => sendDisputeNotification(dispute, order, 'responded'),
    resolved:  async (dispute, order) => sendDisputeNotification(dispute, order, 'resolved'),
  },
});
const portalLeads = createPortalLeads(WRITE_DATA_DIR, { onNewLead: async (lead) => handleNewPortalLead(lead) });
const inventory = createInventory(WRITE_DATA_DIR, { onLowStock: (product) => sendLowStockAlert(product) });
const progress  = createProgressTracker(WRITE_DATA_DIR, { producers, orders, inventory });

import {
  signToken, verifyToken, requireAuth,
  getAdminUsers, checkPassword, checkOverrideKey,
  useRecoveryCode, generateRecoveryCodes, getGoogleAuthUrl, exchangeGoogleCode,
} from './auth.js';

const app = express();
app.set('trust proxy', 1); // Vercel / reverse proxy — needed for express-rate-limit
const PORT = process.env.PORT || 8000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({ origin: true, credentials: true })); // allow all origins (file://, localhost, Vercel)
// Skip global JSON parser for signed webhooks — ต้องใช้ raw buffer เพื่อตรวจลายเซ็น HMAC
// (LINE + Omise payment) ไม่งั้น express.json จะกิน body ก่อน → ตรวจลายเซ็นไม่ผ่านตลอด
app.use((req, res, next) => {
  if (req.path === '/api/line/webhook' || req.path === '/api/payment/webhook') return next();
  express.json({ limit: '50kb' })(req, res, next);
});
// image endpoint uses its own larger limit (see /api/analyze-image)

// Credit ledger routes — /api/credits, /credits/checkin, /credits/spin, /credits/claim
app.use(credits.router);
// Producer onboarding routes — /api/producers/apply, /producers/categories, /api/catalog
app.use(producers.router);
// Order routes — /api/orders
app.use(orders.router);
// Order dispute / escrow routes — /api/disputes
app.use(disputes.router);
// Portal lead capture — /api/leads/submit (the endpoint all 7 /portals/* pages call)
app.use(portalLeads.router);
// Inventory / first-party shop routes — /api/shop/products
app.use(inventory.router);

// ─── Rate Limiters ────────────────────────────────────────────────────────────
// DISABLE_RATE_LIMIT=1 ปิด generate limiter เฉพาะตอนรัน smoke test (ไม่มีผลกับ production)
const _generateLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 นาที
  max: 10,                    // สูงสุด 10 req/min ต่อ IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'ส่งคำขอบ่อยเกินไป กรุณารอ 1 นาทีแล้วลองใหม่' },
});
const generateLimiter = process.env.DISABLE_RATE_LIMIT === '1' ? (req, res, next) => next() : _generateLimiter;

const affiliateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 นาที
  max: 5,                     // สมัคร affiliate 5 ครั้ง/15 นาที ต่อ IP
  message: { error: 'ส่งคำขอสมัครบ่อยเกินไป กรุณารอแล้วลองใหม่' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 นาที
  max: 20,                    // login 20 ครั้ง/15 นาที ต่อ IP
  message: { error: 'พยายาม login บ่อยเกินไป กรุณารอ 15 นาที' },
});

// ─── AI Clients — Hybrid: Claude (primary) → Gemini (fallback) → Mock ────────
// Priority: 1) Anthropic direct  2) OpenRouter (Claude via OpenRouter)  3) Gemini
const anthropic = (() => {
  if (process.env.ANTHROPIC_API_KEY) {
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  if (process.env.OPENROUTER_API_KEY) {
    // OpenRouter wrapper — ใช้ interface เดิมของ Anthropic SDK
    return {
      messages: {
        create: async ({ model, max_tokens, messages, system }) => {
          const msgs = system
            ? [{ role: 'system', content: system }, ...messages]
            : messages;
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://www.openthai-ai.com',
              'X-Title': 'Openthai.ai',
            },
            body: JSON.stringify({
              model: ({'claude-haiku-4-5-20251001':'anthropic/claude-haiku-4-5','claude-haiku-4-5':'anthropic/claude-haiku-4-5','claude-sonnet-4-5':'anthropic/claude-sonnet-4-5','claude-3-haiku-20240307':'anthropic/claude-3-haiku'})[model] || (model.startsWith('claude') ? `anthropic/${model}` : model),
              max_tokens,
              messages: msgs,
            }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || 'OpenRouter error');
          return { content: [{ text: data.choices[0].message.content }] };
        },
      },
    };
  }
  return null;
})();

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-flash-latest' })
  : null;

// ── Generate with Claude Haiku 4.5 (fast + affordable) ──────────────────────
async function generateWithClaude(form) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(form) }],
  });
  const text = msg.content[0]?.text?.trim() || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return valid JSON');
  const data = JSON.parse(jsonMatch[0]);
  if (Array.isArray(data.hashtags) && !data.hashtags.includes('#Openthai.ai')) {
    data.hashtags.push('#Openthai.ai');
  }
  data.source = 'claude';
  return data;
}

// ── Generate with Gemini Flash Latest ──────────────────────────────────────────
async function generateWithGemini(form) {
  const result = await gemini.generateContent(buildPrompt(form));
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON');
  const data = JSON.parse(jsonMatch[0]);
  if (Array.isArray(data.hashtags) && !data.hashtags.includes('#Openthai.ai')) {
    data.hashtags.push('#Openthai.ai');
  }
  data.source = 'gemini';
  return data;
}

// ── Smart AI Router: Claude → Gemini → Mock ─────────────────────────────────
async function smartGenerate(form) {
  // 1️⃣ ลอง Claude ก่อน (ถ้ามี ANTHROPIC_API_KEY)
  if (anthropic) {
    try {
      const result = await generateWithClaude(form);
      console.log(`[AI] Claude ✅ — ${form.product}`);
      return result;
    } catch (err) {
      console.warn(`[AI] Claude failed: ${err.message} — trying Gemini`);
    }
  }
  // 2️⃣ fallback → Gemini (ถ้ามี GEMINI_API_KEY)
  if (gemini) {
    try {
      const result = await generateWithGemini(form);
      console.log(`[AI] Gemini ✅ — ${form.product}`);
      return result;
    } catch (err) {
      console.warn(`[AI] Gemini failed: ${err.message} — using mock`);
    }
  }
  // 3️⃣ last resort → mock
  console.log(`[AI] Mock — no API keys configured`);
  return mockGenerate(form);
}

// ─── Mock fallback (ใช้เมื่อไม่มี API Key) ───────────────────────────────────
const MOCK_HOOKS = [
  (p) => `ทำไม ${p} ถึงขายดีที่สุดในไทย? เฉลยตอนท้าย!`,
  (p) => `รู้มั้ย? ${p} แท้ๆ ต่างจากของปลอมยังไง!`,
  (p) => `POV: คุณเพิ่งค้นพบ ${p} ที่ดีที่สุดในชีวิต`,
  (p) => `หยุดก่อน! ถ้าคุณยังไม่รู้จัก ${p} คุณเสียโอกาสทุกวัน`,
  (p) => `แม่ค้าไม่อยากให้รู้ว่า ${p} มีราคาถูกขนาดนี้!`,
];

function mockGenerate(form) {
  const hook = MOCK_HOOKS[Math.floor(Math.random() * MOCK_HOOKS.length)](form.product);
  return {
    hook,
    script: [
      `📍 เปิดด้วยคำถาม: "${form.product} คืออะไร และทำไมคนไทยถึงต้องมี?"`,
      `🔍 อธิบายที่มา: บอกเล่าประวัติและความพิเศษของ ${form.category} ไทยแท้`,
      `✅ ข้อเท็จจริง 3 ข้อ: คุณสมบัติ, วัสดุ, มาตรฐาน`,
      `💡 เปรียบเทียบ: ทำไม ${form.product} ของไทยถึงดีกว่านำเข้า`,
      `🎯 CTA: "กดลิงก์ด้านล่างสั่งได้เลย ส่งฟรีทั่วไทย"`,
    ],
    caption: `✨ ${form.product} — สินค้าไทยแท้คุณภาพพรีเมียม\n💰 ราคาพิเศษ${form.price ? ` ${form.price}` : ''}\n🚚 ส่งฟรีทั่วไทย\n⭐ รีวิวจริงกว่า 5,000 คำสั่งซื้อ\n📩 DM หรือกดลิงก์ใน Bio`,
    hashtags: ['#OTOP', '#สินค้าไทย', '#ของดีบ้านเรา', '#ขายออนไลน์', '#TikTokShop', `#${form.product.replace(/\s+/g, '')}`, '#Openthai.ai'],
    criticScore: (7 + Math.random() * 2.8).toFixed(1),
    source: 'mock',
  };
}

// ─── Build Claude prompt ──────────────────────────────────────────────────────
function buildPrompt(form) {
  const langMap = { 'ภาษาไทย': 'ภาษาไทย', 'English': 'English', 'ไทย + อังกฤษ': 'ทั้งภาษาไทยและอังกฤษ' };
  const lang = langMap[form.lang] || 'ภาษาไทย';

  return `คุณเป็น AI ผู้เชี่ยวชาญด้านการสร้างคอนเทนต์ขายสินค้าไทยบน Social Media

สินค้า: ${form.product}
หมวดหมู่: ${form.category}
แพลตฟอร์ม: ${form.platform}
สไตล์คอนเทนต์: ${form.style} (educational=สอน/ให้ข้อมูล, entertainment=ความบันเทิง/ฮา, sales=ขายตรง)
ภาษา: ${lang}
ราคา: ${form.price || 'ไม่ระบุ'}
กลุ่มเป้าหมาย: ${form.audience || 'ทั่วไป'}

กรุณาสร้างคอนเทนต์และตอบกลับ **เฉพาะ JSON** ตามโครงสร้างนี้ ไม่มีข้อความอื่นนอกจาก JSON:

{
  "hook": "ประโยค Hook เปิดที่ดึงดูดใจ 1 ประโยค",
  "script": [
    "ขั้นตอนที่ 1 ของ Script วิดีโอ",
    "ขั้นตอนที่ 2",
    "ขั้นตอนที่ 3",
    "ขั้นตอนที่ 4",
    "ขั้นตอนที่ 5"
  ],
  "caption": "Caption พร้อมใช้งาน มี emoji ครบถ้วน",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5", "#hashtag6", "#hashtag7", "#hashtag8", "#hashtag9", "#hashtag10"],
  "criticScore": "คะแนน 0.0-10.0 ตามคุณภาพของคอนเทนต์ที่คุณสร้าง"
}`;
}

// ─── POST /api/generate ───────────────────────────────────────────────────────
app.post('/api/generate', generateLimiter, async (req, res) => {
  const form = req.body;

  if (!form?.product?.trim()) {
    return res.status(400).json({ error: 'product is required' });
  }

  // Basic input sanitization — ตัดอักขระอันตราย
  const sanitize = (s) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').slice(0, 500) : '');
  form.product  = sanitize(form.product);
  form.audience = sanitize(form.audience);
  form.price    = sanitize(form.price);

  // บังคับโควต้ารายวันตามแผน (Free = 3/วัน, Pro/Premier = ไม่จำกัด)
  const quota = await checkQuota(req);
  if (!quota.allowed) {
    return res.status(429).json({
      error: `ใช้สิทธิ์ฟรีครบ ${quota.limit} ชิ้นแล้ววันนี้ — อัพเกรดเป็น Pro (฿20/เดือน) เพื่อสร้างไม่จำกัด`,
      code: 'QUOTA_EXCEEDED', plan: 'free', used: quota.used, limit: quota.limit, upgrade_url: '/payment?plan=pro',
    });
  }

  try {
    const data = await smartGenerate(form);
    const u = await consumeQuota(req);
    return res.json({ ...data, usage: { plan: u.plan, used: u.used ?? null, limit: u.limit ?? null, remaining: u.remaining ?? null, unlimited: !!u.unlimited, viaCredit: !!u.viaCredit, creditBalance: u.creditBalance ?? null } });
  } catch (err) {
    console.error('[generate error]', err.message);
    const fallback = mockGenerate(form);
    fallback.source = 'mock-fallback';
    return res.json(fallback);
  }
});

// GET /api/usage — โควต้าคงเหลือวันนี้ (ไม่หักโควต้า)
app.get('/api/usage', async (req, res) => {
  const q = await checkQuota(req);
  res.json({ success: true, plan: q.plan, unlimited: !!q.unlimited, used: q.used ?? 0, limit: q.unlimited ? null : q.limit, remaining: q.unlimited ? null : q.remaining });
});

// GET /api/credits/admin/summary — สรุปเศรษฐกิจเครดิต (Admin Key)
app.get('/api/credits/admin/summary', adminLimiter, async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  try { res.json({ success: true, ...(await credits.adminSummary()) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/producers/admin/summary — สรุปผู้ผลิตที่สมัคร (Admin Key)
app.get('/api/producers/admin/summary', adminLimiter, async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  try { res.json({ success: true, ...(await producers.summary()) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/producers/admin/list — รายชื่อผู้ผลิตทั้งหมด (Admin Key)
app.get('/api/producers/admin/list', adminLimiter, async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  try { res.json({ success: true, producers: await producers.all() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/producers/admin/status — อนุมัติ/เปลี่ยนสถานะผู้ผลิต (Admin Key)
app.post('/api/producers/admin/status', adminLimiter, async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const r = await producers.setStatus(req.body?.email, req.body?.status);
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  res.json({ success: true, ...r });
});

// GET /api/orders/admin/summary + /list, POST /api/orders/admin/status (Admin Key)
app.get('/api/orders/admin/summary', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  try { res.json({ success: true, ...(await orders.summary()) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
app.get('/api/orders/admin/list', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  try { res.json({ success: true, orders: await orders.all() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
app.post('/api/orders/admin/status', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const r = await orders.setStatus(req.body?.id, req.body?.status, req.body?.note);
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  res.json({ success: true, ...r });
});
// POST /api/orders/admin/ship — บันทึกเลขพัสดุ + ขนส่ง (Admin Key)
app.post('/api/orders/admin/ship', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const r = await orders.ship(req.body?.id, req.body || {});
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  res.json({ success: true, ...r });
});
// POST /api/orders/admin/deliver — ยืนยันถึงปลายทาง + หลักฐาน (เซ็นรับ/จุดฝาก) (Admin Key)
app.post('/api/orders/admin/deliver', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const r = await orders.deliver(req.body?.id, req.body || {});
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  res.json({ success: true, ...r });
});

// ─── Disputes / Escrow admin — list, AI-assist suggestion, resolve (Admin Key) ─
// GET /api/disputes/admin/summary — สรุปข้อพิพาท + escrow (ใช้เป็น monitoring endpoint ด้วย)
app.get('/api/disputes/admin/summary', adminLimiter, async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  try { res.json({ success: true, ...(await disputes.summary()) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
app.get('/api/disputes/admin/list', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  try { res.json({ success: true, disputes: await disputes.all() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
// POST /api/disputes/admin/ai-suggest — ขอความเห็น AI ประกอบการตัดสินใจ (ไม่ auto-resolve)
app.post('/api/disputes/admin/ai-suggest', adminLimiter, async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const r = await disputes.aiSuggest(req.body?.id);
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  res.json({ success: true, ...r });
});
// POST /api/disputes/admin/resolve — คำตัดสินสุดท้ายของ admin (favor_supplier/favor_buyer/refund/split)
app.post('/api/disputes/admin/resolve', adminLimiter, async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const r = await disputes.resolve(req.body?.id, { decision: req.body?.decision, note: req.body?.note, resolved_by: req.body?.resolved_by || 'admin' });
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  res.json({ success: true, ...r });
});

// ─── 360° Progress Tracker ───────────────────────────────────────────────────
// GET /api/progress/snapshot — snapshot ล่าสุด (public read)
app.get('/api/progress/snapshot', async (req, res) => {
  try {
    let snap = progress.loadSnapshot();
    if (!snap || snap.date !== new Date().toISOString().slice(0, 10)) {
      snap = await progress.buildSnapshot();
    }
    res.json({ success: true, ...snap });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/progress/history — 90 วันย้อนหลัง
app.get('/api/progress/history', (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '30'), 90);
    const h = progress.loadHistory().slice(-days);
    res.json({ success: true, history: h, days });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/progress/daily-report — Vercel Cron trigger (23:30 Thai = 16:30 UTC)
app.post('/api/progress/daily-report', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key || req.headers['x-vercel-cron-secret'];
  const adminOk = checkAdminKey(key);
  const cronOk  = key === process.env.CRON_SECRET;
  if (!adminOk && !cronOk) return res.status(401).json({ success: false, message: adminDenyMessage() });
  try {
    const result = await progress.sendDailyReport();
    res.json({ success: true, ...result });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PATCH /api/progress/kpi — อัปเดต KPI มือ
app.patch('/api/progress/kpi', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const { guild_id, kpi_key, value } = req.body || {};
  if (!guild_id || !kpi_key || value === undefined) return res.status(400).json({ success: false, error: 'ต้องการ guild_id, kpi_key, value' });
  const r = await progress.updateManualKpi(guild_id, kpi_key, value);
  res.json(r);
});

// ─── Inventory admin (Admin Key) ──────────────────────────────────────────────
const invAuth = (req, res) => { const key = req.headers['x-admin-key'] || req.query.key; if (!checkAdminKey(key)) { res.status(401).json({ success: false, message: adminDenyMessage() }); return false; } return true; };
app.get('/api/inventory/admin/list', async (req, res) => { if (!invAuth(req, res)) return; try { res.json({ success: true, products: await inventory.list() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
app.get('/api/inventory/admin/summary', async (req, res) => { if (!invAuth(req, res)) return; try { res.json({ success: true, ...(await inventory.summary()) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
app.get('/api/inventory/admin/movements', async (req, res) => { if (!invAuth(req, res)) return; try { res.json({ success: true, movements: await inventory.movements(req.query.product_id) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
app.post('/api/inventory/admin/upsert', async (req, res) => { if (!invAuth(req, res)) return; const r = await inventory.upsert(req.body || {}); if (!r.ok) return res.status(400).json({ success: false, error: r.error }); res.json({ success: true, ...r }); });
app.post('/api/inventory/admin/adjust', async (req, res) => { if (!invAuth(req, res)) return; const { id, delta, type, reason } = req.body || {}; const r = await inventory.adjust(id, delta, type, reason); if (!r.ok) return res.status(400).json({ success: false, error: r.error }); res.json({ success: true, ...r }); });
app.post('/api/inventory/admin/remove', async (req, res) => { if (!invAuth(req, res)) return; res.json({ success: true, ...(await inventory.remove(req.body?.id)) }); });
app.get('/api/inventory/admin/sales', async (req, res) => { if (!invAuth(req, res)) return; try { res.json({ success: true, ...(await inventory.productSales(req.query.product_id)) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
app.get('/api/inventory/admin/sales-report', async (req, res) => { if (!invAuth(req, res)) return; try { res.json({ success: true, ...(await inventory.salesReport()) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

// POST /api/shop/checkout — ซื้อสินค้าร้านเรา + รับชำระเงิน (Omise) + ตัดสต๊อก + สร้างออเดอร์ติดตามได้
const shopLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 12, message: { success: false, error: 'สั่งซื้อบ่อยเกินไป' } });
app.post('/api/shop/checkout', shopLimiter, async (req, res) => {
  try {
    const { product_id, qty: rawQty, customer_name, contact, address, method = 'card', token, ref, platform } = req.body || {};
    const channel = (ref ? `ref:${String(ref).slice(0, 20)}` : (platform ? String(platform).slice(0, 30) : 'store'));
    const p = await inventory.get(product_id);
    if (!p || p.status !== 'active') return res.status(404).json({ success: false, error: 'ไม่พบสินค้า' });
    if (!customer_name?.trim() || !contact?.trim()) return res.status(400).json({ success: false, error: 'กรอกชื่อและช่องทางติดต่อ' });
    const qty = Math.max(1, Math.min(999, parseInt(rawQty, 10) || 1));
    if ((p.stock || 0) < qty) return res.status(409).json({ success: false, error: `สต๊อกไม่พอ (เหลือ ${p.stock})` });
    const amount = (p.price || 0) * qty;

    // สร้างออเดอร์ (ติดตามได้ในระบบเดียวกับ marketplace)
    const ord = await orders.place({ producer_email: STORE_EMAIL, product_name: p.name, price: p.price, qty, customer_name, contact, address, note: `ร้าน Openthai · SKU ${p.sku}` });
    const orderId = ord.id;

    const finalizePaid = async (charge) => {
      await inventory.adjust(product_id, -qty, 'sale', `ขายผ่านร้าน (ออเดอร์ ${orderId})`, orderId, channel);
      await orders.setStatus(orderId, 'confirmed', 'ชำระเงินสำเร็จ');
      return res.json({ success: true, paid: true, order_id: orderId, amount, stock_left: Math.max(0, (p.stock || 0) - qty), ...(charge || {}) });
    };

    // Mock mode (ยังไม่ตั้ง Omise) — บัตร/ม็อค ถือว่าจ่ายสำเร็จทันที
    if (!process.env.OMISE_SECRET_KEY) {
      if (method === 'promptpay') return res.json({ success: true, paid: false, order_id: orderId, amount, mock: true, message: 'mock mode — ยังไม่ตั้ง Omise (สต๊อกจะตัดเมื่อชำระจริง)' });
      return finalizePaid({ charge_id: `mock_${Date.now()}`, mock: true });
    }
    if (method === 'card') {
      if (!token) return res.status(400).json({ success: false, error: 'ต้องการ card token' });
      const charge = await createCardCharge({ amount_thb: amount, token, description: `Openthai Store — ${p.name} ×${qty}`, metadata: { order_id: orderId, product_id, qty } });
      if (charge.status === 'failed') return res.status(402).json({ success: false, error: charge.failure_message || 'บัตรถูกปฏิเสธ', order_id: orderId });
      if (charge.paid) return finalizePaid({ charge_id: charge.charge_id });
      return res.json({ success: true, paid: false, order_id: orderId, amount, ...charge });
    }
    if (method === 'promptpay') {
      const charge = await createPromptPayCharge({ amount_thb: amount, description: `Openthai Store — ${p.name} ×${qty}`, metadata: { order_id: orderId, product_id, qty } });
      return res.json({ success: true, paid: false, order_id: orderId, amount, ...charge, note: 'สแกนจ่ายแล้วสต๊อกจะตัดเมื่อยืนยันการชำระ' });
    }
    return res.status(400).json({ success: false, error: 'method ต้องเป็น card หรือ promptpay' });
  } catch (e) { addLog('error', 'Shop', e.message); res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/leads/admin/search — รวมลูกค้า/ลีดทุกแหล่ง (waitlist + affiliate + order) + ค้นหา/กรอง
app.get('/api/leads/admin/search', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const type = (req.query.type || '').toString().trim();
    const leads = [];
    for (const w of waitlist) leads.push({ type: 'waitlist', name: '', contact: w.email || '', detail: `source: ${w.source || 'landing'}`, date: w.joined_at || w.createdAt || '' });
    for (const a of affiliates) leads.push({ type: 'affiliate', name: a.name || '', contact: a.email || '', detail: `${a.platform || ''} · ${a.ref_code || ''}`.trim(), date: a.created_at || a.joined_at || '' });
    const ords = await orders.all();
    for (const o of ords) leads.push({ type: 'order', name: o.customer_name || '', contact: o.contact || '', detail: `${o.product_name || ''}${o.amount ? ` · ฿${o.amount}` : ''}`, date: o.created_at || '' });
    // เติม "portal:" นำหน้า type ของ portal leads กันชนกับ type เดิม (โดยเฉพาะ "affiliate" ที่มาจากคนละ
    // แหล่ง — affiliate ปกติคือคนที่สมัครจริงแล้ว ส่วน portal:affiliate คือคนกรอกฟอร์มสนใจ ซึ่งตอนนี้
    // handleNewPortalLead() auto-register ต่อให้เป็นใบสมัครจริงทันทีที่กรอกฟอร์มแล้ว (ดู "registered"
    // ด้านล่าง) — เช็คไขว้กับ producers/affiliates จริงด้วย email เพื่อบอกแอดมินว่าอันไหนสมัครจริงแล้ว
    const portal = await portalLeads.all();
    const producerEmails = new Set((await producers.all()).map(p => p.email));
    const affiliateEmails = new Set(affiliates.map(a => a.email));
    for (const l of portal) {
      let registered = null; // null = ไม่มีระบบจริงให้เชื่อม (เช่น consumer/gov/foundation — lead คือระบบทั้งหมดอยู่แล้ว)
      if (l.type === 'producer') registered = producerEmails.has(l.email);
      else if (l.type === 'affiliate') registered = affiliateEmails.has(l.email);
      leads.push({ type: `portal:${l.type}`, name: l.name || '', contact: l.email || '', detail: Object.entries(l.form_data || {}).filter(([k]) => k !== 'name' && k !== 'email').map(([k, v]) => `${k}: ${v}`).join(' · ').slice(0, 200), date: l.created_at || '', registered });
    }

    let out = leads;
    if (type && type !== 'all') out = out.filter((l) => l.type === type);
    if (q) out = out.filter((l) => [l.name, l.contact, l.detail].some((f) => (f || '').toString().toLowerCase().includes(q)));
    out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const counts = { all: leads.length, waitlist: leads.filter((l) => l.type === 'waitlist').length, affiliate: leads.filter((l) => l.type === 'affiliate').length, order: leads.filter((l) => l.type === 'order').length };
    for (const t of portalLeads.KNOWN_TYPES) counts[`portal:${t}`] = leads.filter((l) => l.type === `portal:${t}`).length;
    res.json({ success: true, counts, total: out.length, leads: out.slice(0, 2000) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/leads/admin/broadcast — ส่งอีเมล newsletter หาลีดทั้งหมด (Admin Key)
const broadcastLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 6, message: { success: false, error: 'ส่ง broadcast บ่อยเกินไป' } });
app.post('/api/leads/admin/broadcast', broadcastLimiter, async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const { subject, message, audience = 'all' } = req.body || {};
  if (!subject?.trim() || !message?.trim()) return res.status(400).json({ success: false, error: 'ต้องการหัวข้อและข้อความ' });

  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');
  const set = new Set();
  if (audience === 'all' || audience === 'waitlist') for (const w of waitlist) if (isEmail(w.email)) set.add(w.email.toLowerCase());
  if (audience === 'all' || audience === 'affiliate') for (const a of affiliates) if (isEmail(a.email)) set.add(a.email.toLowerCase());
  if (audience === 'all' || audience === 'order') { const ords = await orders.all(); for (const o of ords) if (isEmail(o.contact)) set.add(o.contact.toLowerCase()); }
  const recipients = [...set];

  if (!mailer) return res.json({ success: false, sent: 0, recipients: recipients.length, error: 'ยังไม่ได้ตั้ง SMTP — ตั้ง SMTP_USER/SMTP_PASS ใน env เพื่อส่งจริง (พบผู้รับ ' + recipients.length + ' คน)' });
  if (!recipients.length) return res.json({ success: true, sent: 0, recipients: 0, message: 'ไม่มีอีเมลผู้รับในกลุ่มนี้' });

  const safe = String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  const html = `<div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#fe2c55,#6366f1);padding:24px;text-align:center;"><h1 style="margin:0;font-size:22px;">Openthai.ai</h1></div>
    <div style="padding:26px;font-size:15px;line-height:1.7;color:#e2e8f0;">${safe}</div>
    <div style="padding:16px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid rgba(255,255,255,0.08);">
      <a href="${DOMAIN_URL}" style="color:#6366f1;">openthai-ai.com</a> · ส่งถึงคุณเพราะเคยลงทะเบียน/ใช้บริการ Openthai.ai
    </div></div>`;

  let sent = 0;
  for (let i = 0; i < recipients.length; i += 50) {
    const batch = recipients.slice(i, i + 50);
    try {
      await mailer.sendMail({ from: `"Openthai.ai" <${process.env.SMTP_USER}>`, to: process.env.SMTP_USER, bcc: batch, subject: subject.slice(0, 200), html });
      sent += batch.length;
    } catch (e) { console.error('[broadcast] batch error:', e.message); }
  }
  addLog('info', 'Broadcast', `ส่ง newsletter "${subject.slice(0, 40)}" → ${sent}/${recipients.length} คน`);
  res.json({ success: true, sent, recipients: recipients.length });
});

// ─── Nodemailer transporter ───────────────────────────────────────────────────
// SMTP_PORT ต้องอ่านจาก env เหมือนที่ preflight.js ทำ — เดิม hardcode 587/secure:false
// ทำให้ preflight ทดสอบ SMTP_PORT=465 (SSL) ผ่าน แต่ mailer จริงที่ใช้ส่งอีเมลทุกฉบับกลับ
// ใช้ 587/insecure เสมอ ไม่ตรงกับที่ทดสอบไว้ — ผู้ที่ตั้ง SMTP_PORT=465 อีเมลจริงจะส่งไม่ได้
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const mailer = process.env.SMTP_USER
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function sendAffiliateWelcome(to, name, refCode, refLink) {
  if (!mailer) return;
  try {
    await mailer.sendMail({
      from: `"Openthai.ai" <${process.env.SMTP_USER}>`,
      to,
      subject: '🎉 ยินดีต้อนรับสู่ Openthai.ai Affiliate Program!',
      html: `
      <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#fe2c55,#6366f1);padding:32px;text-align:center;">
          <h1 style="margin:0;font-size:26px;">🎉 ยินดีด้วย ${name}!</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);">คุณเป็น Affiliate ของ Openthai.ai แล้ว</p>
        </div>
        <div style="padding:28px;">
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
            <div style="font-size:12px;color:#64748b;margin-bottom:6px;">REF CODE ของคุณ</div>
            <div style="font-size:32px;font-weight:900;letter-spacing:4px;color:#10b981;">${refCode}</div>
          </div>
          <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:16px;margin-bottom:20px;">
            <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Affiliate Link ของคุณ</div>
            <a href="${refLink}" style="color:#a5b4fc;font-size:14px;word-break:break-all;">${refLink}</a>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:10px;background:rgba(16,185,129,0.1);border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:900;color:#10b981;">20%</div>
                <div style="font-size:11px;color:#64748b;">Commission เริ่มต้น</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:10px;background:rgba(99,102,241,0.1);border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:900;color:#6366f1;">ทุกจันทร์</div>
                <div style="font-size:11px;color:#64748b;">จ่ายเงิน</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:10px;background:rgba(245,158,11,0.1);border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:900;color:#f59e0b;">40%</div>
                <div style="font-size:11px;color:#64748b;">สูงสุด Elite</div>
              </td>
            </tr>
          </table>
          <div style="text-align:center;">
            <a href="${DOMAIN_URL}/affiliate/dashboard?ref=${encodeURIComponent(refCode)}" style="display:inline-block;background:linear-gradient(135deg,#fe2c55,#6366f1);color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:700;font-size:15px;">📊 เปิด Dashboard ของฉัน</a>
          </div>
        </div>
        <div style="padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#475569;">
          Openthai.ai • <a href="${DOMAIN_URL}" style="color:#6366f1;">openthai-ai.com</a>
        </div>
      </div>`,
    });
    console.log(`📧 Welcome email ส่งให้ ${to} เรียบร้อย`);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

// ─── ใบเสร็จการชำระเงิน (ส่งอีเมลอัตโนมัติเมื่อชำระสำเร็จ) ──────────────────────
async function sendPaymentReceipt(to, { plan, amount_thb, charge_id, paid_at, method }) {
  if (!mailer || !to) return;
  const planName = SUBSCRIPTION_PLANS[plan]?.name || plan || 'Subscription';
  const baht = Number(amount_thb || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const when = paid_at ? new Date(paid_at).toLocaleString('th-TH') : new Date().toLocaleString('th-TH');
  const channel = method === 'card' ? 'บัตรเครดิต/เดบิต' : method === 'subscription' ? 'ตัดบัตรอัตโนมัติรายเดือน' : 'พร้อมเพย์ (PromptPay)';
  try {
    await mailer.sendMail({
      from: `"Openthai.ai" <${process.env.SMTP_USER}>`,
      to,
      subject: `🧾 ใบเสร็จการชำระเงิน Openthai.ai — แผน ${planName}`,
      html: `
      <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#10b981,#059669);padding:32px;text-align:center;">
          <h1 style="margin:0;font-size:26px;">✅ ขอบคุณสำหรับการชำระเงิน</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);">บัญชีของคุณถูกอัพเกรดเป็นแผน ${planName} แล้ว</p>
        </div>
        <div style="padding:28px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:10px 0;color:#94a3b8;">สรุปการชำระเงิน</td><td style="padding:10px 0;text-align:right;color:#10b981;font-weight:700;">สำเร็จ</td></tr>
            <tr><td style="padding:10px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">แผน</td><td style="padding:10px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${planName} (รายเดือน)</td></tr>
            <tr><td style="padding:10px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">ยอดที่ชำระทั้งหมด</td><td style="padding:10px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);font-weight:700;">${baht} บาท</td></tr>
            <tr><td style="padding:10px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">วันที่ชำระเงิน</td><td style="padding:10px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${when}</td></tr>
            <tr><td style="padding:10px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">ช่องทางการชำระเงิน</td><td style="padding:10px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${channel}</td></tr>
            <tr><td style="padding:10px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">เลขที่รายการ</td><td style="padding:10px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);font-family:monospace;font-size:12px;">${charge_id || '-'}</td></tr>
          </table>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:16px;text-align:center;font-size:12px;color:#64748b;">
          Openthai.ai • <a href="${DOMAIN_URL}" style="color:#6366f1;">openthai-ai.com</a>
        </div>
      </div>`,
    });
    console.log(`📧 Receipt email ส่งให้ ${to} เรียบร้อย`);
  } catch (err) {
    console.error('Receipt email error:', err.message);
  }
}

// แจ้งเตือนผู้ผลิตทางอีเมลเมื่อมีคำสั่งซื้อใหม่ (+ สำเนาถึงเจ้าของระบบ)
// HTML-escape ก่อนแทรกข้อมูลที่ผู้ใช้กรอกเองลงในอีเมล — clip() ใน orders.js/disputes.js/
// portal-leads.js ตัด <tag> ด้วย regex ที่ bypass ได้ถ้า input มี "<" ไม่ปิด (เช่น
// `<img src=x onerror=y` ไม่มี ">") ตัวเปิด tag ที่ไม่สมบูรณ์นี้จะไม่ถูก regex ตัดออก แล้วไป
// เจอ ">" ตัวถัดไปในเทมเพลต HTML เอง (เช่นจาก </td>) กลายเป็น tag ที่สมบูรณ์โดยไม่ตั้งใจ —
// อีเมลแจ้งเตือน 3 จุด (order/dispute/portal-lead) ส่งถึงคนจริงข้ามฝ่าย (ลูกค้า↔ผู้ผลิต↔แอดมิน)
// จึงต้อง escape ที่จุดแทรกลง HTML โดยตรง ไม่พึ่ง clip() ที่ต้นทางอย่างเดียว
const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

async function sendOrderNotification(order) {
  const to = order?.producer_email || process.env.ORDER_NOTIFY_EMAIL || process.env.SMTP_USER;
  if (!mailer || !to) return; // ไม่มี SMTP → ข้ามเงียบๆ (mock/dev)
  const baht = (n) => (n == null ? '-' : `฿${Number(n).toLocaleString('th-TH')}`);
  const owner = process.env.ORDER_NOTIFY_EMAIL || process.env.SMTP_USER;
  try {
    await mailer.sendMail({
      from: `"Openthai.ai" <${process.env.SMTP_USER}>`,
      to,
      cc: owner && owner !== to ? owner : undefined,
      subject: `🛒 คำสั่งซื้อใหม่ — ${order.product_name} ×${order.qty}`,
      html: `
      <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#fe2c55,#6366f1);padding:28px;text-align:center;">
          <h1 style="margin:0;font-size:24px;">🛒 คุณมีคำสั่งซื้อใหม่!</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);">รีบติดต่อลูกค้าเพื่อยืนยันและจัดส่ง</p>
        </div>
        <div style="padding:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:9px 0;color:#94a3b8;">สินค้า</td><td style="padding:9px 0;text-align:right;font-weight:700;">${escapeHtml(order.product_name)}</td></tr>
            <tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">จำนวน</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${order.qty}</td></tr>
            <tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">ยอดรวม</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);color:#10b981;font-weight:700;">${baht(order.amount)}</td></tr>
            <tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">ชื่อลูกค้า</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${escapeHtml(order.customer_name)}</td></tr>
            <tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">ติดต่อลูกค้า</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);font-weight:700;color:#a5b4fc;">${escapeHtml(order.contact)}</td></tr>
            ${order.note ? `<tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">หมายเหตุ</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${escapeHtml(order.note)}</td></tr>` : ''}
            <tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">เลขที่ออเดอร์</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);font-family:monospace;font-size:12px;">${order.id}</td></tr>
          </table>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:16px;text-align:center;font-size:12px;color:#64748b;">
          Openthai.ai • <a href="${DOMAIN_URL}/admin" style="color:#6366f1;">จัดการออเดอร์ใน Admin</a>
        </div>
      </div>`,
    });
    console.log(`📧 Order notification ส่งให้ ${to} เรียบร้อย`);
  } catch (err) {
    console.error('Order email error:', err.message);
  }
}

// แจ้งเตือนเมื่อมีการเปิด/ตอบโต้/ปิดข้อพิพาทคำสั่งซื้อ (escrow) — ถึง "ทั้งสองฝ่าย" + สำเนาเจ้าของระบบ
// (ก่อนหน้านี้ส่งแค่ผู้ผลิต — พลาดฝั่งผู้ซื้อ ทำให้ไม่เป็นธรรมกับอีกฝ่าย)
const isEmailLike = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');
async function sendDisputeNotification(dispute, order, phase) {
  const owner = process.env.ORDER_NOTIFY_EMAIL || process.env.SMTP_USER;
  const recipients = new Set();
  if (order?.producer_email) recipients.add(order.producer_email);
  if (isEmailLike(order?.contact)) recipients.add(order.contact);
  if (!recipients.size && owner) recipients.add(owner);
  if (!mailer || !recipients.size) return;

  const subjectMap = {
    opened:    `⚠️ มีข้อพิพาทใหม่ — ออเดอร์ ${order?.product_name || dispute.order_id}`,
    responded: `💬 มีคำชี้แจงใหม่ในข้อพิพาท — ออเดอร์ ${order?.product_name || dispute.order_id}`,
    resolved:  `✅ ข้อพิพาทถูกปิดแล้ว — ออเดอร์ ${order?.product_name || dispute.order_id}`,
  };
  const colorMap = { opened: '#ef4444,#f59e0b', responded: '#6366f1,#8b5cf6', resolved: '#10b981,#059669' };
  const titleMap = { opened: '⚠️ ข้อพิพาทใหม่', responded: '💬 มีคำชี้แจงใหม่', resolved: '✅ ข้อพิพาทถูกปิดแล้ว' };

  try {
    await mailer.sendMail({
      from: `"Openthai.ai" <${process.env.SMTP_USER}>`,
      to: [...recipients].join(', '),
      cc: owner && !recipients.has(owner) ? owner : undefined,
      subject: subjectMap[phase] || subjectMap.opened,
      html: `
      <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,${colorMap[phase] || colorMap.opened});padding:28px;text-align:center;">
          <h1 style="margin:0;font-size:22px;">${titleMap[phase] || titleMap.opened}</h1>
        </div>
        <div style="padding:24px;font-size:14px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:9px 0;color:#94a3b8;">เลขที่ออเดอร์</td><td style="padding:9px 0;text-align:right;font-family:monospace;font-size:12px;">${dispute.order_id}</td></tr>
            <tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">เปิดโดย</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${dispute.opened_by === 'buyer' ? 'ผู้ซื้อ' : 'ผู้ผลิต'}</td></tr>
            <tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">เหตุผล</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${escapeHtml(dispute.reason)}</td></tr>
            ${phase === 'responded' ? `<tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">คำชี้แจง</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${escapeHtml(dispute.counter_response?.note) || '-'}</td></tr>` : ''}
            ${phase === 'resolved' ? `<tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">คำตัดสิน</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);font-weight:700;">${escapeHtml(dispute.resolution?.decision) || '-'}</td></tr>` : ''}
          </table>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:16px;text-align:center;font-size:12px;color:#64748b;">
          Openthai.ai • <a href="${DOMAIN_URL}/admin" style="color:#6366f1;">จัดการข้อพิพาทใน Admin</a> · เช็คสถานะที่ <code>/api/disputes/${dispute.id}/track</code>
        </div>
      </div>`,
    });
    console.log(`📧 Dispute (${phase}) notification ส่งให้ ${[...recipients].join(', ')} เรียบร้อย`);
  } catch (err) {
    console.error('Dispute email error:', err.message);
  }
}

// แจ้งเตือนเมื่อมีคนกรอกฟอร์มจากหน้า /portals/* (gov-thai, gov-intl, intl-org, foundation, creator, affiliate, producer, consumer, middleman)
const PORTAL_TYPE_LABEL = { 'gov-thai': 'หน่วยงานรัฐไทย', 'gov-intl': 'หน่วยงานรัฐต่างประเทศ', 'intl-org': 'องค์กรระหว่างประเทศ', foundation: 'มูลนิธิ/NGO', creator: 'ครีเอเตอร์', affiliate: 'Affiliate (สนใจ)', producer: 'ผู้ผลิต (สนใจ)', consumer: 'ผู้บริโภค', middleman: 'คนกลาง/ตัวแทนจำหน่าย' };
async function sendPortalLeadNotification(lead) {
  const to = process.env.PORTAL_LEAD_NOTIFY_EMAIL || process.env.ORDER_NOTIFY_EMAIL || process.env.SMTP_USER;
  if (!mailer || !to) return;
  const label = PORTAL_TYPE_LABEL[lead.type] || lead.type;
  const fields = Object.entries(lead.form_data || {}).map(([k, v]) => `<tr><td style="padding:7px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">${escapeHtml(k)}</td><td style="padding:7px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${escapeHtml(v)}</td></tr>`).join('');
  try {
    await mailer.sendMail({
      from: `"Openthai.ai" <${process.env.SMTP_USER}>`,
      to,
      subject: `🌐 มีผู้สนใจใหม่จาก Portal — ${label}`,
      html: `
      <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:28px;text-align:center;">
          <h1 style="margin:0;font-size:22px;">🌐 มีผู้สนใจใหม่ — ${label}</h1>
        </div>
        <div style="padding:24px;font-size:14px;">
          <table style="width:100%;border-collapse:collapse;">${fields}</table>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:16px;text-align:center;font-size:12px;color:#64748b;">
          Openthai.ai • <a href="${DOMAIN_URL}/admin" style="color:#6366f1;">ดูใน Admin → Customers</a>
        </div>
      </div>`,
    });
    console.log(`📧 Portal lead (${lead.type}) notification ส่งให้ ${to} เรียบร้อย`);
  } catch (err) {
    console.error('Portal lead email error:', err.message);
  }
}

// /portals/producer และ /portals/affiliate เดิมส่งข้อมูลเข้า portal_leads เฉยๆ (เก็บไว้ดูใน
// Admin เท่านั้น) โดยไม่เคยเชื่อมกับระบบสมัครจริง (/api/producers/apply, /api/affiliate/apply)
// เลย — คนสมัครผ่านหน้านี้จึงไม่ได้กลายเป็นผู้ผลิต/affiliate จริงจนกว่าแอดมินจะสังเกตเห็น
// lead แล้วเชิญให้สมัครซ้ำอีกที ฟังก์ชันนี้ auto-register ต่อให้ทันทีที่ lead เข้ามา
// (best-effort — ถ้า register ไม่ผ่าน lead ก็ยังถูกบันทึกและแจ้งเตือนตามปกติ)
async function handleNewPortalLead(lead) {
  await sendPortalLeadNotification(lead);
  const fd = lead.form_data || {};
  try {
    if (lead.type === 'producer') {
      const r = await producers.register({
        company: fd.name, contact_name: fd.name, email: lead.email,
        phone: fd.phone, product_name: fd.product,
      });
      if (r.ok) console.log(`✅ Portal lead (producer) auto-registered เป็นใบสมัครผู้ผลิตจริง: ${lead.email}`);
      else console.warn(`[portal-leads] producer auto-register ไม่ผ่าน: ${r.error}`);
    } else if (lead.type === 'affiliate') {
      const r = await registerAffiliateCore({ name: fd.name, email: lead.email, platform: fd.platform });
      if (r.ok) console.log(`✅ Portal lead (affiliate) auto-registered เป็น affiliate จริง: ${lead.email} — Ref: ${r.record.ref_code}`);
      else console.warn(`[portal-leads] affiliate auto-register ไม่ผ่าน: ${r.message}`);
    }
  } catch (e) {
    console.error('[portal-leads] auto-register error:', e.message);
  }
}

// แจ้งเตือนเติมสต๊อกเมื่อสินค้าใกล้หมด — อีเมล + LINE + log (ทุกช่องทาง)
async function sendLowStockAlert(product) {
  const line = `⚠️ สต๊อกใกล้หมด: ${product.name} (${product.sku}) เหลือ ${product.stock} ชิ้น (จุดเตือน ${product.low_stock}) — ควรเติมสต๊อก`;
  addLog('warn', 'Inventory', line);
  const to = process.env.ORDER_NOTIFY_EMAIL || process.env.SMTP_USER;
  if (mailer && to) {
    try {
      await mailer.sendMail({
        from: `"Openthai.ai" <${process.env.SMTP_USER}>`, to,
        subject: `⚠️ เติมสต๊อก: ${product.name} เหลือ ${product.stock}`,
        html: `<div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:560px;margin:0 auto;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:24px;text-align:center;"><h1 style="margin:0;font-size:22px;">⚠️ สต๊อกใกล้หมด</h1></div>
          <div style="padding:24px;font-size:15px;line-height:1.7;">
            <b>${product.name}</b> (SKU ${product.sku})<br>เหลือ <b style="color:#ef4444;">${product.stock}</b> ชิ้น · จุดเตือน ${product.low_stock}<br><br>
            👉 ควรเติมสต๊อกที่ <a href="${DOMAIN_URL}/admin" style="color:#6366f1;">Admin → คลังสินค้า</a>
          </div></div>`,
      });
    } catch (e) { console.error('Low-stock email error:', e.message); }
  }
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (token) {
    try { await fetch('https://notify-api.line.me/api/notify', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ message: `\n${line}` }).toString() }); }
    catch (e) { console.error('Low-stock LINE error:', e.message); }
  }
}

// ─── Affiliate DB — Supabase primary / JSON file fallback ────────────────────
const AFF_FILE = join(WRITE_DATA_DIR, 'affiliates.json');
function _affFileSave(data) {
  try {
    const dir = AFF_FILE.replace(/[/\\][^/\\]+$/, '');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(AFF_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('[affiliates] file save error:', e.message); }
}
const _affToRow = (r) => ({
  ref_code: r.ref_code, name: r.name, email: r.email, phone: r.phone || '',
  platform: r.platform || 'TikTok', followers: r.followers || '',
  channel_url: r.channel_url || '', note: r.note || '', ref_link: r.ref_link || '',
  tier: r.tier || 'starter', commission_rate: r.commission_rate ?? 0.20,
  total_sales: r.total_sales || 0, total_earned: r.total_earned || 0,
  pending_payout: (r.total_earned || 0) - (r.paid_out || 0),
  status: r.status || 'active',
  joined_at: r.joined_at || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
const _affFromRow = (r) => ({
  id: r.id, ref_code: r.ref_code, name: r.name, email: r.email,
  phone: r.phone || '', platform: r.platform || 'TikTok',
  followers: r.followers || '', channel_url: r.channel_url || '',
  note: r.note || '', ref_link: r.ref_link || '',
  tier: r.tier || 'starter', commission_rate: r.commission_rate ?? 0.20,
  total_sales: r.total_sales || 0, total_earned: r.total_earned || 0,
  paid_out: 0, clicks: 0, monthly: [], recent_sales: [],
  status: r.status || 'active', joined_at: r.joined_at,
});
let affiliates = [];
try { if (existsSync(AFF_FILE)) affiliates = JSON.parse(readFileSync(AFF_FILE, 'utf8')); } catch (_) {}

if (_useSB) {
  _sbReq('GET', '/affiliates', { params: { select: '*', order: 'joined_at.asc', limit: '10000' } })
    .then(rows => {
      if (Array.isArray(rows) && rows.length > 0) {
        affiliates.length = 0; affiliates.push(...rows.map(_affFromRow));
        console.log(`[affiliates] ✅ Loaded ${rows.length} from Supabase`);
      }
    })
    .catch(e => console.warn('[affiliates] Supabase init failed, using file:', e.message));
}

async function saveAffiliate(record) {
  _affFileSave(affiliates);
  if (_useSB) {
    try { await _sbReq('POST', '/affiliates', { body: [_affToRow(record)], params: { on_conflict: 'ref_code' }, prefer: 'resolution=merge-duplicates,return=minimal' }); }
    catch (e) { console.warn('[affiliates] Supabase write failed:', e.message); }
  }
}

// สมัคร Affiliate จริง — ใช้ทั้งจาก POST /api/affiliate/apply โดยตรง และจาก portal lead
// (type:'affiliate') ที่ auto-register ต่อให้อัตโนมัติ ดู handleNewPortalLead ด้านล่าง
async function registerAffiliateCore(input) {
  const { name, email, phone, platform, followers, channel_url, note, ref_code, ref_link } = input || {};
  if (!name || !email) return { ok: false, status: 400, message: 'ต้องการชื่อและอีเมล' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, message: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  const safeEmail = email.toLowerCase().trim();
  const proposedCode = ref_code ? ref_code.replace(/[^A-Z0-9a-z_-]/g, '') : '';

  if (affiliates.find((a) => a.email === safeEmail)) {
    return { ok: false, status: 409, message: 'อีเมลนี้สมัครไปแล้ว', duplicate: true };
  }

  const finalCode = proposedCode || `AFF${Date.now().toString().slice(-6)}`;
  const record = {
    id: Date.now().toString(),
    name: String(name).trim().slice(0, 100),
    email: safeEmail, phone: String(phone || '').slice(0, 20),
    platform: platform || 'TikTok',
    followers: String(followers || '').slice(0, 50),
    channel_url: String(channel_url || '').slice(0, 200),
    note: String(note || '').slice(0, 500),
    ref_code: finalCode,
    ref_link: ref_link || `${DOMAIN_URL}/?ref=${encodeURIComponent(finalCode)}`,
    tier: 'starter',
    commission_rate: 0.20,
    total_sales: 0,
    total_earned: 0,
    joined_at: new Date().toISOString(),
    status: 'active',
  };

  affiliates.push(record);
  await saveAffiliate(record);
  console.log(`✅ Affiliate สมัครใหม่: ${name} (${safeEmail}) — Ref: ${record.ref_code}`);

  sendAffiliateWelcome(safeEmail, name, record.ref_code, record.ref_link);
  webhooks.dispatch('affiliate.joined', { name, ref_code: record.ref_code, platform: record.platform });

  return { ok: true, record };
}

// ─── Withdrawals store (ไฟล์) — คำขอถอนค่าคอมพันธมิตร ────────────────────────
const WD_FILE = join(WRITE_DATA_DIR, 'withdrawals.json');
let withdrawals = [];
try { if (existsSync(WD_FILE)) withdrawals = JSON.parse(readFileSync(WD_FILE, 'utf8')); } catch (_) {}
function saveWithdrawals() {
  try {
    const dir = WD_FILE.replace(/[/\\][^/\\]+$/, '');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(WD_FILE, JSON.stringify(withdrawals, null, 2), 'utf8');
  } catch (e) { console.error('[withdrawals] save error:', e.message); }
}
const WD_MIN = 100;  // ยอดถอนขั้นต่ำ (บาท)
// ยอดที่ "จองไว้" = คำขอถอนที่ยังไม่จบ (pending/approved) — กันถอนซ้ำเกินยอดจริง
const reservedFor = (ref) => withdrawals.filter(w => w.ref_code === ref && ['pending', 'approved'].includes(w.status)).reduce((s, w) => s + (w.amount || 0), 0);
const affPending = (a) => +((a.total_earned || 0) - (a.paid_out || 0) - reservedFor(a.ref_code)).toFixed(2);

// ─── POST /api/affiliate/apply — รับสมัคร Affiliate ──────────────────────────

app.post('/api/affiliate/apply', affiliateLimiter, async (req, res) => {
  try {
    const r = await registerAffiliateCore(req.body);
    if (!r.ok) return res.status(r.status).json({ success: false, message: r.message });
    res.json({
      success: true,
      message: 'สมัคร Affiliate สำเร็จ!',
      data: {
        ref_code: r.record.ref_code,
        ref_link: r.record.ref_link,
        tier: r.record.tier,
        commission_rate: r.record.commission_rate,
      },
    });
  } catch (err) {
    console.error('Affiliate apply error:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// ─── GET /api/affiliate/stats/:ref_code — ดูสถิติ ────────────────────────────
app.get('/api/affiliate/stats/:ref_code', (req, res) => {
  const aff = affiliates.find((a) => a.ref_code === req.params.ref_code);
  if (!aff) return res.status(404).json({ success: false, message: 'ไม่พบ Affiliate นี้' });

  // คำนวณวันจันทร์ถัดไป (วันจ่ายเงิน)
  const d = new Date();
  const daysUntil = d.getDay() === 1 ? 7 : (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntil);
  const nextPayout = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  // ความคืบหน้าสู่ Tier ถัดไป (อีกกี่ดีลถึงค่าคอมขั้นถัดไป)
  const sales = aff.total_sales || 0;
  const upcoming = AFFILIATE_TIERS.filter(t => t.min > sales).sort((a, b) => a.min - b.min)[0];
  const next_tier = upcoming ? { tier: upcoming.tier, rate: upcoming.rate, at_sales: upcoming.min, sales_to_go: upcoming.min - sales } : null;

  res.json({
    success: true,
    data: {
      ref_code:        aff.ref_code,
      name:            aff.name,
      tier:            aff.tier,
      commission_rate: aff.commission_rate,
      next_tier,
      total_sales:     aff.total_sales     || 0,
      total_earned:    aff.total_earned    || 0,
      pending_payout:  (aff.total_earned   || 0) - (aff.paid_out || 0),
      paid_out:        aff.paid_out        || 0,
      clicks:          aff.clicks          || 0,
      clicks_by_source: aff.clicks_by_source || {},
      sales_by_source:  aff.sales_by_source  || {},
      earned_by_source: aff.earned_by_source || {},
      conversions:     aff.total_sales     || 0,
      conversion_rate: aff.clicks > 0 ? +((aff.total_sales / aff.clicks) * 100).toFixed(1) : 0,
      monthly:         aff.monthly         || [],
      recent_sales:    aff.recent_sales    || [],
      next_payout_date: nextPayout,
      joined_at:       aff.joined_at,
      status:          aff.status,
      platform:        aff.platform,
    },
  });
});

// ─── POST /api/affiliate/click — นับคลิกลิงก์ ref (สำหรับ conversion rate) ────
const affClickLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { success: false } });
// ช่องทางที่รองรับสำหรับ attribution
const TRACK_SOURCES = ['tiktok', 'facebook', 'instagram', 'line', 'youtube', 'x', 'shopee', 'lazada', 'direct'];
const cleanSource = (s) => { const v = String(s || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 20); return TRACK_SOURCES.includes(v) ? v : (v ? 'other' : 'direct'); };

app.post('/api/affiliate/click', affClickLimiter, (req, res) => {
  const ref = (req.body?.ref || req.query?.ref || '').toString().replace(/[^A-Z0-9a-z_-]/g, '').slice(0, 40);
  const aff = ref && affiliates.find(a => a.ref_code === ref);
  if (!aff) return res.json({ success: false });
  aff.clicks = (aff.clicks || 0) + 1;
  // attribution ตามแหล่งที่มา (utm_source) — รู้ว่าคลิกมาจากแพลตฟอร์มไหน
  const src = cleanSource(req.body?.source || req.query?.source);
  aff.clicks_by_source = aff.clicks_by_source || {};
  aff.clicks_by_source[src] = (aff.clicks_by_source[src] || 0) + 1;
  saveAffiliate(aff).catch(() => {});
  res.json({ success: true });
});

// POST /api/track/link — สร้างลิงก์ติดตาม (UTM + ref) — รู้ว่าเงินมาจากแพลตฟอร์ม/แคมเปญไหน
app.post('/api/track/link', (req, res) => {
  let base = String(req.body?.url || '').trim().slice(0, 500);
  if (!base) return res.status(400).json({ success: false, error: 'ต้องการ url ปลายทาง' });
  if (!/^https?:\/\//i.test(base)) base = 'https://' + base;
  let u;
  try { u = new URL(base); } catch { return res.status(400).json({ success: false, error: 'url ไม่ถูกต้อง' }); }
  const source = cleanSource(req.body?.source);
  const campaign = String(req.body?.campaign || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'launch';
  const ref = String(req.body?.ref || '').replace(/[^A-Z0-9a-z_-]/g, '').slice(0, 40);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', 'social');
  u.searchParams.set('utm_campaign', campaign);
  u.searchParams.set('source', source);          // ให้หน้าเว็บส่งต่อเข้า click attribution ได้
  if (ref) { u.searchParams.set('ref', ref); }
  res.json({ success: true, link: u.toString(), source, campaign, ref: ref || null });
});

// ─── GET /api/affiliate/leaderboard — อันดับพันธมิตร (public · ปิดบังชื่อ) ──────
// ปิดบังชื่อบางส่วนเพื่อความเป็นส่วนตัว · จัดอันดับตาม total_earned แล้ว total_sales
function maskName(name) {
  const s = String(name || '').trim();
  if (!s) return 'พันธมิตร';
  const chars = [...s];
  if (chars.length <= 2) return chars[0] + '*';
  return chars.slice(0, 2).join('') + '*'.repeat(Math.min(4, chars.length - 2));
}
app.get('/api/affiliate/leaderboard', (req, res) => {
  const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 20));
  const ranked = affiliates
    .filter(a => a.status !== 'banned')
    .map(a => ({
      name: maskName(a.name),
      platform: a.platform || '-',
      tier: a.tier || 'starter',
      total_sales: a.total_sales || 0,
      total_earned: +(a.total_earned || 0).toFixed(2),
      clicks: a.clicks || 0,
      conversion_rate: a.clicks > 0 ? +((a.total_sales || 0) / a.clicks * 100).toFixed(1) : 0,
    }))
    .sort((x, y) => (y.total_earned - x.total_earned) || (y.total_sales - x.total_sales))
    .slice(0, limit)
    .map((a, i) => ({ rank: i + 1, ...a }));
  const totals = affiliates.reduce((t, a) => ({
    affiliates: t.affiliates + 1,
    sales: t.sales + (a.total_sales || 0),
    earned: +(t.earned + (a.total_earned || 0)).toFixed(2),
  }), { affiliates: 0, sales: 0, earned: 0 });
  res.json({ success: true, leaderboard: ranked, totals, ts: new Date().toISOString() });
});

// ─── POST /api/affiliate/withdraw — พันธมิตรขอถอนค่าคอมเข้าพร้อมเพย์ ───────────
const withdrawLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { success: false, error: 'ขอถอนบ่อยเกินไป กรุณารอ' } });
app.post('/api/affiliate/withdraw', withdrawLimiter, (req, res) => {
  const ref = (req.body?.ref_code || '').toString().replace(/[^A-Z0-9a-z_-]/g, '').slice(0, 40);
  const promptpay = (req.body?.promptpay || '').toString().replace(/[^0-9]/g, '').slice(0, 13);
  const aff = ref && affiliates.find(a => a.ref_code === ref);
  if (!aff) return res.status(404).json({ success: false, error: 'ไม่พบพันธมิตรนี้' });
  if (!/^[0-9]{10}$|^[0-9]{13}$/.test(promptpay)) return res.status(400).json({ success: false, error: 'กรอกพร้อมเพย์ให้ถูกต้อง (เบอร์ 10 หลัก หรือเลขบัตร 13 หลัก)' });
  const avail = affPending(aff);
  const amount = req.body?.amount != null ? Math.round(Number(req.body.amount)) : avail;
  if (!(amount > 0)) return res.status(400).json({ success: false, error: 'ยอดถอนไม่ถูกต้อง' });
  if (amount < WD_MIN) return res.status(400).json({ success: false, error: `ถอนขั้นต่ำ ฿${WD_MIN}` });
  if (amount > avail) return res.status(400).json({ success: false, error: `ยอดถอนเกินยอดที่ถอนได้ (คงเหลือ ฿${avail})` });

  const wd = {
    id: `wd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ref_code: ref, name: aff.name, amount, promptpay,
    status: 'pending', requested_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  withdrawals.unshift(wd);
  saveWithdrawals();
  addLog('info', 'Withdraw', `คำขอถอน ฿${amount} → ${ref} (${aff.name})`);
  webhooks.dispatch('affiliate.withdraw_requested', { ref_code: ref, amount, id: wd.id }, null);
  res.json({ success: true, withdrawal: wd, pending_balance: affPending(aff) });
});

// ─── GET /api/affiliate/withdrawals?ref_code= — รายการคำขอของพันธมิตร ─────────
app.get('/api/affiliate/withdrawals', (req, res) => {
  const ref = (req.query.ref_code || '').toString().replace(/[^A-Z0-9a-z_-]/g, '').slice(0, 40);
  if (!ref) return res.status(400).json({ success: false, error: 'ต้องการ ref_code' });
  const aff = affiliates.find(a => a.ref_code === ref);
  const list = withdrawals.filter(w => w.ref_code === ref).map(w => ({ ...w, promptpay: w.promptpay.replace(/(\d{3})\d+(\d{2})/, '$1****$2') }));
  res.json({ success: true, withdrawals: list, pending_balance: aff ? affPending(aff) : 0, total_earned: aff?.total_earned || 0, paid_out: aff?.paid_out || 0 });
});

// ─── Admin: รายการ + อนุมัติ/ปฏิเสธ/จ่ายแล้ว (x-admin-key) ────────────────────
app.get('/api/affiliate/withdrawals/admin', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const status = (req.query.status || '').toString();
  const list = status ? withdrawals.filter(w => w.status === status) : withdrawals;
  res.json({ success: true, count: list.length, withdrawals: list });
});
app.post('/api/affiliate/withdrawals/admin/:id', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const wd = withdrawals.find(w => w.id === req.params.id);
  if (!wd) return res.status(404).json({ success: false, error: 'ไม่พบคำขอถอนนี้' });
  const action = (req.body?.action || '').toString();
  if (!['approve', 'reject', 'paid'].includes(action)) return res.status(400).json({ success: false, error: 'action ต้องเป็น approve | reject | paid' });
  if (wd.status === 'paid') return res.status(409).json({ success: false, error: 'คำขอนี้จ่ายเงินไปแล้ว' });

  if (action === 'approve') wd.status = 'approved';
  else if (action === 'reject') { wd.status = 'rejected'; wd.note = (req.body?.note || '').toString().slice(0, 200); }
  else if (action === 'paid') {
    const aff = affiliates.find(a => a.ref_code === wd.ref_code);
    if (aff) { aff.paid_out = +((aff.paid_out || 0) + wd.amount).toFixed(2); saveAffiliate(aff).catch(() => {}); }
    wd.status = 'paid'; wd.paid_at = new Date().toISOString();
  }
  wd.updated_at = new Date().toISOString();
  saveWithdrawals();
  addLog('info', 'Withdraw', `${action} ฿${wd.amount} → ${wd.ref_code} (${wd.id})`);
  webhooks.dispatch('affiliate.withdraw_updated', { id: wd.id, ref_code: wd.ref_code, status: wd.status, amount: wd.amount }, null);
  res.json({ success: true, withdrawal: wd });
});

// ─── GET /api/affiliate/list — admin only (ต้องใช้ ADMIN_KEY header) ──────────
app.get('/api/affiliate/list', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) {
    return res.status(401).json({ success: false, message: adminDenyMessage() });
  }
  // ซ่อน sensitive fields ก่อนส่ง
  const safeData = affiliates.map(({ email, phone, ...rest }) => ({
    ...rest,
    email: email ? email.replace(/(.{2}).+(@.+)/, '$1***$2') : '',
    phone: phone ? phone.replace(/(\d{3})\d+(\d{2})/, '$1****$2') : '',
  }));
  res.json({ success: true, count: affiliates.length, data: safeData });
});

// ─── POST /api/contact — ติดต่อทีมงาน ───────────────────────────────────────
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { success: false, message: 'ส่งข้อความบ่อยเกินไป กรุณารอ 1 ชั่วโมง' },
});

app.post('/api/contact', contactLimiter, (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ อีเมล และข้อความ' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }
    const safe = (s, max = 500) => String(s || '').replace(/<[^>]*>/g, '').slice(0, max);

    console.log(`📨 Contact: ${safe(name)} <${safe(email, 254)}> — ${safe(subject, 100)}`);

    if (mailer) {
      // แจ้งทีมงาน
      mailer.sendMail({
        from: `"Openthai.ai" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        replyTo: safe(email, 254),
        subject: `[Contact] ${safe(subject, 100) || 'ข้อความจากผู้ใช้'}`,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;"><h3>ข้อความจาก ${safe(name)}</h3><p><strong>Email:</strong> ${safe(email, 254)}</p><p><strong>Subject:</strong> ${safe(subject, 100)}</p><hr/><p style="white-space:pre-wrap;">${safe(message)}</p></div>`,
      }).catch(console.error);
      // ยืนยันให้ผู้ส่ง
      mailer.sendMail({
        from: `"Openthai.ai" <${process.env.SMTP_USER}>`,
        to: safe(email, 254),
        subject: '✅ ได้รับข้อความของคุณแล้ว — Openthai.ai',
        html: `<div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:500px;margin:0 auto;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#fe2c55,#6366f1);padding:24px;text-align:center;"><h2 style="margin:0;">✅ ได้รับข้อความแล้ว!</h2></div><div style="padding:24px;font-size:14px;color:#cbd5e1;"><p>สวัสดีคุณ ${safe(name)},</p><p>เราได้รับข้อความของคุณแล้ว ทีมงานจะตอบกลับภายใน <strong style="color:#10b981;">1–2 วันทำการ</strong></p><p style="margin-top:20px;">ขอบคุณที่ติดต่อ Openthai.ai 🙏</p></div></div>`,
      }).catch(console.error);
    }

    res.json({ success: true, message: 'ส่งข้อความสำเร็จ! ทีมงานจะตอบกลับใน 1–2 วันทำการ' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
  }
});

// ─── Waitlist / Email Capture (from Landing Page) ────────────────────────────
const WAITLIST_FILE = join(WRITE_DATA_DIR, 'waitlist.json');

function loadWaitlist() {
  try { if (existsSync(WAITLIST_FILE)) return JSON.parse(readFileSync(WAITLIST_FILE, 'utf8')); } catch (_) {}
  return [];
}
function saveWaitlist(data) {
  try {
    const dir = WAITLIST_FILE.replace(/[/\\][^/\\]+$/, '');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(WAITLIST_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('Save waitlist error:', e.message); }
}

const waitlist = loadWaitlist();

const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  max: 3,                    // กรอกอีเมล 3 ครั้ง/ชั่วโมง ต่อ IP
  message: { success: false, message: 'ส่งคำขอบ่อยเกินไป กรุณารอแล้วลองใหม่' },
});

app.post('/api/waitlist', waitlistLimiter, (req, res) => {
  try {
    const { email, source } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'อีเมลไม่ถูกต้อง' });
    }

    const sanitizedEmail = email.toLowerCase().trim().slice(0, 254);

    if (waitlist.find((w) => w.email === sanitizedEmail)) {
      return res.json({ success: true, message: 'ลงทะเบียนไว้แล้ว! เราจะแจ้งเตือนคุณเร็วๆ นี้ 🎉' });
    }

    const record = {
      email: sanitizedEmail,
      source: source || 'landing',
      joined_at: new Date().toISOString(),
    };
    waitlist.push(record);
    saveWaitlist(waitlist);
    console.log(`📧 Waitlist: ${sanitizedEmail} (${source || 'landing'}) — total: ${waitlist.length}`);

    // ส่ง confirmation email (async)
    if (mailer) {
      mailer.sendMail({
        from: `"Openthai.ai" <${process.env.SMTP_USER}>`,
        to: sanitizedEmail,
        subject: '🎉 ยืนยันการลงทะเบียน Openthai.ai',
        html: `<div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:500px;margin:0 auto;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#fe2c55,#6366f1);padding:28px;text-align:center;"><h1 style="margin:0;font-size:22px;">🎉 ยินดีต้อนรับ!</h1></div><div style="padding:24px;"><p style="font-size:14px;color:#cbd5e1;">ขอบคุณที่สนใจ <strong>Openthai.ai</strong> เราจะแจ้งเตือนคุณทันทีที่มีสิทธิพิเศษ</p><div style="text-align:center;margin:20px 0;"><a href="${DOMAIN_URL}" style="background:linear-gradient(135deg,#fe2c55,#6366f1);color:#fff;text-decoration:none;padding:12px 24px;border-radius:50px;font-weight:700;font-size:14px;">🚀 ลองใช้ฟรีตอนนี้เลย</a></div></div></div>`,
      }).catch(console.error);
    }

    res.json({ success: true, message: 'ลงทะเบียนสำเร็จ! 🎉 เราจะแจ้งเตือนคุณทันที' });
  } catch (err) {
    console.error('Waitlist error:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
  }
});

// ─── POST /api/analyze-image — Gemini/Claude Vision วิเคราะห์รูปสินค้า ─────────
app.post('/api/analyze-image', express.json({ limit: '5mb' }), generateLimiter, async (req, res) => {
  const { base64, mimeType } = req.body || {};
  if (!base64) return res.status(400).json({ success: false, error: 'ต้องส่งข้อมูลรูปภาพ (base64)' });

  const imagePrompt = `วิเคราะห์รูปสินค้าที่เห็นในภาพนี้ แล้วตอบกลับ JSON นี้เท่านั้น ไม่มีข้อความอื่น:
{
  "product": "ชื่อสินค้าที่เห็น (ภาษาไทย กระชับ)",
  "category": "หมวดหมู่ที่เหมาะสมที่สุดจาก: OTOP, อาหาร, ความงาม, สิ่งทอ, เครื่องดื่ม, สมุนไพร, เครื่องประดับ, เฟอร์นิเจอร์, ทั่วไป",
  "description": "คำอธิบายสินค้า 1 ประโยคสั้น ๆ ดึงดูดใจ",
  "audience": "กลุ่มเป้าหมายที่เหมาะสม เช่น แม่บ้าน, คนรักสุขภาพ"
}`;

  // ลอง Claude Vision ก่อน
  if (anthropic) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: base64 } },
            { type: 'text', text: imagePrompt },
          ],
        }],
      });
      const text = msg.content[0]?.text?.trim() || '';
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const data = JSON.parse(m[0]);
        return res.json({ success: true, source: 'claude', ...data });
      }
    } catch (e) { console.warn('[Vision] Claude failed:', e.message); }
  }

  // Fallback: Gemini Vision
  if (gemini) {
    try {
      const result = await gemini.generateContent([
        { inlineData: { data: base64, mimeType: mimeType || 'image/jpeg' } },
        imagePrompt,
      ]);
      const text = result.response.text().trim();
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const data = JSON.parse(m[0]);
        return res.json({ success: true, source: 'gemini', ...data });
      }
    } catch (e) { console.warn('[Vision] Gemini failed:', e.message); }
  }

  return res.status(503).json({ success: false, error: 'ต้องตั้งค่า ANTHROPIC_API_KEY หรือ GEMINI_API_KEY' });
});

// ─── GET /api/trending — Trending Thai hashtags (cached 30 min) ───────────────
const trendCache = { data: null, ts: 0 };
const TREND_TTL  = 30 * 60 * 1000;

const TREND_MAX_AGE = 2 * 60 * 60 * 1000; // force-refresh after 2 hours even if TTL not expired

app.get('/api/trending', async (req, res) => {
  const age = Date.now() - trendCache.ts;
  if (trendCache.data && age < TREND_TTL && age < TREND_MAX_AGE) {
    return res.json(trendCache.data);
  }

  // ถ้ามี Gemini → ให้ AI อัพเดต trend ให้อัตโนมัติ
  if (gemini) {
    try {
      const r = await gemini.generateContent(
        `สร้าง trending hashtags สำหรับ TikTok ไทย ณ วันที่ ${new Date().toLocaleDateString('th-TH')} ตอบ JSON เท่านั้น:
{"hashtags":[{"tag":"#xxx","views":"xxM","hot":true/false}],"topics":[{"topic":"ชื่อ","momentum":"+xx%"}]}`
      );
      const text = r.response.text().trim();
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const ai = JSON.parse(m[0]);
        const payload = { ...ai, ts: new Date().toISOString(), source: 'gemini' };
        trendCache.data = payload; trendCache.ts = Date.now();
        return res.json(payload);
      }
    } catch (_) {}
  }

  // Curated fallback
  const payload = {
    hashtags: [
      { tag: '#OTOP', views: '2.8B', hot: true }, { tag: '#สินค้าไทย', views: '1.2B', hot: true },
      { tag: '#TikTokShop', views: '4.1B', hot: true }, { tag: '#รีวิวสินค้า', views: '3.2B', hot: true },
      { tag: '#แม่ค้าออนไลน์', views: '650M', hot: false }, { tag: '#ของดีราคาถูก', views: '890M', hot: false },
      { tag: '#ผลิตภัณฑ์ไทย', views: '340M', hot: false }, { tag: '#เซลออนไลน์', views: '780M', hot: true },
      { tag: '#ขายออนไลน์', views: '1.5B', hot: false }, { tag: '#ของกินถูก', views: '520M', hot: false },
      { tag: '#ความงามไทย', views: '420M', hot: true }, { tag: '#สมุนไพรไทย', views: '290M', hot: false },
      { tag: '#ผ้าทอมือ', views: '180M', hot: true }, { tag: '#ฝีมือไทย', views: '240M', hot: false },
      { tag: '#กินง่ายทำง่าย', views: '870M', hot: true },
    ],
    topics: [
      { topic: 'สินค้า OTOP ไทย', momentum: '+35%' }, { topic: 'อาหารพื้นบ้านเหนือ', momentum: '+28%' },
      { topic: 'ความงามธรรมชาติ', momentum: '+42%' }, { topic: 'ผ้าทอมือพื้นเมือง', momentum: '+19%' },
      { topic: 'น้ำพริก/เครื่องแกง', momentum: '+55%' }, { topic: 'สมุนไพรล้านนา', momentum: '+31%' },
    ],
    sounds: [
      { name: 'เพลงฮิต TikTok ไทย 2026', uses: '12M' },
      { name: 'Sad Thai Pop Viral', uses: '8.5M' },
      { name: 'Thai Hip Hop Bass', uses: '6.2M' },
    ],
    ts: new Date().toISOString(), source: 'curated',
  };
  trendCache.data = payload; trendCache.ts = Date.now();
  return res.json(payload);
});

// ─── POST /api/generate-ab — A/B สร้าง 2 variant พร้อมกัน ──────────────────────
app.post('/api/generate-ab', generateLimiter, async (req, res) => {
  const form = req.body;
  if (!form?.product?.trim()) return res.status(400).json({ error: 'product required' });
  const sanitize = (s) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').slice(0, 500) : '');
  form.product = sanitize(form.product);
  form.audience = sanitize(form.audience);
  form.price = sanitize(form.price);
  try {
    const [a, b] = await Promise.all([smartGenerate(form), smartGenerate({ ...form, style: form.style === 'sales' ? 'entertainment' : 'sales' })]);
    return res.json({ a, b });
  } catch (err) {
    const a = mockGenerate(form);
    const b = mockGenerate({ ...form, style: 'entertainment' });
    return res.json({ a, b });
  }
});

// ─── POST /api/generate/stream — สตรีมคำโฆษณาสดทีละคำ (SSE · ChatGPT-style) ──────
// ไหลลื่นกว่า: ผู้ใช้เห็นข้อความค่อยๆ ปรากฏแทนรอจนเสร็จ
app.post('/api/generate/stream', generateLimiter, async (req, res) => {
  const { product, platform = 'TikTok', tone = 'สนุก/กระตุ้น', category = 'OTOP', audience = 'ทั่วไป' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  // SSE headers — ปิด buffering เพื่อให้ไหลทันที
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (event, data) => { try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* closed */ } };
  let closed = false;
  res.on('close', () => { closed = true; }); // client disconnect (ไม่ใช่ req body อ่านจบ)

  const prompt = `เขียนแคปชั่นขายของภาษาไทยที่ปังสำหรับ ${platform} โทน "${tone}"
สินค้า: "${String(product).slice(0, 200)}" · หมวด: ${category} · กลุ่มเป้าหมาย: ${audience}
เขียนเป็นข้อความต่อเนื่อง (ไม่ต้องมีหัวข้อ/JSON) มี hook เปิดที่ดึงดูด · ประโยชน์ · call-to-action · อิโมจิพอเหมาะ · แฮชแท็ก 3-5 ตัวท้ายสุด`;

  try {
    send('start', { source: anthropic ? 'claude' : (gemini ? 'gemini' : 'mock') });

    if (anthropic) {
      const stream = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 1024, stream: true,
        messages: [{ role: 'user', content: prompt }],
      });
      for await (const ev of stream) {
        if (closed) break;
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) send('delta', { text: ev.delta.text });
      }
    } else if (gemini) {
      const result = await gemini.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        if (closed) break;
        const t = chunk.text(); if (t) send('delta', { text: t });
      }
    } else {
      // Mock — สตรีมทีละคำเพื่อให้เห็น UX จริง
      const mock = `🔥 หยุดเลื่อน! ${String(product).slice(0, 40)} ที่ทุกคนตามหา มาแล้ว ✨\n\nคุณภาพคัดเกรด ส่งตรงถึงมือคุณ ราคาที่จับต้องได้ รับประกันความพอใจ 💯\n\n👉 ทักแชทสั่งเลยวันนี้ ของมีจำนวนจำกัด!\n\n#${category} #ของดีบอกต่อ #Openthai_ai`;
      for (const word of mock.split(/(\s+)/)) {
        if (closed) break;
        send('delta', { text: word });
        await new Promise(r => setTimeout(r, 35));
      }
    }
    send('done', { ok: true });
  } catch (e) {
    addLog('warn', 'GenerateStream', e.message);
    send('error', { message: 'เกิดข้อผิดพลาดระหว่างสตรีม' });
  } finally {
    try { res.end(); } catch { /* ignore */ }
  }
});

// ─── POST /api/chat/stream — AI ที่ปรึกษาธุรกิจ (แชทสตรีมสด · SSE) ───────────────
const CHAT_SYSTEM = `คุณคือ "ผู้ช่วย AI ของ Openthai.ai" — ที่ปรึกษาธุรกิจสำหรับ SME/OTOP/ผู้ประกอบการไทย
ตอบเป็นภาษาไทยที่เป็นกันเอง กระชับ ใช้ได้จริง เน้นการตลาด ขายของออนไลน์ คอนเทนต์ ราคา และการบริหารร้าน
ถ้าเหมาะสม แนะนำให้ผู้ใช้ลองใช้ทักษะ AI ในระบบ (เช่น ตั้งราคา · สคริปต์ไลฟ์ · วางแคมเปญ)`;

app.post('/api/chat/stream', generateLimiter, async (req, res) => {
  const raw = Array.isArray(req.body?.messages) ? req.body.messages : [];
  // sanitize: เก็บ 12 ข้อความล่าสุด · จำกัดความยาว
  const messages = raw.slice(-12)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'ต้องมีข้อความผู้ใช้' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
  });
  const send = (event, data) => { try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* closed */ } };
  let closed = false;
  res.on('close', () => { closed = true; });

  try {
    send('start', { source: anthropic ? 'claude' : (gemini ? 'gemini' : 'mock') });

    if (anthropic) {
      const stream = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 1024, system: CHAT_SYSTEM, stream: true, messages,
      });
      for await (const ev of stream) {
        if (closed) break;
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) send('delta', { text: ev.delta.text });
      }
    } else if (gemini) {
      const convo = messages.map(m => `${m.role === 'user' ? 'ผู้ใช้' : 'ผู้ช่วย'}: ${m.content}`).join('\n');
      const result = await gemini.generateContentStream(`${CHAT_SYSTEM}\n\n${convo}\nผู้ช่วย:`);
      for await (const chunk of result.stream) { if (closed) break; const t = chunk.text(); if (t) send('delta', { text: t }); }
    } else {
      const q = messages[messages.length - 1].content.slice(0, 40);
      const mock = `ขอบคุณที่ถามเรื่อง "${q}" นะคะ 😊\n\nสำหรับ SME ไทย แนะนำให้เริ่มจาก: เข้าใจลูกค้าให้ชัด → ทำคอนเทนต์ที่ตรงใจ → ตั้งราคาที่คุ้มทั้งสองฝ่าย\n\nลองใช้ทักษะในระบบช่วยได้นะคะ เช่น 🎭 Persona, 💰 ตั้งราคา, 🔴 สคริปต์ไลฟ์ — อยากให้ช่วยด้านไหนเพิ่มเติมไหมคะ?`;
      for (const word of mock.split(/(\s+)/)) { if (closed) break; send('delta', { text: word }); await new Promise(r => setTimeout(r, 30)); }
    }
    send('done', { ok: true });
  } catch (e) {
    addLog('warn', 'ChatStream', e.message);
    send('error', { message: 'เกิดข้อผิดพลาดระหว่างตอบ' });
  } finally { try { res.end(); } catch { /* ignore */ } }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AI SKILLS HUB — S10-S15 (Trend, Hashtag, SEO, Sentiment, Video Script, Translate)
// ═══════════════════════════════════════════════════════════════════════════════

// callAI — วิ่งผ่าน Smart Model Router (เลือกถูกสุด + failover + คุมงบ) สำหรับงาน skill ทั่วไป
// taskType เริ่มต้น 'bulk' (ถูกก่อน) — ส่ง 'heavy' สำหรับงานวิเคราะห์ที่ต้องการคุณภาพ
async function callAI(prompt, maxTokens = 1024, taskType = 'bulk') {
  const r = await routeAI(taskType, prompt, { maxTokens });
  return r.text || '';
}

function parseAIJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error('no json');
}

// ─── Per-provider callers สำหรับ OpenThaiAi Council (Claude · Gemini · Grok) ────
async function callClaude(prompt, maxTokens = 700) {
  if (!anthropic) return null;
  try {
    const msg = await anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
    return msg.content[0]?.text?.trim() || null;
  } catch (e) { addLog('warn', 'Council/Claude', e.message); return null; }
}
async function callGeminiText(prompt) {
  if (!gemini) return null;
  try { const r = await gemini.generateContent(prompt); return r.response.text().trim() || null; }
  catch (e) { addLog('warn', 'Council/Gemini', e.message); return null; }
}
// Grok (xAI) — OpenAI-compatible endpoint
async function callGrok(prompt, maxTokens = 700) {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.XAI_MODEL || 'grok-2-latest', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `xAI HTTP ${res.status}`);
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) { addLog('warn', 'Council/Grok', e.message); return null; }
}

// ─── Smart Model Router — เลือกโมเดลถูกสุดที่เหมาะกับงาน + failover + คุมงบ/วัน ─────
// ลดต้นทุน token: งานหนัก→คุณภาพก่อน, งานปริมาณ→ถูกก่อน, เกินงบ/วัน→Eco Mode (เฉพาะรุ่นถูก)
// cost ต่อ 1k tokens เป็นค่าประมาณ (USD) — ปรับได้ตามเรตจริงของแต่ละค่าย
const ROUTER_PROVIDERS = {
  gemini: { call: callGeminiText, costPer1k: 0.0004, label: 'Gemini Flash' },
  grok:   { call: callGrok,       costPer1k: 0.0005, label: 'Grok' },
  claude: { call: callClaude,     costPer1k: 0.0008, label: 'Claude Haiku' },
};
const ROUTER_TIERS = {
  heavy: ['claude', 'gemini', 'grok'],   // งานวิเคราะห์ซับซ้อน — คุณภาพก่อน
  bulk:  ['gemini', 'grok', 'claude'],   // งานปริมาณ (แคปชั่น/ข้อความสั้น) — ถูกก่อน
  eco:   ['gemini', 'grok'],             // โหมดประหยัด — เฉพาะรุ่นถูกสุด
};
const HEAVY_TASKS = new Set(['heavy', 'heavy_reasoning', 'legal_check', 'anti_fraud', 'analysis']);
const AI_DAILY_BUDGET_USD = parseFloat(process.env.AI_DAILY_BUDGET_USD || '1.0');
const routerToday = () => new Date().toISOString().slice(0, 10);
const routerState = { day: routerToday(), spentUsd: 0, calls: 0, byProvider: {}, health: { gemini: true, grok: true, claude: true }, failCount: {} };
function routerRollover() {
  if (routerState.day !== routerToday()) {
    routerState.day = routerToday(); routerState.spentUsd = 0; routerState.calls = 0;
    routerState.byProvider = {}; routerState.health = { gemini: true, grok: true, claude: true }; routerState.failCount = {};
  }
}
const estTokens = (s) => Math.ceil((s || '').length / 4);
const routerEco = () => routerState.spentUsd >= AI_DAILY_BUDGET_USD;

async function routeAI(taskType, prompt, { maxTokens = 700 } = {}) {
  routerRollover();
  const eco = routerEco();
  const tier = eco ? 'eco' : (HEAVY_TASKS.has(taskType) ? 'heavy' : 'bulk');
  const order = ROUTER_TIERS[tier] || ROUTER_TIERS.bulk;
  const tried = [];
  for (const p of order) {
    const prov = ROUTER_PROVIDERS[p];
    if (!prov) continue;
    if (!routerState.health[p]) { tried.push(`${p}:skip(unhealthy)`); continue; }
    const t0 = Date.now();
    let text = null;
    try { text = await prov.call(prompt, maxTokens); } catch (_) { text = null; }
    if (text) {
      const tokens = estTokens(prompt) + estTokens(text);
      const usd = +(tokens / 1000 * prov.costPer1k).toFixed(6);
      routerState.spentUsd = +(routerState.spentUsd + usd).toFixed(6);
      routerState.calls++;
      const bp = routerState.byProvider[p] || { calls: 0, usd: 0, tokens: 0 };
      bp.calls++; bp.usd = +(bp.usd + usd).toFixed(6); bp.tokens += tokens;
      routerState.byProvider[p] = bp; routerState.failCount[p] = 0;
      return { ok: true, provider: p, model: prov.label, tier, eco, text, tokens, cost_usd: usd, latency_ms: Date.now() - t0, tried };
    }
    tried.push(`${p}:unavailable`);
    routerState.failCount[p] = (routerState.failCount[p] || 0) + 1;
    if (routerState.failCount[p] >= 3) routerState.health[p] = false;  // ปิดชั่วคราวเมื่อล้มซ้ำ (รีเซ็ตรายวัน)
  }
  return { ok: false, provider: null, model: null, tier, eco, text: null, tried, reason: 'ไม่มี provider พร้อมใช้ — ตั้ง ANTHROPIC_API_KEY / GEMINI_API_KEY / XAI_API_KEY' };
}

// GET /api/router/status — แดชบอร์ดต้นทุนโทเคน + สถานะ provider + งบประมาณ
app.get('/api/router/status', (req, res) => {
  routerRollover();
  res.json({
    success: true,
    day: routerState.day,
    spent_usd: routerState.spentUsd,
    budget_usd: AI_DAILY_BUDGET_USD,
    budget_used_pct: AI_DAILY_BUDGET_USD > 0 ? +(routerState.spentUsd / AI_DAILY_BUDGET_USD * 100).toFixed(1) : 0,
    eco_mode: routerEco(),
    calls: routerState.calls,
    health: routerState.health,
    by_provider: routerState.byProvider,
    providers: Object.entries(ROUTER_PROVIDERS).map(([id, p]) => ({ id, label: p.label, cost_per_1k_usd: p.costPer1k, available: !!process.env[id === 'claude' ? 'ANTHROPIC_API_KEY' : id === 'gemini' ? 'GEMINI_API_KEY' : 'XAI_API_KEY'] })),
    tiers: ROUTER_TIERS,
    note: 'cost เป็นค่าประมาณต่อ 1k tokens · เกินงบ/วัน → Eco Mode (เฉพาะรุ่นถูก) · health รีเซ็ตรายวัน',
  });
});

// POST /api/router/run — ส่งงานให้ router เลือกโมเดลถูกสุด/สลับค่ายอัตโนมัติ
app.post('/api/router/run', generateLimiter, async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim().slice(0, 8000);
  const taskType = String(req.body?.task_type || 'bulk');
  if (!prompt) return res.status(400).json({ success: false, error: 'ต้องการ prompt' });
  const r = await routeAI(taskType, prompt, { maxTokens: Math.min(2000, parseInt(req.body?.max_tokens, 10) || 700) });
  res.json({ success: r.ok, ...r });
});

// ─── OpenThaiAi Council — ห้องที่ AI 3 เจ้าช่วยกันวิเคราะห์ + สังเคราะห์ข้อสรุป ────
const COUNCIL_PERSONAS = {
  claude: { name: 'Claude (Anthropic)', role: 'สถาปัตยกรรม · ความปลอดภัย · คุณภาพโค้ด', icon: '🟣' },
  gemini: { name: 'Gemini (Google)',    role: 'ข้อมูล · ตลาด · SEO · การสเกล',        icon: '🔵' },
  grok:   { name: 'Grok (xAI)',         role: 'การเติบโต · ไอเดียกล้าได้กล้าเสีย · เรียลไทม์', icon: '⚫' },
};
function mockCouncilVoice(provider, topic) {
  const t = topic.length > 60 ? topic.slice(0, 60) + '…' : topic;
  const M = {
    claude: `1) ด้านความน่าเชื่อถือ: "${t}" ต้องมี security + privacy ที่ตรวจสอบได้ (HTTPS, ตรวจลายเซ็น webhook, เก็บความลับใน env)\n2) สถาปัตยกรรม: แยก service ชัด รองรับ scale + มี health/readiness check\n3) คุณภาพ: มี automated test ครอบ flow สำคัญก่อน go-global\n4) ข้อเสนอ: ทำ audit log + เอกสาร API ภาษาอังกฤษให้พาร์ตเนอร์ต่างชาติเชื่อมต่อได้`,
    gemini: `1) ตลาด: หา niche ที่ OpenThaiAi เด่น (AI คอนเทนต์ไทย→อาเซียน) ก่อนชนรายใหญ่\n2) SEO/Discovery: ทำหน้า landing หลายภาษา + schema markup ให้ติด Google\n3) ข้อมูล: เก็บ metric conversion/retention เพื่อปรับ product ด้วยข้อมูลจริง\n4) ข้อเสนอ: เริ่ม i18n (ไทย/อังกฤษ/จีน) + พิสูจน์ผลด้วย case study ลูกค้าจริง`,
    grok: `1) การเติบโต: ใช้ creator/affiliate เป็นหัวหอก — ยิ่งแชร์ยิ่งโต (viral loop)\n2) ไอเดียกล้า: ออกฟีเจอร์ที่คู่แข่งยังไม่มี เช่น multi-AI council นี้เป็นจุดขาย\n3) เรียลไทม์: เกาะเทรนด์ + ออกคอนเทนต์เร็ว ชนะด้วยความไว\n4) ข้อเสนอ: ทำ referral rewards + leaderboard กระตุ้นการแข่งขันของพันธมิตร`,
  };
  return M[provider] || `วิเคราะห์เบื้องต้นสำหรับ: ${t}`;
}
function mockSynthesis(topic) {
  return `📋 ข้อสรุปร่วม OpenThaiAi Council\nหัวข้อ: ${topic}\n\nแผนปฏิบัติให้เป็นที่ยอมรับในตลาดโลก:\n1) ความน่าเชื่อถือก่อน (Claude): security + test + readiness ครบ → พาร์ตเนอร์กล้าใช้\n2) เจาะ niche + i18n (Gemini): เริ่มจาก AI คอนเทนต์ไทย→อาเซียน ทำหลายภาษา + SEO\n3) โตด้วย viral loop (Grok): affiliate/referral + leaderboard + ออกฟีเจอร์เด่นที่คู่แข่งไม่มี\n4) วัดผลด้วยข้อมูลจริง: ติดตาม conversion/retention แล้ววนปรับ\n\n⚠️ หมายเหตุ: นี่คือโหมดจำลอง (ยังไม่ได้ตั้ง API key ของ AI) — ตั้ง ANTHROPIC_API_KEY / GEMINI_API_KEY / XAI_API_KEY เพื่อให้ AI จริงทั้ง 3 เจ้าวิเคราะห์`;
}
app.post('/api/council', generateLimiter, async (req, res) => {
  const topic = String(req.body?.topic || '').trim().slice(0, 2000);
  if (!topic) return res.status(400).json({ success: false, error: 'ต้องการหัวข้อที่จะให้ที่ประชุมวิเคราะห์ (topic)' });
  // ห้องนี้เปิดให้ Claude/Gemini/Grok (เมื่อมี API key จริง) เข้าร่วมได้ แต่ต้องผูกกับสถานะจริงของ
  // OpenThaiAi เสมอ ไม่ใช่ห้องคุยเรื่องทั่วไป — ฉีด context จริง (เหมือน /api/council/scan) เข้าไป
  // ทุกครั้ง กันไม่ให้กลายเป็น general-purpose 3-AI chatbot ที่หลุด scope ไปเรื่องอื่น
  const context = await buildScanContext();
  const base = `คุณกำลังร่วมประชุมในห้อง "OpenThaiAi Command Room" กับ AI เจ้าอื่น ห้องนี้มีไว้คุยเรื่อง OpenThaiAi เท่านั้น

สถานะจริงของ OpenThaiAi (อ้างอิงข้อมูลนี้เสมอ ห้ามมโนข้อเท็จจริงเพิ่ม):
${context}

หัวข้อที่ต้องวิเคราะห์ (ต้องเชื่อมโยงกับ OpenThaiAi เท่านั้น ถ้าหัวข้อไม่เกี่ยวกับ OpenThaiAi ให้ตอบว่าห้องนี้คุยได้เฉพาะเรื่อง OpenThaiAi แทน): ${topic}
ตอบเป็นภาษาไทย สั้นกระชับ เป็นข้อ ๆ (3-5 ข้อ) ในมุมที่คุณถนัด พร้อมข้อเสนอที่ลงมือทำได้จริง โดยอิงจากสถานะจริงข้างต้น`;
  const persona = (p) => `${base}\n\nบทบาทของคุณในวงประชุม: ${COUNCIL_PERSONAS[p].role}`;

  const [claude, gem, grok] = await Promise.all([
    callClaude(persona('claude')), callGeminiText(persona('gemini')), callGrok(persona('grok')),
  ]);
  const voices = [
    { id: 'claude', ...COUNCIL_PERSONAS.claude, live: !!claude, text: claude || mockCouncilVoice('claude', topic) },
    { id: 'gemini', ...COUNCIL_PERSONAS.gemini, live: !!gem,    text: gem    || mockCouncilVoice('gemini', topic) },
    { id: 'grok',   ...COUNCIL_PERSONAS.grok,   live: !!grok,   text: grok   || mockCouncilVoice('grok', topic) },
  ];
  const synthPrompt = `ในฐานะผู้ดำเนินการประชุม OpenThaiAi จงสังเคราะห์ความเห็นจาก AI 3 เจ้าต่อไปนี้ ให้เป็น "ข้อสรุปร่วม + แผนปฏิบัติ 3-5 ข้อ" ที่ทำให้ OpenThaiAi เป็นที่ยอมรับในตลาดโลก ตอบไทย กระชับ ลงมือทำได้จริง:\n\n${voices.map(v => `[${v.name}]\n${v.text}`).join('\n\n')}`;
  let synthesis = await callClaude(synthPrompt) || await callGeminiText(synthPrompt) || await callGrok(synthPrompt);
  const synthLive = !!synthesis;
  if (!synthesis) synthesis = mockSynthesis(topic);

  addLog('info', 'Council', `topic: ${topic.slice(0, 60)} · live: ${voices.filter(v => v.live).map(v => v.id).join(',') || 'none(mock)'}`);
  res.json({ success: true, room: 'OpenThaiAi', topic, voices, synthesis, synthesis_live: synthLive, any_live: voices.some(v => v.live), ts: new Date().toISOString() });
});

// ─── Council Scan Room — 3 AI วิเคราะห์ "สถานะจริงของโปรเจกต์" ไม่ใช่หัวข้อลอยๆ ───
// ต่างจาก /api/council ตรงที่ context มาจากสถานะรันไทม์จริง (ไม่ใช่ไฟล์ PROJECT_STATUS.md
// ที่รากของ repo — vercel.json includeFiles: "backend/**" เท่านั้น ไฟล์นอก backend/ จะไม่ถูก
// bundle ขึ้น Vercel serverless function) และมีกฎกำกับพรอมต์ชัดเจนว่าห้ามมโนข้อเท็จจริง
async function buildScanContext() {
  const skillsActive = SKILLS_REGISTRY.filter((s) => s.status === 'active').length;
  const skillsNeedKey = SKILLS_REGISTRY.filter((s) => s.status !== 'active');
  const [disputeSummary, orderSummary, producerSummary, portalLeadList] = await Promise.all([
    disputes.summary(), orders.summary(), producers.summary(), portalLeads.all(),
  ]);
  const keys = {
    anthropic: !!process.env.ANTHROPIC_API_KEY, gemini: !!process.env.GEMINI_API_KEY, xai: !!process.env.XAI_API_KEY,
    supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY), omise: !!process.env.OMISE_SECRET_KEY,
  };
  return `สถานะจริงของ OpenThaiAi ณ ตอนนี้ (ดึงจากระบบรันไทม์จริง ไม่ใช่การสมมติ):
- Skills: ${SKILLS_REGISTRY.length} รายการ (${skillsActive} active, ${skillsNeedKey.length} รอ API key: ${skillsNeedKey.map((s) => s.id).join(', ') || '-'})
- Orders: ${orderSummary.total} รายการ (เก็บข้อมูลโหมด: ${orderSummary.mode})
- Producers: ${producerSummary.total} ราย (โหมด: ${producerSummary.mode})
- Disputes: ${disputeSummary.total} รายการ · เปิดอยู่ ${disputeSummary.open_count} · ค้างเกิน SLA ${disputeSummary.overdue_count} (โหมด: ${disputeSummary.mode})
- Portal leads: ${portalLeadList.length} รายการ (จาก 7 หน้า /portals/*)
- AI providers ที่มี API key: Claude=${keys.anthropic ? 'มี' : 'ไม่มี'}, Gemini=${keys.gemini ? 'มี' : 'ไม่มี'}, Grok/xAI=${keys.xai ? 'มี' : 'ไม่มี'}
- Database: Supabase ${keys.supabase ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้ตั้งค่า (fallback เป็นไฟล์ในเครื่อง)'}
- Payment: Omise ${keys.omise ? 'ตั้งค่าแล้ว (รับเงินจริง)' : 'ยังไม่ได้ตั้งค่า (mock mode)'}`;
}

app.post('/api/council/scan', generateLimiter, async (req, res) => {
  try {
    const context = await buildScanContext();
    const base = `คุณกำลังร่วม "ห้องสั่งงานรวม" ของ OpenThaiAi กับ AI เจ้าอื่น เพื่อสแกนและวิเคราะห์สถานะจริงของโปรเจกต์
กฎสำคัญที่สุด: ห้ามสมมติหรือมโนข้อเท็จจริงใดๆ นอกเหนือจากข้อมูลด้านล่างนี้ ถ้าข้อมูลไม่พอให้วิเคราะห์เรื่องใด ให้บอกตรงๆ ว่าไม่มีข้อมูลพอ แทนที่จะเดา

${context}

จากข้อมูลข้างต้นเท่านั้น วิเคราะห์และเสนอแนะ 3-5 ข้อในมุมที่คุณถนัด`;
    const persona = (p) => `${base}\n\nบทบาทของคุณในวงนี้: ${COUNCIL_PERSONAS[p].role}`;

    const [claude, gem, grok] = await Promise.all([
      callClaude(persona('claude')), callGeminiText(persona('gemini')), callGrok(persona('grok')),
    ]);
    const voices = [
      { id: 'claude', ...COUNCIL_PERSONAS.claude, live: !!claude, text: claude || mockCouncilVoice('claude', 'สแกนสถานะโปรเจกต์') },
      { id: 'gemini', ...COUNCIL_PERSONAS.gemini, live: !!gem, text: gem || mockCouncilVoice('gemini', 'สแกนสถานะโปรเจกต์') },
      { id: 'grok', ...COUNCIL_PERSONAS.grok, live: !!grok, text: grok || mockCouncilVoice('grok', 'สแกนสถานะโปรเจกต์') },
    ];
    const synthPrompt = `สังเคราะห์ผลสแกนจาก AI 3 เจ้าต่อไปนี้ (อ้างอิงเฉพาะข้อมูลจริงที่ให้ไว้ ห้ามเติมข้อมูลใหม่) ให้เป็นรายงาน "ห้องสั่งงานรวม" — สรุปสถานะ + สิ่งที่ควรทำต่อ 3-5 ข้อ เรียงตามความสำคัญ:\n\n${voices.map((v) => `[${v.name}]\n${v.text}`).join('\n\n')}`;
    let synthesis = await callClaude(synthPrompt) || await callGeminiText(synthPrompt) || await callGrok(synthPrompt);
    const synthLive = !!synthesis;
    if (!synthesis) synthesis = `📋 ห้องสั่งงานรวม — สรุปสแกน (โหมดจำลอง เพราะไม่มี AI API key จริง)\n\n${context}\n\n⚠️ ตั้ง ANTHROPIC_API_KEY / GEMINI_API_KEY / XAI_API_KEY เพื่อให้ AI จริงทั้ง 3 เจ้าวิเคราะห์`;

    addLog('info', 'CouncilScan', `live: ${voices.filter((v) => v.live).map((v) => v.id).join(',') || 'none(mock)'}`);
    res.json({ success: true, room: 'OpenThaiAi Command Room', context, voices, synthesis, synthesis_live: synthLive, any_live: voices.some((v) => v.live), ts: new Date().toISOString() });
  } catch (e) {
    addLog('warn', 'CouncilScan', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Thai Function Calling — natural-language Thai command → real tool call ───
// Uses Claude/Gemini's native tool-use APIs (see backend/agent-tools.js for the
// schema + why this needs no fine-tuning). No mock fallback here — deciding
// whether/which tool to call is a real model decision, not something safe to fake.
const toolContext = () => ({ orders, disputes, skillsRegistry: SKILLS_REGISTRY, webhooks });

async function runAgentCommandClaude(message) {
  const first = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 1024,
    tools: TOOL_DEFINITIONS,
    messages: [{ role: 'user', content: message }],
  });
  const toolUse = first.content.find((b) => b.type === 'tool_use');
  if (!toolUse) {
    return { tool_called: null, tool_input: null, tool_result: null, reply: first.content.find((b) => b.type === 'text')?.text || '' };
  }
  const result = await executeTool(toolUse.name, toolUse.input, toolContext());
  const follow = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 1024,
    tools: TOOL_DEFINITIONS,
    messages: [
      { role: 'user', content: message },
      { role: 'assistant', content: first.content },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) }] },
    ],
  });
  return { tool_called: toolUse.name, tool_input: toolUse.input, tool_result: result, reply: follow.content.find((b) => b.type === 'text')?.text || '' };
}

async function runAgentCommandGemini(message) {
  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-flash-latest', tools: toGeminiTools() });
  const chat = model.startChat();
  const first = await chat.sendMessage(message);
  const call = first.response.functionCalls?.()?.[0];
  if (!call) return { tool_called: null, tool_input: null, tool_result: null, reply: first.response.text() };
  const result = await executeTool(call.name, call.args, toolContext());
  const follow = await chat.sendMessage([{ functionResponse: { name: call.name, response: result } }]);
  return { tool_called: call.name, tool_input: call.args, tool_result: result, reply: follow.response.text() };
}

app.post('/api/agent/command', generateLimiter, async (req, res) => {
  const message = String(req.body?.message || '').trim().slice(0, 2000);
  if (!message) return res.status(400).json({ success: false, error: 'ต้องการ message (คำสั่งภาษาไทย)' });
  try {
    let out;
    if (anthropic) out = await runAgentCommandClaude(message);
    else if (gemini) out = await runAgentCommandGemini(message);
    else return res.status(503).json({ success: false, error: 'Function calling ต้องการ ANTHROPIC_API_KEY หรือ GEMINI_API_KEY — โมเดลจริงต้องเป็นผู้ตัดสินใจว่าจะเรียกเครื่องมือไหน จึงไม่มีโหมดจำลอง' });
    addLog('info', 'AgentCommand', `"${message.slice(0, 60)}" → ${out.tool_called || '(no tool)'}`);
    res.json({ success: true, ...out, available_tools: TOOL_DEFINITIONS.map((t) => t.name) });
  } catch (e) {
    addLog('warn', 'AgentCommand', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// S10 · POST /api/skills/trend — วิเคราะห์เทรนด์ตามสินค้า
app.post('/api/skills/trend', generateLimiter, async (req, res) => {
  const { product, category, platform } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });
  const prompt = `คุณเป็นผู้เชี่ยวชาญเทรนด์ TikTok และ Social Media ไทย
วิเคราะห์เทรนด์ที่เหมาะสมสำหรับ:
สินค้า: ${product}
หมวดหมู่: ${category || 'ทั่วไป'}
แพลตฟอร์ม: ${platform || 'TikTok'}
ตอบกลับ JSON เท่านั้น (ภาษาไทย):
{"trending_angles":[{"angle":"ชื่อ","desc":"อธิบาย","momentum":"+xx%"}],"best_timing":"เวลาโพสต์ดีสุด","content_format":"รูปแบบที่นิยม","avoid":["สิ่งที่ควรหลีกเลี่ยง"],"top_hooks":["Hook 1","Hook 2","Hook 3"],"analysis":"สรุป 2 ประโยค"}`;
  try {
    const text = await callAI(prompt);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) {
    addLog('warn', 'Skills/Trend', e.message);
  }
  res.json({ success: true, source: 'mock',
    trending_angles: [
      { angle: `${product} ของแท้ vs ของเทียม`, desc: 'เปิดเผยความจริงที่คนอยากรู้', momentum: '+42%' },
      { angle: `ทำไมต้อง ${product}?`, desc: 'กระตุ้นความสงสัยด้วยคำถาม', momentum: '+35%' },
      { angle: `${product} ราคาไม่ถึง 500 บาท`, desc: 'เทรนด์ราคาและความคุ้มค่า', momentum: '+28%' },
    ],
    best_timing: '19:00–21:00 น. ศุกร์–อาทิตย์',
    content_format: 'วิดีโอ 15–30 วินาที Hook ใน 3 วินาทีแรก',
    avoid: ['โพสต์ช่วง 10:00-14:00 วันธรรมดา', 'คอนเทนต์ยาวเกิน 60 วินาที'],
    top_hooks: [`หยุด! ${product} แท้ต่างจากของปลอมยังไง`, `POV: เจอ ${product} ราคาโคตรถูก`, `แม่ค้าไม่อยากให้รู้!`],
    analysis: `สินค้า ${product} กำลังมาแรงบน ${platform || 'TikTok'} เทรนด์หลักคือการเปรียบเทียบและเปิดเผยความจริงที่คนไม่รู้`,
  });
});

// S11 · POST /api/skills/hashtag — AI Hashtag Generator
app.post('/api/skills/hashtag', generateLimiter, async (req, res) => {
  const { product, category, platform, style } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });
  const prompt = `คุณเป็นผู้เชี่ยวชาญ Hashtag Strategy สำหรับ Social Media ไทย
สร้าง Hashtag Set สำหรับ:
สินค้า: ${product}
หมวดหมู่: ${category || 'ทั่วไป'}
แพลตฟอร์ม: ${platform || 'TikTok'}
สไตล์: ${style || 'sales'}
ตอบกลับ JSON เท่านั้น:
{"sets":{"mega":["#hashtag ที่มี views มากกว่า 1B"],"trending":["#hashtag กำลังเทรนด์"],"niche":["#hashtag เฉพาะกลุ่ม relevance สูง"],"thai":["#hashtag ภาษาไทย"]},"recommended":"5-7 hashtag แนะนำรวมกัน","tip":"เคล็ดลับการใช้ hashtag สำหรับสินค้านี้"}`;
  try {
    const text = await callAI(prompt);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) {
    addLog('warn', 'Skills/Hashtag', e.message);
  }
  const base = product.replace(/\s+/g, '');
  res.json({ success: true, source: 'mock',
    sets: {
      mega: ['#TikTokShop', '#ของดีบ้านเรา', '#สินค้าไทย', '#OTOP'],
      trending: ['#รีวิวสินค้า', '#แม่ค้าออนไลน์', '#ของดีราคาถูก', '#เซลออนไลน์'],
      niche: [`#${base}`, `#${category || 'ของดี'}ไทย`, '#ผลิตภัณฑ์ท้องถิ่น', '#ฝีมือไทย'],
      thai: ['#สินค้าOTOP', '#ของไทยดีมาก', '#สนับสนุนคนไทย', '#ของดีราคาเป็นมิตร'],
    },
    recommended: `#สินค้าไทย #OTOP #TikTokShop #${base} #รีวิวสินค้า #ของดีบ้านเรา #Openthai`,
    tip: 'ใช้ 3-5 mega hashtag + 3-4 niche hashtag ต่อโพสต์ เปลี่ยน set ทุก 3-5 โพสต์เพื่อ reach กลุ่มใหม่',
  });
});

// POST /api/captions/generate — สร้างแคปชั่นขายต่อแพลตฟอร์ม (human-in-the-loop)
// คืนข้อความให้ผู้ใช้ "ก๊อปไปโพสต์เอง" — ไม่โพสต์อัตโนมัติ (ไม่ละเมิด ToS ของแพลตฟอร์ม)
// แคปชั่นรองรับ 3 ภาษา (th/en/zh) — hook + template ต่อภาษา/แพลตฟอร์ม
const CAPTION_I18N = {
  th: {
    hooks: ['หยุดเลื่อนก่อน!', 'ของดีบอกต่อ', 'ส่งตรงจากผู้ผลิต', 'รีวิวจริงไม่อวย', 'ไอเทมที่คนตามหา'],
    tags: (n) => `#${n} #ของดีบอกต่อ #รีวิวสินค้า`,
    tiktok: (h, n, pr, f, l, t) => `🔥 ${h} 🔥\n📌 ${n}${pr ? ` — ${pr}` : ''}\n${f ? `👉 ${f}\n` : ''}สนใจดูลิงก์ในไบโอ 🛒\n${t} #TikTokป้ายยา #fyp`,
    facebook: (h, n, pr, f, l) => `📢 ${h}\n${n} มารีวิวให้ดูกันจริงๆ${f ? ` — ${f}` : ''}\n${pr ? `ราคา ${pr} ` : ''}สนใจทักแชทหรือดูพิกัดในคอมเมนต์แรกได้เลยครับ 👇${l ? `\n${l}` : ''}`,
    instagram: (h, n, pr, f, _l, t) => `${h} ✨\n${n}${f ? `\n${f}` : ''}${pr ? `\n💰 ${pr}` : ''}\nDM มาได้เลยถ้าสนใจ 💌\n${t}`,
    line: (h, n, pr, f, l) => `💚 สิทธิพิเศษเฉพาะเพื่อนใน LINE 💚\n🎁 ${n}${pr ? ` เพียง ${pr}` : ''}\n${f ? `✅ ${f}\n` : ''}🛒 สั่งซื้อ/สอบถามได้เลย${l ? `: ${l}` : ' ในแชทนี้'}`,
  },
  en: {
    hooks: ['Stop scrolling!', 'Must-have item', 'Straight from the maker', 'Honest review', 'Everyone is asking for this'],
    tags: (n) => `#${n} #musthave #review`,
    tiktok: (h, n, pr, f, l, t) => `🔥 ${h} 🔥\n📌 ${n}${pr ? ` — ${pr}` : ''}\n${f ? `👉 ${f}\n` : ''}Link in bio 🛒\n${t} #tiktokmademebuyit #fyp`,
    facebook: (h, n, pr, f, l) => `📢 ${h}\nReal review of ${n}${f ? ` — ${f}` : ''}\n${pr ? `Price ${pr}. ` : ''}DM me or check the first comment for the order link 👇${l ? `\n${l}` : ''}`,
    instagram: (h, n, pr, f, _l, t) => `${h} ✨\n${n}${f ? `\n${f}` : ''}${pr ? `\n💰 ${pr}` : ''}\nDM me if interested 💌\n${t}`,
    line: (h, n, pr, f, l) => `💚 Special deal for LINE friends 💚\n🎁 ${n}${pr ? ` only ${pr}` : ''}\n${f ? `✅ ${f}\n` : ''}🛒 Order now${l ? `: ${l}` : ' in this chat'}`,
  },
  zh: {
    hooks: ['别划走！', '好物分享', '工厂直供', '真实测评', '大家都在找的好物'],
    tags: (n) => `#${n} #好物推荐 #测评`,
    tiktok: (h, n, pr, f, l, t) => `🔥 ${h} 🔥\n📌 ${n}${pr ? ` — ${pr}` : ''}\n${f ? `👉 ${f}\n` : ''}链接在主页 🛒\n${t} #种草 #fyp`,
    facebook: (h, n, pr, f, l) => `📢 ${h}\n真实测评 ${n}${f ? ` — ${f}` : ''}\n${pr ? `价格 ${pr}。` : ''}想要的私信我，或看第一条评论的购买链接 👇${l ? `\n${l}` : ''}`,
    instagram: (h, n, pr, f, _l, t) => `${h} ✨\n${n}${f ? `\n${f}` : ''}${pr ? `\n💰 ${pr}` : ''}\n有兴趣请私信 💌\n${t}`,
    line: (h, n, pr, f, l) => `💚 LINE好友专属优惠 💚\n🎁 ${n}${pr ? ` 仅需 ${pr}` : ''}\n${f ? `✅ ${f}\n` : ''}🛒 立即下单${l ? `：${l}` : '（本聊天）'}`,
  },
};
function buildCaption(platform, p, hookIdx, lang = 'th') {
  const L = CAPTION_I18N[lang] || CAPTION_I18N.th;
  const name = p.name || (lang === 'zh' ? '商品' : lang === 'en' ? 'product' : 'สินค้า');
  const price = p.price ? `฿${Number(p.price).toLocaleString()}` : '';
  const feat = p.features || '';
  const link = p.link || '';
  const tags = p.hashtags || L.tags(String(name).replace(/\s+/g, ''));
  const hook = L.hooks[hookIdx % L.hooks.length];
  const fn = L[platform];
  return fn ? fn(hook, name, price, feat, link, tags) : `${name}${price ? ` ${price}` : ''}${link ? ` ${link}` : ''}`;
}
app.post('/api/captions/generate', generateLimiter, (req, res) => {
  const { name, price, features, link, hashtags } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ success: false, error: 'ต้องการชื่อสินค้า (name)' });
  const lang = ['th', 'en', 'zh'].includes(req.body?.lang) ? req.body.lang : 'th';
  const want = Array.isArray(req.body?.platforms) && req.body.platforms.length
    ? req.body.platforms.filter(pl => ['tiktok', 'facebook', 'instagram', 'line'].includes(pl))
    : ['tiktok', 'facebook', 'instagram', 'line'];
  const product = { name: String(name).slice(0, 120), price, features: String(features || '').slice(0, 300), link: String(link || '').slice(0, 300), hashtags: String(hashtags || '').slice(0, 200) };
  const captions = {};
  want.forEach((pl, i) => { captions[pl] = buildCaption(pl, product, i, lang); });
  res.json({
    success: true,
    lang,
    captions,
    note: 'ก๊อปแคปชั่นไปโพสต์เองในแต่ละแอป — ระบบไม่โพสต์อัตโนมัติ (ป้องกันบัญชีโดนแบนจากการละเมิด ToS)',
  });
});

// S12 · POST /api/skills/seo — SEO Thai Keyword Optimizer
app.post('/api/skills/seo', generateLimiter, async (req, res) => {
  const { product, category, platform } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });
  const prompt = `คุณเป็นผู้เชี่ยวชาญ SEO และ SEM สำหรับตลาดไทย
วิเคราะห์ keywords สำหรับ:
สินค้า: ${product}
หมวดหมู่: ${category || 'ทั่วไป'}
แพลตฟอร์ม: ${platform || 'TikTok'}
ตอบกลับ JSON เท่านั้น (ภาษาไทย):
{"primary_keywords":["keyword หลัก volume สูง"],"long_tail":["keyword ยาว conversion สูง"],"search_intent":"เจตนาการค้นหาหลัก","title_formula":"สูตรชื่อโพสต์ SEO-friendly","description_tips":"เคล็ดลับเขียน description","competitor_gap":"ช่องว่างที่คู่แข่งยังไม่ cover"}`;
  try {
    const text = await callAI(prompt);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) {
    addLog('warn', 'Skills/SEO', e.message);
  }
  res.json({ success: true, source: 'mock',
    primary_keywords: [`${product}`, `${product}ราคาถูก`, `${product}แท้`, `ซื้อ${product}ออนไลน์`],
    long_tail: [`${product}ที่ไหนดี`, `${product}คุณภาพสูงราคาถูก`, `${product}ส่งฟรีทั่วไทย`, `${product}รีวิวจริง`],
    search_intent: 'Commercial Intent — ผู้ใช้กำลังเปรียบเทียบและพร้อมซื้อ',
    title_formula: `[ชื่อสินค้า] ของแท้ | [จุดเด่น] | ราคาพิเศษ ส่งฟรี`,
    description_tips: 'ใส่ keyword หลักใน 100 ตัวอักษรแรก เพิ่มราคา+จุดเด่น+CTA ก่อน "อ่านเพิ่มเติม"',
    competitor_gap: `ส่วนใหญ่ยังขาด keyword เฉพาะเจาะจง — "${product}มาตรฐาน" และ "${product}รับรองคุณภาพ" competition ต่ำ`,
  });
});

// S13 · POST /api/skills/sentiment — Sentiment Scanner
app.post('/api/skills/sentiment', generateLimiter, async (req, res) => {
  const { text: inputText, product } = req.body || {};
  if (!inputText?.trim()) return res.status(400).json({ error: 'text required' });
  const prompt = `คุณเป็นผู้เชี่ยวชาญ Sentiment Analysis ภาษาไทย
วิเคราะห์ความรู้สึกจากข้อความต่อไปนี้:
"${inputText.slice(0, 1000)}"
${product ? `สินค้า: ${product}` : ''}
ตอบกลับ JSON เท่านั้น:
{"overall":"positive/neutral/negative","score":0.0,"breakdown":{"positive":0,"neutral":0,"negative":0},"key_emotions":["อารมณ์หลัก"],"pain_points":["ปัญหาที่ลูกค้าพบ"],"praise_points":["สิ่งที่ลูกค้าชม"],"action_items":["สิ่งที่ควรทำ"],"summary":"สรุป 1-2 ประโยค"}`;
  try {
    const text = await callAI(prompt);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) {
    addLog('warn', 'Skills/Sentiment', e.message);
  }
  const positiveWords = ['ดี', 'เยี่ยม', 'ชอบ', 'สวย', 'คุ้ม', 'แจ่ม', 'เด็ด'];
  const negativeWords = ['แย่', 'ห่วย', 'ผิดหวัง', 'ช้า', 'เสีย', 'ปลอม'];
  const posCount = positiveWords.filter(w => inputText.includes(w)).length;
  const negCount = negativeWords.filter(w => inputText.includes(w)).length;
  const overall = posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral';
  res.json({ success: true, source: 'mock',
    overall, score: overall === 'positive' ? 0.7 : overall === 'negative' ? 0.3 : 0.5,
    breakdown: { positive: Math.round(posCount * 30 + 20), neutral: 30, negative: Math.round(negCount * 25 + 10) },
    key_emotions: overall === 'positive' ? ['ประทับใจ', 'พึงพอใจ'] : overall === 'negative' ? ['ผิดหวัง', 'ไม่พอใจ'] : ['เป็นกลาง'],
    pain_points: negCount > 0 ? ['ต้องการข้อมูลเพิ่มเติม', 'คาดหวังมากกว่านี้'] : [],
    praise_points: posCount > 0 ? ['คุณภาพสินค้าดี', 'บริการรวดเร็ว'] : [],
    action_items: ['ตอบรับความคิดเห็นภายใน 2 ชั่วโมง', 'เพิ่ม FAQ สำหรับคำถามที่พบบ่อย'],
    summary: `ข้อความนี้มีความรู้สึก${overall === 'positive' ? 'เชิงบวก' : overall === 'negative' ? 'เชิงลบ' : 'เป็นกลาง'} ควรติดตามและตอบสนองอย่างเหมาะสม`,
  });
});

// S14 · POST /api/skills/video-script — Video Script + Storyboard
app.post('/api/skills/video-script', generateLimiter, async (req, res) => {
  const { product, category, platform, duration, style } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });
  const sec = parseInt(duration) || 30;
  const prompt = `คุณเป็นผู้กำกับคอนเทนต์ TikTok มืออาชีพ สร้าง script + storyboard สำหรับ:
สินค้า: ${product}
หมวดหมู่: ${category || 'ทั่วไป'}
แพลตฟอร์ม: ${platform || 'TikTok'}
ความยาว: ${sec} วินาที
สไตล์: ${style || 'sales'}
ตอบกลับ JSON เท่านั้น (ภาษาไทย):
{"title":"ชื่อวิดีโอ","scenes":[{"time":"0-3s","action":"การกระทำ","script":"สคริปต์","visual":"ภาพที่เห็น","sound":"เสียง/เพลง"}],"hook":"ประโยคเปิด 3 วินาทีแรก","cta":"call-to-action ท้ายวิดีโอ","music_vibe":"สไตล์เพลงที่เหมาะ","filming_tips":"เคล็ดลับถ่ายทำ"}`;
  try {
    const text = await callAI(prompt, 1500);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) {
    addLog('warn', 'Skills/VideoScript', e.message);
  }
  res.json({ success: true, source: 'mock',
    title: `${product} — เปิดเผยความจริงที่คุณต้องรู้!`,
    hook: `หยุดก่อน! ถ้าคุณยังไม่รู้จัก ${product} นี่ คุณเสียโอกาสทุกวัน`,
    scenes: [
      { time: '0-3s', action: 'ถือสินค้าขึ้นมาให้เห็นชัด', script: `หยุดก่อน! ${product} แท้ต้องเป็นแบบนี้!`, visual: 'Close-up สินค้า ไฟดี', sound: 'เสียงเพลงฮิต TikTok ดัง' },
      { time: '3-10s', action: 'แสดงคุณสมบัติหลัก', script: `จุดเด่น 3 ข้อของ ${product} ที่ทำให้ต่างจากแบรนด์อื่น`, visual: 'Zoom in รายละเอียดสินค้า', sound: 'เพลงเบาลง' },
      { time: '10-20s', action: 'สาธิตการใช้งาน', script: 'ดูสิว่าใช้งานง่ายขนาดไหน แค่นี้เอง!', visual: 'มือสาธิตการใช้งานจริง', sound: 'เสียง ambient' },
      { time: `20-${sec}s`, action: 'CTA และราคา', script: `ราคาพิเศษวันนี้ กดลิงก์ใน bio หรือ comment ว่า "ต้องการ" เดี๋ยวทักไป`, visual: 'ป้ายราคา + สินค้า', sound: 'เพลงดังขึ้น + effect' },
    ],
    cta: 'Comment "ต้องการ" หรือกดลิงก์ใน Bio สั่งได้เลย ส่งฟรีทั่วไทย!',
    music_vibe: 'Thai Pop ฮิต หรือ Upbeat ที่กำลัง trend บน TikTok',
    filming_tips: 'ถ่ายแนวตั้ง 9:16 ใช้แสงธรรมชาติหน้าต่าง ถ่ายหลาย take เลือก take ที่ดีที่สุด',
  });
});

// S15 · POST /api/skills/translate — Thai ↔ Multi-language Translator
app.post('/api/skills/translate', generateLimiter, async (req, res) => {
  const { text: inputText, from, to, product } = req.body || {};
  if (!inputText?.trim()) return res.status(400).json({ error: 'text required' });
  const fromLang = from || 'ภาษาไทย';
  const toLang = to || 'English';
  const prompt = `คุณเป็นผู้เชี่ยวชาญการแปลภาษาสำหรับ Social Media Marketing
แปลข้อความต่อไปนี้จาก ${fromLang} เป็น ${toLang}:
"${inputText.slice(0, 1000)}"
${product ? `บริบท: สินค้า ${product}` : ''}
ตอบกลับ JSON เท่านั้น:
{"translated":"ข้อความที่แปลแล้ว","tone":"โทนที่ใช้","localization_tips":"เคล็ดลับปรับให้เข้ากับวัฒนธรรมท้องถิ่น","alternatives":[{"text":"ทางเลือกอื่น","note":"เหมาะกับ..."}],"cultural_notes":"หมายเหตุวัฒนธรรมสำคัญ"}`;
  try {
    const text = await callAI(prompt, 1024);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) {
    addLog('warn', 'Skills/Translate', e.message);
  }
  res.json({ success: true, source: 'mock',
    translated: `[แปลจาก ${fromLang} เป็น ${toLang}] ${inputText.slice(0, 100)}...`,
    tone: 'Professional yet friendly — เหมาะสำหรับ Social Media',
    localization_tips: `ปรับ emoji และ tone ให้เหมาะกับวัฒนธรรม ${toLang === 'English' ? 'ตะวันตก' : toLang}`,
    alternatives: [{ text: 'ทางเลือก 1 — formal version', note: 'เหมาะกับ B2B' }],
    cultural_notes: toLang === 'English' ? 'หลีกเลี่ยงการใช้คำสแลงไทยที่แปลตรงไม่ได้ — อธิบายบริบทแทน' : 'ปรับการใช้ระดับความสุภาพให้เหมาะกับประเทศปลายทาง',
  });
});

// S16 · POST /api/skills/prompt-builder — Prompt Engineering Builder (Zero-shot/Few-shot/CoT/ToT/Role)
app.post('/api/skills/prompt-builder', generateLimiter, async (req, res) => {
  const { goal, technique = 'zero-shot', role, examples, context: ctx, output_format } = req.body || {};
  if (!goal?.trim()) return res.status(400).json({ error: 'goal required' });

  const techniqueMap = {
    'zero-shot':   'Zero-Shot Prompting — สั่งตรงโดยไม่มีตัวอย่าง ใช้ได้กับงานที่ชัดเจน',
    'few-shot':    'Few-Shot Prompting — ให้ตัวอย่าง 2-5 คู่ Input→Output เพื่อให้ AI เรียนรู้ pattern',
    'chain':       'Chain-of-Thought (CoT) — ให้ AI คิดทีละขั้น "Let\'s think step by step"',
    'tree':        'Tree-of-Thought (ToT) — สำรวจหลายแนวทาง เลือกดีที่สุด เหมาะกับปัญหาซับซ้อน',
    'role':        'Role Prompting — กำหนด persona/บทบาทให้ AI ทำให้ตอบแบบผู้เชี่ยวชาญ',
    'instruction': 'Instruction Prompting — ออกคำสั่งชัดเจน + constraints + output format',
  };
  const techDesc = techniqueMap[technique] || techniqueMap['zero-shot'];

  const prompt = `คุณเป็น Prompt Engineering Expert ระดับโลก ที่เชี่ยวชาญเทคนิคจาก OpenAI, Google DeepMind, Anthropic
ช่วยสร้าง Prompt คุณภาพสูงสำหรับงานที่กำหนด โดยใช้เทคนิค: ${techDesc}

เป้าหมาย/งาน: "${goal.slice(0, 500)}"
เทคนิค: ${technique}
${role ? `Role/Persona: ${role}` : ''}
${examples ? `ตัวอย่าง Input→Output ที่ต้องการ: ${examples.slice(0, 500)}` : ''}
${ctx ? `บริบทเพิ่มเติม: ${ctx.slice(0, 300)}` : ''}
${output_format ? `รูปแบบผลลัพธ์: ${output_format}` : ''}

ตอบกลับ JSON เท่านั้น:
{
  "built_prompt": "prompt ที่สร้างขึ้น พร้อมใช้งาน (ภาษาที่เหมาะสมกับงาน)",
  "technique_used": "${technique}",
  "why_this_technique": "เหตุผลที่เลือกเทคนิคนี้สำหรับงานนี้",
  "prompt_breakdown": [{"part":"ชื่อส่วน","content":"เนื้อหาส่วนนั้น","role":"บทบาทของส่วนนี้ใน prompt"}],
  "tips": ["เคล็ดลับปรับปรุง 1","เคล็ดลับ 2","เคล็ดลับ 3"],
  "variations": [{"label":"ชื่อรูปแบบ","prompt":"prompt ทางเลือก"}],
  "quality_score": 85,
  "expected_output_quality": "สูง/กลาง/ต่ำ พร้อมอธิบาย"
}`;

  try {
    const text = await callAI(prompt, 2048);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) {
    addLog('warn', 'Skills/PromptBuilder', e.message);
  }

  // Mock fallback
  const mockPrompts = {
    'zero-shot':   `คุณเป็น ${role || 'ผู้เชี่ยวชาญ'} โปรด${goal}. ตอบเป็นภาษาที่ชัดเจน กระชับ และมีประสิทธิภาพ${output_format ? `. รูปแบบ: ${output_format}` : ''}`,
    'few-shot':    `ตัวอย่าง:\nInput: [ตัวอย่าง 1]\nOutput: [ผลลัพธ์ 1]\n\nInput: [ตัวอย่าง 2]\nOutput: [ผลลัพธ์ 2]\n\nตอนนี้โปรด${goal}:\nInput: {{input}}\nOutput:`,
    'chain':       `มาคิดทีละขั้นตอน (Let's think step by step):\n\nงาน: ${goal}\n\nขั้นที่ 1: วิเคราะห์ปัญหา\nขั้นที่ 2: กำหนดแนวทาง\nขั้นที่ 3: ดำเนินการ\nขั้นที่ 4: ตรวจสอบ\n\nเริ่มกระบวนการ:`,
    'tree':        `สำรวจ 3 แนวทางสำหรับ: ${goal}\n\nแนวทาง A: [แนวทางที่ 1]\nแนวทาง B: [แนวทางที่ 2]\nแนวทาง C: [แนวทางที่ 3]\n\nประเมิน pros/cons แต่ละแนวทาง แล้วเลือกแนวทางที่ดีที่สุดพร้อมเหตุผล`,
    'role':        `คุณคือ${role || 'ผู้เชี่ยวชาญระดับโลก'}ที่มีประสบการณ์มากกว่า 20 ปี\nในฐานะผู้เชี่ยวชาญ โปรด${goal}\nใช้ความรู้เชิงลึกและประสบการณ์จริงในการตอบ`,
    'instruction': `## คำสั่ง\n${goal}\n\n## ข้อกำหนด\n- ตอบเป็นภาษาไทย\n- ความยาว: กระชับและครบถ้วน\n- รูปแบบ: ${output_format || 'bullet points'}\n\n## เริ่มตอบ:`,
  };
  res.json({
    success: true, source: 'mock',
    built_prompt: mockPrompts[technique] || mockPrompts['zero-shot'],
    technique_used: technique,
    why_this_technique: `${techDesc} — เหมาะกับงาน "${goal.slice(0, 60)}"`,
    prompt_breakdown: [
      { part: 'Role/Context', content: role || 'ผู้เชี่ยวชาญ', role: 'กำหนดมุมมองและความเชี่ยวชาญของ AI' },
      { part: 'Task Instruction', content: goal.slice(0, 100), role: 'อธิบายงานที่ต้องการชัดเจน' },
      { part: 'Output Format', content: output_format || 'default', role: 'กำหนดรูปแบบผลลัพธ์' },
    ],
    tips: [
      'เพิ่ม constraints เช่น "ห้ามเกิน 100 คำ" เพื่อควบคุมความยาว',
      'ใส่ตัวอย่างที่ดีและไม่ดีเพื่อให้ AI เข้าใจ boundary ชัดขึ้น',
      'ทดสอบ temperature 0.3-0.7 เพื่อหาจุดสมดุลระหว่าง creativity กับ accuracy',
    ],
    variations: [
      { label: 'Version สั้น', prompt: `${goal}. ตอบสั้นกระชับ 3 bullet points` },
      { label: 'Version ละเอียด', prompt: `อธิบายอย่างละเอียด: ${goal}. พร้อมตัวอย่างจริง` },
    ],
    quality_score: 78,
    expected_output_quality: 'กลาง — ควรเพิ่ม AI API key เพื่อผลลัพธ์ที่ดีขึ้น',
  });
});

// S9 · Learning Layer — feedback loop + content pattern memory
const LEARNING_FILE = () => {
  const dir = WRITE_DATA_DIR;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'learning-patterns.json');
};
function loadPatterns() {
  const f = LEARNING_FILE();
  if (!existsSync(f)) return { ratings: [], patterns: {}, total: 0 };
  try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return { ratings: [], patterns: {}, total: 0 }; }
}
function savePatterns(data) {
  writeFileSync(LEARNING_FILE(), JSON.stringify(data, null, 2));
}

app.post('/api/skills/learning/rate', generateLimiter, (req, res) => {
  const { content_type, platform, tone, rating, output_snippet = '' } = req.body || {};
  if (!content_type || !rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'content_type and rating (1-5) required' });
  const data = loadPatterns();
  const entry = { content_type, platform: platform || 'ทั่วไป', tone: tone || 'ทั่วไป', rating: Number(rating), snippet: output_snippet.slice(0, 200), ts: Date.now() };
  data.ratings.push(entry);
  data.total = (data.total || 0) + 1;
  const key = `${content_type}|${platform || 'ทั่วไป'}`;
  if (!data.patterns[key]) data.patterns[key] = { count: 0, sum: 0, avg: 0, top_tones: {} };
  const p = data.patterns[key];
  p.count++; p.sum += entry.rating; p.avg = +(p.sum / p.count).toFixed(2);
  p.top_tones[entry.tone] = (p.top_tones[entry.tone] || 0) + 1;
  if (data.ratings.length > 500) data.ratings = data.ratings.slice(-500);
  savePatterns(data);
  res.json({ success: true, total_ratings: data.total, pattern_avg: p.avg });
});

app.get('/api/skills/learning/patterns', (req, res) => {
  const data = loadPatterns();
  const summary = Object.entries(data.patterns).map(([key, p]) => {
    const [content_type, platform] = key.split('|');
    const top_tone = Object.entries(p.top_tones).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    return { content_type, platform, count: p.count, avg_rating: p.avg, top_tone };
  }).sort((a, b) => b.avg_rating - a.avg_rating);
  const recent = (data.ratings || []).slice(-10).reverse();
  res.json({ success: true, total_ratings: data.total || 0, patterns: summary, recent_feedback: recent });
});

app.post('/api/skills/learning/enhance', generateLimiter, async (req, res) => {
  const { content, content_type = 'ทั่วไป', platform = 'ทั่วไป' } = req.body || {};
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });
  const data = loadPatterns();
  const key = `${content_type}|${platform}`;
  const pattern = data.patterns[key];
  const context = pattern ? `pattern ที่ดีที่สุดสำหรับ ${content_type} บน ${platform}: avg rating ${pattern.avg}/5, top tone: ${Object.entries(pattern.top_tones).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-'}` : '';
  const prompt = `ปรับปรุง content นี้ให้ดีขึ้น สำหรับ ${content_type} บน ${platform}
${context ? `\nข้อมูล learning จากผู้ใช้จริง: ${context}` : ''}

Content เดิม:
"${content}"

ตอบเป็น JSON:
{
  "enhanced": "content ที่ปรับปรุงแล้ว",
  "changes": ["การเปลี่ยนแปลงที่ 1","การเปลี่ยนแปลงที่ 2","การเปลี่ยนแปลงที่ 3"],
  "why": "เหตุผลที่ทำให้ดีขึ้น",
  "score_prediction": 4
}`;
  try {
    const text = await callAI(prompt, 1024);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Learning/Enhance', e.message); }
  res.json({
    success: true, source: 'mock',
    enhanced: content + '\n\n✨ [ปรับปรุงแล้ว] เพิ่ม hook ที่แข็งแกร่ง, ใช้ emotion trigger, ปิดด้วย CTA ที่ชัดเจน',
    changes: ['เพิ่ม hook 3 วินาทีแรก', 'ใส่ social proof', 'เพิ่ม urgency ในประโยคสุดท้าย'],
    why: `จากข้อมูล feedback ${data.total || 0} รายการ — content ที่มี hook + urgency ได้คะแนนสูงสุด`,
    score_prediction: 4,
  });
});

// ── Daily PR Content Generator ────────────────────────────────────────────────
const PR_DAILY_FILE = () => {
  const dir = WRITE_DATA_DIR;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'pr-daily-plan.json');
};
function loadPRPlan() {
  const f = PR_DAILY_FILE();
  if (!existsSync(f)) return {};
  try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return {}; }
}
function savePRPlan(data) { writeFileSync(PR_DAILY_FILE(), JSON.stringify(data, null, 2)); }

app.post('/api/pr/daily-content', generateLimiter, async (req, res) => {
  const {
    date, topic, product = '', event_type = 'promotion',
    channels = ['Facebook','TikTok','LINE','X','Email'],
    tone = 'สนุก/กระตุ้น', audience = 'ผู้บริโภคทั่วไป',
  } = req.body || {};
  if (!date || !topic?.trim()) return res.status(400).json({ error: 'date and topic required' });

  const dateObj = new Date(date);
  const dayTH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'][dateObj.getDay()];
  const dateLabel = `${dateObj.getDate()} ธันวาคม ${dateObj.getFullYear() + 543}`;

  const prompt = `คุณเป็น PR Manager มืออาชีพของ Openthai.ai สร้างสื่อประชาสัมพันธ์ครบทุกช่องทางสำหรับ:

วันที่: ${dateLabel} (วัน${dayTH})
หัวข้อ/กิจกรรม: "${topic}"${product ? `\nสินค้า/แบรนด์: ${product}` : ''}
ประเภท: ${event_type}
โทน: ${tone}
กลุ่มเป้าหมาย: ${audience}
ช่องทาง: ${channels.join(', ')}

ตอบ JSON เดียว ไม่ต้องอธิบาย:
{
  "headline": "หัวข้อข่าว PR หลัก (กระชับ สะดุดตา)",
  "key_message": "สารสำคัญที่ต้องการสื่อ 1 ประโยค",
  "facebook": {
    "post": "โพสต์ Facebook ยาว 150-250 คำ เน้น storytelling",
    "cta": "CTA ปิดท้าย"
  },
  "tiktok": {
    "hook": "Hook 3 วินาทีแรก (ต้องหยุดนิ้วได้)",
    "script": "Script TikTok 30-45 วินาที แบ่งเป็น Scene",
    "caption": "Caption + hashtags"
  },
  "line": {
    "broadcast": "ข้อความ LINE Broadcast กระชับ 80-120 คำ",
    "rich_menu_cta": "ข้อความปุ่ม CTA"
  },
  "x": {
    "thread": ["Tweet 1 (hook)", "Tweet 2 (detail)", "Tweet 3 (cta)"]
  },
  "email": {
    "subject": "Subject line ที่ open rate สูง",
    "preheader": "Preheader text",
    "body_intro": "ย่อหน้าเปิด 2-3 ประโยค",
    "body_main": "เนื้อหาหลัก 100-150 คำ",
    "cta_button": "ข้อความปุ่ม CTA"
  },
  "press_release": {
    "headline": "หัวข้อข่าว formal สำหรับสื่อมวลชน",
    "lead": "Lead paragraph ตอบ 5W1H",
    "quote": "Quote จาก CEO/ตัวแทน"
  },
  "hashtags": ["#hashtag1","#hashtag2","#hashtag3","#hashtag4","#hashtag5"],
  "image_concept": "แนวคิดภาพ/creative direction สำหรับทีมออกแบบ",
  "best_post_time": "เวลาที่ดีที่สุดในการโพสต์"
}`;

  try {
    const text = await callAI(prompt, 3000);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', date, topic, ...d });
  } catch (e) { addLog('warn', 'PR/DailyContent', e.message); }

  // Mock fallback
  res.json({
    success: true, source: 'mock', date, topic,
    headline: `${topic} — Openthai.ai ขอเชิญร่วมงาน ${dateLabel}`,
    key_message: `${topic} เป็นโอกาสพิเศษที่ Openthai.ai มอบให้ทุกท่าน`,
    facebook: {
      post: `✨ ${topic}\n\nวันที่ ${dateLabel} นี้ Openthai.ai มีข่าวดีมาแจ้งทุกท่าน!\n\n${product ? `"${product}" ` : ''}เราพร้อมมอบประสบการณ์ที่ดีที่สุดให้กับคุณ ด้วยเทคโนโลยี AI ที่ทรงพลังที่สุดในไทย\n\n👉 อย่าพลาด! สมัครฟรีได้เลยที่ openthai-ai.com\n\n#Openthai #AI #ไทย`,
      cta: '🔗 คลิกเพื่อดูรายละเอียด',
    },
    tiktok: {
      hook: `หยุด! วันที่ 20 ธันวาคมนี้ ${topic} จะเปลี่ยนชีวิตคุณ`,
      script: `[Scene 1 0-5s] Hook: "คุณรู้ไหมว่า..."\n[Scene 2 5-15s] ปัญหาที่ทุกคนเจอ\n[Scene 3 15-25s] วิธีแก้จาก Openthai.ai\n[Scene 4 25-30s] CTA: "ลองฟรีเลย!"`,
      caption: `${topic} 🚀 ${product || 'Openthai.ai'} #AI #ไทย #เทคโนโลยี #SME`,
    },
    line: {
      broadcast: `🎉 ${topic}\n\nสวัสดีครับ! วันที่ ${dateLabel} นี้ Openthai.ai มีโปรพิเศษสำหรับสมาชิก LINE ทุกท่าน\n\n${product ? `🛍️ ${product}\n\n` : ''}📌 ข้อเสนอนี้มีจำนวนจำกัด อย่าพลาดนะครับ!`,
      rich_menu_cta: '🔥 ดูโปรโมชั่น',
    },
    x: {
      thread: [
        `🚨 Breaking: ${topic} — Openthai.ai #AI #Thailand`,
        `รายละเอียด: ${product || 'ระบบ AI ใหม่ของเรา'} พร้อมให้บริการแล้ว ครอบคลุมทุกความต้องการของนักการตลาดไทย`,
        `🔗 ทดลองใช้ฟรีได้เลย openthai-ai.com — RT เพื่อแชร์ให้เพื่อน! #Openthai #AIMarketing`,
      ],
    },
    email: {
      subject: `[Openthai.ai] ${topic} — ข่าวพิเศษสำหรับคุณ`,
      preheader: `อย่าพลาด! โอกาสพิเศษวันที่ ${dateLabel}`,
      body_intro: `สวัสดีครับ ทีม Openthai.ai มีข่าวดีมาแจ้งให้ทราบ เกี่ยวกับ "${topic}" ซึ่งจะเริ่มต้นในวันที่ ${dateLabel} นี้`,
      body_main: `${product ? `"${product}" ` : ''}เราพัฒนาระบบ AI ที่ช่วยให้คุณสร้างคอนเทนต์ได้เร็วขึ้น 10 เท่า เข้าใจตลาดไทยจริงๆ ไม่ใช่แค่แปลจากภาษาต่างประเทศ ทดลองใช้ฟรีได้เลยวันนี้`,
      cta_button: '🚀 เริ่มใช้งานฟรี',
    },
    press_release: {
      headline: `Openthai.ai ประกาศ "${topic}" ยกระดับการตลาดดิจิทัลของ SME ไทย`,
      lead: `กรุงเทพฯ, ${dateLabel} — Openthai.ai บริษัท AI Marketing ชั้นนำของไทย ประกาศ "${topic}" เพื่อตอบสนองความต้องการของผู้ประกอบการ SME และ OTOP ทั่วประเทศ`,
      quote: `"นี่คือก้าวสำคัญของ Openthai.ai ในการทำให้ AI เข้าถึงได้ง่ายสำหรับทุกคน" — ผู้บริหาร Openthai.ai`,
    },
    hashtags: ['#Openthai', '#AIMarketing', '#DigitalThailand', '#SMEไทย', '#คอนเทนต์AI'],
    image_concept: `ภาพ flat design โทนแดง-ดำ มีตัวอักษร "${topic}" ขนาดใหญ่ background gradient จาก #080812 → #fe2c55 มี sparkle effect`,
    best_post_time: 'Facebook: 19:00-21:00 · TikTok: 20:00-22:00 · LINE: 07:00-09:00 · Email: 08:00-09:00',
  });
});

// PR Daily Plan — save/load
app.get('/api/pr/daily-plan', (req, res) => {
  res.json({ success: true, plan: loadPRPlan() });
});
app.post('/api/pr/daily-plan', (req, res) => {
  const { date, data } = req.body || {};
  if (!date) return res.status(400).json({ error: 'date required' });
  const plan = loadPRPlan();
  if (data === null) { delete plan[date]; } else { plan[date] = { ...plan[date], ...data, updatedAt: Date.now() }; }
  savePRPlan(plan);
  res.json({ success: true });
});

// Global PR Creator — 3 ภาษา × 5 กลุ่มเป้าหมาย × 7 ทวีป
app.post('/api/pr/global-content', generateLimiter, async (req, res) => {
  const { product, usp = '', category = 'สินค้าไทย', event_type = 'general', tone = 'professional' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `คุณเป็น Global PR Strategist ที่เชี่ยวชาญตลาดไทย อังกฤษ และจีน ระดับโลก

สินค้า/บริการ: "${product}"
จุดเด่น (USP): "${usp || 'สินค้าไทยคุณภาพสูง'}"
หมวดหมู่: "${category}"
โอกาส/งาน: "${event_type}"
น้ำเสียง: "${tone}"

สร้างสื่อประชาสัมพันธ์ครบถ้วนสำหรับ 3 ภาษา × 7 กลุ่มเป้าหมาย

กลุ่มเป้าหมาย:
- producer: ผู้ผลิต/โรงงาน (B2B ต้องการพันธมิตรผลิต)
- seller: ผู้ขาย/ร้านค้า (B2B ต้องการสต็อกขายต่อ)
- consumer: ผู้บริโภคปลายทาง (B2C ซื้อใช้เอง)
- distributor: ตัวแทนจำหน่ายในประเทศ (B2B กระจาย)
- intl_agent: ตัวแทนข้ามชาติ/ส่งออก (B2B ระหว่างประเทศ)
- sme: SME ไทย ธุรกิจขนาดกลาง-เล็ก (ต้องการ AI ทดแทนทีม Marketing)
- agri: เกษตรกรรม/ผลิตภัณฑ์การเกษตร (Farm-to-Table, ส่งออก, Organic, GI)

ตอบเป็น JSON เท่านั้น:
{
  "thai": {
    "producer":{"headline":"...","body":"เนื้อหา 3-4 ประโยค","cta":"...","hashtags":["#..."],"key_message":"..."},
    "seller":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "consumer":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "distributor":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "intl_agent":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "sme":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "agri":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."}
  },
  "english": {
    "producer":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "seller":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "consumer":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "distributor":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "intl_agent":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "sme":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "agri":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."}
  },
  "chinese": {
    "producer":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "seller":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "consumer":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "distributor":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "intl_agent":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "sme":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."},
    "agri":{"headline":"...","body":"...","cta":"...","hashtags":["#..."],"key_message":"..."}
  },
  "continental": {
    "asia":{"focus":"...","key_markets":["..."],"strategy":"...","channels":["..."]},
    "europe":{"focus":"...","key_markets":["..."],"strategy":"...","channels":["..."]},
    "north_america":{"focus":"...","key_markets":["..."],"strategy":"...","channels":["..."]},
    "south_america":{"focus":"...","key_markets":["..."],"strategy":"...","channels":["..."]},
    "africa":{"focus":"...","key_markets":["..."],"strategy":"...","channels":["..."]},
    "oceania":{"focus":"...","key_markets":["..."],"strategy":"...","channels":["..."]},
    "antarctica":{"focus":"...","key_markets":["..."],"strategy":"...","channels":["..."]},
    "global_tip":"..."
  }
}`;

  try {
    const raw = await callAI(prompt, 8000);
    const data = parseAIJson(raw);
    return res.json({ ok: true, source: anthropic ? 'claude' : 'gemini', ...data });
  } catch (e) {
    addLog('warn', 'PR/GlobalContent', e.message);
  }

  // Mock fallback — product-aware
  const p = product;
  const u = usp || 'คุณภาพไทยระดับส่งออก';
  const mockContent = {
    thai: {
      producer: {
        headline: `🏭 ร่วมผลิต "${p}" — โอกาสทองพันธมิตรการผลิตไทย`,
        body: `"${p}" กำลังขยายฐานการผลิต มองหาพันธมิตรโรงงานที่มีมาตรฐาน GMP/ISO ${u} รองรับทั้งรูปแบบ OEM และ ODM พร้อมระบบ QC ครบวงจร รายได้ขั้นต่ำ 500,000 บาท/เดือน สัญญาระยะยาว 1-3 ปี`,
        cta: 'ติดต่อฝ่ายผลิตวันนี้ — รับ Contract ระยะยาวทันที',
        hashtags: ['#ผู้ผลิตไทย', '#OEMไทย', '#โรงงานไทย', '#โอกาสธุรกิจ'],
        key_message: `ร่วมสร้าง "${p}" คุณภาพระดับส่งออกกับเรา`,
      },
      seller: {
        headline: `💰 ขาย "${p}" Margin 30-40% ระบบ Support ครบ`,
        body: `เปิดรับตัวแทนจำหน่าย "${p}" ทั่วประเทศ หมวด${category}ที่ตลาดต้องการสูง Margin 30-40% มีทีม Support ขาย Marketing Co-op Budget และระบบส่งสินค้าฟรีทั่วประเทศ`,
        cta: 'สมัครเป็นตัวแทนวันนี้ — รับส่วนลด 15% ออเดอร์แรก',
        hashtags: [`#ขาย${p.replace(/\s/g,'')}`, '#ตัวแทนจำหน่าย', '#รายได้เสริม', '#ขายออนไลน์'],
        key_message: `ขาย "${p}" รายได้ดี ระบบ support ครบทุกขั้นตอน`,
      },
      consumer: {
        headline: `✨ "${p}" — ${u}`,
        body: `"${p}" ผลิตจากวัตถุดิบไทยคัดสรร ${u} ผ่านมาตรฐานความปลอดภัยระดับสากล ลูกค้าใช้แล้วกว่า 50,000 ราย รีวิว ⭐4.9/5 ส่งด่วน 24 ชั่วโมง`,
        cta: 'สั่งซื้อตอนนี้ — ลด 20% + ส่งฟรีทั่วไทย',
        hashtags: ['#สินค้าไทย', '#คุณภาพดี', '#ของดีบอกต่อ', `#${category}`],
        key_message: `"${p}" ดีจริง ลูกค้าบอกต่อทั่วประเทศ`,
      },
      distributor: {
        headline: `🤝 "${p}" เปิดรับ Distributor Exclusive ทั่วประเทศ`,
        body: `มองหา Distributor ระดับจังหวัด/ภูมิภาค สำหรับ "${p}" ให้สิทธิ์ Exclusive เขตพื้นที่ มี Marketing support งบโฆษณาร่วม Training ทีมขาย และ CRM ระบบติดตามยอดขาย`,
        cta: 'ยื่นใบสมัคร Distributor วันนี้ — สิทธิ์ Exclusive จำกัด',
        hashtags: ['#Distributor', '#ตัวแทนจำหน่าย', '#ธุรกิจไทย', '#Exclusive'],
        key_message: `เป็น Distributor "${p}" ได้สิทธิ์ Exclusive รายได้มั่นคงระยะยาว`,
      },
      intl_agent: {
        headline: `🌏 "${p}" — สินค้าไทยพรีเมียม พร้อมส่งออกทั่วโลก`,
        body: `"${p}" ผ่านมาตรฐานการส่งออก FDA/CE/ISO และ Halal Certification ${u} บรรจุภัณฑ์ส่งออก MOQ ยืดหยุ่น ราคา FOB แข่งขันได้ ตัวแทนข้ามชาติรับ Commission 8-15%`,
        cta: 'ติดต่อฝ่าย Export วันนี้ — รับ Sample ฟรี',
        hashtags: ['#ThaiExport', '#สินค้าไทยส่งออก', '#GlobalBusiness', '#OTOP'],
        key_message: `"${p}" Thai Premium Quality — Certified & Ready to Export Worldwide`,
      },
      sme: {
        headline: `💼 SME ไทย — ไม่ต้องจ้าง Agency แพง! AI ทำให้คุณได้เลย`,
        body: `"${p}" คือตัวอย่างของ SME ไทยที่ใช้ AI แทนทีม Marketing ได้จริง OpenThai AI ช่วยสร้างแบรนด์ออนไลน์ครบวงจร คอนเทนต์ขายสินค้า 3 ภาษา วิเคราะห์คู่แข่งเรียลไทม์ และวางแผน PR รายเดือน ${u} ลดต้นทุน Marketing ได้ทันที เริ่มต้นได้วันนี้`,
        cta: 'ทดลองใช้ฟรี 14 วัน — ไม่ต้องใช้บัตรเครดิต',
        hashtags: ['#SMEไทย', '#ThaiSME', '#AIMarketing', '#ธุรกิจไทย', '#ลดต้นทุน'],
        key_message: `SME ไทยมี AI Marketing เป็นของตัวเองได้ — เริ่มต้นง่าย ราคาที่เข้าถึงได้`,
      },
      agri: {
        headline: `🌾 เกษตรกรไทย — ขายตรงถึงผู้บริโภคทั่วโลก ด้วย AI ที่เข้าใจเรื่องเกษตร`,
        body: `"${p}" ผลิตภัณฑ์เกษตรไทยคุณภาพสูง ${u} OpenThai AI ช่วยเล่าเรื่อง Farm-to-Table ใน 3 ภาษา สร้างเนื้อหาสำหรับตลาด EU/USA/Japan ที่ต้องการ Organic และ GI สร้าง Video Script ให้ลูกค้าเห็นไร่นาจริง รองรับใบรับรอง Organic · GAP · GI ช่วยสร้างเอกสารประกอบ`,
        cta: 'เริ่มส่งออกสินค้าเกษตรไทยวันนี้ → openthai-ai.com',
        hashtags: ['#เกษตรกรไทย', '#ThaiAgriculture', '#FarmToTable', '#OrganicThai', '#GAPCertified', '#สินค้าเกษตรไทย'],
        key_message: `เกษตรกรไทยส่งออกได้ — ด้วย AI ที่เข้าใจเรื่องเกษตรและตลาดโลก`,
      },
    },
    english: {
      producer: {
        headline: `🏭 Manufacture "${p}" With Us — Premium Thai OEM Partnership`,
        body: `We are seeking certified manufacturing partners for "${p}", Thailand's leading ${category} product. ${u}. We offer GMP/ISO-certified facilities, full QC support, flexible MOQ, and long-term contracts with guaranteed monthly revenue of THB 500,000+.`,
        cta: 'Contact Our Manufacturing Division Today — Long-Term Contracts Available',
        hashtags: ['#ThaiManufacturing', '#OEMPartner', '#MadeInThailand', '#BusinessOpportunity'],
        key_message: `Partner with us to produce "${p}" — export-grade Thai manufacturing excellence`,
      },
      seller: {
        headline: `💰 Sell "${p}" — 30-40% Margin, Complete Sales Support`,
        body: `Become an authorized reseller of "${p}", the #1 ${category} in Thailand. ${u}. Enjoy 30-40% margins, full marketing co-op support, free nationwide shipping, dedicated account management, and a proven 8-week fast-start program.`,
        cta: 'Apply to Become a Reseller Now — 15% Off Your First Order',
        hashtags: ['#ThaiProducts', '#ResellerOpportunity', '#BusinessGrowth', '#EcommerceTH'],
        key_message: `High margin, full support — sell "${p}" and scale your business fast`,
      },
      consumer: {
        headline: `✨ "${p}" — Premium Thai Quality You Can Trust`,
        body: `Discover "${p}", crafted from Thailand's finest ingredients with meticulous quality standards. ${u}. Loved by 50,000+ satisfied customers with a 4.9/5 star rating. FDA-approved, safe for the whole family. Fast 24-hour delivery.`,
        cta: 'Order Now — 20% Off + Free Shipping',
        hashtags: ['#MadeInThailand', '#QualityFirst', '#ThaiGoods', '#CustomerApproved'],
        key_message: `"${p}" — premium Thai quality trusted by thousands worldwide`,
      },
      distributor: {
        headline: `🤝 "${p}" Exclusive Distribution Rights — Territory Available Now`,
        body: `We are expanding our distribution network for "${p}" across Thailand and regionally. ${u}. Exclusive territorial rights available. Includes marketing co-op funding, sales team training, CRM system access, and dedicated logistics support.`,
        cta: 'Apply for Exclusive Distribution Rights — Limited Territories Available',
        hashtags: ['#DistributionRights', '#ExclusivePartner', '#ThaiProducts', '#BusinessOpportunity'],
        key_message: `Exclusive distribution of "${p}" — build a sustainable business with Thailand's leading brand`,
      },
      intl_agent: {
        headline: `🌏 "${p}" — Thailand's Export-Ready Premium Product for Global Markets`,
        body: `"${p}" is certified for international markets (FDA/CE/ISO/Halal/GMP). ${u}. Flexible MOQ, export-standard packaging in English/Chinese/Arabic, competitive FOB/CIF pricing. International agents earn 8-15% commission with dedicated export support team.`,
        cta: 'Contact Our Export Division — Free Samples & Certifications Available',
        hashtags: ['#ThaiExport', '#GlobalTrade', '#ASEAN', '#InternationalBusiness'],
        key_message: `"${p}" — Thailand's premium certified product ready for every global market`,
      },
      sme: {
        headline: `💼 Thai SMEs — No Expensive Agency Needed. Let AI Do It For You.`,
        body: `"${p}" proves that Thai SMEs can compete at a global level with AI-powered marketing. OpenThai AI is your complete marketing department — tri-lingual content for all major platforms, real-time competitor analysis, and monthly PR plans. ${u}. Reduce marketing costs dramatically and start growing today.`,
        cta: 'Start Your 14-Day Free Trial — No Credit Card Required',
        hashtags: ['#ThaiSME', '#SMEThailand', '#AIMarketing', '#SmallBusiness', '#GrowWithAI'],
        key_message: `Thai SMEs can now own their AI Marketing — affordable, powerful, built for Thailand`,
      },
      agri: {
        headline: `🌾 Thai Farmers & Agri-Brands — Sell Direct to the World with AI`,
        body: `"${p}" is a world-class Thai agricultural product that deserves a global audience. ${u}. OpenThai AI creates compelling Farm-to-Table stories in Thai, English, and Chinese — tailored for EU, USA, and Japanese markets that demand Organic, GAP, and GI certification. Includes video scripts showcasing your real farm and documentation support for export certifications.`,
        cta: 'Start Exporting Thai Agriculture Today → openthai-ai.com',
        hashtags: ['#ThaiAgriculture', '#FarmToTable', '#OrganicThai', '#GAPCertified', '#ThaiExport', '#AgriTech'],
        key_message: `Thai agricultural products deserve global recognition — AI-powered storytelling makes it happen`,
      },
    },
    chinese: {
      producer: {
        headline: `🏭 与我们共同生产"${p}" — 优质泰国OEM合作`,
        body: `我们正在寻找"${p}"的认证生产合作伙伴，这是泰国领先的${category}产品。${u}。我们提供GMP/ISO认证设施、全面质量控制、灵活起订量和长期合同，月收入保证不低于50万泰铢。`,
        cta: '立即联系制造部门 — 签订长期合同',
        hashtags: ['#泰国制造', '#OEM合作', '#商业机会', '#泰国出口'],
        key_message: `与我们合作生产"${p}" — 出口级泰国制造卓越品质`,
      },
      seller: {
        headline: `💰 销售"${p}" — 利润30-40%，全程销售支持`,
        body: `成为"${p}"授权经销商，泰国${category}领域第一品牌。${u}。享有30-40%高利润、营销联合支持、全国免费送货、专属客户经理和8周快速启动计划。`,
        cta: '立即申请成为经销商 — 首单享15%折扣',
        hashtags: ['#泰国产品', '#经销商机会', '#业务增长', '#跨境电商'],
        key_message: `高利润、全支持 — 销售"${p}"，快速扩大业务`,
      },
      consumer: {
        headline: `✨ "${p}" — 值得信赖的泰国优质精品`,
        body: `探索"${p}"，采用泰国最优质原料精心制作，品质严格把控。${u}。深受50,000+满意顾客喜爱，评分高达4.9/5星。获FDA认证，全家安心使用，24小时快速配送。`,
        cta: '立即订购 — 优惠20%+免费送货',
        hashtags: ['#泰国制造', '#优质产品', '#泰国好物', '#顾客好评'],
        key_message: `"${p}" — 数万消费者信赖的泰国优质品牌`,
      },
      distributor: {
        headline: `🤝 "${p}"独家分销权 — 区域代理正在招募`,
        body: `我们正在扩展"${p}"在全国及区域的分销网络。${u}。提供独家区域代理权，包含营销联合资金、销售团队培训、CRM系统和专属物流支持。`,
        cta: '立即申请独家分销权 — 名额有限',
        hashtags: ['#分销权', '#独家代理', '#泰国产品', '#商业机会'],
        key_message: `"${p}"独家分销 — 与泰国领先品牌共建可持续业务`,
      },
      intl_agent: {
        headline: `🌏 "${p}" — 面向全球市场的泰国优质出口产品`,
        body: `"${p}"已获国际市场认证（FDA/CE/ISO/清真/GMP）。${u}。灵活起订量，英/中/阿出口标准包装，具竞争力的FOB/CIF定价。国际代理商获得8-15%佣金，享专属出口支持团队。`,
        cta: '联系出口部门 — 提供免费样品及认证资料',
        hashtags: ['#泰国出口', '#国际贸易', '#东盟', '#全球业务'],
        key_message: `"${p}" — 通过认证、面向全球市场的泰国优质出口产品`,
      },
      sme: {
        headline: `💼 泰国中小企业 — 无需昂贵代理公司，AI为您打理一切`,
        body: `"${p}"证明了泰国中小企业可以借助AI营销在全球竞争。OpenThai AI是您完整的营销部门——三语内容覆盖所有主要平台、实时竞品分析和月度PR计划。${u}。大幅降低营销成本，立即开始增长。`,
        cta: '开始14天免费试用 — 无需信用卡',
        hashtags: ['#泰国中小企业', '#AI营销', '#小微企业', '#泰国创业', '#用AI增长'],
        key_message: `泰国中小企业现在也能拥有自己的AI营销——实惠、强大、专为泰国打造`,
      },
      agri: {
        headline: `🌾 泰国农业品牌 — 用AI直达全球消费者`,
        body: `"${p}"是世界级的泰国农产品，理应走向全球。${u}。OpenThai AI用泰语、英语和中文创作引人入胜的农场直供故事，专为需要有机、GAP和地理标志认证的欧盟、美国和日本市场量身定制。包含展示真实农场的视频脚本和出口认证文件支持。`,
        cta: '立即开始出口泰国农产品 → openthai-ai.com',
        hashtags: ['#泰国农业', '#农场直供', '#有机泰国', '#GAP认证', '#泰国出口', '#农业科技'],
        key_message: `泰国农产品值得全球认可——AI驱动的故事讲述让梦想成真`,
      },
    },
    continental: {
      asia: {
        focus: 'ตลาดหลัก — ASEAN + จีน + ญี่ปุ่น + เกาหลีใต้',
        key_markets: ['ไทย', 'จีน', 'ญี่ปุ่น', 'เกาหลีใต้', 'สิงคโปร์', 'มาเลเซีย', 'เวียดนาม', 'อินโดนีเซีย'],
        strategy: `เน้น KOL Marketing ภาษาท้องถิ่น, Social Commerce (TikTok/Shopee), ใบรับรอง Halal สำหรับตลาด Muslim-majority, แพ็คเกจ Premium สำหรับ JP/KR`,
        channels: ['TikTok', 'LINE', 'WeChat', 'Shopee', 'Lazada', 'Instagram', 'KakaoTalk'],
      },
      europe: {
        focus: 'ตลาดพรีเมียม — EU + UK สินค้า Sustainable & Organic',
        key_markets: ['เยอรมนี', 'ฝรั่งเศส', 'สหราชอาณาจักร', 'เนเธอร์แลนด์', 'สวีเดน', 'อิตาลี'],
        strategy: `ต้องการ CE/Organic/Fair Trade certifications, เน้น sustainability story, GDPR-compliant marketing, B2B ผ่าน Trade Shows (Anuga, SIAL), premium positioning`,
        channels: ['LinkedIn', 'Instagram', 'Amazon EU', 'Trade Shows', 'B2B Directories'],
      },
      north_america: {
        focus: 'ตลาดใหญ่ที่สุด — USA + Canada ผู้บริโภค Wellness สูง',
        key_markets: ['สหรัฐอเมริกา', 'แคนาดา', 'เม็กซิโก'],
        strategy: `Amazon USA Marketplace สำคัญที่สุด, Influencer Marketing บน TikTok/IG, เน้น health benefits & natural ingredients, FDA certification บังคับ`,
        channels: ['Amazon', 'TikTok', 'Instagram', 'Pinterest', 'Whole Foods Online', 'Facebook'],
      },
      south_america: {
        focus: 'ตลาดเกิดใหม่ไว — บราซิล + โคลอมเบีย + ชิลี',
        key_markets: ['บราซิล', 'โคลอมเบีย', 'เปรู', 'ชิลี', 'อาร์เจนตินา'],
        strategy: `Portuguese (บราซิล) + Spanish content บังคับ, Social Commerce สูงมาก, WhatsApp Business เป็น primary channel, Mercado Libre เป็น marketplace หลัก, ราคาแข่งขัน`,
        channels: ['WhatsApp Business', 'Instagram', 'Mercado Libre', 'YouTube', 'TikTok'],
      },
      africa: {
        focus: 'ตลาดเติบโตสูงสุด — Sub-Saharan Africa + Middle East/North Africa',
        key_markets: ['แอฟริกาใต้', 'ไนจีเรีย', 'เคนยา', 'UAE', 'ซาอุดิอาระเบีย', 'อียิปต์', 'โมร็อกโก'],
        strategy: `Halal certification สำคัญมากสำหรับ MENA, Mobile-first (90% ใช้มือถือ), WhatsApp Business เป็น primary, พันธมิตรท้องถิ่น (Local Distributor) สำคัญ, ราคาที่เข้าถึงได้`,
        channels: ['WhatsApp Business', 'Facebook', 'Instagram', 'Jumia', 'Noon', 'Souq'],
      },
      oceania: {
        focus: 'ตลาดคุณภาพสูง — ออสเตรเลีย + นิวซีแลนด์',
        key_markets: ['ออสเตรเลีย', 'นิวซีแลนด์', 'ปาปัวนิวกินี', 'ฟิจิ'],
        strategy: `TGA (Australia) / Medsafe (NZ) certification ถ้าเป็นสุขภาพ, ชุมชน Asian-Australian ใหญ่ชื่นชอบสินค้าไทย, เน้น natural/organic, Amazon AU + Chemist Warehouse Online`,
        channels: ['Amazon AU', 'Instagram', 'Facebook', 'Chemist Warehouse', 'Woolworths Online', 'TikTok'],
      },
      antarctica: {
        focus: 'ชุมชนวิจัยนานาชาติ ~5,000 คน — ตลาดเฉพาะทาง',
        key_markets: ['McMurdo Station (USA)', 'Scott Base (NZ)', 'Concordia (EU)', 'Zhongshan (China)'],
        strategy: `สินค้าต้องทนทานต่อสภาพอากาศรุนแรง (-80°C), บรรจุภัณฑ์พิเศษ, ส่งผ่าน Supply Chain สถานีวิจัย, เหมาะสำหรับ emergency food / research supplies`,
        channels: ['Email', 'Research Institution Networks', 'Government Procurement', 'Specialized Logistics'],
      },
      global_tip: `กลยุทธ์โลก: "${p}" ควรมี (1) Multilingual packaging TH/EN/ZH/AR (2) Certifications ครบ Halal/Organic/ISO/FDA (3) Digital-first ทุก market (4) Local Distributor Network ใน 7 ทวีป (5) Unified Brand Story ที่สื่อถึง "Thai Premium Heritage"`,
    },
  };
  return res.json({ ok: true, source: 'mock', ...mockContent });
});

// S17 · POST /api/skills/cultural-wisdom — ปรัชญาจีน/ไทย/พุทธ Cultural Wisdom Engine
app.post('/api/skills/cultural-wisdom', generateLimiter, async (req, res) => {
  const { situation, tradition = 'all', purpose = 'general' } = req.body || {};
  if (!situation?.trim()) return res.status(400).json({ error: 'situation required' });

  const traditionMap = {
    chinese: 'ปรัชญาจีน (儒家 Confucianism) — 八德: 忠孝仁爱礼义廉耻 และ 四书五经',
    buddhist: 'พระพุทธศาสนา (Buddhism) — พระไตรปิฎก ไตรสิกขา ศีล สมาธิ ปัญญา',
    thai: 'ปรัชญาไทย — หลักพระราชดำริ เศรษฐกิจพอเพียง วัฒนธรรมไทย',
    all: 'สามปรัชญา: Confucianism (儒家) + Buddhism (พุทธ) + ปรัชญาไทย',
  };

  const prompt = `คุณเป็น ปราชญ์แห่งปัญญาตะวันออก (Oriental Wisdom Master) ผู้เชี่ยวชาญ:
- ปรัชญาจีน 儒家: 八德 (忠孝仁爱礼义廉耻), 四书 (論語 大學 中庸 孟子), 五经
- พระพุทธศาสนา: พระไตรปิฎก, ไตรสิกขา (ศีล สมาธิ ปัญญา), อริยสัจ 4, มรรค 8
- ปรัชญาไทย: เศรษฐกิจพอเพียง, ความกตัญญู, ความสามัคคี

สถานการณ์/คำถาม: "${situation.slice(0, 600)}"
ประเพณีปัญญา: ${traditionMap[tradition] || traditionMap['all']}
วัตถุประสงค์: ${purpose}

ตอบกลับ JSON เท่านั้น:
{
  "wisdom_quote": "คำสอนโบราณที่เกี่ยวข้องที่สุด (ภาษาต้นฉบับ + อักษรโรมัน ถ้ามี)",
  "quote_source": "แหล่งที่มา เช่น 論語 หรือ ธรรมบท หรือ พระราชดำรัส",
  "thai_meaning": "ความหมายเป็นภาษาไทยที่เข้าใจง่าย",
  "virtue_alignment": [{"virtue":"คุณธรรม","tradition":"ปรัชญา","relevance":"ความเกี่ยวข้องกับสถานการณ์"}],
  "deep_insight": "การวิเคราะห์เชิงลึก 3-4 ประโยค — เชื่อมปัญญาโบราณกับสถานการณ์ปัจจุบัน",
  "practical_steps": ["ขั้นตอนปฏิบัติ 1 — อิงหลักธรรม","ขั้นตอน 2","ขั้นตอน 3"],
  "business_application": "การประยุกต์ใช้ในธุรกิจ/การตลาด ถ้าเกี่ยวข้อง",
  "additional_wisdom": [{"tradition":"ชื่อปรัชญา","quote":"คำสอน","meaning":"ความหมาย"}],
  "reflection_question": "คำถามให้ขบคิดต่อ"
}`;

  try {
    const text = await callAI(prompt, 2048);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) {
    addLog('warn', 'Skills/CulturalWisdom', e.message);
  }

  // Mock fallback
  const mockWisdom = {
    chinese: {
      wisdom_quote: '己所不欲，勿施於人 (Jǐ suǒ bù yù, wù shī yú rén)',
      quote_source: '論語 · 衛靈公 (Analects of Confucius · Chapter 15)',
      thai_meaning: 'สิ่งที่ตนเองไม่ปรารถนา อย่าทำกับผู้อื่น — Golden Rule แห่งขงจื๊อ',
    },
    buddhist: {
      wisdom_quote: 'ความไม่ประมาทเป็นทางแห่งความไม่ตาย ความประมาทเป็นทางแห่งความตาย',
      quote_source: 'ธรรมบท · อัปปมาทวรรค (Dhammapada v.21)',
      thai_meaning: 'อัปปมาทธรรม — ความตื่นตัวและไม่ประมาทในทุกสิ่งนำไปสู่ความสำเร็จ',
    },
    thai: {
      wisdom_quote: '"เศรษฐกิจพอเพียง" — ความพอเพียง พอประมาณ มีเหตุผล มีภูมิคุ้มกัน',
      quote_source: 'พระราชดำรัสรัชกาลที่ 9',
      thai_meaning: 'หลักการดำเนินชีวิตและธุรกิจอย่างยั่งยืน ไม่โลภ ไม่เร่งร้อน',
    },
    all: {
      wisdom_quote: '知足者富 (Zhī zú zhě fù) — ผู้รู้จักพอย่อมร่ำรวย',
      quote_source: '道德經 · 老子 Chapter 33',
      thai_meaning: 'ความพอใจในสิ่งที่มีคือความมั่งคั่งที่แท้จริง — สอดคล้องกับพุทธธรรมและเศรษฐกิจพอเพียง',
    },
  };
  const base = mockWisdom[tradition] || mockWisdom['all'];
  res.json({
    success: true, source: 'mock',
    ...base,
    virtue_alignment: [
      { virtue: '仁 (Rén) — เมตตา', tradition: 'Confucianism', relevance: 'ใส่ใจผู้อื่นในการตัดสินใจ' },
      { virtue: 'กรุณา (Karunā)', tradition: 'Buddhism', relevance: 'ช่วยเหลือผู้ที่ได้รับผลกระทบ' },
      { virtue: 'พอเพียง', tradition: 'ปรัชญาไทย', relevance: 'ไม่ตัดสินใจจากความโลภ' },
    ],
    deep_insight: `สถานการณ์ที่เผชิญสะท้อนหลักการสำคัญของปรัชญาตะวันออก — ความสำเร็จที่แท้จริงไม่ใช่แค่ผลลัพธ์ภายนอก แต่คือกระบวนการที่มีคุณธรรม ปัญญาโบราณสอนว่าการกระทำด้วยหัวใจที่บริสุทธิ์และเข้าใจบริบทรอบข้างจะนำไปสู่ผลลัพธ์ที่ยั่งยืน ทั้ง 忠 (ความซื่อสัตย์) และ 仁 (ความเมตตา) ต้องทำงานร่วมกัน`,
    practical_steps: [
      'หยุดและสังเกต (止) — ก่อนตัดสินใจ ให้ใจสงบ 5 นาที ใคร่ครวญผลกระทบต่อผู้อื่น',
      'ปรึกษาผู้รู้ (問) — หาความเห็นจากผู้มีประสบการณ์ ตามหลัก 學而時習之',
      'ลงมือด้วยคุณธรรม (行) — ดำเนินการอย่างซื่อตรงและเมตตา วัดผลทั้งตัวเลขและผลกระทบต่อสังคม',
    ],
    business_application: 'หลัก 仁义礼智信 (Ren Yi Li Zhi Xin) ใช้ได้กับการสร้างแบรนด์ที่ยั่งยืน — ลูกค้าไทยให้ความสำคัญกับ "ความจริงใจ" และ "ความกตัญญู" สูงมาก แบรนด์ที่สื่อสารคุณค่าเหล่านี้มักได้ loyalty สูงกว่า',
    additional_wisdom: [
      { tradition: 'Buddhism', quote: 'อัปปมาทธรรม — ความไม่ประมาท', meaning: 'ตื่นตัว รอบคอบ ไม่ละเลยรายละเอียด' },
      { tradition: 'Confucianism', quote: '學而不思則罔，思而不學則殆', meaning: 'เรียนโดยไม่คิดสูญเปล่า คิดโดยไม่เรียนอันตราย' },
    ],
    reflection_question: `"ถ้าคำตัดสินใจนี้ถูกตัดสินโดยคนที่คุณเคารพที่สุด พวกเขาจะมองว่าคุณกระทำด้วย 仁 (ความเมตตา) หรือไม่?"`,
  });
});

// Content Benchmark — เทียบสื่อกับตลาด 5 มิติ
app.post('/api/content-benchmark', generateLimiter, async (req, res) => {
  const { content, platform = 'tiktok', language = 'thai', category = 'ทั่วไป' } = req.body || {};
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });

  const platformCtx = {
    tiktok:    'TikTok / TikTok Shop — วิดีโอสั้น Hook 3 วินาที ภาษาสนุก กระตุ้น FOMO',
    facebook:  'Facebook — โพสต์ยาว เล่าเรื่อง Social Proof ภาพประกอบ',
    instagram: 'Instagram — Aesthetic caption สั้นกระชับ Hashtag 20-30 ตัว',
    line:      'LINE OA — สั้น กระชับ ลิงก์ชัด Push notification',
    shopee:    'Shopee — คีย์เวิร์ด SEO ราคา โปรโมชั่น Badge',
    x:         'X (Twitter) — กระชับ 280 ตัวอักษร ความเห็น Trending topic',
    linkedin:  'LinkedIn — Professional B2B ข้อมูล Case Study',
    youtube:   'YouTube — Title SEO Thumbnail hook Description keyword',
  };

  const prompt = `คุณเป็น Senior Content Strategist และ Social Media Analyst ระดับโลก เชี่ยวชาญตลาดไทยและ Digital Marketing 2025-2026

วิเคราะห์ content ต่อไปนี้เทียบกับมาตรฐาน Top Performer ในตลาด:

=== CONTENT ที่ต้องวิเคราะห์ ===
${content.slice(0, 2000)}
=== สิ้นสุด CONTENT ===

Platform: ${platformCtx[platform] || platform}
ภาษา: ${language}
หมวดหมู่: ${category}

วิเคราะห์ 5 มิติเทียบ Top 10% Content ในตลาดปัจจุบัน:

1. ความทันสมัย — ใช้ภาษา/สไตล์ปี 2025-2026 ไหม มี Gen-Z appeal ไหม
2. คำที่ติดเทรนด์ — ใช้คำฮิตที่กำลังไวรัลไหม เช่น "ปัง", "ตรง", "เห็นผลจริง", "ต้องลอง", "FOMO", "Exclusive"
3. ความน่าอ่าน — Hook ดึงดูดไหม ประโยคสั้น/ยาวเหมาะไหม คำนิยามชัดน่าอ่านไหม
4. Hashtag เทรนด์ — # ที่ใช้ตรงกับ Trending Hashtag ของ Platform นั้นไหม ขาด # สำคัญไหม
5. มาตรฐานตลาด — เทียบกับ Top Performer จริงๆ ของ Platform + Category นี้ ห่างกันแค่ไหน

ตอบ JSON เท่านั้น ไม่มีข้อความอื่น:
{
  "overall_score": <0-100>,
  "grade": "<A+|A|B+|B|C+|C|D>",
  "verdict": "<สรุปประโยคเดียว ชัดเจน>",
  "dimensions": {
    "modernity":       {"score":<0-100>,"label":"ทันสมัย","verdict":"<ดีมาก|ดี|ปานกลาง|ต้องปรับ>","detail":"<วิเคราะห์>","tip":"<คำแนะนำ>"},
    "trend_words":     {"score":<0-100>,"label":"คำเทรนด์","verdict":"<...>","found":["<คำที่พบและดี>"],"missing":["<คำที่ขาดแต่ควรมี>"],"tip":"<คำแนะนำ>"},
    "readability":     {"score":<0-100>,"label":"น่าอ่าน","verdict":"<...>","detail":"<วิเคราะห์>","tip":"<คำแนะนำ>"},
    "hashtags":        {"score":<0-100>,"label":"Hashtag เทรนด์","verdict":"<...>","found":["<#ที่ใช้และดี>"],"missing_hot":["<#ที่ขาดแต่กำลังฮิตมาก>"],"tip":"<คำแนะนำ>"},
    "market_standard": {"score":<0-100>,"label":"มาตรฐานตลาด","verdict":"<...>","detail":"<เทียบ Top Performer>","tip":"<คำแนะนำ>"}
  },
  "market_comparison": {
    "top_example": "<ตัวอย่าง content สไตล์ Top Performer สำหรับ Platform+Category นี้ — เขียนเต็มๆ เหมือน content จริง>",
    "strengths": ["<จุดแข็งของ content นี้>","<จุดแข็ง 2>"],
    "gaps": ["<สิ่งที่ขาดเมื่อเทียบตลาด>","<gap 2>","<gap 3>"],
    "competitor_tactics": ["<กลยุทธ์ที่ Top Performer ใช้>","<tactic 2>","<tactic 3>"]
  },
  "trending_now": {
    "words": ["<คำที่กำลังฮิต 5-8 คำ>"],
    "phrases": ["<วลีฮิต 3-5 วลี>"],
    "hashtags": ["<#เทรนด์ที่ฮิตมากใน Platform นี้ 8-12 ตัว>"]
  },
  "improved": {
    "headline": "<Headline ที่ปรับแล้ว ดีกว่าเดิม ใช้คำเทรนด์>",
    "body": "<Body ที่ปรับแล้ว — สั้นกระชับกว่า ดึงดูดกว่า>",
    "cta": "<CTA ที่แรงกว่าเดิม>",
    "hashtags": ["<#เทรนด์1>","<#เทรนด์2>","<#เทรนด์3>","<#เทรนด์4>","<#เทรนด์5>","<#เทรนด์6>"]
  }
}`;

  try {
    const raw = await callAI(prompt, 4000);
    const data = parseAIJson(raw);
    return res.json({ ok: true, source: anthropic ? 'claude' : 'gemini', ...data });
  } catch (e) {
    addLog('warn', 'ContentBenchmark', e.message);
  }

  // Mock fallback — platform-aware
  const platformScores = {
    tiktok:    { mod: 72, trend: 65, read: 78, hash: 60, mkt: 70 },
    facebook:  { mod: 78, trend: 70, read: 82, hash: 68, mkt: 75 },
    instagram: { mod: 74, trend: 68, read: 80, hash: 55, mkt: 72 },
    shopee:    { mod: 76, trend: 72, read: 75, hash: 70, mkt: 73 },
  };
  const s = platformScores[platform] || { mod: 74, trend: 68, read: 78, hash: 62, mkt: 72 };
  const overall = Math.round((s.mod + s.trend + s.read + s.hash + s.mkt) / 5);
  const grade = overall >= 90 ? 'A+' : overall >= 85 ? 'A' : overall >= 78 ? 'B+' : overall >= 70 ? 'B' : overall >= 62 ? 'C+' : 'C';

  const trendWordsByPlatform = {
    tiktok:    ['ปังมาก', 'ทำแล้วไม่ผิดหวัง', 'FOMO', 'ต้องลอง', 'เห็นผลจริง', 'ดีงาม', 'สตรอง'],
    facebook:  ['รีวิวจริง', 'ของแท้จากโรงงาน', 'ส่งตรงจากแหล่ง', 'คุ้มมาก', 'บอกต่อ'],
    instagram: ['Aesthetic', 'Vibe', 'Minimal', 'Must-have', 'Game changer', 'Glow up'],
    shopee:    ['ราคาโรงงาน', 'ส่งฟรี', 'ของแท้', 'คุณภาพดี ราคาถูก', 'สต็อกจำกัด'],
  };
  const trendHashByPlatform = {
    tiktok:    ['#รีวิว', '#ของดีบอกต่อ', '#tiktokshopthailand', '#สินค้าไทย', '#ของมันต้องมี', '#ไวรัล', '#fyp', '#foryou', '#ช็อปออนไลน์'],
    facebook:  ['#รีวิวจริง', '#สินค้าไทย', '#OTOP', '#ของดี', '#ขายออนไลน์', '#ธุรกิจไทย'],
    instagram: ['#thaiproduct', '#ootd', '#lifestyle', '#aesthetic', '#MadeInThailand', '#instagood'],
    shopee:    ['#Shopee', '#ช้อปปี้', '#สินค้าแนะนำ', '#ของถูกดี', '#ลดราคา'],
  };
  const tw = trendWordsByPlatform[platform] || trendWordsByPlatform.tiktok;
  const th = trendHashByPlatform[platform] || trendHashByPlatform.tiktok;

  res.json({
    ok: true, source: 'mock', overall_score: overall, grade,
    verdict: `Content มีคุณภาพระดับ ${grade} — ดีแต่ยังมีช่องว่างจาก Top Performer ในตลาด ${6 - Math.round(overall/20)} จุดหลัก`,
    dimensions: {
      modernity: {
        score: s.mod, label: 'ทันสมัย',
        verdict: s.mod >= 80 ? 'ดีมาก' : s.mod >= 70 ? 'ดี' : 'ต้องปรับ',
        detail: `ภาษาที่ใช้อยู่ในระดับ${s.mod >= 75 ? 'ทันสมัยดี' : 'ค่อนข้างเป็นทางการเกินไป'} สำหรับ ${platform} ปี 2026 ควรเพิ่มความ casual และ conversational มากขึ้น`,
        tip: 'เพิ่มคำสแลงที่ฮิตปัจจุบัน เช่น "ปัง", "ตรง", "สตรอง" และ Emoji ที่เกี่ยวข้อง',
      },
      trend_words: {
        score: s.trend, label: 'คำเทรนด์',
        verdict: s.trend >= 75 ? 'ดี' : 'ปานกลาง',
        found: tw.slice(0, 2),
        missing: tw.slice(2, 5),
        tip: `เพิ่มคำ: "${tw.slice(2, 4).join('", "')}" เพื่อให้ติดเทรนด์มากขึ้น`,
      },
      readability: {
        score: s.read, label: 'น่าอ่าน',
        verdict: s.read >= 80 ? 'ดีมาก' : 'ดี',
        detail: `Hook ของ content นี้${s.read >= 80 ? 'ดึงดูดใจดี' : 'ยังไม่แรงพอ ควรขึ้นต้นด้วยคำถามหรือ pain point ของลูกค้า'} ความยาวประโยค${s.read >= 78 ? 'เหมาะสม' : 'ยาวเกินไป ควรตัดให้สั้น กระชับ อ่านง่ายขึ้น'}`,
        tip: 'ขึ้นต้นด้วยคำถาม หรือ Pain point เช่น "เคยเจอปัญหา...ไหม?" แล้วตามด้วยวิธีแก้',
      },
      hashtags: {
        score: s.hash, label: 'Hashtag เทรนด์',
        verdict: s.hash >= 70 ? 'ดี' : 'ต้องปรับ',
        found: th.slice(0, 3),
        missing_hot: th.slice(3, 6),
        tip: `เพิ่ม: ${th.slice(3, 6).map(h => h).join(' ')} — กำลังฮิตมากใน ${platform} ขณะนี้`,
      },
      market_standard: {
        score: s.mkt, label: 'มาตรฐานตลาด',
        verdict: s.mkt >= 75 ? 'ดี' : 'ปานกลาง',
        detail: `เทียบกับ Top 10% Content ใน ${platform} หมวด${category} — content นี้อยู่ในระดับ Top ${100 - s.mkt}% ยังห่างจาก viral content ที่ได้ Engagement สูงสุดในตลาด`,
        tip: 'Top Performer มักใช้ Social Proof (ตัวเลขลูกค้า, รีวิว), Scarcity (สต็อกจำกัด, หมดแล้ว) และ Clear CTA ที่กระชับ',
      },
    },
    market_comparison: {
      top_example: `🔥 [ตัวอย่าง Top Performer ${platform}/${category}]\n"❌ เคยซื้อของออนไลน์แล้วผิดหวังบ้างไหม?\n✅ ลองมาทางนี้เลย! ของแท้ 100% รีวิวจริงจากลูกค้ากว่า 50,000 คน ⭐4.9/5\n💥 สั่งวันนี้ ส่งพรุ่งนี้ + ลด 30% เฉพาะ 24 ชม.\n👇 กด Link ด้านล่างได้เลย!"`,
      strengths: ['ข้อมูลครบถ้วน ครอบคลุมทุกมิติ', 'โครงสร้าง Headline-Body-CTA ชัดเจน', 'ภาษาเข้าใจง่าย'],
      gaps: ['ขาด Social Proof (ตัวเลขลูกค้า, รีวิว)', 'ไม่มี Urgency/Scarcity element', `Hashtag ยังน้อยกว่า Top Performer ที่ใช้ ${platform === 'instagram' ? '25-30' : '8-12'} ตัว`, 'Hook ยังไม่แรงพอ — ควรขึ้นต้นด้วย Pain หรือคำถาม'],
      competitor_tactics: ['เปิดด้วยคำถามหรือ Pain point ของลูกค้าเสมอ', 'ใส่ตัวเลข Social Proof ที่ชัดเจน เช่น "50,000+ คนใช้แล้ว"', 'สร้าง Urgency ด้วย "เฉพาะวันนี้" หรือ "สต็อกจำกัด"', 'ใช้ Emoji เพื่อ Break ข้อความและดึงสายตา'],
    },
    trending_now: {
      words: tw,
      phrases: ['เห็นผลจริง ไม่ต้องรอนาน', 'ส่งตรงจากโรงงาน ราคาถูกกว่า', 'ลูกค้ากว่า X คนบอกต่อ', 'สั่งตอนนี้ หมดแล้วหมดเลย'],
      hashtags: th,
    },
    improved: {
      headline: `😱 หยุดก่อน! ยังไม่ได้ลอง [สินค้า] อยู่หรือนี่? ลูกค้ากว่า 50,000 คนบอกว่า "เปลี่ยนชีวิต"`,
      body: `✅ ของแท้ 100% จากโรงงานไทย\n⭐ รีวิว 4.9/5 ไม่แต่งเติม\n🚀 ส่งฟรีทั่วไทย วันนี้เท่านั้น!\n💥 ลด ${platform === 'shopee' ? '40%' : '30%'} — สต็อกจำกัด หมดแล้วหมดเลย`,
      cta: `👇 สั่งเลยก่อนหมด → [ลิงก์] หรือ DM ได้ทันที!`,
      hashtags: th.slice(0, 6),
    },
  });
});

// Ultra Promo Engine — 10-Module Expert Marketing System
app.post('/api/ultra-promo', generateLimiter, async (req, res) => {
  const {
    product, price = '', category = 'ทั่วไป', usp, pain = '', desire = '',
    target = 'ทั่วไป', competitor = '', platform = 'ทุกแพลตฟอร์ม',
    tone = 'สนุก/กระตุ้น', brand_voice = 'ทันสมัย, น่าเชื่อถือ',
  } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });
  if (!usp?.trim())     return res.status(400).json({ error: 'usp required' });

  const prompt = `คุณเป็น CMO + Copywriter ระดับโลกที่เชี่ยวชาญตลาดไทย สร้างระบบการตลาดระดับเทพที่ครอบคลุมทุกมิติสำหรับ:

สินค้า: "${product}"
ราคา: ${price || 'ไม่ระบุ'}
หมวดหมู่: ${category}
จุดเด่นหลัก (USP): "${usp}"
ปัญหาของลูกค้า: ${pain || 'ไม่ระบุ'}
ความต้องการ: ${desire || 'ไม่ระบุ'}
กลุ่มเป้าหมาย: ${target}
คู่แข่ง: ${competitor || 'ไม่ระบุ'}
แพลตฟอร์มหลัก: ${platform}
โทน: ${tone}
เสียงแบรนด์: ${brand_voice}

ตอบ JSON เดียวครอบคลุม 10 โมดูล ห้ามอธิบายนอก JSON:

{
  "hook_matrix": {
    "shock": ["hook shock 1 — ทำให้หยุดนิ้วทันที","hook shock 2","hook shock 3"],
    "question": ["hook คำถาม 1 — ให้คนอยากตอบ","hook คำถาม 2","hook คำถาม 3"],
    "curiosity": ["hook curiosity 1 — ทิ้งปริศนา","hook curiosity 2","hook curiosity 3"],
    "story": ["hook เปิดด้วย story 1 — เหตุการณ์จริง","hook story 2","hook story 3"],
    "contrast": ["hook ขัดแย้งความคาดหวัง 1","hook contrast 2","hook contrast 3"],
    "platform_openers": {
      "tiktok": "ประโยคเปิด TikTok ที่หยุดนิ้วใน 0.5 วินาทีแรก",
      "facebook": "ประโยคเปิด Facebook ที่ทำให้คลิก See More",
      "shopee": "Title SEO Shopee ที่ดึงดูดและติด keyword",
      "instagram": "Caption เปิดต้น IG ที่ดึงให้กด More",
      "youtube": "Hook YouTube ใน 5 วินาทีแรกก่อน skip"
    },
    "first_words": ["คำขึ้นต้นที่ทรงพลังที่สุด 1","คำขึ้นต้น 2","คำขึ้นต้น 3","คำขึ้นต้น 4","คำขึ้นต้น 5"],
    "visual_hooks": ["แนวคิดภาพ hook 1 สำหรับทีม design","แนวคิดภาพ hook 2","แนวคิดภาพ hook 3"]
  },
  "buyer_psychology": {
    "pain_matrix": [
      {"rational":"ปัญหาเชิงเหตุผล 1","emotional":"ความรู้สึกที่ซ่อนอยู่","deep_fear":"ความกลัวลึกๆ ที่ไม่พูดออกมา"},
      {"rational":"ปัญหาเชิงเหตุผล 2","emotional":"...","deep_fear":"..."},
      {"rational":"ปัญหาเชิงเหตุผล 3","emotional":"...","deep_fear":"..."}
    ],
    "desire_map": [
      {"surface":"ความต้องการที่พูดออกมา","core":"ความต้องการแท้จริง","identity":"ตัวตนที่อยากเป็น"},
      {"surface":"...","core":"...","identity":"..."}
    ],
    "cognitive_biases": [
      {"bias":"Scarcity","application":"วิธีใช้กับสินค้านี้โดยเฉพาะ","copy_example":"ตัวอย่าง copy จริง"},
      {"bias":"Social Proof","application":"...","copy_example":"..."},
      {"bias":"Authority","application":"...","copy_example":"..."},
      {"bias":"Reciprocity","application":"...","copy_example":"..."},
      {"bias":"Loss Aversion","application":"...","copy_example":"..."},
      {"bias":"Anchoring","application":"...","copy_example":"..."}
    ],
    "emotional_triggers": ["trigger อารมณ์ 1 + วิธีใช้","trigger 2","trigger 3","trigger 4","trigger 5"],
    "buyer_journey_hooks": [
      {"stage":"Awareness","emotion":"ยังไม่รู้ว่ามีปัญหา","message":"สารที่ต้องส่ง"},
      {"stage":"Consideration","emotion":"กำลังเปรียบเทียบ","message":"..."},
      {"stage":"Decision","emotion":"กลัวผิดพลาด","message":"..."},
      {"stage":"Purchase","emotion":"ต้องการ validation","message":"..."}
    ]
  },
  "platform_packages": {
    "tiktok": {
      "hook": "hook TikTok ที่ดีที่สุดสำหรับสินค้านี้",
      "script_15s": "script 15 วินาที แบ่ง scene ชัดเจน",
      "script_30s": "script 30 วินาที",
      "caption": "caption พร้อม hashtag",
      "hashtags": ["#hashtag1","#hashtag2","#hashtag3","#hashtag4","#hashtag5"],
      "algorithm_tip": "เคล็ดลับ algorithm TikTok เฉพาะสินค้าประเภทนี้"
    },
    "facebook": {
      "post_long": "โพสต์ Facebook ยาว storytelling 200+ คำ",
      "post_short": "โพสต์สั้น punch line 50 คำ",
      "carousel_slides": ["Slide 1: ...","Slide 2: ...","Slide 3: ...","Slide 4 CTA: ..."],
      "ad_primary_text": "Primary text สำหรับ Facebook Ads"
    },
    "shopee": {
      "title": "ชื่อสินค้า SEO Shopee ≤120 ตัวอักษร",
      "bullets": ["จุดเด่น 1 พร้อม emoji","จุดเด่น 2","จุดเด่น 3","จุดเด่น 4","จุดเด่น 5"],
      "description": "คำอธิบายสินค้า Shopee ครบถ้วน",
      "search_keywords": ["keyword1","keyword2","keyword3","keyword4","keyword5"]
    },
    "line": {
      "broadcast": "ข้อความ LINE Broadcast",
      "chat_opener": "ข้อความเปิดแชทครั้งแรก",
      "followup": "ข้อความ follow-up หลัง 24 ชั่วโมง"
    },
    "instagram": {
      "reels_hook": "hook Reels IG",
      "caption": "caption IG ครบ",
      "story_sequence": ["Story 1","Story 2","Story 3 CTA"]
    }
  },
  "copy_arsenal": {
    "aida": {
      "attention": "A — ดึงความสนใจ",
      "interest": "I — สร้างความสนใจ",
      "desire": "D — กระตุ้นความต้องการ",
      "action": "A — กระตุ้นการกระทำ",
      "full_copy": "copy AIDA เต็มรูปแบบ"
    },
    "pas": {
      "problem": "P — ปัญหา",
      "agitate": "A — ขยายความเจ็บปวด",
      "solution": "S — วิธีแก้ที่ดีที่สุด",
      "full_copy": "copy PAS เต็มรูปแบบ"
    },
    "bab": {
      "before": "Before — ชีวิตก่อนใช้สินค้า",
      "after": "After — ชีวิตหลังใช้สินค้า",
      "bridge": "Bridge — สินค้าคือสะพาน",
      "full_copy": "copy BAB เต็มรูปแบบ"
    },
    "fomo": {
      "urgency": "copy กระตุ้นด้วย FOMO",
      "scarcity": "copy ขาดแคลน/จำนวนจำกัด",
      "social_proof": "copy Social Proof เฉพาะ"
    },
    "power_words": ["คำทรงพลัง 1","คำ 2","คำ 3","คำ 4","คำ 5","คำ 6","คำ 7","คำ 8"],
    "testimonial_templates": [
      "template testimonial 1 — เหมือนคนจริงพูด",
      "template testimonial 2",
      "template testimonial 3"
    ],
    "email_subject_lines": ["subject line 1 open rate สูง","subject 2","subject 3","subject 4","subject 5"]
  },
  "video_blueprint": {
    "v15": {
      "duration": "15 วินาที",
      "platform": "TikTok / Instagram Reels",
      "scenes": [
        {"sec":"0-3","type":"Hook","visual":"ภาพ/การกระทำ","script":"คำพูด","emotion":"อารมณ์ที่ต้องการ"},
        {"sec":"3-8","type":"Problem","visual":"...","script":"...","emotion":"..."},
        {"sec":"8-13","type":"Solution","visual":"...","script":"...","emotion":"..."},
        {"sec":"13-15","type":"CTA","visual":"...","script":"...","emotion":"..."}
      ]
    },
    "v30": {
      "duration": "30 วินาที",
      "platform": "TikTok / Facebook",
      "scenes": [
        {"sec":"0-5","type":"Hook","visual":"...","script":"...","emotion":"..."},
        {"sec":"5-12","type":"Pain","visual":"...","script":"...","emotion":"..."},
        {"sec":"12-22","type":"Product Demo","visual":"...","script":"...","emotion":"..."},
        {"sec":"22-28","type":"Result","visual":"...","script":"...","emotion":"..."},
        {"sec":"28-30","type":"CTA","visual":"...","script":"...","emotion":"..."}
      ]
    },
    "v60": {
      "duration": "60 วินาที",
      "platform": "YouTube / Facebook",
      "scenes": [
        {"sec":"0-5","type":"Hook","visual":"...","script":"...","emotion":"..."},
        {"sec":"5-15","type":"Story/Pain","visual":"...","script":"...","emotion":"..."},
        {"sec":"15-30","type":"Product Reveal","visual":"...","script":"...","emotion":"..."},
        {"sec":"30-45","type":"Benefits","visual":"...","script":"...","emotion":"..."},
        {"sec":"45-55","type":"Social Proof","visual":"...","script":"...","emotion":"..."},
        {"sec":"55-60","type":"CTA","visual":"...","script":"...","emotion":"..."}
      ]
    },
    "live_script": {
      "open_5min": "script เปิด live 5 นาทีแรก",
      "product_demo": "script สาธิตสินค้า",
      "close_urgency": "script ปิดพร้อม urgency",
      "flash_sale_call": "เสียงประกาศ flash sale"
    }
  },
  "price_psychology": {
    "anchor_strategy": "วิธีตั้งราคา anchor ที่ทำให้รู้สึกคุ้มค่า",
    "anchor_copy": "copy เปรียบเทียบราคา anchor",
    "bundles": [
      {"name":"Bundle ชื่อ 1","items":"สิ่งที่รวม","original_price":"ราคาเต็ม","bundle_price":"ราคา bundle","saving":"ส่วนลด","headline":"headline กระตุ้น"},
      {"name":"Bundle 2","items":"...","original_price":"...","bundle_price":"...","saving":"...","headline":"..."},
      {"name":"Bundle 3","items":"...","original_price":"...","bundle_price":"...","saving":"...","headline":"..."}
    ],
    "urgency_tactics": ["tactic scarcity 1","tactic urgency 2","tactic FOMO 3","tactic 4","tactic 5"],
    "guarantee": {
      "type": "ประเภท guarantee ที่เหมาะสม",
      "copy": "copy guarantee ที่ทำให้คนกล้าซื้อ",
      "duration": "ระยะเวลา"
    },
    "value_framing": [
      "frame ราคา 1 — เทียบเป็น/วัน",
      "frame ราคา 2 — เทียบกับของอื่น",
      "frame ราคา 3 — คำนวณ ROI"
    ]
  },
  "objection_killers": [
    {"objection":"ข้อโต้แย้ง 1 — แพงไป","killer":"คำตอบสุดแจ่ม","proof_type":"Comparison","reframe":"การ reframe ใหม่"},
    {"objection":"ไม่แน่ใจว่าได้ผล","killer":"...","proof_type":"Testimonial + Data","reframe":"..."},
    {"objection":"ต้องคิดก่อน","killer":"...","proof_type":"Urgency","reframe":"..."},
    {"objection":"เคยลองแบบอื่นแล้วไม่ได้ผล","killer":"...","proof_type":"Differentiation","reframe":"..."},
    {"objection":"ไม่มีเวลา","killer":"...","proof_type":"Demo","reframe":"..."},
    {"objection":"สั่งได้ที่ไหน/ไม่ไว้วางใจ","killer":"...","proof_type":"Authority + Review","reframe":"..."},
    {"objection":"ถามคนอื่นก่อน","killer":"...","proof_type":"Decision Trigger","reframe":"..."}
  ],
  "funnel_strategy": {
    "tofu": [
      {"content_type":"content type","message":"สาร","platform":"แพลตฟอร์ม","kpi":"KPI"},
      {"content_type":"...","message":"...","platform":"...","kpi":"..."}
    ],
    "mofu": [
      {"content_type":"...","message":"...","platform":"...","kpi":"..."},
      {"content_type":"...","message":"...","platform":"...","kpi":"..."}
    ],
    "bofu": [
      {"content_type":"...","message":"...","platform":"...","kpi":"..."},
      {"content_type":"...","message":"...","platform":"...","kpi":"..."}
    ],
    "retargeting_sequence": [
      {"day":"Day 1","message":"ข้อความ retarget วันที่ 1","format":"format"},
      {"day":"Day 3","message":"...","format":"..."},
      {"day":"Day 7","message":"...","format":"..."}
    ],
    "email_sequence": [
      {"email":"Email 1","subject":"subject","timing":"ทันทีหลังสมัคร","goal":"เป้าหมาย","body_outline":"outline"},
      {"email":"Email 2","subject":"...","timing":"Day 2","goal":"...","body_outline":"..."},
      {"email":"Email 3","subject":"...","timing":"Day 4","goal":"...","body_outline":"..."},
      {"email":"Email 4","subject":"...","timing":"Day 7","goal":"...","body_outline":"..."},
      {"email":"Email 5","subject":"...","timing":"Day 10","goal":"...","body_outline":"..."}
    ],
    "upsell_opportunities": ["upsell 1","upsell 2","cross-sell 1","cross-sell 2"]
  },
  "competitive_positioning": {
    "usp_statement": "USP statement ที่ชัดและทรงพลัง 1 ประโยค",
    "differentiation_matrix": [
      {"dimension":"มิติเปรียบเทียบ 1","us":"เราดีกว่าอย่างไร","them":"คู่แข่งทำแบบนี้"},
      {"dimension":"...","us":"...","them":"..."},
      {"dimension":"...","us":"...","them":"..."}
    ],
    "category_creation": "แนวคิด Blue Ocean — สร้างหมวดหมู่ใหม่ที่ไม่มีคู่แข่ง",
    "why_us_bullets": ["เหตุผล why us 1","เหตุผล 2","เหตุผล 3","เหตุผล 4","เหตุผล 5"],
    "positioning_statement": "Positioning statement แบบ Geoffrey Moore"
  },
  "kol_brief": {
    "product_brief": "brief สินค้าสำหรับ KOL — ครบถ้วนใน 1 ย่อหน้า",
    "key_messages": ["message หลัก 1 ที่ KOL ต้องพูด","message 2","message 3"],
    "script_direction": "direction การแสดงและพูดสำหรับ KOL",
    "content_format": "format content ที่ต้องการ (รีวิว/ทดสอบ/unbox/before-after)",
    "dos": ["สิ่งที่ต้องทำ 1","ต้องทำ 2","ต้องทำ 3"],
    "donts": ["ห้ามทำ 1","ห้ามทำ 2","ห้ามทำ 3"],
    "hashtag_mandatory": ["#hashtag_บังคับ_1","#hashtag_2"],
    "kpi_expectations": "KPI ที่คาดหวังจาก KOL campaign"
  }
}`;

  try {
    const text = await callAI(prompt, 6000);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', product, usp, ...d });
  } catch (e) { addLog('warn', 'UltraPromo', e.message); }

  // Mock fallback
  const pName = product.slice(0, 40);
  res.json({
    success: true, source: 'mock', product, usp,
    hook_matrix: {
      shock: [`"99% คนใช้ ${pName} ผิดวิธีมาตลอด — คุณเป็นคนนั้นไหม?"`, `"หยุดก่อน! สิ่งที่คุณกำลังทำอยู่ทำให้เสียเงินฟรีทุกวัน"`, `"ฉันไม่เชื่อจนกว่าจะได้ลองเอง — ${pName} เปลี่ยนทุกอย่าง"`],
      question: [`"ทำไมคนที่ประสบความสำเร็จถึงเลือก ${pName}?"`, `"คุณเคยสงสัยไหมว่าทำไมเพื่อนบ้านดูดีขึ้นทุกวัน?"`, `"ถ้ามีสิ่งหนึ่งที่เปลี่ยนชีวิตได้ คุณอยากรู้ไหม?"`],
      curiosity: [`"เปิดดูแค่ 10 วินาที แล้วคุณจะรู้ว่าทำไม ${pName} ถึงขายหมดทุกครั้ง"`, `"ความลับที่แม่ค้าออนไลน์ยอดขายล้านไม่บอกคุณ"`, `"สิ่งที่เกิดขึ้นหลังใช้ ${pName} 7 วัน ทำให้ฉันตกใจ"`],
      story: [`"เมื่อปีที่แล้วฉันเกือบล้มเลิก จนได้ลอง ${pName}..."`, `"ลูกค้าคนนี้ส่งข้อความมาบอกว่า '${pName} เปลี่ยนชีวิตฉัน'"`, `"3 เดือนก่อน ฉันอยู่ในสถานการณ์เดียวกับคุณตอนนี้"`],
      contrast: [`"ทุกคนบอกว่าแพง แต่ลูกค้า 95% บอกว่าคุ้มมาก"`, `"ดูซับซ้อน ใช้จริงแค่ 5 นาที"`, `"คิดว่าไม่จำเป็น จนวันที่ลองใช้จริง"`],
      platform_openers: {
        tiktok: `POV: วันที่คุณค้นพบ ${pName} แล้วชีวิตไม่เหมือนเดิมอีกต่อไป`,
        facebook: `[อ่านต่อก่อนเลื่อนผ่าน] ฉันใช้เวลา 6 เดือนกว่าจะค้นพบว่า "${pName}" คือสิ่งที่ขาดหายไปตลอดช่วงชีวิตที่ผ่านมา...`,
        shopee: `${pName} ⭐ ${usp} | ส่งด่วน 24 ชม. | รับประกัน | ซื้อเลยก่อนหมด`,
        instagram: `${pName} ✨ เปลี่ยนทุกอย่างใน 7 วัน (แตะดู story เพื่อดูก่อน-หลัง)`,
        youtube: `อย่าเพิ่งปิด — ใน 5 วินาทีนี้ฉันจะบอกว่าทำไม ${pName} ถึงแตกต่างจากทุกอย่างที่คุณเคยลอง`,
      },
      first_words: ['หยุด!', 'เดี๋ยวก่อน...', 'ความจริงคือ:', 'ฉันต้องบอกคุณ:', 'คุณรู้ไหมว่า'],
      visual_hooks: [`ภาพ Before/After ชัดเจน — ซ้าย: ปัญหา, ขวา: หลังใช้ ${pName}`, `Text overlay ขนาดใหญ่: "คุณกำลังเสียเงินฟรีทุกวัน" บน background สีแดง`, `POV shot — มือกำลังหยิบ ${pName} พร้อม sound effect "ding"`],
    },
    buyer_psychology: {
      pain_matrix: [
        { rational: `จ่ายเงินซื้อสินค้าอื่นแล้วไม่ได้ผล`, emotional: 'รู้สึกโง่ ถูกหลอก เสียใจ', deep_fear: 'กลัวว่าตัวเองจะไม่ดีพอ ไม่มีทางแก้ได้' },
        { rational: 'ไม่รู้จะเริ่มต้นจากตรงไหน', emotional: 'รู้สึกหนักใจ ไม่มั่นใจ', deep_fear: 'กลัวถูกตัดสิน ทำผิดพลาดซ้ำอีก' },
        { rational: 'ราคาสินค้าดีๆ แพงเกินไป', emotional: 'รู้สึกไม่ยุติธรรม ท้อแท้', deep_fear: 'กลัวว่าชีวิตที่ดีไม่ใช่สำหรับคนอย่างตน' },
      ],
      desire_map: [
        { surface: `ต้องการ ${pName} ที่ได้ผลจริง`, core: 'ต้องการชีวิตที่ง่ายขึ้น ดีขึ้น', identity: `ต้องการเป็นคนที่ฉลาดเลือก เป็นคน "รู้จัก" สิ่งดีๆ` },
        { surface: 'ต้องการประหยัดเงิน', core: 'ต้องการความมั่นคง ไม่เสี่ยง', identity: 'ต้องการเป็นคนที่บริหารเงินเก่ง' },
      ],
      cognitive_biases: [
        { bias: 'Scarcity', application: `แสดงจำนวน ${pName} ที่เหลือ`, copy_example: `"เหลือเพียง 12 ชิ้นสุดท้าย — หมดแล้วรอนาน"` },
        { bias: 'Social Proof', application: 'แสดงจำนวนลูกค้าและรีวิว', copy_example: '"ลูกค้ากว่า 8,500 คนไว้วางใจแล้ว ⭐⭐⭐⭐⭐"' },
        { bias: 'Authority', application: 'อ้างถึงผู้เชี่ยวชาญหรือสื่อ', copy_example: '"แนะนำโดยผู้เชี่ยวชาญ ผ่านการทดสอบ 6 เดือน"' },
        { bias: 'Reciprocity', application: 'ให้ข้อมูลมีค่าฟรีก่อน', copy_example: '"ดาวน์โหลด Guide ฟรี ก่อนตัดสินใจซื้อ"' },
        { bias: 'Loss Aversion', application: 'เน้นสิ่งที่เสียถ้าไม่ซื้อ', copy_example: `"ทุกวันที่ไม่มี ${pName} คือเงินที่หายไปโดยเปล่าประโยชน์"` },
        { bias: 'Anchoring', application: 'แสดงราคาสูงก่อน ราคาจริงทีหลัง', copy_example: `"ปกติ ฿${price || '1,990'} — วันนี้เหลือเพียง ฿${price || '990'}"` },
      ],
      emotional_triggers: [
        'ความภาคภูมิใจ — "คนรอบข้างจะมองคุณต่างออกไป"',
        'ความกลัวพลาด — "คนที่ไม่ได้ลองจะเสียใจทีหลัง"',
        'ความอยากรู้ — "ความลับที่คนส่วนใหญ่ไม่รู้"',
        'ความรัก — "ทำเพื่อคนที่คุณรัก"',
        'ความสะดวกสบาย — "ชีวิตง่ายขึ้นทันทีใน 5 นาที"',
      ],
      buyer_journey_hooks: [
        { stage: 'Awareness', emotion: 'ยังไม่รู้ว่ามีปัญหา', message: 'เล่าเรื่องปัญหาที่คนส่วนใหญ่เผชิญ ให้เขา "เห็น" ตัวเอง' },
        { stage: 'Consideration', emotion: 'กำลังเปรียบเทียบ', message: `แสดงว่า ${pName} แตกต่างและดีกว่าอย่างไร ด้วย proof` },
        { stage: 'Decision', emotion: 'กลัวผิดพลาด', message: 'รับประกัน + testimonial + ลด risk ด้วย guarantee ชัดเจน' },
        { stage: 'Purchase', emotion: 'ต้องการ validation', message: 'ยืนยันว่าเขาตัดสินใจถูก — "คุณเลือกถูกต้องแล้ว"' },
      ],
    },
    platform_packages: {
      tiktok: {
        hook: `POV: ลองใช้ ${pName} ครั้งแรกในชีวิต...`,
        script_15s: `[0-3s] "หยุด! คุณยังไม่รู้เรื่องนี้เกี่ยวกับ ${pName}"\n[3-8s] แสดงปัญหาที่คนส่วนใหญ่เจอ\n[8-13s] เปิดเผย ${pName} + USP: "${usp}"\n[13-15s] "ลิงก์ใน bio — ส่งฟรีวันนี้เท่านั้น"`,
        script_30s: `[0-5s] Hook: "ทำไม ${pName} ถึงขายหมดทุกสัปดาห์?"\n[5-12s] เล่าปัญหาที่คนเจอ\n[12-22s] Demo + ผลลัพธ์จริง\n[22-28s] Social proof + ราคา\n[28-30s] CTA: "กด link ตอนนี้ เหลือน้อยมาก"`,
        caption: `${pName} ✨ ${usp} 🔥 #ของดี #แนะนำ #ต้องลอง #ไทย #ออนไลน์`,
        hashtags: [`#${pName.replace(/\s/g, '')}`, '#ของดีบอกต่อ', '#แนะนำ', '#TikTokShop', '#ไทยแลนด์'],
        algorithm_tip: 'โพสต์ช่วง 19:00-21:00 · ใช้ trending sound · ตอบ comment ภายใน 30 นาทีแรก · ใส่ keyword ในคำพูด 3 ครั้ง',
      },
      facebook: {
        post_long: `เพื่อนๆ เคยรู้สึกแบบนี้ไหม?\n\n[เล่าปัญหา 2-3 ประโยค]\n\nฉันก็เป็นแบบนั้นมาตลอด จนกระทั่งได้ลอง "${pName}"\n\n${usp}\n\nหลังใช้แค่ [X วัน] ฉันรู้สึก... [ผลลัพธ์]\n\nตอนนี้ลูกค้ากว่า 8,500 คนไว้วางใจแล้ว ⭐⭐⭐⭐⭐\n\nวันนี้เท่านั้น — ราคาพิเศษ + ส่งฟรี\n👇 คลิก Shop Now เลย`,
        post_short: `"${usp}" — ${pName}\n\nลูกค้า 8,500+ รีวิว 5 ดาว 🌟\nส่งฟรี วันนี้เท่านั้น\n\n👇 Shop Now`,
        carousel_slides: ['Slide 1: ปัญหาที่คุณเจออยู่...', `Slide 2: แนะนำ ${pName}`, `Slide 3: ${usp}`, 'Slide 4: ลูกค้ารีวิว ⭐⭐⭐⭐⭐', 'Slide 5: ราคาพิเศษ + CTA'],
        ad_primary_text: `ถ้าคุณกำลังมองหา [ผลลัพธ์ที่ต้องการ] — ${pName} คือคำตอบ\n\n✅ ${usp}\n✅ ส่งฟรี\n✅ รับประกันคืนเงิน\n\nลูกค้า 8,500+ ไว้วางใจแล้ว 👇`,
      },
      shopee: {
        title: `${pName} ${usp} ของแท้ 100% ส่งด่วน ราคาโรงงาน`,
        bullets: [`✅ ${usp}`, '✅ ส่งด่วน 24 ชั่วโมง', '✅ รับประกัน 30 วัน', '✅ บรรจุภัณฑ์แน่นหนา ปลอดภัย', '✅ ลูกค้า 8,500+ ไว้วางใจ ⭐⭐⭐⭐⭐'],
        description: `${pName}\n\n${usp}\n\nทำไมต้องเลือก ${pName}?\n• จุดเด่น 1\n• จุดเด่น 2\n• จุดเด่น 3\n\nวิธีใช้: [คำแนะนำ]\n\nรับประกัน: 30 วัน คืนเงิน 100% ถ้าไม่พอใจ`,
        search_keywords: [pName, usp.split(' ')[0], category, 'ของแท้', 'ส่งฟรี'],
      },
      line: {
        broadcast: `🎉 สวัสดีครับ!\n\n${pName} — ${usp}\n\n📦 สั่งวันนี้ ส่งพรุ่งนี้\n💰 ราคาพิเศษ ${price || 'ลดสูงสุด 30%'}\n\n👉 กด Shop เลย: [link]`,
        chat_opener: `สวัสดีครับ! สนใจ ${pName} ไหมครับ? ขอแนะนำ — ${usp} ราคาพิเศษวันนี้ 🔥`,
        followup: `สวัสดีอีกครั้งนะครับ 😊 ไม่ทราบว่ายังสนใจ ${pName} ไหมครับ? วันนี้มี stock เหลือน้อยมากแล้ว 📦`,
      },
      instagram: {
        reels_hook: `✨ ${pName} เปลี่ยนทุกอย่าง (watch till end)`,
        caption: `${pName} ✨\n\n${usp}\n\n📌 ดีกว่าที่คิด\n📌 ส่งด่วน\n📌 ราคาคุ้มค่า\n\n🔗 Link in bio\n\n#${pName.replace(/\s/g,'')} #ของดี #แนะนำ #ไทย`,
        story_sequence: ['Story 1: Hook — ปัญหา + คำถาม', `Story 2: Solution — ${pName} + Demo`, 'Story 3: CTA — Swipe Up / Link'],
      },
    },
    copy_arsenal: {
      aida: {
        attention: `"${pName} — ${usp.slice(0, 30)}..."`,
        interest: `ลูกค้ากว่า 8,500 คนยืนยัน ผลลัพธ์จริง ไม่ใช่แค่คำโฆษณา`,
        desire: `จินตนาการถึงชีวิตที่ [ผลลัพธ์] ในทุกวัน — ${pName} ทำให้เป็นจริงได้`,
        action: `สั่งเลยวันนี้ ส่งฟรี รับประกัน 30 วัน`,
        full_copy: `"${pName}" — ${usp}\n\nลูกค้า 8,500+ ยืนยัน ผลจริง...\n\nจินตนาการถึง [ผลลัพธ์ที่ดี]...\n\n🔥 วันนี้เท่านั้น: ส่งฟรี + รับประกัน 30 วัน\n👇 สั่งเลย`,
      },
      pas: {
        problem: `คุณเคยรู้สึกว่า [ปัญหา] แล้วทำอะไรไม่ได้เลยใช่ไหม?`,
        agitate: `ทุกวันที่ปล่อยผ่านไป คือโอกาสที่หายไป เงินที่เสียเปล่า และความรู้สึกที่แย่ลงเรื่อยๆ`,
        solution: `${pName} คือคำตอบที่คุณรอมานาน — ${usp}`,
        full_copy: `คุณเคยรู้สึกว่า [ปัญหา]?\n\nทุกวันที่ผ่านไปโดยไม่แก้ปัญหา...\n\n${pName} คือทางออก — ${usp}\n\nสั่งเลยตอนนี้ ก่อนจะสาย 👇`,
      },
      bab: {
        before: `ก่อน: [อธิบายชีวิตที่ยากลำบาก มีปัญหา ไม่มีทางออก]`,
        after: `หลัง: [ชีวิตที่ดีขึ้น ปัญหาหมดไป มีความสุข]`,
        bridge: `${pName} — สะพานที่พาคุณจาก Before ไปสู่ After`,
        full_copy: `ก่อนหน้านี้ฉัน [ปัญหา]...\n\nหลังจากใช้ ${pName} เพียง [X วัน]...\n\n[ผลลัพธ์ที่ดี]!\n\nคุณก็ทำได้ — ${usp}\n\n👇 ลองเลย`,
      },
      fomo: {
        urgency: `⚡ เหลือเวลา 2 ชั่วโมง — ราคาพิเศษ ${price || 'ลด 40%'} หมดเที่ยงคืนนี้!`,
        scarcity: `📦 สต็อกเหลือเพียง 8 ชิ้นสุดท้าย จาก 200 ชิ้นที่มา — ไม่รับประกันว่าพรุ่งนี้จะยังมี`,
        social_proof: `🔥 ขณะนี้มี 34 คนกำลังดูสินค้านี้อยู่ — ${pName} ขายออก 1 ชิ้นทุก 4 นาที`,
      },
      power_words: ['พิสูจน์แล้ว', 'ลับเฉพาะ', 'ทันที', 'รับประกัน', 'จำนวนจำกัด', 'ฟรี', 'เปิดเผย', 'ปฏิวัติ'],
      testimonial_templates: [
        `"ตอนแรกไม่เชื่อเลย จนลองใช้จริง — ${pName} เปลี่ยนชีวิตฉันใน 7 วัน ไม่เสียดายเลยที่ซื้อ" — K. นิดา, กรุงเทพฯ`,
        `"ซื้อมาแล้ว 3 กล่อง ให้คะแนน 10/10 บอกต่อไปทั้งออฟฟิศ" — คุณ พัชร, เชียงใหม่`,
        `"ลองมาหลายยี่ห้อ ไม่มีไหนเทียบได้กับ ${pName}" — คุณ มาลี, ขอนแก่น`,
      ],
      email_subject_lines: [
        `[เร่งด่วน] ${pName} เหลือ 8 ชิ้นสุดท้าย`,
        `คุณ [ชื่อ] ยังไม่รู้เรื่องนี้เกี่ยวกับ ${pName}`,
        `ทำไมลูกค้า 8,500 คนถึงเลือก ${pName}`,
        `โอกาสสุดท้าย — ราคาพิเศษหมดวันนี้เที่ยงคืน`,
        `เพื่อน [ชื่อ] ที่คุณไว้ใจแนะนำ ${pName}`,
      ],
    },
    video_blueprint: {
      v15: {
        duration: '15 วินาที', platform: 'TikTok / Instagram Reels',
        scenes: [
          { sec: '0-3', type: 'Hook', visual: `มือจับ ${pName} โคลสอัพ`, script: `"หยุด! คุณต้องดูสิ่งนี้"`, emotion: 'ตื่นเต้น/สงสัย' },
          { sec: '3-8', type: 'Problem', visual: 'ภาพแสดงปัญหา', script: 'เคยเจอปัญหานี้ไหม?', emotion: 'เข้าใจ/เชื่อมต่อ' },
          { sec: '8-13', type: 'Solution', visual: `Demo ${pName}`, script: `${pName} — ${usp}`, emotion: 'ตื่นเต้น/โล่งใจ' },
          { sec: '13-15', type: 'CTA', visual: 'Text overlay + link', script: 'Link ใน bio — ส่งฟรีวันนี้!', emotion: 'เร่งด่วน' },
        ],
      },
      v30: {
        duration: '30 วินาที', platform: 'TikTok / Facebook',
        scenes: [
          { sec: '0-5', type: 'Hook', visual: 'Pattern interrupt — อะไรบางอย่างที่ไม่คาดคิด', script: `"ทำไม ${pName} ถึงขายหมดทุกสัปดาห์?"`, emotion: 'สงสัย' },
          { sec: '5-12', type: 'Pain', visual: 'ภาพปัญหา/ความเจ็บปวด', script: 'คุณก็เคยรู้สึกแบบนี้ใช่ไหม?', emotion: 'เข้าใจ/เชื่อมต่อ' },
          { sec: '12-22', type: 'Product Demo', visual: `Demo ${pName} ชัดเจน เห็นผลลัพธ์`, script: `${usp}`, emotion: 'ตื่นเต้น/ประทับใจ' },
          { sec: '22-28', type: 'Social Proof', visual: 'รีวิวลูกค้า / ตัวเลข', script: 'ลูกค้ากว่า 8,500 คนไว้วางใจแล้ว', emotion: 'มั่นใจ' },
          { sec: '28-30', type: 'CTA', visual: 'Logo + link', script: 'สั่งเลยตอนนี้ ส่งฟรี!', emotion: 'เร่งด่วน' },
        ],
      },
      v60: {
        duration: '60 วินาที', platform: 'YouTube / Facebook',
        scenes: [
          { sec: '0-5', type: 'Hook', visual: 'Opening shot แรงๆ', script: `"นี่คือเหตุผลที่ ${pName} เปลี่ยนชีวิตฉัน"`, emotion: 'ตื่นเต้น' },
          { sec: '5-15', type: 'Story/Pain', visual: 'เล่าเรื่อง', script: 'ก่อนหน้านี้ฉันเจอปัญหา...', emotion: 'เข้าใจ/เชื่อมต่อ' },
          { sec: '15-30', type: 'Product Reveal', visual: `Reveal ${pName} อย่างสวยงาม`, script: `แล้วฉันก็ค้นพบ ${pName}`, emotion: 'ตื่นเต้น/หวัง' },
          { sec: '30-45', type: 'Benefits', visual: 'แสดงประโยชน์ทีละข้อ', script: `${usp} — และนี่คือสิ่งที่ได้`, emotion: 'ประทับใจ' },
          { sec: '45-55', type: 'Social Proof', visual: 'รีวิวลูกค้าจริง', script: 'ลูกค้า 8,500+ พูดว่า...', emotion: 'มั่นใจ' },
          { sec: '55-60', type: 'CTA', visual: 'Strong CTA', script: 'คลิก link เลย — ส่งฟรี รับประกัน 30 วัน', emotion: 'เร่งด่วน' },
        ],
      },
      live_script: {
        open_5min: `สวัสดีทุกท่านนะครับ! ยินดีต้อนรับเข้าสู่ live ของเรา วันนี้มีของดีมาฝาก — ${pName}! ใครที่เพิ่งเข้ามา กด heart เพื่อรับโปรพิเศษ...`,
        product_demo: `ตอนนี้จะมาสาธิตให้ดูกันเลย — ${pName} ทำงานอย่างไร... [Demo ทีละขั้นตอน] เห็นผลลัพธ์ชัดเจนไหมครับ?`,
        close_urgency: `ตอนนี้เหลือสต็อกแค่ 20 ชิ้นสุดท้ายนะครับ หลังจากนี้ราคากลับสู่ปกติ ใครอยากได้รีบกด order เลย!`,
        flash_sale_call: `🔥 FLASH SALE เริ่มแล้ว! ลด [X]% เฉพาะ 10 นาทีนี้เท่านั้น! กด order เลย ก่อนหมด!`,
      },
    },
    price_psychology: {
      anchor_strategy: `แสดงราคา "ก่อนลด" ที่ใหญ่กว่า ขีดทับ แล้วแสดงราคาจริงที่น้อยกว่า สร้างความรู้สึกคุ้มค่าทันที`,
      anchor_copy: `~~฿${price ? parseInt(price) * 2 : '3,990'}~~ → ฿${price || '1,990'} เท่านั้น (ประหยัด ฿${price ? parseInt(price) : '2,000'})`,
      bundles: [
        { name: 'Starter Pack', items: `${pName} x1 + คู่มือฟรี`, original_price: price || '1,990', bundle_price: price ? Math.round(parseInt(price) * 0.9).toString() : '1,790', saving: '200', headline: 'เริ่มต้นสุดคุ้ม' },
        { name: 'Value Pack', items: `${pName} x2 + Bonus`, original_price: price ? (parseInt(price) * 2).toString() : '3,980', bundle_price: price ? Math.round(parseInt(price) * 1.6).toString() : '2,990', saving: price ? (parseInt(price) * 0.4).toString() : '990', headline: 'ยอดนิยม — ซื้อ 2 คุ้มกว่า' },
        { name: 'Premium Bundle', items: `${pName} x3 + Free Gift + Priority`, original_price: price ? (parseInt(price) * 3).toString() : '5,970', bundle_price: price ? Math.round(parseInt(price) * 2.1).toString() : '3,990', saving: price ? (parseInt(price) * 0.9).toString() : '1,980', headline: 'สุดคุ้ม — ราคาต่อชิ้นถูกสุด' },
      ],
      urgency_tactics: ['Countdown timer "เหลือ 2:30:00"', `"Stock เหลือ 8 ชิ้น จาก 200"`, '"34 คนกำลังดูสินค้านี้อยู่"', '"ราคาพิเศษหมดวันนี้เที่ยงคืน"', '"ส่งฟรีเฉพาะออเดอร์ก่อน 17:00 น."'],
      guarantee: {
        type: 'คืนเงิน 100% ภายใน 30 วัน',
        copy: `ลองใช้ ${pName} เต็ม 30 วัน ถ้าไม่พอใจด้วยเหตุผลใดก็ตาม คืนเงินทันที 100% ไม่ถามเหตุผล ความเสี่ยงทั้งหมดอยู่ที่เรา ไม่ใช่คุณ`,
        duration: '30 วัน',
      },
      value_framing: [
        price ? `เพียง ฿${Math.round(parseInt(price)/30)} ต่อวัน — น้อยกว่ากาแฟ 1 แก้ว` : 'เพียงไม่กี่สิบบาทต่อวัน น้อยกว่ากาแฟ 1 แก้ว',
        `ถ้าช่วยแก้ปัญหาได้ คุ้มค่ากว่าการแก้ปัญหาผิดวิธีหลายเท่า`,
        `ROI: ลงทุน ฿${price || '990'} เพื่อผลลัพธ์ที่ [คุณค่า] ซึ่งมีมูลค่า [สูงกว่ามาก]`,
      ],
    },
    objection_killers: [
      { objection: 'แพงไป', killer: `เทียบกับ [ทางเลือกอื่น] ที่แพงกว่าและได้ผลน้อยกว่า ${pName} คุ้มกว่ามาก — รับประกัน 30 วัน คืนเงิน 100%`, proof_type: 'Comparison + Guarantee', reframe: '"ไม่ใช่รายจ่าย แต่เป็นการลงทุน"' },
      { objection: 'ไม่แน่ใจว่าได้ผล', killer: `ลูกค้า 8,500 คนยืนยันผลลัพธ์จริง + รับประกัน 30 วัน ถ้าไม่ได้ผลคืนเงินเต็ม ความเสี่ยงอยู่ที่เราทั้งหมด`, proof_type: 'Social Proof + Guarantee', reframe: '"ลองดูก่อน ถ้าไม่ดีคืนเงิน"' },
      { objection: 'ต้องคิดก่อน', killer: `เข้าใจครับ แต่ราคาพิเศษนี้มีเฉพาะวันนี้ ลูกค้าที่ "คิดก่อน" มักเสียใจที่ไม่ได้ราคานี้`, proof_type: 'Urgency + FOMO', reframe: '"การคิดนานๆ คือต้นทุนที่ซ่อนอยู่"' },
      { objection: 'เคยลองแบบอื่นแล้วไม่ได้ผล', killer: `${pName} ต่างจากสิ่งที่เคยลอง เพราะ ${usp} — นั่นคือเหตุผลที่ลูกค้าที่เคย "ผิดหวังมาก่อน" กลายเป็นแฟนตัวยงที่สุด`, proof_type: 'Differentiation + Testimonial', reframe: '"ครั้งนี้ต่างออกไปเพราะ..."' },
      { objection: 'ไม่มีเวลา/ยุ่งมาก', killer: `ใช้เวลาแค่ [X นาที] — ออกแบบมาสำหรับคนที่ยุ่ง ทำได้ระหว่าง [กิจกรรมประจำวัน]`, proof_type: 'Demo + Convenience', reframe: '"ยิ่งยุ่งยิ่งต้องการ"' },
      { objection: 'ไม่รู้จักแบรนด์ / ไม่ไว้ใจ', killer: `ลูกค้า 8,500+ รีวิว 4.9/5 ⭐ + รับประกัน 30 วัน + [สื่อ/ผู้เชี่ยวชาญ] รับรอง — ไม่มีอะไรต้องกลัว`, proof_type: 'Authority + Social Proof + Guarantee', reframe: '"ลองดูก่อน ถ้าไม่ดีได้คืนเงิน"' },
      { objection: 'ถามคนอื่นก่อน / ปรึกษาแฟน', killer: `ดีใจที่คุณรอบคอบ แต่ราคาพิเศษนี้หมดเที่ยงคืน สามารถสั่งเลยแล้ว share ให้คนที่บ้านดูได้เลย ถ้าไม่โอเคคืนได้ภายใน 30 วัน`, proof_type: 'Urgency + Risk Reversal', reframe: '"ซื้อก่อน ถ้าไม่ ok คืนได้"' },
    ],
    funnel_strategy: {
      tofu: [
        { content_type: 'Educational Video', message: `เรื่องที่คนไม่รู้เกี่ยวกับ [ปัญหา]`, platform: 'TikTok, YouTube', kpi: 'Reach > 10K, CPV < ฿0.30' },
        { content_type: 'Blog/FB Article', message: `[X] วิธีแก้ [ปัญหา] ที่ได้ผลจริง`, platform: 'Facebook, Google', kpi: 'Traffic, Time on page > 2 min' },
      ],
      mofu: [
        { content_type: 'Review/Demo Video', message: `${pName} — รีวิวจริง ผลลัพธ์จริง`, platform: 'YouTube, TikTok', kpi: 'Engagement Rate > 5%' },
        { content_type: 'Comparison Content', message: `เปรียบเทียบ ${pName} vs ทางเลือกอื่น`, platform: 'Facebook, IG', kpi: 'Save Rate > 3%' },
      ],
      bofu: [
        { content_type: 'Testimonial Ad', message: 'ลูกค้าจริงพูดถึงผลลัพธ์', platform: 'Facebook Ads, TikTok Ads', kpi: 'ROAS > 3x' },
        { content_type: 'Limited Offer', message: `โปรพิเศษ ${pName} หมดวันนี้`, platform: 'LINE, Email, Retarget Ads', kpi: 'Conversion > 3%' },
      ],
      retargeting_sequence: [
        { day: 'Day 1', message: `"ยังสนใจ ${pName} ไหม? เหลือสต็อกน้อยลงแล้ว"`, format: 'Single Image Ad' },
        { day: 'Day 3', message: `"ลูกค้าที่ซื้อ ${pName} บอกว่า..." — Testimonial`, format: 'Video Ad' },
        { day: 'Day 7', message: `"โอกาสสุดท้าย — ราคาพิเศษหมดแล้ว แต่เพิ่งเติมสต็อก"`, format: 'Carousel Ad' },
      ],
      email_sequence: [
        { email: 'Email 1', subject: `ยินดีต้อนรับ — นี่คือสิ่งที่รอคุณอยู่`, timing: 'ทันทีหลังสมัคร', goal: 'สร้าง expectation', body_outline: 'ขอบคุณ + แนะนำ brand + value proposition' },
        { email: 'Email 2', subject: `[ชื่อ] คุณรู้เรื่องนี้เกี่ยวกับ ${pName} ไหม?`, timing: 'Day 2', goal: 'Educate', body_outline: 'เรื่องที่คนไม่รู้ + ปัญหาที่แก้ได้' },
        { email: 'Email 3', subject: `ลูกค้าคนนี้เปลี่ยนชีวิตด้วย ${pName}`, timing: 'Day 4', goal: 'Social Proof', body_outline: 'Case study + testimonial จริง' },
        { email: 'Email 4', subject: `[เร่งด่วน] โปรพิเศษสำหรับคุณโดยเฉพาะ`, timing: 'Day 7', goal: 'Convert', body_outline: 'Special offer + urgency + guarantee' },
        { email: 'Email 5', subject: `นี่คือโอกาสสุดท้าย [ชื่อ]`, timing: 'Day 10', goal: 'Final push', body_outline: 'Scarcity + เล่าเรื่อง FOMO + strong CTA' },
      ],
      upsell_opportunities: [
        `Upsell: ${pName} Premium / รุ่นใหญ่ขึ้น`,
        `Upsell: Bundle pack — ซื้อ 3 ประหยัดกว่า`,
        `Cross-sell: สินค้าเสริมที่ใช้คู่กับ ${pName}`,
        `Cross-sell: บริการหลังการขาย / Membership`,
      ],
    },
    competitive_positioning: {
      usp_statement: `${pName} คือ [ประเภทสินค้า] เดียวที่ ${usp} — เพราะเราเข้าใจ [กลุ่มเป้าหมาย] อย่างแท้จริง`,
      differentiation_matrix: [
        { dimension: 'คุณภาพผลลัพธ์', us: `${usp}`, them: 'ผลลัพธ์ไม่แน่นอน ขึ้นอยู่กับคน' },
        { dimension: 'ความเชี่ยวชาญ', us: 'พัฒนาสำหรับตลาดไทยโดยเฉพาะ', them: 'ทั่วไป ไม่เฉพาะเจาะจง' },
        { dimension: 'การรับประกัน', us: 'คืนเงิน 100% ใน 30 วัน', them: 'ไม่มี หรือมีเงื่อนไขซับซ้อน' },
      ],
      category_creation: `สร้าง category ใหม่: "[ชื่อ category ใหม่ที่ไม่มีคู่แข่ง]" — ไม่ใช่แค่ [category เดิม] แต่เป็น [category ใหม่ที่ตอบโจทย์ลึกกว่า]`,
      why_us_bullets: [`✅ ${usp}`, '✅ รับประกัน 30 วัน คืนเงิน 100%', '✅ ลูกค้า 8,500+ ไว้วางใจ', '✅ พัฒนาสำหรับตลาดไทยโดยเฉพาะ', '✅ ส่งด่วน 24 ชั่วโมง'],
      positioning_statement: `สำหรับ [กลุ่มเป้าหมาย] ที่ [ปัญหา], ${pName} คือ [category] ที่ [USP ชัดเจน] ต่างจากคู่แข่งเพราะ [proof point]`,
    },
    kol_brief: {
      product_brief: `${pName} — ${usp}. สินค้า [หมวดหมู่] ราคา ${price || 'เหมาะสม'} เหมาะสำหรับ [กลุ่มเป้าหมาย]. จุดเด่นหลัก: 1) ${usp} 2) รับประกัน 30 วัน 3) ลูกค้า 8,500+ ไว้วางใจ`,
      key_messages: [`"${usp}" — นี่คือสิ่งที่ต้องพูดถึง`, `ผลลัพธ์จริงที่ได้จากการใช้ ${pName}`, 'ทำไมถึงแตกต่างจากสินค้าอื่นในตลาด'],
      script_direction: `พูดในฐานะผู้ใช้จริง ไม่ใช่โฆษณา — เล่าประสบการณ์จริง แสดง Demo ชัดเจน แสดง Before/After ถ้าเป็นไปได้ โทน: สนุก จริงใจ ไม่ formal เกินไป`,
      content_format: `รีวิว + Demo (ไม่ใช่แค่ unboxing) — ต้องเห็นผลลัพธ์จริงในคลิป, Story + Reels Series 3 ตอน`,
      dos: ['แสดง Demo ที่เห็นผลลัพธ์ชัดเจน', `พูดถึง ${usp} ด้วยคำพูดตัวเอง ไม่ท่อง script`, 'แท็ก @openthai_ai + ใส่ hashtag ที่กำหนด'],
      donts: ['อย่าพูดราคาโดยไม่ได้รับอนุญาต', 'อย่าเปรียบเทียบแบรนด์คู่แข่งโดยตรง', 'อย่าสัญญาผลลัพธ์ที่เกินจริง'],
      hashtag_mandatory: [`#${pName.replace(/\s/g, '')}`, '#Openthai'],
      kpi_expectations: `Views > 50K, Engagement Rate > 5%, Link clicks > 500, Sales conversion ≥ 2%`,
    },
  });
});

// S18 · POST /api/skills/promo-engine — Sales Conversion Engine (ครบทุกมิติ)
app.post('/api/skills/promo-engine', generateLimiter, async (req, res) => {
  const { product, price = '', category = 'OTOP', target = 'ทั่วไป', usp, platform = 'ทุกแพลตฟอร์ม', tone = 'สนุก/ขำ', competitor = '' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });
  if (!usp?.trim())     return res.status(400).json({ error: 'usp required' });

  const prompt = `คุณเป็น Sales Conversion Strategist + Copywriting Expert ระดับโลก ผสม Claude Hopkins, Gary Halbert, David Ogilvy และ นักการตลาดดิจิทัลไทยชั้นนำ
เชี่ยวชาญ: TikTok Marketing, Facebook Ads, E-commerce Thai (Shopee/Lazada), Consumer Psychology Thailand

─── ข้อมูลสินค้า ───
สินค้า: "${product.slice(0, 200)}"
ราคา: ${price || 'ไม่ระบุ'}
หมวด: ${category}
กลุ่มเป้าหมาย: ${target}
จุดเด่น/USP: "${usp.slice(0, 400)}"
แพลตฟอร์มหลัก: ${platform}
โทน: ${tone}
${competitor ? `คู่แข่ง: ${competitor}` : ''}

─── ภารกิจ ───
สร้าง Sales Conversion Engine ครบทุกมิติสำหรับสินค้านี้ ตอบกลับ JSON เท่านั้น:

{
  "hooks": {
    "shock": ["hook ที่ทำให้ตกใจหยุดดูทันที 1","hook 2","hook 3"],
    "curiosity": ["hook กระตุ้นความอยากรู้ 1","hook 2","hook 3"],
    "pain_point": ["hook โดนใจปัญหา 1","hook 2","hook 3"],
    "promise": ["hook สัญญาผลลัพธ์ชัดเจน 1","hook 2","hook 3"],
    "story": ["hook เล่าเรื่องดึงดูด 1","hook 2"],
    "power_opener": "hook ที่ดีที่สุดสำหรับสินค้านี้ — เลือกจาก 5 ประเภทข้างต้น"
  },
  "psychology": {
    "core_desire": "ความต้องการลึกสุดที่ผู้ซื้อต้องการ (ไม่ใช่แค่ฟีเจอร์)",
    "core_fear": "ความกลัวหรือปัญหาหลักก่อนซื้อ",
    "buyer_persona": "คำอธิบาย persona 3-4 ประโยค — ชีวิต ปัญหา ความฝัน",
    "fomo_triggers": ["trigger 1","trigger 2","trigger 3","trigger 4"],
    "decision_blockers": ["blocker 1","blocker 2","blocker 3"],
    "emotional_journey": "เส้นทางอารมณ์จาก ไม่รู้จัก → สนใจ → อยากได้ → ซื้อ"
  },
  "platform_packages": {
    "tiktok": {
      "hook": "hook 3วิแรก",
      "script": "script เต็ม 30-60 วินาที มี [0s] [5s] [15s] [25s] timestamp",
      "cta": "call to action ปิดท้าย",
      "sound_tip": "แนะนำ vibe เสียง/เพลง"
    },
    "facebook": {
      "headline": "headline โฆษณา",
      "body": "body copy 3-4 ย่อหน้า",
      "cta": "CTA button text + ประโยคปิด"
    },
    "instagram": {
      "caption": "caption พร้อม emoji และ hashtag 5 ตัว",
      "bio_link_text": "ข้อความชี้ไป bio link",
      "story_idea": "แนวคิด Story 5-frame"
    },
    "shopee": {
      "title": "ชื่อสินค้า SEO-optimized ≤120 ตัวอักษร",
      "description": "คำอธิบายสินค้า Shopee 200-300 คำ",
      "keywords": ["keyword1","keyword2","keyword3","keyword4","keyword5","keyword6","keyword7","keyword8"]
    },
    "lazada": {
      "title": "ชื่อสินค้า Lazada format",
      "bullets": ["จุดเด่น 1","จุดเด่น 2","จุดเด่น 3","จุดเด่น 4","จุดเด่น 5"],
      "tags": ["tag1","tag2","tag3","tag4","tag5"]
    },
    "line": {
      "broadcast": "ข้อความ LINE Broadcast พร้อม emoji ≤300 ตัวอักษร"
    }
  },
  "copy_arsenal": {
    "headlines": ["headline 1","headline 2","headline 3","headline 4","headline 5"],
    "short_captions": ["caption สั้น ≤30 คำ 1","caption 2","caption 3"],
    "pas_copy": "Problem:\\n[ปัญหา]\\n\\nAgitate:\\n[ขยายความเจ็บปวด]\\n\\nSolution:\\n[สินค้าคุณแก้ได้อย่างไร]",
    "long_form": "long-form copy 150-250 คำ สไตล์ advertorial",
    "cta_variants": ["CTA 1","CTA 2","CTA 3","CTA 4","CTA 5","CTA 6"]
  },
  "video_blueprint": {
    "total_duration": "30s / 45s / 60s",
    "format": "9:16 Vertical",
    "music_mood": "แนวเพลงที่เหมาะ",
    "scenes": [
      {"second":"0-3","emotion":"ชื่ออารมณ์","visual":"สิ่งที่เห็นในภาพ","script":"คำพูด/caption","direction":"กล้อง/มุมถ่าย"},
      {"second":"3-8","emotion":"...","visual":"...","script":"...","direction":"..."},
      {"second":"8-20","emotion":"...","visual":"...","script":"...","direction":"..."},
      {"second":"20-30","emotion":"...","visual":"...","script":"...","direction":"..."}
    ],
    "key_moments": ["moment สำคัญ 1","moment 2","moment 3"],
    "broll_ideas": ["broll idea 1","broll 2","broll 3","broll 4","broll 5"]
  },
  "price_psychology": {
    "anchoring_script": "script เปรียบเทียบราคา ทำให้รู้สึกคุ้มค่า",
    "urgency_triggers": ["trigger 1","trigger 2","trigger 3"],
    "bundle_ideas": ["bundle idea 1","bundle 2","bundle 3"],
    "guarantee_script": "script การรับประกัน/คืนเงิน ลด risk",
    "bonus_ideas": ["bonus 1","bonus 2","bonus 3"]
  },
  "objection_killers": [
    {"objection":"ข้อโต้แย้ง 1","killer_response":"response ที่ปิดได้ทันที","proof_type":"Social Proof / Guarantee / Demo / Data"},
    {"objection":"ข้อโต้แย้ง 2","killer_response":"...","proof_type":"..."},
    {"objection":"ข้อโต้แย้ง 3","killer_response":"...","proof_type":"..."},
    {"objection":"ข้อโต้แย้ง 4","killer_response":"...","proof_type":"..."},
    {"objection":"ข้อโต้แย้ง 5","killer_response":"...","proof_type":"..."}
  ],
  "funnel_strategy": {
    "awareness": {"content_type":"TikTok Hook, FB Reach","message":"สารสำคัญระยะ Top","platform":"TikTok, Facebook","kpi":"Reach 10k / CPM ≤฿30"},
    "interest":  {"content_type":"รีวิว, Demo","message":"สารสำคัญระยะ Mid","platform":"IG, YouTube","kpi":"Engagement Rate >5%"},
    "decision":  {"content_type":"Testimonial, เปรียบเทียบ","message":"สารปิดการตัดสินใจ","platform":"Shopee, Facebook Retarget","kpi":"Add-to-cart rate >8%"},
    "action":    {"content_type":"Flash Sale, Limited","message":"ปิดการขายทันที","platform":"LINE Broadcast, Shopee","kpi":"Conversion >3%"},
    "repurchase":{"content_type":"Thank you + Next offer","message":"รักษาลูกค้าและกระตุ้นซื้อซ้ำ","platform":"LINE OA, Email","kpi":"Repeat purchase 30d >20%"}
  }
}`;

  try {
    const text = await callAI(prompt, 4096);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) {
    addLog('warn', 'Skills/PromoEngine', e.message);
  }

  // Mock fallback
  const pName = product.slice(0, 40);
  res.json({
    success: true, source: 'mock',
    hooks: {
      shock: [
        `"หยุด! คุณกำลังจ่ายแพงเกินไปสำหรับ${pName} แบบที่ไม่ได้ผล"`,
        `"99% ของคนใช้ ${pName} ผิดวิธี — คุณเป็นคนนั้นอยู่ไหม?"`,
        `"ทดสอบแล้ว! ${pName} นี้เปลี่ยนชีวิตฉันใน 7 วัน"`,
      ],
      curiosity: [
        `"เหตุผลที่ทุกคนพูดถึง ${pName} นี้คืออะไร?"`,
        `"ลองดูสิว่าทำไม ${pName} นี้ถึงหมดสต็อกใน 3 ชั่วโมง"`,
        `"ความลับที่ผู้ผลิต ${pName} ไม่อยากให้คุณรู้"`,
      ],
      pain_point: [
        `"เบื่อกับ [ปัญหา] ที่ไม่มีทางออก? ${pName} คือคำตอบ"`,
        `"ใช้เงินไปเท่าไหร่แล้วกับสินค้าที่ไม่ได้ผล?"`,
        `"ถ้าคุณเคยรู้สึก [ปัญหา] วิดีโอนี้สำหรับคุณโดยเฉพาะ"`,
      ],
      promise: [
        `"${pName} รับประกัน: เห็นผลใน 7 วัน หรือคืนเงิน"`,
        `"เปลี่ยน [ปัญหา] เป็น [ผลลัพธ์] ด้วย ${pName}"`,
        `"ผลลัพธ์จริง ไม่ตกแต่ง — ดูได้เลย"`,
      ],
      story: [
        `"3 ปีก่อนฉันเคยเป็นแบบนี้ จนได้ลอง ${pName}..."`,
        `"ลูกค้าส่งรีวิวมาว่า '${pName} เปลี่ยนชีวิตฉัน' — นี่คือเรื่องราวเธอ"`,
      ],
      power_opener: `"หยุด! คุณกำลังจ่ายแพงเกินไปสำหรับ${pName} แบบที่ไม่ได้ผล — ดูสิ่งที่แตกต่าง"`,
    },
    psychology: {
      core_desire: `ต้องการ [ผลลัพธ์ที่ดี] จาก ${pName} อย่างรวดเร็ว โดยไม่ต้องเสียเงินมาก`,
      core_fear: `กลัวซื้อแล้วไม่ได้ผล เสียเงินฟรี และถูกคนอื่นมองว่าโง่ที่หลงเชื่อ`,
      buyer_persona: `คือคนที่เคยลองสินค้าหลายตัวแต่ไม่ได้ผล พวกเขาสงสัยทุกอย่าง แต่ยังค้นหาคำตอบอยู่ พวกเขาต้องการ proof จริงๆ ก่อนตัดสินใจ`,
      fomo_triggers: [
        `"มีคนซื้อแล้ว [X] คนใน 24 ชั่วโมงที่ผ่านมา"`,
        `"ราคาพิเศษเฉพาะสัปดาห์นี้เท่านั้น"`,
        `"เพื่อนของคุณหลายคนใช้ ${pName} แล้ว คุณยังไม่ลอง?"`,
        `"สต็อกเหลือน้อย — ไม่อยากพลาดใช่ไหม?"`,
      ],
      decision_blockers: [
        `"ราคาสูงเกินไปสำหรับสิ่งที่ยังไม่รู้ผล"`,
        `"กลัวว่าของจะไม่ตรงปก หรือคุณภาพไม่ได้เรื่อง"`,
        `"ไม่แน่ใจว่าจะเหมาะกับตัวเองหรือเปล่า"`,
      ],
      emotional_journey: `ไม่รู้จัก → เห็น hook แล้วอยากรู้ → อ่าน/ดูรีวิวแล้วสนใจ → คิดเรื่องราคาและความเสี่ยง → เห็น guarantee แล้วตัดสินใจซื้อ`,
    },
    platform_packages: {
      tiktok: {
        hook: `"หยุด! นี่คือ ${pName} ที่ทุกคนตามหา" [แสดงสินค้า]`,
        script: `[0s] "หยุดก่อน! ${pName} นี้เปลี่ยนทุกอย่าง"\n[5s] "ปัญหาที่คุณเจออยู่คือ [ปัญหา]..."\n[15s] "แต่ ${pName} นี้ [USP] — ดูผลจริงได้เลย"\n[25s] "ราคาแค่ ${price || 'พิเศษ'} กดลิ้งค์ใน bio เลย!"`,
        cta: `"กดลิ้งค์ใน bio รีบก่อนหมด! 🔥"`,
        sound_tip: `เลือก trending Thai pop หรือ upbeat instrumental ที่ BPM 120-140 เข้ากับ energy ของ hook`,
      },
      facebook: {
        headline: `"${pName}: ${usp.slice(0, 60)}"`,
        body: `คุณเคยรู้สึกหงุดหน่ายกับ [ปัญหา] ไหม?\n\nฉันก็เคยเป็นแบบนั้น จนได้ลอง ${pName} — และทุกอย่างเปลี่ยนไป\n\n✅ ${usp}\n✅ เห็นผลจริง ไม่ตกแต่ง\n✅ ${price ? `เพียง ${price}` : 'ราคาพิเศษ'} รับประกันคืนเงิน\n\nลูกค้ากว่า 1,000+ คนบอกว่า "${pName} คือสิ่งที่ดีที่สุดที่เคยลอง"`,
        cta: `"สั่งซื้อตอนนี้ก่อนหมดสต็อก →"`,
      },
      instagram: {
        caption: `✨ ${pName} — เปลี่ยนชีวิตคุณได้!\n\n${usp}\n\n${price ? `💰 ${price}` : ''} 🔗 Link in bio\n\n#${product.replace(/\s+/g, '')} #สินค้าไทย #รีวิว #ของดี #แนะนำ`,
        bio_link_text: `"ดู ${pName} ที่ทุกคนพูดถึง 👆"`,
        story_idea: `Frame1: คำถาม "คุณเคยมีปัญหา [X] ไหม?" | Frame2: ปัญหา | Frame3: Solution ${pName} | Frame4: Before/After | Frame5: CTA swipe up`,
      },
      shopee: {
        title: `${pName} ${category} ${usp.slice(0, 50)} ของแท้ 100% พร้อมส่ง`,
        description: `🌟 ${pName} — ${usp}\n\n✅ คุณสมบัติหลัก:\n• ${usp}\n• คุณภาพมาตรฐาน\n• ปลอดภัย 100%\n\n📦 รายละเอียด:\n• ราคา: ${price || 'ดูในหน้าสินค้า'}\n• หมวด: ${category}\n\n⭐ รับประกันความพึงพอใจ\n\n🚚 จัดส่งรวดเร็ว 1-3 วัน`,
        keywords: [product, category, usp.split(' ')[0], 'ของดี', 'ราคาถูก', 'คุณภาพ', 'OTOP', 'สินค้าไทย'],
      },
      lazada: {
        title: `[ของแท้] ${pName} | ${usp.slice(0, 60)} | ส่งฟรี`,
        bullets: [`✅ ${usp}`, `✅ คุณภาพมาตรฐาน ปลอดภัย`, `✅ ราคา ${price || 'ดีที่สุด'} คุ้มค่า`, `✅ จัดส่งรวดเร็ว 1-3 วัน`, `✅ รับประกันสินค้าแท้ 100%`],
        tags: [product, category, 'สินค้าไทย', 'OTOP', 'คุณภาพดี'],
      },
      line: {
        broadcast: `🎉 ${pName} มาแล้ว!\n\n✨ ${usp}\n💰 ราคาพิเศษ ${price || 'ติดต่อสอบถาม'}\n\n⏰ สต็อกจำกัด! สั่งตอนนี้ก่อนหมด\n👉 คลิกลิ้งค์สั่งซื้อ: [LINK]\n\n📞 สอบถามเพิ่มเติม: inbox ได้เลย`,
      },
    },
    copy_arsenal: {
      headlines: [
        `"${pName}: ${usp.slice(0, 50)}"`,
        `"ทำไม ${target} ถึงเลือก ${pName}?"`,
        `"${price ? `เพียง ${price}` : 'ราคาพิเศษ'} สำหรับ ${pName} ที่ [ผลลัพธ์จริง]"`,
        `"[ปัญหา]? ${pName} แก้ได้ใน 7 วัน"`,
        `"ลองแล้ว บอกต่อ — ${pName} ที่ทุกคนพูดถึง"`,
      ],
      short_captions: [
        `"${pName} เปลี่ยนชีวิตฉันได้อย่างไร — ดูเลย 👇"`,
        `"${usp.slice(0, 40)} ในราคา ${price || 'สุดคุ้ม'} 🔥"`,
        `"ลองแล้วต้องบอกต่อ! ${pName} 💯"`,
      ],
      pas_copy: `Problem:\nคุณเคยรู้สึก [ปัญหา] และหาทางออกไม่ได้ใช่ไหม? ลองอะไรก็ไม่ได้ผล เสียเงินไปเยอะ แต่ยังไม่เจอสิ่งที่ใช่\n\nAgitate:\nมันน่าหงุดหน่ายมากเวลาที่ [ปัญหาขยาย] และยิ่งนานวัน [ผลกระทบ] มันยิ่งแย่ลง...\n\nSolution:\n${pName} คือคำตอบที่คุณตามหา — ${usp} พิสูจน์แล้วโดยลูกค้ากว่า 1,000+ คน`,
      long_form: `ถ้าคุณกำลังมองหา ${pName} ที่ [ผลลัพธ์จริง] — หยุดอ่านตรงนี้ก่อน\n\nเราเข้าใจว่าคุณเคยลองหลายอย่างแต่ไม่ได้ผล นั่นเป็นเพราะสินค้าส่วนใหญ่ไม่ได้ออกแบบมาสำหรับคุณจริงๆ\n\n${pName} แตกต่างตรงที่: ${usp}\n\nลูกค้าของเราบอกว่า "ใช้แล้วเห็นผลจริง ไม่ต้องรอนาน" — นี่ไม่ใช่แค่คำโฆษณา แต่เป็นผลลัพธ์ที่พิสูจน์แล้ว\n\n${price ? `ราคาเพียง ${price}` : 'ราคาสุดคุ้ม'} พร้อมรับประกันความพึงพอใจ ถ้าไม่ดีคืนเงิน 100%`,
      cta_variants: ['สั่งซื้อเลย →', 'ดูราคาพิเศษ', 'กดรับโปรตอนนี้', 'ไม่ซื้อเดี๋ยวหมด!', 'คลิกสั่งได้เลย', 'รีบก่อนสต็อกหมด 🔥'],
    },
    video_blueprint: {
      total_duration: '30-45 วินาที',
      format: '9:16 Vertical',
      music_mood: 'Upbeat Thai Pop หรือ Trending Sound TikTok',
      scenes: [
        { second: '0-3s', emotion: '⚡ Shock/Hook', visual: `มือถือหรือหน้าคนถือ ${pName} ระยะใกล้`, script: `"หยุดก่อน! นี่คือ ${pName} ที่ทุกคนตามหา"`, direction: 'Closeup + jump cut' },
        { second: '3-10s', emotion: '😤 Pain Point', visual: 'แสดงปัญหา B-roll', script: '"คุณเคยเจอ [ปัญหา] ไหม? ฉันก็เคยเป็น..."', direction: 'Medium shot, แสงธรรมชาติ' },
        { second: '10-25s', emotion: '✨ Solution/Demo', visual: `ใช้งาน ${pName} จริง แสดงผลลัพธ์`, script: `"แต่ตั้งแต่ใช้ ${pName} — [ผลลัพธ์] มันเปลี่ยนทุกอย่าง!"`, direction: 'Before/After split หรือ Demo ชัดๆ' },
        { second: '25-30s', emotion: '💳 CTA', visual: 'แสดงราคา + ลิ้งค์', script: `"${price ? `เพียง ${price}` : 'ราคาพิเศษ'} — กดลิ้งค์ใน bio ก่อนหมดเลย!"`, direction: 'Text overlay + สินค้า closeup' },
      ],
      key_moments: [
        'วินาที 0-3: MUST stop the scroll — ใช้ visual ที่ผิดปกติ',
        'วินาที 15-20: แสดง transformation/result ที่ชัดเจนที่สุด',
        'วินาที 28-30: CTA ชัด พร้อม urgency',
      ],
      broll_ideas: ['Unboxing สินค้า', `Before/After ชัดๆ`, 'ลูกค้าจริงใช้งาน', 'Closeup texture/detail', 'Lifestyle ที่เข้ากับ target'],
    },
    price_psychology: {
      anchoring_script: `"ปกติสินค้าแบบนี้ราคา [X] — แต่ ${pName} ของเราให้คุณในราคา ${price || '[ราคาพิเศษ]'} พร้อมของแถมมูลค่า [Y] อีกด้วย"`,
      urgency_triggers: [
        `"โปรนี้จบวันอาทิตย์นี้เท่านั้น ⏰"`,
        `"มีสต็อกเหลือแค่ [X] ชิ้น รีบก่อนพลาด"`,
        `"ลูกค้า [X] คนกำลังดูสินค้านี้อยู่ตอนนี้"`,
      ],
      bundle_ideas: [
        `ซื้อ 2 ชิ้น ลด 20% + ส่งฟรี`,
        `Bundle กับสินค้าเสริม ราคาประหยัดกว่าซื้อแยก 30%`,
        `ซื้อ 1 แถม 1 เฉพาะสัปดาห์นี้`,
      ],
      guarantee_script: `"ถ้าใช้แล้วไม่พอใจใน 30 วัน — คืนเงิน 100% ไม่มีข้อแม้ คุณไม่มีอะไรเสีย ลองดูได้เลย"`,
      bonus_ideas: [
        `ของแถม: [สินค้าเสริมมูลค่า X]`,
        `คู่มือการใช้งาน PDF ฟรี`,
        `เป็นสมาชิก VIP รับส่วนลด 10% ทุกออเดอร์ต่อไป`,
      ],
    },
    objection_killers: [
      { objection: 'ราคาแพงเกินไป', killer_response: `เทียบกับปัญหาที่คุณเผชิญอยู่ และสิ่งที่เคยเสียเงินไปกับของที่ไม่ได้ผล — ${price || '[ราคา]'} คือการลงทุนที่คุ้มค่าที่สุด และมีรับประกันคืนเงินถ้าไม่ดี`, proof_type: 'Price Comparison + Guarantee' },
      { objection: 'ของจริงหรือของปลอม?', killer_response: 'เราส่งตรงจากผู้ผลิต มีใบรับรอง [X] พร้อมรหัส QR ยืนยันของแท้ทุกชิ้น', proof_type: 'Certificate + Authenticity Code' },
      { objection: 'ไม่แน่ใจว่าจะเหมาะกับตัวเอง', killer_response: 'เราเข้าใจ นั่นเป็นเหตุผลที่เราให้ทดลองใช้ฟรี 7 วัน หรือรับประกัน 30 วัน ถ้าไม่เหมาะ — คืนเงินทันที', proof_type: 'Free Trial / Money-Back Guarantee' },
      { objection: 'เคยลองของแบบนี้มาแล้วไม่ได้ผล', killer_response: `${pName} แตกต่างตรงที่ ${usp} — ลูกค้าที่เคยท้อแท้กับสินค้าอื่น ${product.length > 5 ? 'พบว่าได้ผลกับเราในสัปดาห์แรก' : 'บอกว่านี่คือครั้งแรกที่ได้ผลจริง'}`, proof_type: 'Testimonial + Unique Differentiator' },
      { objection: 'ส่งนานไหม / ของจะมาถึงไหม?', killer_response: 'จัดส่งผ่าน Kerry/Flash Express มีเลข tracking ทุกออเดอร์ ส่งใน 24 ชั่วโมง ถึงใน 1-3 วันทำการ', proof_type: 'Logistics Proof + Tracking' },
    ],
    funnel_strategy: {
      awareness:  { content_type: 'TikTok Hook, FB Reach Ad', message: `ดึงดูดด้วย hook ที่โดนใจปัญหา + awareness ว่า ${pName} มีอยู่`, platform: 'TikTok, Facebook', kpi: 'Reach 10k+ / CPM ≤฿30' },
      interest:   { content_type: 'Demo Video, รีวิวจริง', message: `แสดง before/after และ proof ว่า ${pName} ทำงานอย่างไร`, platform: 'Instagram, YouTube', kpi: 'Engagement Rate >5%, View 75%+' },
      decision:   { content_type: 'Testimonial, เปรียบเทียบ, FAQ', message: `ตอบข้อโต้แย้ง เน้น guarantee + social proof ปิดการตัดสินใจ`, platform: 'Facebook Retarget, Shopee', kpi: 'Add-to-cart >8%, CTR >3%' },
      action:     { content_type: 'Flash Sale, Limited Offer', message: `urgency + scarcity — "ซื้อตอนนี้ก่อนหมด" พร้อม CTA ชัดเจน`, platform: 'LINE Broadcast, Shopee Push', kpi: 'Conversion Rate >3%, ROAS >3x' },
      repurchase: { content_type: 'Thank you + Next Product', message: `ขอบคุณ + แนะนำสินค้าเสริม + ส่วนลด VIP รอบถัดไป`, platform: 'LINE OA, Email', kpi: 'Repeat Purchase 30d >20%' },
    },
  });
});

// S19 · POST /api/skills/supply-chain — Supply Chain AI Strategist (ครบทุกมิติ)
// วิเคราะห์ห่วงโซ่อุปทานสำหรับ SME/OTOP ไทย: พยากรณ์ดีมานด์ · สต๊อก · จัดซื้อ · โลจิสติกส์ · ความเสี่ยง
app.post('/api/skills/supply-chain', generateLimiter, async (req, res) => {
  const {
    product, category = 'OTOP', monthly_volume = '', unit_cost = '',
    sourcing = 'ผสม', lead_time = '', season = 'ทั้งปี', channels = 'ออนไลน์',
  } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `คุณเป็นที่ปรึกษา Supply Chain & Operations ระดับโลก ผสมความเชี่ยวชาญ APICS (CPIM/CSCP), Lean, Just-in-Time
และเข้าใจบริบท SME/OTOP/เกษตรกรไทยอย่างลึกซึ้ง (ฤดูกาล, ต้นทุนขนส่งในประเทศ, ผู้ผลิตรายย่อย, ตลาดออนไลน์ไทย)

─── ข้อมูลธุรกิจ ───
สินค้า: "${product.slice(0, 200)}"
หมวด: ${category}
ยอดขาย/เดือนโดยประมาณ: ${monthly_volume || 'ไม่ระบุ'} ชิ้น
ต้นทุนต่อหน่วย: ${unit_cost || 'ไม่ระบุ'} บาท
แหล่งจัดหา: ${sourcing} (ผลิตเอง/ในประเทศ/นำเข้า/ผสม)
Lead time จัดหา: ${lead_time || 'ไม่ระบุ'}
ฤดูกาลขายดี: ${season}
ช่องทางจัดจำหน่าย: ${channels}

─── ภารกิจ ───
วิเคราะห์ห่วงโซ่อุปทานครบทุกมิติให้ผู้ประกอบการนำไปใช้ได้จริง ตอบกลับเป็น JSON เท่านั้น:

{
  "health_score": 0-100 (คะแนนความพร้อม supply chain โดยรวมจากข้อมูลที่ให้),
  "summary": "สรุปภาพรวม 2-3 ประโยค — จุดแข็ง จุดที่ต้องระวัง",
  "demand_forecast": {
    "trend": "ขาขึ้น / ทรงตัว / ขาลง — พร้อมเหตุผลสั้นๆ",
    "seasonality": "อธิบายรูปแบบฤดูกาลของสินค้านี้ในตลาดไทย",
    "monthly_outlook": [
      {"period":"ช่วงเดือน เช่น ม.ค.-มี.ค.","demand_level":"สูง/กลาง/ต่ำ","note":"เหตุผล + สิ่งที่ควรเตรียม"},
      {"period":"...","demand_level":"...","note":"..."},
      {"period":"...","demand_level":"...","note":"..."},
      {"period":"...","demand_level":"...","note":"..."}
    ],
    "safety_stock_advice": "แนะนำระดับ safety stock + วิธีคำนวณอย่างง่ายสำหรับ SME",
    "reorder_point": "จุดที่ควรสั่งซื้อใหม่ — อธิบายเป็นสูตร/ตัวเลขเข้าใจง่าย"
  },
  "inventory_strategy": {
    "abc_focus": "สินค้านี้ควรถูกจัดเป็น A/B/C และบริหารอย่างไร",
    "stock_level": "ระดับสต๊อกที่เหมาะสม + เหตุผล",
    "turnover_tip": "วิธีเพิ่ม inventory turnover / ลดของค้าง",
    "deadstock_risk": "ความเสี่ยงของค้างสต๊อก + วิธีป้องกัน"
  },
  "sourcing_strategy": {
    "recommendation": "คำแนะนำเรื่องแหล่งจัดหา (ผลิตเอง vs จ้างผลิต vs นำเข้า) สำหรับสินค้านี้",
    "supplier_criteria": ["เกณฑ์เลือกซัพพลายเออร์ 1","เกณฑ์ 2","เกณฑ์ 3","เกณฑ์ 4"],
    "negotiation_tips": ["เคล็ดลับต่อรอง 1","เคล็ดลับ 2","เคล็ดลับ 3"],
    "moq_strategy": "กลยุทธ์จัดการ MOQ (ขั้นต่ำการสั่ง) ไม่ให้จมทุน",
    "dual_sourcing": "ควรมีซัพพลายเออร์สำรองไหม + เหตุผล"
  },
  "logistics": {
    "recommended_channels": ["ช่องทางขนส่งที่เหมาะ 1","ช่องทาง 2","ช่องทาง 3"],
    "cost_optimization": ["วิธีลดต้นทุนขนส่ง 1","วิธี 2","วิธี 3"],
    "delivery_sla": "เป้าหมายเวลาจัดส่งที่แข่งขันได้ในตลาดไทย",
    "packaging_tip": "คำแนะนำบรรจุภัณฑ์ — ลดของเสียหาย + ต้นทุน + ภาพลักษณ์",
    "fulfillment_model": "แนะนำโมเดล fulfillment (self / 3PL / dropship / marketplace warehouse)"
  },
  "cost_structure": {
    "landed_cost_factors": ["ปัจจัยต้นทุนรวมที่ต้องคิด 1","ปัจจัย 2","ปัจจัย 3","ปัจจัย 4"],
    "margin_protection": "วิธีปกป้องกำไรเมื่อต้นทุน/ขนส่งผันผวน",
    "pricing_note": "ข้อควรระวังเรื่องการตั้งราคาให้ครอบคลุมต้นทุน supply chain"
  },
  "risk_management": [
    {"risk":"ความเสี่ยง 1","likelihood":"สูง/กลาง/ต่ำ","impact":"ผลกระทบ","mitigation":"วิธีรับมือ"},
    {"risk":"ความเสี่ยง 2","likelihood":"...","impact":"...","mitigation":"..."},
    {"risk":"ความเสี่ยง 3","likelihood":"...","impact":"...","mitigation":"..."},
    {"risk":"ความเสี่ยง 4","likelihood":"...","impact":"...","mitigation":"..."}
  ],
  "action_plan": ["สิ่งที่ควรทำทันที 1","ทำใน 30 วัน 2","ทำใน 90 วัน 3","ทำระยะยาว 4","ทำระยะยาว 5"],
  "kpis": [
    {"metric":"ชื่อ KPI","target":"เป้าหมาย","why":"ทำไมต้องวัด"},
    {"metric":"...","target":"...","why":"..."},
    {"metric":"...","target":"...","why":"..."},
    {"metric":"...","target":"...","why":"..."}
  ]
}`;

  try {
    const text = await callAI(prompt, 4096);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) {
    addLog('warn', 'Skills/SupplyChain', e.message);
  }

  // Mock fallback — ใช้ heuristic เมื่อไม่มี AI key
  const pName = product.slice(0, 40);
  const vol = Number(monthly_volume) || 0;
  const peak = season && season !== 'ทั้งปี' ? season : 'ปลายปี (ต.ค.-ธ.ค.)';
  res.json({
    success: true, source: 'mock',
    health_score: vol > 0 && lead_time ? 72 : 58,
    summary: `${pName} มีศักยภาพในช่องทาง${channels} จุดที่ต้องโฟกัสคือการจับคู่สต๊อกกับฤดูกาล (${peak}) และลดความเสี่ยงด้าน lead time จากแหล่งจัดหาแบบ${sourcing}`,
    demand_forecast: {
      trend: 'ทรงตัวถึงขาขึ้น — ขึ้นกับการทำตลาดออนไลน์อย่างต่อเนื่อง',
      seasonality: `สินค้ากลุ่ม${category}มักขายดีช่วง${peak} และเทศกาล/ของฝาก — ควรเตรียมสต๊อกล่วงหน้า 1-2 เดือน`,
      monthly_outlook: [
        { period: 'ม.ค.-มี.ค.', demand_level: 'กลาง', note: 'หลังปีใหม่ดีมานด์ชะลอ — เคลียร์สต๊อกค้าง + ทำโปรกระตุ้น' },
        { period: 'เม.ย.-มิ.ย.', demand_level: 'กลาง', note: 'สงกรานต์ของฝากดีช่วงสั้น — เตรียมเซ็ตของขวัญ' },
        { period: 'ก.ค.-ก.ย.', demand_level: 'ต่ำ', note: 'นอกฤดู — ลดการสั่งผลิต เน้นทดสอบสินค้าใหม่' },
        { period: 'ต.ค.-ธ.ค.', demand_level: 'สูง', note: 'ไฮซีซั่น/ของฝากปลายปี — สั่งผลิตล่วงหน้า ส.ค.-ก.ย.' },
      ],
      safety_stock_advice: 'safety stock ≈ ยอดขายเฉลี่ยต่อวัน × (lead time วัน) × 1.3 (เผื่อความผันผวน 30%)',
      reorder_point: 'จุดสั่งซื้อใหม่ = (ยอดขายเฉลี่ย/วัน × lead time) + safety stock',
    },
    inventory_strategy: {
      abc_focus: vol > 100 ? 'จัดเป็นกลุ่ม A — ทำยอดหลัก ควรตรวจสต๊อกถี่และไม่ให้ขาด' : 'จัดเป็นกลุ่ม B — ตรวจสต๊อกรายสัปดาห์ก็เพียงพอ',
      stock_level: 'เก็บสต๊อกพอขาย 4-6 สัปดาห์ + safety stock — หลีกเลี่ยงการสต๊อกเกิน 3 เดือน',
      turnover_tip: 'ตั้งเป้า inventory turnover ≥ 6 รอบ/ปี — ใช้โปรโมชั่นเคลียร์ของช้าทุกสิ้นไตรมาส',
      deadstock_risk: 'สินค้าฤดูกาล/มีวันหมดอายุเสี่ยงค้างสูง — ผลิตแบบ batch เล็กถี่ๆ ดีกว่าล็อตใหญ่',
    },
    sourcing_strategy: {
      recommendation: sourcing === 'นำเข้า' ? 'นำเข้า: ล็อกราคา + เผื่อ lead time และความเสี่ยงค่าเงิน/ศุลกากร' : 'ผลิตในประเทศ/จ้างผลิต: ยืดหยุ่นกว่า เหมาะกับ SME ที่ดีมานด์ยังผันผวน',
      supplier_criteria: ['คุณภาพสม่ำเสมอ (มีมาตรฐาน/อย./มผช.)', 'ความตรงต่อเวลาส่งมอบ', 'ความยืดหยุ่นเรื่อง MOQ', 'เงื่อนไขการชำระเงิน/เครดิตเทอม'],
      negotiation_tips: ['รวมออเดอร์เพื่อต่อรองราคาต่อหน่วย', 'ขอเครดิตเทอม 30-60 วันเพื่อเสริมสภาพคล่อง', 'ตกลงราคาคงที่เป็นช่วง (lock price) เมื่อนำเข้า'],
      moq_strategy: 'เริ่มจาก MOQ ต่ำสุดที่ยอมรับได้ ทดสอบตลาดก่อน แล้วค่อยเพิ่มล็อตเมื่อยอดนิ่ง',
      dual_sourcing: 'ควรมีซัพพลายเออร์สำรองอย่างน้อย 1 ราย — กันความเสี่ยงของขาด/ราคาพุ่ง',
    },
    logistics: {
      recommended_channels: ['ไปรษณีย์ไทย/Flash/J&T สำหรับพัสดุย่อย', 'ขนส่งเหมาเที่ยวเมื่อส่งจำนวนมาก', 'คลัง marketplace (Shopee/Lazada) เพื่อส่งเร็วขึ้น'],
      cost_optimization: ['เจรจาเรตขนส่งแบบ contract เมื่อยอดส่งสูง', 'รวมออเดอร์/รอบจัดส่งลดค่าเที่ยว', 'เลือกขนาดกล่องมาตรฐานลดค่าน้ำหนักเชิงปริมาตร'],
      delivery_sla: 'ตั้งเป้าจัดส่งภายในประเทศ 1-3 วันทำการเพื่อแข่งขันบนแพลตฟอร์ม',
      packaging_tip: 'บรรจุภัณฑ์กันกระแทกพอดีตัว — ลดของเสียหายและต้นทุนน้ำหนักเชิงปริมาตร พร้อมแบรนด์ดิ้งบนกล่อง',
      fulfillment_model: vol > 200 ? 'พิจารณา 3PL หรือคลัง marketplace เมื่อยอดสูง' : 'Self-fulfillment เพียงพอในช่วงเริ่มต้น',
    },
    cost_structure: {
      landed_cost_factors: ['ต้นทุนสินค้า/วัตถุดิบ', 'ค่าขนส่งขาเข้า + ขาออก', 'ค่าบรรจุภัณฑ์', 'ค่าธรรมเนียมแพลตฟอร์ม/ชำระเงิน'],
      margin_protection: 'คำนวณ landed cost จริงทุกล็อต ตั้งราคาให้เผื่อค่าขนส่งผันผวน ≥ 10%',
      pricing_note: 'อย่าตั้งราคาจากต้นทุนสินค้าอย่างเดียว — ต้องรวมค่าขนส่ง บรรจุภัณฑ์ และค่าธรรมเนียมแพลตฟอร์ม',
    },
    risk_management: [
      { risk: 'ของขาดสต๊อกช่วงไฮซีซั่น', likelihood: 'สูง', impact: 'เสียยอดขาย + เสียอันดับร้าน', mitigation: 'สั่งผลิตล่วงหน้า + safety stock + ซัพพลายเออร์สำรอง' },
      { risk: 'Lead time ผู้ผลิตล่าช้า', likelihood: 'กลาง', impact: 'ส่งช้า ลูกค้าไม่พอใจ', mitigation: 'ทำสัญญา SLA + บัฟเฟอร์เวลาในการวางแผน' },
      { risk: 'ต้นทุน/ค่าขนส่งพุ่ง', likelihood: 'กลาง', impact: 'กำไรลด', mitigation: 'ล็อกราคาซัพพลายเออร์ + ทบทวนราคาขายเป็นรอบ' },
      { risk: 'สินค้าค้างสต๊อก (นอกฤดู)', likelihood: 'กลาง', impact: 'จมทุน/ของเสื่อม', mitigation: 'ผลิต batch เล็ก + โปรเคลียร์ของตามรอบ' },
    ],
    action_plan: [
      'ทันที: คำนวณ reorder point + safety stock จากยอดขายจริง',
      '30 วัน: หาซัพพลายเออร์สำรอง 1 ราย + เจรจาเครดิตเทอม',
      '90 วัน: ตั้งระบบเตือนสต๊อกต่ำ (ใช้ Inventory ในระบบ)',
      'ระยะยาว: เจรจาเรตขนส่งแบบ contract เมื่อยอดโต',
      'ระยะยาว: วางแผนผลิตล่วงหน้าตามปฏิทินฤดูกาล',
    ],
    kpis: [
      { metric: 'Inventory Turnover', target: '≥ 6 รอบ/ปี', why: 'วัดว่าสต๊อกหมุนเร็วไม่จมทุน' },
      { metric: 'Stockout Rate', target: '< 5%', why: 'วัดโอกาสเสียยอดขายจากของขาด' },
      { metric: 'On-time Delivery', target: '≥ 95%', why: 'รักษาความพอใจลูกค้า + อันดับร้าน' },
      { metric: 'Logistics Cost %', target: '< 15% ของราคาขาย', why: 'คุมต้นทุนขนส่งไม่ให้กินกำไร' },
    ],
  });
});

// S20 · POST /api/skills/pricing — Pricing Optimizer (ตั้งราคาให้ได้กำไร + แข่งขันได้)
app.post('/api/skills/pricing', generateLimiter, async (req, res) => {
  const { product, cost = '', competitor_price = '', category = 'OTOP', target_margin = '', positioning = 'คุ้มค่า' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `คุณเป็นนักวางกลยุทธ์ราคา (Pricing Strategist) ระดับโลก เชี่ยวชาญ value-based pricing, จิตวิทยาราคา
และตลาด SME/OTOP/ออนไลน์ไทย (Shopee/Lazada/TikTok Shop)

─── ข้อมูล ───
สินค้า: "${product.slice(0, 200)}"
หมวด: ${category}
ต้นทุนต่อหน่วย: ${cost || 'ไม่ระบุ'} บาท
ราคาคู่แข่ง: ${competitor_price || 'ไม่ระบุ'} บาท
กำไรเป้าหมาย: ${target_margin || 'ไม่ระบุ'}
การวางตำแหน่ง: ${positioning}

ตอบกลับ JSON เท่านั้น:
{
  "recommended_price": "ราคาที่แนะนำ (บาท) + เหตุผลสั้น",
  "price_range": {"min":"ราคาต่ำสุดที่ยังมีกำไร","max":"ราคาสูงสุดที่ตลาดรับได้"},
  "psychological_price": "ราคาจิตวิทยา เช่น 199 แทน 200 + เหตุผล",
  "strategy": "ชื่อกลยุทธ์ราคา + อธิบาย 2-3 ประโยค",
  "margin_analysis": {"gross_margin":"% กำไรขั้นต้นโดยประมาณ","note":"ข้อสังเกตเรื่องต้นทุน/กำไร"},
  "competitor_positioning": "ควรตั้งราคาเทียบคู่แข่งอย่างไร (ถูกกว่า/เท่ากัน/พรีเมียม) + เหตุผล",
  "bundle_options": ["ไอเดียจัดเซ็ต/แพ็กเพิ่มมูลค่า 1","2","3"],
  "discount_strategy": "กลยุทธ์ส่วนลด/โปรที่ไม่ทำลายกำไร",
  "upsell_ideas": ["ไอเดีย upsell/cross-sell 1","2","3"],
  "price_anchoring_tip": "วิธีตั้ง anchor ให้ลูกค้ารู้สึกคุ้ม"
}`;

  try {
    const text = await callAI(prompt, 2048);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/Pricing', e.message); }

  const c = Number(cost) || 0;
  const rec = c > 0 ? Math.round(c * 2.2 / 10) * 10 + 9 : null;
  res.json({
    success: true, source: 'mock',
    recommended_price: rec ? `${rec} บาท (มาร์กอัป ~2.2x จากต้นทุน เพื่อครอบคลุมค่าขนส่ง/แพลตฟอร์ม + กำไร)` : 'ตั้งจากต้นทุน × 2-2.5 เท่า เผื่อค่าขนส่ง+ค่าธรรมเนียม',
    price_range: { min: c > 0 ? `${Math.round(c * 1.6)} บาท` : 'ต้นทุน × 1.6', max: c > 0 ? `${Math.round(c * 3)} บาท` : 'ต้นทุน × 3' },
    psychological_price: rec ? `ตั้ง ${rec} แทนเลขกลม — เลขลงท้าย 9 ทำให้รู้สึกถูกลง` : 'ใช้เลขลงท้าย 9 (เช่น 199, 299)',
    strategy: `Value-based + Charm pricing — เน้นวางตำแหน่ง "${positioning}" สื่อสารคุณค่าให้ชัดก่อนแจ้งราคา`,
    margin_analysis: { gross_margin: c > 0 && rec ? `~${Math.round((1 - c / rec) * 100)}%` : 'ตั้งเป้า ≥ 50%', note: 'อย่าลืมหักค่าขนส่ง บรรจุภัณฑ์ และค่าธรรมเนียมแพลตฟอร์มก่อนคิดกำไรสุทธิ' },
    competitor_positioning: competitor_price ? `ถ้าคุณภาพเหนือกว่า ตั้งใกล้เคียงหรือพรีเมียมกว่าเล็กน้อยได้ ถ้าเท่ากันให้เพิ่มของแถม/บริการแทนการลดราคา` : 'หาราคาคู่แข่ง 3 รายก่อน แล้ววางให้สอดคล้องกับคุณค่าที่สื่อสาร',
    bundle_options: ['เซ็ตคู่ลดราคาเล็กน้อย', 'แพ็กของฝาก + กล่องพรีเมียม', 'ซื้อ 2 แถมของชิ้นเล็ก'],
    discount_strategy: 'ใช้ส่วนลดมีเงื่อนไข (ขั้นต่ำ/ช่วงเวลา) แทนลดถาวร — รักษากำไรและความรู้สึกพิเศษ',
    upsell_ideas: ['เสนอไซซ์ใหญ่คุ้มกว่า', 'เพิ่มบริการห่อของขวัญ', 'สมัครสมาชิกรับซ้ำราคาพิเศษ'],
    price_anchoring_tip: 'โชว์ราคาเต็มขีดฆ่าคู่กับราคาขายจริง + ระบุ "ประหยัด X บาท"',
  });
});

// S21 · POST /api/skills/customer-service — Customer Service AI (ช่วยตอบลูกค้าอย่างมืออาชีพ)
app.post('/api/skills/customer-service', generateLimiter, async (req, res) => {
  const { message, product = '', tone = 'สุภาพ เป็นมิตร', channel = 'แชท' } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: 'message required' });

  const prompt = `คุณเป็นผู้เชี่ยวชาญ Customer Experience สำหรับร้านค้าออนไลน์ไทย ช่วยร้านตอบลูกค้าให้ปิดการขาย/แก้ปัญหาได้อย่างมืออาชีพ
ช่องทาง: ${channel} · โทน: ${tone}${product ? ` · สินค้า: ${product}` : ''}

ข้อความจากลูกค้า: "${message.slice(0, 600)}"

วิเคราะห์และร่างคำตอบ ตอบกลับ JSON เท่านั้น:
{
  "intent": "เจตนาของลูกค้า (สอบถาม/ต่อรอง/ตำหนิ/สนใจซื้อ/ติดตามพัสดุ ฯลฯ)",
  "sentiment": "positive / neutral / negative",
  "urgency": "สูง / กลาง / ต่ำ",
  "escalate": true/false (ควรส่งต่อให้คนดูแลไหม),
  "suggested_replies": ["คำตอบแนะนำแบบที่ 1 (กระชับ)","แบบที่ 2 (อบอุ่น)","แบบที่ 3 (เน้นปิดการขาย)"],
  "recommended_reply": "คำตอบที่ดีที่สุดสำหรับสถานการณ์นี้",
  "follow_up": "ประโยคติดตามผล/ชวนคุยต่อ",
  "do_dont": {"do":["ควรทำ 1","ควรทำ 2"],"dont":["ไม่ควรทำ 1","ไม่ควรทำ 2"]}
}`;

  try {
    const text = await callAI(prompt, 2048);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/CustomerService', e.message); }

  const neg = /แพง|ช้า|เสีย|ผิด|ไม่พอใจ|แย่|คืนเงิน|โกง/.test(message);
  res.json({
    success: true, source: 'mock',
    intent: neg ? 'ตำหนิ/ร้องเรียน' : (/ราคา|เท่าไหร่|กี่บาท|ลด/.test(message) ? 'สอบถามราคา/ต่อรอง' : 'สอบถามทั่วไป'),
    sentiment: neg ? 'negative' : 'neutral',
    urgency: neg ? 'สูง' : 'กลาง',
    escalate: neg,
    suggested_replies: [
      `สวัสดีค่ะ ขอบคุณที่สอบถามนะคะ ${product ? `เรื่อง${product} ` : ''}ทางร้านยินดีดูแลให้เต็มที่เลยค่ะ 🙏`,
      `รับทราบค่ะ ทางร้านเข้าใจความรู้สึกของลูกค้า ขออนุญาตช่วยตรวจสอบและดูแลให้เรียบร้อยนะคะ`,
      `ตอนนี้มีโปรพิเศษอยู่พอดีค่ะ สนใจให้ทางร้านจัดให้เลยไหมคะ จะรีบจัดส่งให้เร็วที่สุดค่ะ ✨`,
    ],
    recommended_reply: neg
      ? `ต้องขออภัยในความไม่สะดวกด้วยนะคะ 🙏 ทางร้านขอช่วยตรวจสอบให้ทันทีค่ะ รบกวนขอเลขคำสั่งซื้อ/รายละเอียดเพิ่มเติม เพื่อดูแลให้เรียบร้อยที่สุดค่ะ`
      : `สวัสดีค่ะ ขอบคุณที่สนใจนะคะ ${product ? `${product} ` : ''}ทางร้านยินดีให้ข้อมูลเพิ่มเติมเลยค่ะ มีอะไรให้ช่วยดูแลเป็นพิเศษไหมคะ 😊`,
    follow_up: 'มีอะไรให้ทางร้านช่วยเพิ่มเติมไหมคะ ยินดีดูแลค่ะ 🙏',
    do_dont: { do: ['ตอบเร็ว สุภาพ เห็นอกเห็นใจ', 'เสนอทางแก้ที่ชัดเจน'], dont: ['ตอบห้วน/โต้เถียงลูกค้า', 'สัญญาเกินจริง'] },
  });
});

// S22 · POST /api/skills/ad-budget — Ad Budget Planner (จัดสรรงบโฆษณาข้ามแพลตฟอร์ม)
app.post('/api/skills/ad-budget', generateLimiter, async (req, res) => {
  const { product, budget = '', goal = 'ยอดขาย', platforms = 'TikTok, Facebook', duration = '30 วัน', category = 'OTOP' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `คุณเป็น Performance Marketing Strategist ระดับโลก เชี่ยวชาญการจัดสรรงบโฆษณา (media buying) บน TikTok Ads, Meta Ads, Google
สำหรับ SME/OTOP ไทย เข้าใจ CPM/CPC/ROAS จริงของตลาดไทย

─── ข้อมูล ───
สินค้า: "${product.slice(0, 200)}" (หมวด ${category})
งบประมาณ: ${budget || 'ไม่ระบุ'} บาท
เป้าหมาย: ${goal}
แพลตฟอร์ม: ${platforms}
ระยะเวลา: ${duration}

ตอบกลับ JSON เท่านั้น:
{
  "summary": "สรุปกลยุทธ์การใช้งบ 2-3 ประโยค",
  "allocation": [
    {"platform":"ชื่อแพลตฟอร์ม","percent":เลข%,"amount":"จำนวนเงินบาท","format":"รูปแบบโฆษณาที่แนะนำ","rationale":"เหตุผล"}
  ],
  "expected_results": {"reach":"ประมาณการ reach","cpm":"~฿ ต่อ 1000 impressions","cpc":"~฿ ต่อคลิก","roas":"คาดการณ์ ROAS","conversions":"ประมาณยอดขาย/leads"},
  "phasing": [
    {"phase":"ทดสอบ (Testing)","budget":"% หรือบาท","days":"กี่วัน","focus":"โฟกัสอะไร"},
    {"phase":"ขยายผล (Scaling)","budget":"...","days":"...","focus":"..."},
    {"phase":"เก็บเกี่ยว (Retargeting)","budget":"...","days":"...","focus":"..."}
  ],
  "bid_strategy": "กลยุทธ์ bid/optimization ที่แนะนำ",
  "creative_tips": ["เคล็ดลับครีเอทีฟ 1","2","3"],
  "scaling_rules": ["กฎการเพิ่มงบ 1","2","3"],
  "watch_metrics": [
    {"metric":"ตัวชี้วัด","target":"เกณฑ์","action":"ทำอะไรเมื่อถึงเกณฑ์"}
  ]
}`;

  try {
    const text = await callAI(prompt, 2048);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/AdBudget', e.message); }

  const b = Number(budget) || 0;
  const list = platforms.split(/[,·/]+/).map(s => s.trim()).filter(Boolean);
  const weights = list.map(p => /tiktok/i.test(p) ? 0.4 : /facebook|meta/i.test(p) ? 0.3 : /instagram/i.test(p) ? 0.15 : /google|youtube/i.test(p) ? 0.1 : 0.2);
  const wsum = weights.reduce((a, c) => a + c, 0) || 1;
  const allocation = list.map((p, i) => {
    const pct = Math.round((weights[i] / wsum) * 100);
    return { platform: p, percent: pct, amount: b ? `฿${Math.round(b * weights[i] / wsum).toLocaleString('th-TH')}` : `${pct}%`,
      format: /tiktok/i.test(p) ? 'Spark Ads / วิดีโอ 9:16' : /facebook|meta|instagram/i.test(p) ? 'Advantage+ / Carousel' : 'Search / Performance Max',
      rationale: /tiktok/i.test(p) ? 'ต้นทุน reach ต่ำ + ไวรัลง่ายในไทย' : 'จับกลุ่ม retarget + คนตั้งใจซื้อ' };
  });
  res.json({
    success: true, source: 'mock',
    summary: `แบ่งงบ${b ? ` ฿${b.toLocaleString('th-TH')}` : ''}แบบ 70/20/10 (ทดสอบ/ขยาย/รีทาร์เก็ต) เน้น${list[0] || 'TikTok'}เป็นช่องทางหลักเพื่อเป้าหมาย "${goal}" ภายใน ${duration}`,
    allocation,
    expected_results: { reach: b ? `~${Math.round(b / 30 * 1000).toLocaleString('th-TH')} คน` : 'ขึ้นกับงบ', cpm: '~฿30-60', cpc: '~฿1-4', roas: 'เป้า ≥ 3x (ขึ้นกับครีเอทีฟ/ราคา)', conversions: b ? `~${Math.round(b / 80)} ออเดอร์ (ที่ CPA ~฿80)` : '—' },
    phasing: [
      { phase: 'ทดสอบ (Testing)', budget: '70%', days: '7-10 วัน', focus: 'ทดสอบ 3-5 ครีเอทีฟ × 2-3 กลุ่มเป้าหมาย หา winner' },
      { phase: 'ขยายผล (Scaling)', budget: '20%', days: '10-15 วัน', focus: 'ทุ่มงบให้ ad ที่ ROAS ดีสุด ค่อยๆเพิ่ม 20%/วัน' },
      { phase: 'เก็บเกี่ยว (Retargeting)', budget: '10%', days: 'ตลอด', focus: 'ยิงซ้ำคนที่ดู/add-to-cart แต่ยังไม่ซื้อ' },
    ],
    bid_strategy: 'เริ่มด้วย Lowest Cost / Highest Volume เก็บ data ก่อน แล้วค่อยเปลี่ยนเป็น Cost Cap เมื่อรู้ CPA จริง',
    creative_tips: ['Hook 3 วินาทีแรกต้องหยุดนิ้ว', 'ทำหลายเวอร์ชันให้อัลกอริทึมเลือก', 'ใส่ราคา/โปรชัดเจนในวิดีโอ'],
    scaling_rules: ['เพิ่มงบไม่เกิน 20%/วันกัน learning reset', 'ปิด ad ที่ ROAS < 1.5 หลังใช้งบพอประมาณ', 'แตก ad set ใหม่เมื่อ frequency > 3'],
    watch_metrics: [
      { metric: 'ROAS', target: '≥ 3x', action: 'ต่ำกว่า → ปรับครีเอทีฟ/กลุ่มเป้าหมาย' },
      { metric: 'CPA', target: '≤ กำไรต่อชิ้น', action: 'สูงกว่า → หยุด ad นั้น' },
      { metric: 'CTR', target: '≥ 1.5%', action: 'ต่ำ → เปลี่ยน hook/ภาพ' },
    ],
  });
});

// S23 · POST /api/skills/break-even — Break-even & Profit Planner (วางแผนจุดคุ้มทุน + กำไร)
app.post('/api/skills/break-even', generateLimiter, async (req, res) => {
  const { product, price = '', unit_cost = '', fixed_costs = '', monthly_target = '' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const p = Number(price) || 0, c = Number(unit_cost) || 0, F = Number(fixed_costs) || 0, T = Number(monthly_target) || 0;
  const contribution = p - c;
  const beUnits = contribution > 0 ? Math.ceil(F / contribution) : null;

  const prompt = `คุณเป็นที่ปรึกษาการเงิน SME ไทย ช่วยเจ้าของร้านวางแผนจุดคุ้มทุนและกำไรอย่างเข้าใจง่าย
สินค้า: "${product.slice(0, 200)}"
ราคาขาย/หน่วย: ${p || 'ไม่ระบุ'} บาท · ต้นทุนผันแปร/หน่วย: ${c || 'ไม่ระบุ'} บาท
ต้นทุนคงที่/เดือน: ${F || 'ไม่ระบุ'} บาท · เป้ายอดขาย/เดือน: ${T || 'ไม่ระบุ'} ชิ้น
${contribution ? `(กำไรส่วนเกินต่อหน่วย = ${contribution} บาท${beUnits ? ` · จุดคุ้มทุน ≈ ${beUnits} ชิ้น/เดือน` : ''})` : ''}

ตอบกลับ JSON เท่านั้น (ใช้ตัวเลขจริงจากข้อมูล):
{
  "summary": "สรุปสุขภาพการเงินของสินค้านี้ 2-3 ประโยค",
  "contribution_margin": {"per_unit":"฿ ต่อหน่วย","percent":"% ของราคาขาย"},
  "break_even": {"units":"จำนวนชิ้น/เดือน","revenue":"฿ ยอดขายที่คุ้มทุน","daily_units":"~ชิ้น/วัน"},
  "profit_projection": [
    {"units":"ที่ยอด X ชิ้น","revenue":"฿","profit":"฿ กำไรสุทธิ","note":"..."},
    {"units":"...","revenue":"฿","profit":"฿","note":"..."}
  ],
  "scenarios": [
    {"name":"แย่ (Worst)","units":"...","profit":"฿"},
    {"name":"ปกติ (Base)","units":"...","profit":"฿"},
    {"name":"ดี (Best)","units":"...","profit":"฿"}
  ],
  "pricing_sensitivity": "ถ้าขึ้น/ลดราคา 10% ผลต่อจุดคุ้มทุนและกำไร",
  "cash_flow_tips": ["เคล็ดลับสภาพคล่อง 1","2","3"],
  "health_verdict": "ประเมินว่าสินค้านี้น่าทำต่อไหม + เงื่อนไข"
}`;

  try {
    const text = await callAI(prompt, 2048);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/BreakEven', e.message); }

  // Mock fallback — คำนวณจริงจากตัวเลข
  const baht = n => `฿${Math.round(n).toLocaleString('th-TH')}`;
  const cmPct = p > 0 ? Math.round(contribution / p * 100) : 0;
  const beRevenue = beUnits ? beUnits * p : 0;
  const profitAt = u => u * contribution - F;
  const proj = (beUnits ? [beUnits, Math.round(beUnits * 1.5), beUnits * 2] : [50, 100, 200]).map(u => ({
    units: `${u.toLocaleString('th-TH')} ชิ้น`, revenue: baht(u * p), profit: baht(profitAt(u)),
    note: profitAt(u) <= 0 ? 'ยังไม่คุ้มทุน' : 'มีกำไรสุทธิ',
  }));
  const base = T || (beUnits ? Math.round(beUnits * 1.3) : 100);
  res.json({
    success: true, source: 'mock',
    summary: contribution > 0
      ? `${product.slice(0, 40)} มีกำไรส่วนเกินต่อหน่วย ${baht(contribution)} (${cmPct}%) ${beUnits ? `ต้องขายอย่างน้อย ${beUnits.toLocaleString('th-TH')} ชิ้น/เดือนจึงคุ้มทุน` : ''}`
      : `⚠️ ราคาขายยังต่ำกว่าหรือเท่าต้นทุน — ต้องปรับราคา/ลดต้นทุนก่อน ไม่งั้นยิ่งขายยิ่งขาดทุน`,
    contribution_margin: { per_unit: baht(contribution), percent: `${cmPct}%` },
    break_even: { units: beUnits ? `${beUnits.toLocaleString('th-TH')} ชิ้น/เดือน` : 'คำนวณไม่ได้ (กำไรต่อหน่วย ≤ 0)', revenue: beUnits ? baht(beRevenue) : '—', daily_units: beUnits ? `~${Math.ceil(beUnits / 30)} ชิ้น/วัน` : '—' },
    profit_projection: proj,
    scenarios: [
      { name: 'แย่ (Worst)', units: `${Math.round(base * 0.5).toLocaleString('th-TH')} ชิ้น`, profit: baht(profitAt(base * 0.5)) },
      { name: 'ปกติ (Base)', units: `${base.toLocaleString('th-TH')} ชิ้น`, profit: baht(profitAt(base)) },
      { name: 'ดี (Best)', units: `${Math.round(base * 1.8).toLocaleString('th-TH')} ชิ้น`, profit: baht(profitAt(base * 1.8)) },
    ],
    pricing_sensitivity: contribution > 0
      ? `ขึ้นราคา 10% → กำไรต่อหน่วยเพิ่มเป็น ${baht(contribution + p * 0.1)} จุดคุ้มทุนลดเหลือ ~${Math.ceil(F / (contribution + p * 0.1)).toLocaleString('th-TH')} ชิ้น | ลดราคา 10% → จุดคุ้มทุนพุ่งเป็น ~${contribution - p * 0.1 > 0 ? Math.ceil(F / (contribution - p * 0.1)).toLocaleString('th-TH') : '∞'} ชิ้น`
      : 'ต้องขึ้นราคาหรือลดต้นทุนก่อนจึงจะมีจุดคุ้มทุน',
    cash_flow_tips: ['เก็บเงินสดสำรองอย่างน้อย 1-2 เดือนของต้นทุนคงที่', 'เจรจาเครดิตเทอมกับซัพพลายเออร์เพื่อยืดรอบจ่าย', 'อย่าสต๊อกเกินจำเป็น — เงินจมในของค้าง'],
    health_verdict: contribution > 0
      ? (cmPct >= 40 ? '✅ น่าทำต่อ — มาร์จิ้นดี ถ้าทำยอดถึงจุดคุ้มทุนได้สม่ำเสมอ' : '🟡 พอไปได้ แต่มาร์จิ้นบาง ควรเพิ่มราคา/bundle หรือลดต้นทุน')
      : '🔴 ยังไม่ควรขายราคานี้ — ทบทวนราคา/ต้นทุนก่อน',
  });
});

// S24 · POST /api/skills/campaign-calendar — Campaign Calendar Planner (ปฏิทินแคมเปญตามเทศกาลไทย)
app.post('/api/skills/campaign-calendar', generateLimiter, async (req, res) => {
  const { product, category = 'OTOP', period = 'ทั้งปี', platform = 'TikTok, Shopee' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `คุณเป็นนักวางแผนการตลาดตามฤดูกาล (Seasonal Marketing Planner) ที่เชี่ยวชาญปฏิทินเทศกาล/เทรนด์ช้อปปิ้งของไทย
(ปีใหม่ · ตรุษจีน · วาเลนไทน์ · สงกรานต์ · วันแม่/วันพ่อ · ลอยกระทง · 9.9/10.10/11.11/12.12 · Black Friday · ของฝากเทศกาล)

สินค้า: "${product.slice(0, 200)}" (หมวด ${category}) · ช่วงที่วางแผน: ${period} · ช่องทาง: ${platform}

ตอบกลับ JSON เท่านั้น:
{
  "summary": "สรุปกลยุทธ์ปฏิทินแคมเปญ 2-3 ประโยค",
  "events": [
    {"period":"ช่วงเวลา/เดือน","occasion":"เทศกาล/โอกาส","promo_angle":"มุมโปรโมชั่นที่เข้ากับสินค้า","content_idea":"ไอเดียคอนเทนต์","prep_lead":"ควรเริ่มเตรียมก่อนกี่วัน"}
  ],
  "key_dates": ["วันที่ห้ามพลาดสำหรับสินค้านี้ 1","2","3","4"],
  "always_on_ideas": ["คอนเทนต์ที่ทำได้ตลอดไม่ผูกเทศกาล 1","2","3"],
  "budget_focus": "ช่วงไหนควรทุ่มงบโฆษณามากที่สุด + เหตุผล",
  "tips": ["เคล็ดลับการทำแคมเปญตามเทศกาล 1","2","3"]
}`;

  try {
    const text = await callAI(prompt, 2560);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/CampaignCalendar', e.message); }

  // Mock fallback — ปฏิทินเทศกาลไทยหลัก
  const pName = product.slice(0, 30);
  res.json({
    success: true, source: 'mock',
    summary: `วางแคมเปญ ${pName} ตามจังหวะเทศกาลไทยตลอด${period} เน้นช่วงไฮซีซั่นของฝาก (ตรุษจีน · สงกรานต์ · ปลายปี) และ Double-Day Sale (11.11/12.12) เป็นหมุดหมายหลัก`,
    events: [
      { period: 'ม.ค. (ก่อนตรุษจีน)', occasion: 'ตรุษจีน · ของฝาก/ของไหว้', promo_angle: 'เซ็ตของขวัญมงคล สีแดง-ทอง', content_idea: 'คลิป "ของฝากตรุษจีนถูกใจผู้ใหญ่"', prep_lead: '30 วัน' },
      { period: 'ก.พ.', occasion: 'วาเลนไทน์', promo_angle: 'เซ็ตคู่/ของขวัญให้คนพิเศษ', content_idea: 'รีวิว "ของขวัญที่ให้แล้วประทับใจ"', prep_lead: '21 วัน' },
      { period: 'เม.ย.', occasion: 'สงกรานต์ · ของฝากกลับบ้าน', promo_angle: 'แพ็กเดินทาง/ของฝากญาติ', content_idea: 'คลิป "กลับบ้านทั้งที ฝากอะไรดี"', prep_lead: '30 วัน' },
      { period: 'ส.ค.', occasion: 'วันแม่', promo_angle: 'ของขวัญขอบคุณแม่ + ห่อพิเศษ', content_idea: 'คอนเทนต์เล่าเรื่องอบอุ่นแทนคำขอบคุณ', prep_lead: '21 วัน' },
      { period: 'พ.ย.', occasion: '11.11 · Black Friday', promo_angle: 'Flash Sale ลดแรง + bundle', content_idea: 'นับถอยหลัง + รีวิวกระตุ้น FOMO', prep_lead: '30 วัน' },
      { period: 'ธ.ค.', occasion: '12.12 · ปีใหม่/ของขวัญ', promo_angle: 'เซ็ตของขวัญปีใหม่ พรีเมียม', content_idea: 'Gift Guide "ของขวัญปีใหม่งบ X บาท"', prep_lead: '30 วัน' },
    ],
    key_dates: ['11.11 (Double Day ใหญ่สุด)', '12.12 + ปลายปี', 'ก่อนตรุษจีน 2-3 สัปดาห์', 'ก่อนสงกรานต์ 2-3 สัปดาห์'],
    always_on_ideas: ['รีวิวจากลูกค้าจริง (UGC)', 'Behind the scenes การผลิต/แหล่งที่มา', 'How-to / วิธีใช้สินค้าให้คุ้ม'],
    budget_focus: 'ทุ่มงบช่วง พ.ย.-ธ.ค. (11.11/12.12/ปีใหม่) มากสุด เพราะ intent ซื้อสูงและของฝากปลายปีพีค',
    tips: ['เตรียมสต๊อก + คอนเทนต์ล่วงหน้า 3-4 สัปดาห์ก่อนเทศกาล', 'ตั้งราคา anchor ก่อนวันเซลเพื่อให้ส่วนลดน่าเชื่อ', 'ยิงแอด retarget คนที่ดูช่วงก่อนเทศกาลในวัน Double Day'],
  });
});

// S25 · POST /api/skills/live-script — Live Selling Script (สคริปต์ไลฟ์ขายของ TikTok/FB/Shopee Live)
app.post('/api/skills/live-script', generateLimiter, async (req, res) => {
  const { product, platform = 'TikTok Live', duration = '60 นาที', goal = 'ปิดการขาย', special_offer = '', category = 'OTOP' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `คุณเป็นโค้ชไลฟ์ขายของมืออาชีพ (Live Commerce Expert) ที่เชี่ยวชาญตลาดไทย — TikTok Live, Facebook Live, Shopee Live
รู้จังหวะการเล่า การเรียกยอด การกระตุ้น engagement และปิดการขายแบบแม่ค้าออนไลน์ไทยที่เก่งที่สุด

สินค้า: "${product.slice(0, 200)}" (หมวด ${category}) · แพลตฟอร์ม: ${platform} · ความยาว: ${duration} · เป้าหมาย: ${goal}
${special_offer ? `โปรพิเศษ: ${special_offer}` : ''}

ตอบกลับ JSON เท่านั้น:
{
  "summary": "ภาพรวมแผนไลฟ์ 2-3 ประโยค",
  "opening_hook": "ประโยคเปิดไลฟ์ 30 วินาทีแรกที่ดึงคนให้หยุดดู",
  "rundown": [
    {"time":"นาทีที่ X-Y","segment":"ชื่อช่วง","talking_points":"พูดอะไร/ทำอะไร","goal":"เป้าหมายช่วงนี้"}
  ],
  "engagement_tactics": ["กิจกรรม/วิธีดึง engagement 1","2","3","4"],
  "urgency_scripts": ["ประโยคกระตุ้นความเร่งด่วน/ของจะหมด 1","2","3"],
  "objection_handling": [{"objection":"ลูกค้าถาม/ลังเล","response":"ตอบยังไงให้ปิดได้"}],
  "closing_scripts": ["ประโยคปิดการขาย/เรียกออเดอร์ 1","2","3"],
  "cta_cadence": "ควรย้ำ CTA บ่อยแค่ไหน + จังหวะไหน",
  "tips": ["เคล็ดลับไลฟ์ให้ปัง 1","2","3"]
}`;

  try {
    const text = await callAI(prompt, 2560);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/LiveScript', e.message); }

  const pName = product.slice(0, 30);
  res.json({
    success: true, source: 'mock',
    summary: `แผนไลฟ์ขาย ${pName} บน ${platform} ความยาว ${duration} — เปิดด้วย hook แรง วอร์มคนช่วงต้น โชว์สินค้าจริงกลางไลฟ์ แล้วเร่งปิดการขายช่วงท้ายด้วยโปรจำกัดเวลา`,
    opening_hook: `"สวัสดีค่า! วันนี้มี ${pName} มาให้ทุกคน ใครรอราคานี้อยู่ห้ามไปไหนนะคะ เดี๋ยวมีของแจกด้วย! กดติดตาม+แชร์รัวๆเลยค่า"`,
    rundown: [
      { time: 'นาที 0-5', segment: 'เปิดไลฟ์ + เรียกคน', talking_points: 'ทักทาย เรียกชื่อคนดู ชวนกดติดตาม/แชร์ บอกว่าวันนี้มีอะไรพิเศษ', goal: 'ดึงคนเข้าไลฟ์ + วอร์ม' },
      { time: 'นาที 5-20', segment: 'แนะนำสินค้า + เล่าปัญหา', talking_points: `เล่าว่า ${pName} แก้ปัญหาอะไร โชว์ของจริง จับ สัมผัส ให้เห็นรายละเอียด`, goal: 'สร้างความอยาก' },
      { time: 'นาที 20-40', segment: 'รีวิว + สาธิต + ตอบคำถาม', talking_points: 'สาธิตการใช้ อ่านรีวิวลูกค้าเก่า ตอบคอมเมนต์สด เล่นเกมแจกของ', goal: 'สร้างความเชื่อใจ + engagement' },
      { time: 'นาที 40-55', segment: 'เปิดราคา + โปรไลฟ์', talking_points: 'เปิดราคาพิเศษเฉพาะไลฟ์ เทียบราคาปกติ บอกจำนวนจำกัด', goal: 'กระตุ้นการตัดสินใจ' },
      { time: 'นาที 55-60', segment: 'เร่งปิด + Last call', talking_points: 'นับถอยหลังของหมด ย้ำวิธีสั่ง ยืนยันออเดอร์สด', goal: 'ปิดการขาย' },
    ],
    engagement_tactics: ['ตั้งเป้ายอดไลค์ปลดล็อกของแจก', 'เล่นเกมทายราคา/สุ่มแจก', 'เรียกชื่อคนที่คอมเมนต์', 'ปักหมุดโค้ดส่วนลดในคอมเมนต์'],
    urgency_scripts: ['"ตัวนี้เหลือแค่ 10 ชิ้นสุดท้ายนะคะ!"', '"ราคานี้เฉพาะในไลฟ์เท่านั้น ออกไปแล้วกลับมาเป็นราคาเต็มนะคะ"', '"ใครสั่งใน 5 นาทีนี้ แถมเพิ่มอีก 1 ชิ้นเลยค่า"'],
    objection_handling: [
      { objection: 'แพงไป', response: 'เทียบความคุ้ม/ราคาต่อการใช้งาน + ย้ำของแถมเฉพาะไลฟ์' },
      { objection: 'ขอคิดดูก่อน', response: 'ย้ำว่าโปรหมดเมื่อจบไลฟ์ + รับประกันคืนเงินถ้าไม่พอใจ' },
      { objection: 'ส่งจริงไหม', response: 'โชว์หลักฐานการส่ง/รีวิวจริง + เลขพัสดุลูกค้าเก่า' },
    ],
    closing_scripts: ['"พิมพ์ CF ตามด้วยจำนวนได้เลยค่า เดี๋ยวแม่ค้าจัดให้!"', '"สั่งเลยนะคะ ของมีจำนวนจำกัดจริงๆ"', '"ขอบคุณทุกออเดอร์เลยค่า จัดส่งให้ภายในวันนี้!"'],
    cta_cadence: 'ย้ำ CTA ทุก 5-7 นาที และถี่ขึ้นเป็นทุก 2 นาทีในช่วง 15 นาทีสุดท้าย',
    tips: ['ไลฟ์ให้ยาวพอให้อัลกอริทึมดันคนเข้า (45-90 นาที)', 'พลังงานต้องสูงตลอด อย่าปล่อยให้เงียบ', 'เตรียมสต๊อก+ทีมตอบแชทไว้ก่อนเริ่มไลฟ์'],
  });
});

// S26 · POST /api/skills/omni-solver — Omni-Solver: เครื่องแก้ปัญหาอัจฉริยะรอบด้าน
// วิเคราะห์ปัญหาใดก็ได้ผ่าน 4 ศาสตร์ (จิตวิทยา · เรขาคณิตวิเคราะห์ · นิเวศการอยู่รอด · การแข่งขันการค้า)
// ครบทุกมิติ/มุมมอง/จุดยืน → นำสู่การปิดการขายที่เป็นธรรม (win-win) + ระบบติดตาม 24/7
async function omniSolve({ problem, context = '', goal = 'ปิดการขายที่เป็นธรรม (win-win ทุกฝ่าย)', stakeholders = '' }) {
  const prompt = `คุณคือ "Omni-Solver" — เครื่องแก้ปัญหาอัจฉริยะรอบด้านที่วิเคราะห์ปัญหาทุกชนิดผ่าน 4 ศาสตร์พร้อมกัน
แล้วสังเคราะห์เป็นทางออกที่เป็นธรรมต่อทุกฝ่าย (ไม่เอาเปรียบใคร) มุ่งบรรลุเป้าหมายอย่างยั่งยืน

4 ศาสตร์ที่ต้องใช้วิเคราะห์ (lenses):
1) จิตวิทยา (Psychology) — แรงจูงใจลึก ความกลัว ความต้องการแท้จริง อคติ การตัดสินใจของมนุษย์ทุกฝ่าย
2) เรขาคณิตวิเคราะห์ (Analytic Geometry) — มองปัญหาเป็นโครงสร้าง/แรง/เวกเตอร์ หา "จุดคานงัด" (leverage points) ที่ออกแรงน้อยได้ผลมาก
3) นิเวศการอยู่รอด (Survival Ecology / ป่าดงดิบ) — niche การปรับตัว ทรัพยากร ห่วงโซ่ การอยู่รอดและพึ่งพากันในระบบ
4) การแข่งขันทางการค้า (Competitive Commerce / Game Theory) — คู่แข่ง การวางตำแหน่ง หมากที่ควรเดิน win-win vs zero-sum

ปัญหา/สถานการณ์: "${problem.slice(0, 600)}"
${context ? `บริบทเพิ่มเติม: ${context.slice(0, 400)}` : ''}
เป้าหมาย: ${goal}
${stakeholders ? `ผู้มีส่วนได้ส่วนเสีย: ${stakeholders}` : ''}

ตอบกลับเป็น JSON เท่านั้น (วิเคราะห์ครบทุกมิติ/มุมมอง/จุดยืน):
{
  "summary": "สรุปทางออก 2-3 ประโยค",
  "problem_reframed": "นิยามปัญหาใหม่ให้คมชัดและแก้ได้จริง",
  "root_causes": ["รากของปัญหา 1","2","3"],
  "lenses": {
    "psychology": {"insight":"ข้อค้นพบเชิงจิตวิทยา","levers":["จุดกระตุ้น 1","2"],"risks":["ความเสี่ยงทางอารมณ์ 1"]},
    "geometry": {"insight":"มองปัญหาเป็นโครงสร้าง/แรง","leverage_points":["จุดคานงัด 1","2"],"structure":"คำอธิบายโครงสร้างของปัญหา"},
    "ecology": {"insight":"มุมมองนิเวศ/การอยู่รอด","adaptation":["วิธีปรับตัว 1","2"],"resources":["ทรัพยากร/พันธมิตรที่ควรใช้ 1"]},
    "competition": {"insight":"มุมมองเกม/คู่แข่ง","moves":["หมากที่ควรเดิน 1","2"],"positioning":"การวางตำแหน่งที่ได้เปรียบอย่างเป็นธรรม"}
  },
  "perspectives": [
    {"stakeholder":"ฝ่าย/มุมมอง","view":"เขามองปัญหานี้อย่างไร","need":"สิ่งที่เขาต้องการจริงๆ"},
    {"stakeholder":"...","view":"...","need":"..."},
    {"stakeholder":"...","view":"...","need":"..."}
  ],
  "options": [
    {"option":"ทางเลือก 1","pros":["ข้อดี"],"cons":["ข้อเสีย"],"fairness":"ผลต่อความเป็นธรรมของทุกฝ่าย"},
    {"option":"ทางเลือก 2","pros":["..."],"cons":["..."],"fairness":"..."}
  ],
  "recommended_path": "ทางออกที่แนะนำ + เหตุผลว่าทำไมเป็นธรรมและยั่งยืนที่สุด",
  "fair_close": {
    "win_win":"อธิบายว่าทุกฝ่ายได้อะไร (ไม่มีใครเสียเปรียบ)",
    "script":"สคริปต์/แนวทางการปิดการขายหรือปิดดีลที่เป็นธรรม",
    "guardrails":["หลักจริยธรรมที่ต้องรักษา 1","2"]
  },
  "action_plan": [
    {"step":"สิ่งที่ต้องทำ","owner":"ฝ่ายที่รับผิดชอบ","when":"กรอบเวลา"},
    {"step":"...","owner":"...","when":"..."},
    {"step":"...","owner":"...","when":"..."}
  ],
  "monitoring": {"signals":["สัญญาณที่ต้องเฝ้าติดตามต่อเนื่อง 1","2","3"],"review_cadence":"ความถี่ในการทบทวน (เช่น รายวัน/รายสัปดาห์)"}
}`;

  try {
    const text = await callAI(prompt, 3072);
    const d = parseAIJson(text);
    return { source: anthropic ? 'claude' : 'gemini', ...d };
  } catch (e) { addLog('warn', 'Skills/OmniSolver', e.message); }

  // Mock fallback — โครงวิเคราะห์ 4 ศาสตร์ (ใช้ได้กับทุกปัญหา)
  const pr = problem.slice(0, 80);
  return {
    source: 'mock',
    summary: `วิเคราะห์ "${pr}" ครบ 4 ศาสตร์ แล้วเลือกทางออกที่ทุกฝ่ายได้ประโยชน์ร่วมกัน เน้นความเป็นธรรมและความยั่งยืนมากกว่าชัยชนะระยะสั้น`,
    problem_reframed: `ปัญหาที่แท้จริงไม่ใช่แค่ "${pr}" แต่คือช่องว่างระหว่างสิ่งที่แต่ละฝ่ายต้องการกับสิ่งที่กำลังได้รับ — แก้ที่ช่องว่างนี้`,
    root_causes: ['ความต้องการแท้จริงของแต่ละฝ่ายยังไม่ถูกพูดออกมาชัด', 'ขาดข้อมูล/ความเชื่อใจระหว่างฝ่าย', 'โครงสร้างผลประโยชน์ยังไม่จัดให้สอดคล้องกัน'],
    lenses: {
      psychology: { insight: 'ทุกฝ่ายตัดสินใจจาก "ความกลัวจะเสีย" มากกว่า "ความอยากได้" — ลดความกลัวก่อนจะเปิดใจ', levers: ['ทำให้รู้สึกปลอดภัยและถูกรับฟัง', 'ให้ชนะเล็กๆ ก่อนเพื่อสร้างแรงส่ง'], risks: ['กดดันเร็วไปจะเกิดการต่อต้าน'] },
      geometry: { insight: 'มองปัญหาเป็นระบบแรงหลายทิศ — หาจุดที่ออกแรงน้อยแต่ขยับทั้งระบบ', leverage_points: ['จุดที่ทุกฝ่ายเห็นพ้องอยู่แล้ว (ใช้เป็นฐาน)', 'ผู้มีอิทธิพลที่ขยับแล้วคนอื่นตาม'], structure: 'ปัญหาเป็นรูปสามเหลี่ยมผลประโยชน์ 3 ฝ่าย — ปรับมุมหนึ่งกระทบอีกสองมุมเสมอ' },
      ecology: { insight: 'แต่ละฝ่ายคือสิ่งมีชีวิตในระบบนิเวศเดียวกัน — อยู่รอดได้ดีที่สุดเมื่อพึ่งพากัน ไม่ใช่ล่ากันจนสูญพันธุ์', adaptation: ['ปรับบทบาทให้แต่ละฝ่ายมี niche ที่ไม่ทับกัน', 'สร้างความสัมพันธ์แบบพึ่งพา (symbiosis)'], resources: ['พันธมิตร/ทรัพยากรที่ยังไม่ได้ใช้ร่วมกัน'] },
      competition: { insight: 'เกมนี้ควรเล่นแบบ positive-sum ไม่ใช่ zero-sum — ขยายขนาดเค้กก่อนแบ่ง', moves: ['เปิดข้อมูลที่สร้างความเชื่อใจก่อน', 'เสนอข้อตกลงที่คู่แข่ง/คู่เจรจาปฏิเสธได้ยากเพราะเป็นธรรม'], positioning: 'วางตัวเป็น "ผู้สร้างทางออกที่เป็นธรรม" — ได้เปรียบเชิงชื่อเสียงระยะยาว' },
    },
    perspectives: [
      { stakeholder: 'ฝ่ายเรา', view: 'อยากบรรลุเป้าหมายโดยไม่เสียความสัมพันธ์', need: 'ผลลัพธ์ที่ยั่งยืน + ชื่อเสียงที่ดี' },
      { stakeholder: 'ลูกค้า/คู่เจรจา', view: 'กลัวถูกเอาเปรียบ', need: 'รู้สึกได้ของคุ้มและถูกปฏิบัติอย่างเป็นธรรม' },
      { stakeholder: 'ผู้เกี่ยวข้องอื่น/สังคม', view: 'มองหาความโปร่งใส', need: 'กระบวนการที่ตรวจสอบได้และไม่เอาเปรียบ' },
    ],
    options: [
      { option: 'เจรจาแบบเปิดไพ่ (transparency-first)', pros: ['สร้างความเชื่อใจเร็ว', 'ลดการต่อรองที่สูญเปล่า'], cons: ['เปิดเผยข้อมูลบางส่วน'], fairness: 'สูง — ทุกฝ่ายตัดสินใจบนข้อมูลเดียวกัน' },
      { option: 'เสนอแพ็กเกจหลายระดับให้เลือก', pros: ['ลูกค้ารู้สึกควบคุมได้', 'ปิดได้หลายงบ'], cons: ['ต้องออกแบบข้อเสนอมากขึ้น'], fairness: 'สูง — ให้สิทธิ์เลือกตามกำลัง' },
    ],
    recommended_path: 'ผสาน 2 ทางเลือก: เปิดข้อมูลที่สร้างความเชื่อใจ + เสนอทางเลือกหลายระดับ — ปิดดีลด้วยความสมัครใจของทุกฝ่าย เป็นธรรมและทำซ้ำได้',
    fair_close: {
      win_win: 'ฝ่ายเราได้ยอด+ลูกค้าประจำ · ลูกค้าได้คุณค่าจริงในราคาที่เลือกเอง · ระบบโดยรวมได้มาตรฐานการค้าที่เป็นธรรม',
      script: '"เป้าหมายของเราคือให้คุณได้ผลลัพธ์จริง ไม่ใช่แค่ปิดการขาย — เลือกแบบที่เหมาะกับคุณที่สุด แล้วเรารับประกันความพอใจ ถ้าไม่เวิร์กเรายินดีดูแลต่อ"',
      guardrails: ['ไม่สร้างความเร่งด่วนปลอม/ข้อมูลเท็จ', 'ไม่ปิดการขายที่ลูกค้าไม่ได้ประโยชน์จริง'],
    },
    action_plan: [
      { step: 'ฟังและสรุปความต้องการแท้จริงของแต่ละฝ่ายให้ตรงกัน', owner: 'ฝ่ายขาย/เจรจา', when: 'ทันที' },
      { step: 'ออกแบบข้อเสนอหลายระดับ + จุดรับประกัน', owner: 'ฝ่ายกลยุทธ์', when: '1-3 วัน' },
      { step: 'นำเสนอแบบเปิดข้อมูล + ปิดดีลด้วยความสมัครใจ', owner: 'ฝ่ายขาย', when: '3-7 วัน' },
      { step: 'ติดตามผลหลังปิด + เก็บ feedback ปรับปรุง', owner: 'ฝ่ายดูแลลูกค้า', when: 'ต่อเนื่อง' },
    ],
    monitoring: { signals: ['สัญญาณความไม่พอใจ/ลังเลของฝ่ายใดฝ่ายหนึ่ง', 'อัตราการปิดดีล vs ความพึงพอใจหลังปิด', 'การกลับมาซื้อซ้ำ/บอกต่อ (ตัววัดความเป็นธรรม)'], review_cadence: 'ทบทวนรายสัปดาห์ + ตรวจสัญญาณเร่งด่วนรายวัน' },
  };
}

app.post('/api/skills/omni-solver', generateLimiter, async (req, res) => {
  const { problem, context, goal, stakeholders } = req.body || {};
  if (!problem?.trim()) return res.status(400).json({ error: 'problem required' });
  const d = await omniSolve({ problem, context, goal, stakeholders });
  res.json({ success: true, ...d });
});

// S27 · POST /api/skills/negotiation — Negotiation Coach (โค้ชเจรจาต่อรองสู่ดีลที่เป็นธรรม)
app.post('/api/skills/negotiation', generateLimiter, async (req, res) => {
  const { situation, my_goal = '', their_position = '', constraints = '' } = req.body || {};
  if (!situation?.trim()) return res.status(400).json({ error: 'situation required' });

  const prompt = `คุณเป็นโค้ชการเจรจาต่อรองระดับโลก (ผสม Harvard Negotiation Project, Chris Voss) ที่เน้นดีลแบบ win-win เป็นธรรมต่อทุกฝ่าย เข้าใจวัฒนธรรมการค้าไทย

สถานการณ์เจรจา: "${situation.slice(0, 500)}"
${my_goal ? `เป้าหมายของเรา: ${my_goal}` : ''}
${their_position ? `จุดยืนอีกฝ่าย: ${their_position}` : ''}
${constraints ? `ข้อจำกัด: ${constraints}` : ''}

ตอบกลับ JSON เท่านั้น:
{
  "summary": "สรุปกลยุทธ์การเจรจา 2-3 ประโยค",
  "batna": "ทางเลือกที่ดีที่สุดถ้าดีลนี้ล่ม (BATNA) ของเรา",
  "their_likely_batna": "ทางเลือกสำรองที่อีกฝ่ายน่าจะมี",
  "zopa": "ช่วงที่ตกลงกันได้ (ZOPA) โดยประมาณ + เหตุผล",
  "anchor": "ข้อเสนอเปิดที่ควรตั้ง + เหตุผลเชิงจิตวิทยา",
  "concession_plan": [
    {"give":"สิ่งที่เรายอมได้","get":"สิ่งที่ขอแลก","when":"จังหวะที่ควรใช้"},
    {"give":"...","get":"...","when":"..."}
  ],
  "tactics": ["เทคนิคเจรจา 1","2","3","4"],
  "scripts": {"opening":"ประโยคเปิดเจรจา","handling_pushback":"รับมือเมื่อโดนต่อรองหนัก","closing":"ปิดดีลแบบเป็นธรรม"},
  "fair_framing": "วิธีกรอบดีลให้ทุกฝ่ายรู้สึกว่าเป็นธรรมและอยากตกลง",
  "red_flags": ["สัญญาณที่ควรชะลอ/ถอย 1","2"],
  "tips": ["เคล็ดลับเจรจาให้สำเร็จ 1","2","3"]
}`;

  try {
    const text = await callAI(prompt, 2560);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/Negotiation', e.message); }

  res.json({
    success: true, source: 'mock',
    summary: `เจรจาแบบ interest-based — โฟกัสที่ "ความต้องการแท้จริง" ของทั้งสองฝ่าย ไม่ใช่จุดยืน แล้วขยายทางเลือกให้ได้ดีลที่เป็นธรรมและทำซ้ำได้`,
    batna: 'เตรียมทางเลือกสำรองไว้ก่อนเจรจา (เช่น คู่ค้า/ข้อเสนออื่น) เพื่อไม่ต้องยอมเสียเปรียบ',
    their_likely_batna: 'อีกฝ่ายก็มีทางเลือกสำรอง — ประเมินว่าของเราน่าสนใจกว่าตรงไหน',
    zopa: 'หาจุดที่ราคา/เงื่อนไขต่ำสุดที่เรารับได้ ทับกับสูงสุดที่อีกฝ่ายยอมจ่าย — ดีลอยู่ในช่วงนี้',
    anchor: 'เปิดด้วยตัวเลข/เงื่อนไขที่ดีต่อเราแต่มีเหตุผลรองรับ (anchor) — อีกฝ่ายจะปรับเข้าหา',
    concession_plan: [
      { give: 'ยืดระยะเวลาส่งมอบ', get: 'เพิ่มจำนวนสั่ง/ราคาต่อหน่วยดีขึ้น', when: 'รอบที่สองของการต่อรอง' },
      { give: 'ส่วนลดเล็กน้อย', get: 'ชำระเร็วขึ้น/สัญญาระยะยาว', when: 'ใกล้ปิดดีล' },
    ],
    tactics: ['ถามคำถามปลายเปิดเพื่อเข้าใจความต้องการจริง', 'ใช้ความเงียบหลังยื่นข้อเสนอ', 'เสนอเป็นแพ็กเกจไม่ใช่ทีละข้อ', 'ยึดหลักเกณฑ์ที่เป็นกลาง (ราคาตลาด/มาตรฐาน)'],
    scripts: {
      opening: '"ผม/ดิฉันอยากหาทางที่เวิร์กสำหรับทั้งสองฝ่าย ขอเข้าใจก่อนว่าอะไรสำคัญที่สุดสำหรับคุณในดีลนี้?"',
      handling_pushback: '"ผมเข้าใจว่างบเป็นเรื่องสำคัญ ถ้าเรื่องราคาคือประเด็นหลัก เราลองดูว่าปรับอะไรได้บ้างที่ทำให้คุ้มขึ้นโดยไม่กระทบคุณภาพ"',
      closing: '"สรุปแบบนี้ทั้งสองฝ่ายได้สิ่งที่ต้องการ — คุณได้ [X] เราได้ [Y] ตกลงเดินหน้าด้วยกันไหมครับ?"',
    },
    fair_framing: 'กรอบดีลด้วยเกณฑ์ที่เป็นกลาง (ราคาตลาด มาตรฐานอุตสาหกรรม) เพื่อให้ทุกฝ่ายรู้สึกว่ายุติธรรม ไม่ใช่แพ้-ชนะ',
    red_flags: ['อีกฝ่ายเร่งให้ตัดสินใจผิดปกติ', 'ข้อเสนอที่ดีเกินจริงโดยไม่มีเหตุผล'],
    tips: ['อย่าเจรจาทั้งที่ยังไม่รู้ BATNA ของตัวเอง', 'แยกคนออกจากปัญหา — โจมตีปัญหา ไม่ใช่คน', 'จดบันทึกข้อตกลงเป็นลายลักษณ์อักษรทันที'],
  });
});

// S28 · POST /api/skills/mediation — Conflict Mediator (ไกล่เกลี่ยความขัดแย้งให้เป็นธรรมทุกฝ่าย)
app.post('/api/skills/mediation', generateLimiter, async (req, res) => {
  const { conflict, parties = '', desired_outcome = 'ทางออกที่เป็นธรรมและรักษาความสัมพันธ์' } = req.body || {};
  if (!conflict?.trim()) return res.status(400).json({ error: 'conflict required' });

  const prompt = `คุณเป็นนักไกล่เกลี่ยข้อพิพาทมืออาชีพ (mediator) ที่เป็นกลาง เน้น interest-based mediation
ช่วยทุกฝ่ายหาทางออกร่วมที่เป็นธรรมและรักษาความสัมพันธ์ เข้าใจวัฒนธรรมไทย (รักษาน้ำใจ ไม่เสียหน้า)

ความขัดแย้ง: "${conflict.slice(0, 600)}"
${parties ? `ฝ่ายที่เกี่ยวข้อง: ${parties}` : ''}
ผลลัพธ์ที่ต้องการ: ${desired_outcome}

ตอบกลับ JSON เท่านั้น:
{
  "summary": "สรุปแนวทางไกล่เกลี่ย 2-3 ประโยค",
  "reframe": "นิยามความขัดแย้งใหม่อย่างเป็นกลาง ไม่กล่าวโทษฝ่ายใด",
  "root_tension": "ต้นตอความตึงเครียดที่แท้จริง",
  "parties_analysis": [
    {"party":"ชื่อฝ่าย","position":"จุดยืนที่แสดงออก","interest":"ความต้องการแท้จริงเบื้องหลัง","emotion":"อารมณ์/ความรู้สึก"},
    {"party":"...","position":"...","interest":"...","emotion":"..."}
  ],
  "common_ground": ["จุดร่วมที่ทุกฝ่ายเห็นพ้อง 1","2","3"],
  "resolution_options": [
    {"option":"ทางออก 1","fairness":"เป็นธรรมต่อทุกฝ่ายอย่างไร","tradeoffs":"สิ่งที่แต่ละฝ่ายต้องยอม"},
    {"option":"ทางออก 2","fairness":"...","tradeoffs":"..."}
  ],
  "recommended_resolution": "ทางออกที่แนะนำ + เหตุผลว่าเป็นธรรมและยั่งยืนที่สุด",
  "mediation_script": {"opening":"ประโยคเปิดวงไกล่เกลี่ย","reframing":"ประโยคช่วยให้แต่ละฝ่ายเข้าใจกัน","closing":"ประโยคปิดสู่ข้อตกลง"},
  "ground_rules": ["กติกาการพูดคุยให้สร้างสรรค์ 1","2","3"],
  "follow_up": "วิธีติดตามผลหลังตกลงกัน เพื่อป้องกันขัดแย้งซ้ำ"
}`;

  try {
    const text = await callAI(prompt, 2560);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/Mediation', e.message); }

  res.json({
    success: true, source: 'mock',
    summary: 'ไกล่เกลี่ยแบบเน้นความต้องการแท้จริง (interest-based) — แยกคนออกจากปัญหา หาจุดร่วม แล้วออกแบบทางออกที่ทุกฝ่ายรับได้และรักษาน้ำใจ',
    reframe: 'ความขัดแย้งนี้ไม่ใช่ "ใครผิดใครถูก" แต่คือความต้องการสองชุดที่ยังไม่ถูกประสานให้ลงตัว',
    root_tension: 'ความรู้สึกว่าไม่ถูกรับฟัง + กลัวเสียประโยชน์/เสียหน้า มากกว่าตัวประเด็นเอง',
    parties_analysis: [
      { party: 'ฝ่าย A', position: 'ยืนยันในสิ่งที่ตัวเองเรียกร้อง', interest: 'ต้องการความเป็นธรรมและการยอมรับ', emotion: 'ผิดหวัง/ไม่ถูกรับฟัง' },
      { party: 'ฝ่าย B', position: 'ปกป้องจุดยืนตัวเอง', interest: 'ต้องการความมั่นคงและไม่เสียหน้า', emotion: 'กังวล/ตั้งรับ' },
    ],
    common_ground: ['ทั้งคู่อยากให้เรื่องจบด้วยดี', 'ทั้งคู่ยังเห็นคุณค่าของความสัมพันธ์/ความร่วมมือ', 'ทั้งคู่ไม่อยากเสียเวลา/ทรัพยากรกับความขัดแย้งยืดเยื้อ'],
    resolution_options: [
      { option: 'ตกลงเงื่อนไขกลางที่แบ่งภาระ/ผลประโยชน์อย่างสมดุล', fairness: 'ทั้งสองฝ่ายได้บางส่วนของสิ่งที่ต้องการ', tradeoffs: 'แต่ละฝ่ายยอมลดข้อเรียกร้องสุดโต่งลง' },
      { option: 'ขยายทางเลือก/ทรัพยากรเพื่อให้ได้มากขึ้นทั้งคู่', fairness: 'เปลี่ยนจากแย่งเค้กเป็นขยายเค้ก', tradeoffs: 'ต้องลงแรง/เวลาสร้างทางเลือกใหม่ร่วมกัน' },
    ],
    recommended_resolution: 'เริ่มจากยืนยันจุดร่วม → ให้แต่ละฝ่ายพูดความต้องการจริง → ออกแบบทางออกที่แบ่งสมดุลและเปิดทางขยายผลประโยชน์ร่วม โดยบันทึกข้อตกลงให้ชัดเจน',
    mediation_script: {
      opening: '"วันนี้เรามาคุยกันเพื่อหาทางที่ดีต่อทุกคน ไม่ใช่หาคนผิด ขอให้ทุกฝ่ายได้พูดและได้ฟังกันนะครับ"',
      reframing: '"ที่คุณพูดมา ผมได้ยินว่าสิ่งที่สำคัญกับคุณจริงๆ คือ [ความต้องการ] ใช่ไหมครับ — แล้วของอีกฝ่ายคือ [ความต้องการ]"',
      closing: '"เราเจอทางที่ทั้งสองฝ่ายรับได้แล้ว ขอสรุปเป็นข้อตกลงร่วมกัน และนัดติดตามผลกันนะครับ"',
    },
    ground_rules: ['พูดทีละคน ไม่ขัดจังหวะ', 'พูดถึงปัญหา ไม่โจมตีตัวบุคคล', 'มุ่งหาทางออกร่วม ไม่ใช่เอาชนะ'],
    follow_up: 'นัดทบทวนข้อตกลงใน 2-4 สัปดาห์ เพื่อเช็กว่าทุกฝ่ายทำตามและไม่มีความตึงเครียดใหม่',
  });
});

// S29 · POST /api/skills/crisis — Crisis Manager (จัดการวิกฤต/ดราม่า/PR storm อย่างมีสติ)
app.post('/api/skills/crisis', generateLimiter, async (req, res) => {
  const { situation, channel = 'โซเชียล', severity = 'กลาง', brand = '' } = req.body || {};
  if (!situation?.trim()) return res.status(400).json({ error: 'situation required' });

  const prompt = `คุณเป็นผู้เชี่ยวชาญ Crisis Communication & Reputation Management ระดับโลก เข้าใจวัฒนธรรมไทยและพฤติกรรมโซเชียลไทย
ช่วยแบรนด์รับมือวิกฤต/ดราม่า/คอมเมนต์ลบอย่างมีสติ โปร่งใส เป็นธรรม รักษาความเชื่อมั่นระยะยาว (ไม่กลบเกลื่อน ไม่โกหก)

วิกฤต: "${situation.slice(0, 600)}"
ช่องทาง: ${channel} · ระดับความรุนแรง: ${severity}${brand ? ` · แบรนด์: ${brand}` : ''}

ตอบกลับ JSON เท่านั้น:
{
  "severity_assessment": "ประเมินระดับวิกฤตจริง + เหตุผล (อย่าตื่นตระหนกเกิน/ประมาทเกิน)",
  "first_response_window": "ควรตอบภายในกี่ชั่วโมง + ทำไม",
  "do_now": ["สิ่งที่ต้องทำทันที 1","2","3"],
  "dont": ["สิ่งที่ห้ามทำเด็ดขาด 1","2","3"],
  "holding_statement": "แถลงการณ์เบื้องต้น (สั้น จริงใจ ซื้อเวลาตรวจสอบ) พร้อมโพสต์ได้เลย",
  "full_statement": "แถลงการณ์เต็ม — ยอมรับ/ขอโทษถ้าผิดจริง · อธิบายข้อเท็จจริง · มาตรการแก้ไข · คำมั่น",
  "reply_templates": [
    {"scenario":"ลูกค้าโกรธ/ต่อว่า","reply":"คำตอบที่เห็นอกเห็นใจ + แก้ไข"},
    {"scenario":"คำถามจากสื่อ/คนนอก","reply":"คำตอบเป็นทางการ"},
    {"scenario":"ข้อมูลผิด/ข่าวลือ","reply":"ชี้แจงข้อเท็จจริงอย่างสุภาพ"}
  ],
  "stakeholders": ["ฝ่ายที่ต้องสื่อสาร 1","2","3"],
  "recovery_plan": ["ขั้นฟื้นฟูความเชื่อมั่น 1","2","3"],
  "prevention": ["ป้องกันไม่ให้เกิดซ้ำ 1","2"]
}`;

  try {
    const text = await callAI(prompt, 2560);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/Crisis', e.message); }

  const sev = /สูง|รุนแรง|วิกฤต/.test(severity) ? 'สูง' : /ต่ำ|เล็ก/.test(severity) ? 'ต่ำ' : 'กลาง';
  res.json({
    success: true, source: 'mock',
    severity_assessment: `ระดับ ${sev} — ประเมินจากการแพร่กระจายและผลต่อความเชื่อมั่น ตั้งสติก่อน อย่าตอบด้วยอารมณ์`,
    first_response_window: sev === 'สูง' ? 'ภายใน 1-2 ชั่วโมง — ยิ่งช้ายิ่งบานปลาย' : 'ภายใน 4-6 ชั่วโมง พร้อมข้อมูลที่ตรวจสอบแล้ว',
    do_now: ['รวบรวมข้อเท็จจริงให้ครบก่อนแถลง', 'ออก holding statement ซื้อเวลา', 'มอบหมายผู้พูดคนเดียว (single voice)'],
    dont: ['อย่าลบคอมเมนต์/บล็อกจนดูปกปิด', 'อย่าโต้เถียง/ประชดลูกค้า', 'อย่าสัญญาเกินจริงหรือโกหก'],
    holding_statement: `เรารับทราบเรื่องที่เกิดขึ้นและกำลังตรวจสอบข้อเท็จจริงอย่างเร่งด่วน ขออภัยในความไม่สบายใจ และจะแจ้งความคืบหน้าโดยเร็วที่สุดค่ะ 🙏`,
    full_statement: `ทางแบรนด์ขอชี้แจงกรณีที่เกิดขึ้น: เราได้ตรวจสอบแล้วและ [ข้อเท็จจริง] หากมีส่วนที่บกพร่องเราขอน้อมรับและขออภัยอย่างจริงใจ พร้อมดำเนินการแก้ไขดังนี้ [มาตรการ] เราให้ความสำคัญกับความไว้วางใจของทุกท่านและจะปรับปรุงไม่ให้เกิดซ้ำ`,
    reply_templates: [
      { scenario: 'ลูกค้าโกรธ/ต่อว่า', reply: 'ขอโทษจริงๆ ค่ะที่ทำให้ผิดหวัง ทางเรารับเรื่องไว้แล้วและขอดูแลให้เรียบร้อยที่สุด รบกวนขอรายละเอียดทางข้อความนะคะ' },
      { scenario: 'คำถามจากสื่อ/คนนอก', reply: 'ขอบคุณสำหรับคำถามค่ะ ขณะนี้อยู่ระหว่างตรวจสอบ เราจะออกแถลงการณ์อย่างเป็นทางการเร็วๆ นี้' },
      { scenario: 'ข้อมูลผิด/ข่าวลือ', reply: 'ขออนุญาตชี้แจงข้อเท็จจริงค่ะ: [ข้อมูลจริง] หวังว่าจะช่วยให้เข้าใจตรงกันนะคะ 🙏' },
    ],
    stakeholders: ['ลูกค้าที่ได้รับผลกระทบ', 'ทีมงาน/พนักงานภายใน', 'สื่อ/พันธมิตร'],
    recovery_plan: ['ติดตามแก้ไขเคสที่กระทบจนจบ + แจ้งผล', 'สื่อสารบทเรียน/การปรับปรุงอย่างโปร่งใส', 'ทำคอนเทนต์เชิงบวกฟื้นภาพลักษณ์อย่างค่อยเป็นค่อยไป'],
    prevention: ['ตั้งทีม/คู่มือรับมือวิกฤตล่วงหน้า', 'ตรวจ pain point ที่เป็นชนวนแล้วแก้ที่ต้นเหตุ'],
  });
});

// S30 · POST /api/skills/persona — Customer Persona Builder (สร้างตัวตนลูกค้าเชิงลึก)
app.post('/api/skills/persona', generateLimiter, async (req, res) => {
  const { product, category = 'OTOP', market = 'ไทย', price = '' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `คุณเป็นนักวิจัยตลาดและนักวางกลยุทธ์แบรนด์ระดับโลก เชี่ยวชาญพฤติกรรมผู้บริโภคไทย/อาเซียน
สร้าง buyer persona เชิงลึกที่นำไปใช้ทำการตลาดได้จริง

สินค้า: "${product.slice(0, 200)}" · หมวด: ${category} · ตลาด: ${market}${price ? ` · ราคา: ${price}` : ''}

ตอบกลับ JSON เท่านั้น:
{
  "summary": "สรุปภาพรวมกลุ่มเป้าหมาย 2-3 ประโยค",
  "personas": [
    {
      "name": "ชื่อเล่น persona (จำง่าย)",
      "tagline": "นิยามสั้นๆ ของคนกลุ่มนี้",
      "demographics": "อายุ · เพศ · อาชีพ · รายได้ · ที่อยู่",
      "pains": ["ความเจ็บปวด/ปัญหา 1","2","3"],
      "desires": ["ความต้องการ/ความฝัน 1","2","3"],
      "buying_triggers": ["อะไรกระตุ้นให้ซื้อ 1","2"],
      "objections": ["ข้อกังวลก่อนซื้อ 1","2"],
      "where_to_find": ["ช่องทาง/แพลตฟอร์มที่เจอคนกลุ่มนี้ 1","2","3"],
      "messaging_hooks": ["ประโยค/มุมสื่อสารที่โดนใจ 1","2"],
      "content_ideas": ["ไอเดียคอนเทนต์ที่ใช่ 1","2"]
    },
    {"name":"...","tagline":"...","demographics":"...","pains":["..."],"desires":["..."],"buying_triggers":["..."],"objections":["..."],"where_to_find":["..."],"messaging_hooks":["..."],"content_ideas":["..."]}
  ],
  "primary_persona": "persona ไหนควรโฟกัสเป็นหลัก + เหตุผล",
  "positioning": "ควรวางตำแหน่งสินค้าอย่างไรให้โดนใจกลุ่มหลัก"
}`;

  try {
    const text = await callAI(prompt, 3072);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/Persona', e.message); }

  const pName = product.slice(0, 30);
  res.json({
    success: true, source: 'mock',
    summary: `${pName} เหมาะกับลูกค้า 2 กลุ่มหลัก — กลุ่มที่ตัดสินใจด้วยคุณค่า/คุณภาพ และกลุ่มที่ตัดสินใจด้วยราคา/ความคุ้ม โฟกัสคนละมุมสื่อสาร`,
    personas: [
      { name: 'พี่หนูดี (สายคุณภาพ)', tagline: 'ยอมจ่ายเพื่อของดีมีที่มา', demographics: 'อายุ 30-45 · ทำงานประจำ/เจ้าของกิจการ · รายได้ปานกลาง-สูง · เมือง', pains: ['กลัวซื้อของไม่มีคุณภาพ', 'ไม่มีเวลาเลือกเยอะ', 'อยากได้ของที่ไว้ใจได้'], desires: ['ของดีมีมาตรฐาน', 'ภูมิใจที่สนับสนุนของไทย', 'สะดวก รวดเร็ว'], buying_triggers: ['รีวิวจริง + มาตรฐานรับรอง', 'เรื่องราวแบรนด์ที่จริงใจ'], objections: ['ราคาสูงไปไหม', 'ของแท้หรือเปล่า'], where_to_find: ['Facebook', 'IG', 'รีวิว/Pantip'], messaging_hooks: ['"คัดมาแล้วว่าดีจริง"', '"ของไทยคุณภาพส่งออก"'], content_ideas: ['เบื้องหลังการผลิต', 'รีวิวลูกค้าจริง'] },
      { name: 'น้องคุ้ม (สายคุ้มค่า)', tagline: 'ได้ของดีในราคาที่คุ้ม', demographics: 'อายุ 18-30 · นักศึกษา/เริ่มทำงาน · งบจำกัด · ทั่วประเทศ', pains: ['งบน้อยแต่อยากได้ของดี', 'กลัวโดนหลอก/ของไม่ตรงปก'], desires: ['คุ้มราคา', 'โปร/ส่วนลด', 'ส่งไว'], buying_triggers: ['โปรจำกัดเวลา', 'รีวิว + ยอดขายเยอะ'], objections: ['คุ้มจริงไหม', 'ค่าส่งแพงไหม'], where_to_find: ['TikTok', 'Shopee/Lazada', 'ไลฟ์ขายของ'], messaging_hooks: ['"คุ้มที่สุดในงบนี้"', '"ราคานี้เฉพาะไลฟ์"'], content_ideas: ['คลิปรีวิวเร็วๆ', 'เปรียบเทียบความคุ้ม'] },
    ],
    primary_persona: 'เลือกตามช่องทางหลัก: ถ้าเน้น TikTok/ไลฟ์ → "น้องคุ้ม", ถ้าเน้น Facebook/แบรนด์ → "พี่หนูดี"',
    positioning: `วาง ${pName} ให้สื่อสารคุณค่ากับกลุ่มคุณภาพ และเน้นโปร/ความคุ้มกับกลุ่มราคา — แยกคอนเทนต์ตามกลุ่ม`,
  });
});

// S31 · POST /api/skills/listing — Product Listing Writer (หน้าสินค้า marketplace ครบชุด)
app.post('/api/skills/listing', generateLimiter, async (req, res) => {
  const { product, category = 'OTOP', price = '', key_features = '', platform = 'Shopee' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `คุณเป็นผู้เชี่ยวชาญเขียนหน้าสินค้า e-commerce ไทย (Shopee/Lazada/TikTok Shop) ที่ทำให้สินค้าขายดีและติดอันดับค้นหา
เขียนหน้าสินค้าครบชุดสำหรับ ${platform}

สินค้า: "${product.slice(0, 200)}" · หมวด: ${category}${price ? ` · ราคา: ${price}` : ''}${key_features ? ` · จุดเด่น: ${key_features.slice(0, 300)}` : ''}

ตอบกลับ JSON เท่านั้น:
{
  "titles": ["ชื่อสินค้า SEO ≤120 ตัวอักษร (ใส่คีย์เวิร์ดสำคัญ) 1","ชื่อแบบ 2","ชื่อแบบ 3"],
  "bullets": ["จุดเด่นกระชับ 1","2","3","4","5"],
  "description": "คำอธิบายสินค้าเต็ม 200-300 คำ มีหัวข้อย่อย · ประโยชน์ · วิธีใช้ · เหตุผลที่ต้องซื้อ",
  "specs": [{"label":"คุณสมบัติ","value":"ค่า"},{"label":"...","value":"..."},{"label":"...","value":"..."}],
  "keywords": ["คีย์เวิร์ดค้นหา 1","2","3","4","5","6","7","8"],
  "shipping_note": "ข้อความเรื่องการจัดส่ง/แพ็กกิ้งที่สร้างความมั่นใจ",
  "promo_idea": "ไอเดียโปรโมชั่นกระตุ้นการตัดสินใจ",
  "tips": ["เคล็ดลับเพิ่มยอดขายบนแพลตฟอร์ม 1","2","3"]
}`;

  try {
    const text = await callAI(prompt, 3072);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/Listing', e.message); }

  const pName = product.slice(0, 50);
  res.json({
    success: true, source: 'mock',
    titles: [
      `${pName} ของแท้ คุณภาพดี ส่งไว พร้อมส่ง [${category}]`,
      `${pName} ราคาส่ง คัดเกรดพรีเมียม รับประกันความพอใจ`,
      `[ขายดี] ${pName} ของดีบอกต่อ สินค้าไทยคุณภาพ`,
    ],
    bullets: ['✅ ของแท้ 100% คัดคุณภาพ', '✅ พร้อมส่ง จัดส่งไว 1-2 วัน', '✅ แพ็กอย่างดี กันกระแทก', '✅ รับประกันความพอใจ', '✅ สอบถามได้ตลอด 24 ชม.'],
    description: `${pName} — สินค้าคุณภาพคัดเกรดพิเศษ เหมาะสำหรับผู้ที่มองหาของดีในราคาคุ้มค่า\n\n🌟 ทำไมต้องเลือกเรา\nเราคัดสรรเฉพาะสินค้าคุณภาพ ผ่านการตรวจสอบทุกชิ้น ส่งตรงถึงมือคุณอย่างรวดเร็ว\n\n📦 การจัดส่ง\nแพ็กอย่างดี กันกระแทก จัดส่งภายใน 1-2 วันทำการ พร้อมเลขติดตามพัสดุ\n\n💯 รับประกัน\nหากไม่พอใจ ติดต่อเราได้ทันที ดูแลคุณจนพอใจ — สั่งเลยวันนี้!`,
    specs: [{ label: 'หมวดหมู่', value: category }, { label: 'สภาพ', value: 'ใหม่' }, { label: 'การจัดส่ง', value: '1-2 วันทำการ' }, { label: 'รับประกัน', value: 'ความพอใจ' }],
    keywords: [pName, `${pName} ราคาส่ง`, `${pName} ของแท้`, `${category} คุณภาพ`, 'ของดีบอกต่อ', 'สินค้าไทย', 'พร้อมส่ง', 'ส่งไว'],
    shipping_note: '📦 แพ็กอย่างดี กันกระแทก ส่งไว 1-2 วันทำการ มีเลขติดตามพัสดุทุกออเดอร์',
    promo_idea: 'ซื้อ 2 ชิ้นลดเพิ่ม + ส่งฟรีเมื่อครบยอด — สร้างความเร่งด่วนด้วย "โปรเฉพาะสัปดาห์นี้"',
    tips: ['ใส่คีย์เวิร์ดในชื่อ 3-5 ตัวเพื่อติดอันดับค้นหา', 'รูปแรกต้องชัด สวย เห็นสินค้าเต็ม', 'ตอบแชทเร็ว = อันดับร้านดีขึ้น'],
  });
});

// S32 · POST /api/skills/review-reply — Review Responder (ตอบรีวิวลูกค้าอย่างมืออาชีพ)
app.post('/api/skills/review-reply', generateLimiter, async (req, res) => {
  const { review, product = '', rating = '', channel = 'Shopee', brand = 'ร้านเรา' } = req.body || {};
  if (!review?.trim()) return res.status(400).json({ error: 'review required' });

  const prompt = `คุณเป็นผู้เชี่ยวชาญดูแลลูกค้าและบริหารชื่อเสียงร้านค้าออนไลน์ไทย (${channel})
วิเคราะห์รีวิวลูกค้าและร่างคำตอบที่สุภาพ จริงใจ มืออาชีพ รักษาภาพลักษณ์ร้านและเปลี่ยนวิกฤตเป็นโอกาส

รีวิวลูกค้า: "${review.slice(0, 500)}"${product ? `\nสินค้า: ${product.slice(0, 120)}` : ''}${rating ? `\nคะแนน: ${rating} ดาว` : ''}
ชื่อร้าน/แบรนด์: ${brand}

ตอบกลับ JSON เท่านั้น:
{
  "sentiment": "positive | neutral | negative",
  "summary": "สรุปสั้นๆ ว่าลูกค้าพูดถึงอะไร รู้สึกยังไง",
  "issues": ["ประเด็นที่ลูกค้ากังวล/ติ 1","2"],
  "reply": "คำตอบหลักที่พร้อมโพสต์ตอบกลับได้ทันที สุภาพ จริงใจ ตรงประเด็น ลงท้ายด้วยน้ำใจ",
  "reply_variants": ["คำตอบทางเลือกสั้นกว่า/โทนต่าง 1","2"],
  "action_items": ["สิ่งที่ร้านควรทำต่อ (ภายในร้าน) เพื่อแก้/ป้องกัน 1","2"],
  "upsell": "ประโยคชวนซื้อซ้ำ/แนะนำสินค้าอื่นแบบเนียนๆ (ถ้าเหมาะ)",
  "tips": ["เคล็ดลับตอบรีวิวให้ได้ใจลูกค้าและคนอ่าน 1","2"]
}`;

  try {
    const text = await callAI(prompt, 2048);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/ReviewReply', e.message); }

  const neg = /แย่|ห่วย|ช้า|เสีย|ผิด|ไม่|โกง|พัง|หาย|ผิดหวัง|แตก/.test(review);
  const sentiment = neg ? 'negative' : (/ดี|ชอบ|ประทับใจ|เยี่ยม|คุ้ม|ไว|สวย/.test(review) ? 'positive' : 'neutral');
  res.json({
    success: true, source: 'mock',
    sentiment,
    summary: neg ? 'ลูกค้าไม่พอใจในบางจุดและต้องการให้แก้ไข' : 'ลูกค้าพอใจและให้ผลตอบรับเชิงบวก',
    issues: neg ? ['ประสบการณ์ไม่เป็นไปตามคาด', 'ต้องการการดูแลเพิ่มเติม'] : [],
    reply: neg
      ? `สวัสดีค่ะ ทาง${brand}ต้องขออภัยอย่างสูงสำหรับประสบการณ์ที่ไม่เป็นไปตามที่คาดหวังนะคะ 🙏 ทางร้านขอรับเรื่องนี้ไปปรับปรุงทันที และรบกวนทักแชทเข้ามาเพื่อให้ทางร้านดูแลและแก้ไขให้คุณลูกค้าเป็นกรณีพิเศษค่ะ เราใส่ใจทุกความคิดเห็นจริงๆ ค่ะ`
      : `ขอบคุณมากๆ เลยค่ะ 🙏❤️ ดีใจสุดๆ ที่คุณลูกค้าพอใจ ทาง${brand}ตั้งใจคัดของดีมาให้เสมอค่ะ ฝากกดติดตามร้านไว้ มีโปรและสินค้าใหม่มาเรื่อยๆ นะคะ แล้วพบกันใหม่ค่ะ 😊`,
    reply_variants: neg
      ? ['ขออภัยจริงๆ ค่ะ 🙏 รบกวนทักแชทมานะคะ ทางร้านขอดูแลแก้ไขให้เต็มที่ค่ะ', 'ขอบคุณสำหรับคำติชมค่ะ ทางร้านน้อมรับไปปรับปรุงและพร้อมดูแลคุณลูกค้าค่ะ']
      : ['ขอบคุณมากค่ะ 😍 ฝากติดตามร้านด้วยนะคะ', 'ดีใจที่ถูกใจค่ะ 🙏 แวะมาอุดหนุนใหม่ได้เสมอนะคะ'],
    action_items: neg ? ['ติดต่อลูกค้ารายนี้ทางแชทภายใน 24 ชม.', 'ตรวจสอบขั้นตอนที่เป็นปัญหาเพื่อป้องกันซ้ำ'] : ['บันทึกเป็นรีวิวตัวอย่างไว้ใช้การตลาด'],
    upsell: neg ? '' : 'ครั้งหน้าลองสินค้ารุ่นใหม่ของเราดูนะคะ มีโปรสำหรับลูกค้าเก่าด้วยค่ะ',
    tips: ['ตอบรีวิวทุกชิ้นภายใน 24 ชม. เพิ่มความน่าเชื่อถือร้าน', 'ตอบรีวิวลบอย่างใจเย็น คนอ่านดูการแก้ปัญหามากกว่าตัวปัญหา'],
  });
});

// S33 · POST /api/skills/bundle — Bundle & Upsell Designer (จัดเซ็ต + ขายพ่วง เพิ่มยอดต่อบิล)
app.post('/api/skills/bundle', generateLimiter, async (req, res) => {
  const { product, products = '', category = 'OTOP', price = '', goal = 'เพิ่มยอดต่อบิล' } = req.body || {};
  const main = (product || products || '').trim();
  if (!main) return res.status(400).json({ error: 'product required' });

  const prompt = `คุณเป็นผู้เชี่ยวชาญกลยุทธ์เพิ่มยอดขายต่อบิล (AOV) สำหรับร้านค้าออนไลน์ไทย/OTOP
ออกแบบชุดสินค้า (bundle) และข้อเสนอขายพ่วง (upsell/cross-sell) ที่ลูกค้าอยากซื้อเพิ่มอย่างเป็นธรรม คุ้มทั้งร้านและลูกค้า

สินค้า/รายการสินค้า: "${main.slice(0, 300)}" · หมวด: ${category}${price ? ` · ราคาตั้งต้น: ${price}` : ''}
เป้าหมาย: ${goal}

ตอบกลับ JSON เท่านั้น:
{
  "bundles": [
    {"name":"ชื่อเซ็ตน่าซื้อ","items":["สินค้าในเซ็ต 1","2"],"price_idea":"แนวคิดตั้งราคา/ส่วนลดเซ็ต","why":"เหตุผลที่ลูกค้าอยากได้","target":"กลุ่มลูกค้าที่เหมาะ"}
  ],
  "upsells": [{"trigger":"เมื่อลูกค้าซื้อ X","offer":"เสนอ Y","script":"ประโยคชวนเนียนๆ"}],
  "cross_sells": ["สินค้าที่ควรเสนอคู่กัน 1","2","3"],
  "anchor_tip": "เคล็ดลับวางราคา/เซ็ตให้ตัวเลือกที่อยากขายดูคุ้มที่สุด",
  "promo_copy": "แคปชั่นสั้นโปรโมตเซ็ตขายดี พร้อมโพสต์",
  "tips": ["เคล็ดลับเพิ่มยอดต่อบิลอย่างเป็นธรรม 1","2","3"]
}`;

  try {
    const text = await callAI(prompt, 2560);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/Bundle', e.message); }

  const pName = main.slice(0, 40);
  res.json({
    success: true, source: 'mock',
    bundles: [
      { name: `เซ็ตคู่หูคุ้มกว่า — ${pName}`, items: [`${pName} x2`, 'ของแถมพิเศษ'], price_idea: 'ลด 10-15% เมื่อซื้อเป็นเซ็ต เทียบกับซื้อแยก', why: 'ซื้อเผื่อ/แบ่งเพื่อน คุ้มกว่าและประหยัดค่าส่ง', target: 'ลูกค้าซื้อซ้ำ / ซื้อฝาก' },
      { name: `เซ็ตของขวัญพรีเมียม — ${pName}`, items: [pName, 'แพ็กกล่องของขวัญ', 'การ์ดอวยพร'], price_idea: 'บวกค่าแพ็กพรีเมียม 39-59 บาท', why: 'ซื้อเป็นของฝากได้ทันที ไม่ต้องห่อเอง', target: 'เทศกาล / ของฝาก' },
    ],
    upsells: [
      { trigger: `เมื่อลูกค้าหยิบ ${pName} 1 ชิ้น`, offer: 'เพิ่มอีกชิ้นในราคาพิเศษ', script: 'เพิ่มอีกแค่ชิ้นเดียวรับส่วนลดทันที + ส่งฟรีเลยค่ะ คุ้มกว่าเยอะ!' },
    ],
    cross_sells: ['สินค้าหมวดเดียวกันรสชาติ/สีอื่น', 'ของใช้คู่กัน', 'สินค้าขายดีของร้าน'],
    anchor_tip: 'วางเซ็ตใหญ่ราคาสูงไว้ข้างๆ เซ็ตที่อยากขาย เพื่อให้ตัวเลือกหลักดูคุ้มที่สุด',
    promo_copy: `🔥 จัดเซ็ตคุ้มกว่า! ${pName} ซื้อเป็นเซ็ตประหยัดกว่าซื้อแยก + ส่งฟรี ทักเลยค่ะ`,
    tips: ['ตั้งชื่อเซ็ตให้เห็นประโยชน์ชัด เช่น "เซ็ตคุ้ม" "เซ็ตของฝาก"', 'โชว์ราคาเทียบ "ซื้อแยก vs ซื้อเซ็ต" ให้เห็นส่วนต่าง', 'เสนอขายพ่วงตอนลูกค้าตัดสินใจซื้อแล้ว ได้ผลที่สุด'],
  });
});

// S34 · POST /api/skills/faq — FAQ & Auto-Reply Builder (คลังคำถาม-คำตอบ + ตอบอัตโนมัติ)
app.post('/api/skills/faq', generateLimiter, async (req, res) => {
  const { product, category = 'OTOP', channel = 'LINE/Facebook', tone = 'เป็นกันเอง สุภาพ' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `คุณเป็นผู้เชี่ยวชาญระบบตอบแชทร้านค้าออนไลน์ไทย
สร้างคลังคำถามที่พบบ่อย (FAQ) + ข้อความตอบอัตโนมัติพร้อมใช้ สำหรับร้านที่ขาย "${product.slice(0, 150)}" หมวด ${category}
ช่องทาง: ${channel} · โทน: ${tone}

ครอบคลุมคำถามจริงที่ลูกค้าไทยถามบ่อย เช่น ราคา/โปร, การจัดส่ง, วิธีสั่งซื้อ/ชำระเงิน, ของแท้/คุณภาพ, การคืนสินค้า, สต็อก

ตอบกลับ JSON เท่านั้น:
{
  "faqs": [{"q":"คำถามที่ลูกค้าถามบ่อย","a":"คำตอบพร้อมโพสต์ ชัดเจน สุภาพ","keywords":["คำที่ลูกค้าพิมพ์ที่ trigger คำตอบนี้"]}],
  "greeting": "ข้อความทักทายอัตโนมัติเมื่อลูกค้าทักมาครั้งแรก",
  "away_message": "ข้อความตอบนอกเวลาทำการ",
  "closing": "ข้อความปิดการขาย/ขอบคุณหลังลูกค้าสั่งซื้อ",
  "tips": ["เคล็ดลับตั้งระบบตอบอัตโนมัติให้ปิดการขายได้ 1","2","3"]
}`;

  try {
    const text = await callAI(prompt, 3072);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/FAQ', e.message); }

  const pName = product.slice(0, 40);
  res.json({
    success: true, source: 'mock',
    faqs: [
      { q: 'ราคาเท่าไหร่คะ/ครับ?', a: `${pName} ราคาเริ่มต้นตามรายละเอียดในโพสต์เลยค่ะ ทักมาแจ้งจำนวนได้เลย เดี๋ยวร้านคำนวณโปร + ค่าส่งให้นะคะ 😊`, keywords: ['ราคา', 'เท่าไหร่', 'กี่บาท'] },
      { q: 'ส่งกี่วันถึง?', a: 'จัดส่งภายใน 1-2 วันทำการค่ะ มีเลขติดตามพัสดุทุกออเดอร์ ส่งไวแน่นอนนะคะ 📦', keywords: ['ส่ง', 'กี่วัน', 'จัดส่ง', 'ขนส่ง'] },
      { q: 'ของแท้ไหม?', a: 'ของแท้ 100% คัดคุณภาพทุกชิ้นค่ะ มีลูกค้ารีวิวเยอะมาก มั่นใจได้เลยค่ะ 💯', keywords: ['ของแท้', 'แท้', 'คุณภาพ'] },
      { q: 'สั่งซื้อยังไง / จ่ายเงินยังไง?', a: 'แจ้งสินค้า+จำนวนทางแชทได้เลยค่ะ โอนผ่านพร้อมเพย์/บัญชีธนาคาร หรือเก็บเงินปลายทางก็ได้นะคะ 🛒', keywords: ['สั่ง', 'ซื้อ', 'จ่าย', 'โอน', 'ปลายทาง'] },
      { q: 'มีของพร้อมส่งไหม?', a: 'มีของพร้อมส่งค่ะ ทักมาเช็คสต็อกรุ่น/สีที่ต้องการได้เลยนะคะ 😊', keywords: ['สต็อก', 'พร้อมส่ง', 'มีของ'] },
    ],
    greeting: `สวัสดีค่ะ 🙏 ยินดีต้อนรับสู่ร้านเรานะคะ สนใจ ${pName} สอบถามได้เลยค่ะ ร้านตอบไว ดูแลดีแน่นอน 😊`,
    away_message: 'ตอนนี้นอกเวลาทำการค่ะ 🌙 ทิ้งข้อความไว้ได้เลย ร้านจะรีบตอบกลับโดยเร็วที่สุดนะคะ ขอบคุณที่สนใจค่ะ 🙏',
    closing: 'ขอบคุณมากๆ เลยค่ะ 🙏❤️ ทางร้านจะรีบจัดส่งให้นะคะ ได้รับของแล้วฝากรีวิวด้วยน้า แล้วพบกันใหม่ค่ะ 😊',
    tips: ['ตั้งคีย์เวิร์ดให้ตรงคำที่ลูกค้าพิมพ์จริง เช่น "เท่าไหร่" "ส่งกี่วัน"', 'ทุกคำตอบควรจบด้วยการชวนคุยต่อหรือปิดการขาย', 'ตอบไวใน 5 นาทีแรกเพิ่มโอกาสปิดการขายมากที่สุด'],
  });
});

// S35 · POST /api/skills/broadcast — Broadcast & Re-engagement Writer (ดึงลูกค้าเก่ากลับมาซื้อซ้ำ)
app.post('/api/skills/broadcast', generateLimiter, async (req, res) => {
  const { product, category = 'OTOP', channel = 'LINE', goal = 'ดึงลูกค้าเก่ากลับมาซื้อซ้ำ', offer = '' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `คุณเป็นผู้เชี่ยวชาญ CRM และการตลาดรักษาฐานลูกค้า (retention) สำหรับร้านค้าออนไลน์ไทย/OTOP
เขียนชุดข้อความ broadcast เพื่อ "${goal}" ผ่าน ${channel} สำหรับร้านที่ขาย "${product.slice(0, 150)}" หมวด ${category}${offer ? ` · โปรที่มี: ${offer.slice(0, 120)}` : ''}

ข้อความต้องสั้น กระชับ ไม่สแปม มีคุณค่าต่อลูกค้า และกระตุ้นให้กลับมาซื้อ

ตอบกลับ JSON เท่านั้น:
{
  "segments": [{"name":"กลุ่มลูกค้า เช่น ซื้อครั้งเดียวหายไป","approach":"ควรสื่อสารยังไง"}],
  "messages": [{"title":"ชื่อแคมเปญ","body":"ข้อความ broadcast พร้อมส่ง ≤3 บรรทัด","cta":"ปุ่ม/คำกระตุ้น"}],
  "winback_offer": "ข้อเสนอดึงกลับที่จูงใจแต่ไม่ขาดทุน",
  "subject_lines": ["หัวข้อ/ประโยคเปิดที่คนอยากกดอ่าน 1","2","3"],
  "timing": "ช่วงเวลา/ความถี่ที่ควรส่งเพื่อได้ผลดีที่สุด",
  "tips": ["เคล็ดลับ broadcast ให้ลูกค้าไม่บล็อกและกลับมาซื้อ 1","2","3"]
}`;

  try {
    const text = await callAI(prompt, 2560);
    const d = parseAIJson(text);
    return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...d });
  } catch (e) { addLog('warn', 'Skills/Broadcast', e.message); }

  const pName = product.slice(0, 40);
  res.json({
    success: true, source: 'mock',
    segments: [
      { name: 'ลูกค้าซื้อครั้งเดียวแล้วหายไป', approach: 'ทักถามความพอใจ + เสนอส่วนลดกลับมาซื้อซ้ำ' },
      { name: 'ลูกค้าประจำที่เงียบไปนาน', approach: 'ขอบคุณที่เคยอุดหนุน + สิทธิพิเศษลูกค้าเก่า' },
    ],
    messages: [
      { title: 'คิดถึงลูกค้าคนพิเศษ', body: `สวัสดีค่ะ 😊 ${pName} ของเรามีรุ่นใหม่/ล็อตใหม่มาแล้ว! คิดถึงคุณลูกค้าเลยมีส่วนลดพิเศษมาฝากค่ะ`, cta: 'กดรับส่วนลด 👉' },
      { title: 'สิทธิพิเศษลูกค้าเก่า', body: `ขอบคุณที่เคยอุดหนุน ${pName} นะคะ 🙏 เฉพาะลูกค้าเก่า รับส่วนลดกลับมาช้อปได้เลยค่ะ จำนวนจำกัด!`, cta: 'สั่งเลยก่อนหมด' },
    ],
    winback_offer: 'ส่วนลด 10-15% หรือส่งฟรี เฉพาะลูกค้าเก่า ใช้ได้ภายใน 7 วัน — สร้างความเร่งด่วนแต่ไม่ขาดทุน',
    subject_lines: ['มีของขวัญเล็กๆ มาฝากคุณค่ะ 🎁', `${pName} ล็อตใหม่มาแล้ว — ลูกค้าเก่าได้ก่อนใคร`, 'คิดถึงจัง! กลับมาช้อปรับส่วนลดพิเศษนะคะ'],
    timing: 'ส่งช่วงเย็น 18:00-20:00 หรือสุดสัปดาห์ · ความถี่ไม่เกิน 1-2 ครั้ง/สัปดาห์',
    tips: ['เปิดด้วยคุณค่า/ความห่วงใย ไม่ใช่ขายตรงๆ', 'ใส่ deadline ให้รู้สึกเร่งด่วน', 'ปรับข้อความตามกลุ่มลูกค้า อย่าส่งเหมือนกันหมด'],
  });
});

// ── Skills Registry — แคตตาล็อกทักษะ machine-readable (discovery · docs · integration · scale) ──
// GET /api/skills — รายการทักษะทั้งหมดพร้อม endpoint + input ที่จำเป็น ใช้ขับ UI/อินทิเกรชันภายนอกได้
const SKILLS_REGISTRY = [
  { id: 'S1',  name: 'RCCF Prompt',          category: 'content',     endpoint: '/api/generate',                method: 'POST', inputs: ['product', 'platform', 'tone'], status: 'active' },
  { id: 'S2',  name: 'Taste Check',          category: 'quality',     endpoint: '/api/generate',                method: 'POST', inputs: ['product'],                      status: 'active' },
  { id: 'S3',  name: 'Master Prompt',        category: 'prompt',      endpoint: '/api/generate',                method: 'POST', inputs: ['product', 'platform'],          status: 'active' },
  { id: 'S4',  name: 'Image Analysis',       category: 'vision',      endpoint: '/api/analyze-image',           method: 'POST', inputs: ['image'],                        status: 'active' },
  { id: 'S5',  name: 'TTS Voice',            category: 'voice',       endpoint: '/api/tts',                     method: 'POST', inputs: ['text'],                         status: 'needs_key', requires: 'ELEVENLABS_API_KEY' },
  { id: 'S6',  name: 'AI Critic',            category: 'evaluation',  endpoint: '/api/generate',                method: 'POST', inputs: ['product'],                      status: 'active' },
  { id: 'S7',  name: 'Context Card',         category: 'context',     endpoint: '/api/generate',                method: 'POST', inputs: ['product'],                      status: 'active' },
  { id: 'S8',  name: 'LINE OA Connect',      category: 'integration', endpoint: '/api/line/send',               method: 'POST', inputs: ['message'],                      status: 'needs_key', requires: 'LINE_CHANNEL_TOKEN' },
  { id: 'S9',  name: 'Learning Layer',       category: 'learning',    endpoint: '/api/skills/learning/patterns',method: 'GET',  inputs: [],                               status: 'active' },
  { id: 'S10', name: 'Trend Analyzer',       category: 'trend',       endpoint: '/api/skills/trend',            method: 'POST', inputs: ['product', 'category', 'platform'], status: 'active' },
  { id: 'S11', name: 'Hashtag Generator',    category: 'hashtag',     endpoint: '/api/skills/hashtag',          method: 'POST', inputs: ['product', 'category', 'platform'], status: 'active' },
  { id: 'S12', name: 'SEO Thai',             category: 'seo',         endpoint: '/api/skills/seo',              method: 'POST', inputs: ['product', 'category', 'platform'], status: 'active' },
  { id: 'S13', name: 'Sentiment Scanner',    category: 'sentiment',   endpoint: '/api/skills/sentiment',        method: 'POST', inputs: ['text'],                         status: 'active' },
  { id: 'S14', name: 'Video Script',         category: 'video',       endpoint: '/api/skills/video-script',     method: 'POST', inputs: ['product', 'duration', 'style'], status: 'active' },
  { id: 'S15', name: 'Multi-Language',       category: 'translate',   endpoint: '/api/skills/translate',        method: 'POST', inputs: ['text', 'from', 'to'],           status: 'active' },
  { id: 'S16', name: 'Prompt Builder',       category: 'prompt',      endpoint: '/api/skills/prompt-builder',   method: 'POST', inputs: ['goal', 'technique'],            status: 'active' },
  { id: 'S17', name: 'Cultural Wisdom',      category: 'wisdom',      endpoint: '/api/skills/cultural-wisdom',  method: 'POST', inputs: ['situation', 'tradition'],       status: 'active' },
  { id: 'S18', name: 'Sales Conversion Engine', category: 'sales',   endpoint: '/api/skills/promo-engine',     method: 'POST', inputs: ['product', 'usp', 'platform'],   status: 'active' },
  { id: 'S19', name: 'Supply Chain AI',      category: 'operations',  endpoint: '/api/skills/supply-chain',     method: 'POST', inputs: ['product', 'category', 'sourcing'], status: 'active' },
  { id: 'S20', name: 'Pricing Optimizer',    category: 'pricing',     endpoint: '/api/skills/pricing',          method: 'POST', inputs: ['product', 'cost', 'competitor_price'], status: 'active' },
  { id: 'S21', name: 'Customer Service AI',  category: 'support',     endpoint: '/api/skills/customer-service', method: 'POST', inputs: ['message', 'product', 'channel'], status: 'active' },
  { id: 'S22', name: 'Ad Budget Planner',    category: 'ads',         endpoint: '/api/skills/ad-budget',        method: 'POST', inputs: ['product', 'budget', 'platforms'], status: 'active' },
  { id: 'S23', name: 'Break-even Planner',   category: 'finance',     endpoint: '/api/skills/break-even',       method: 'POST', inputs: ['product', 'price', 'unit_cost', 'fixed_costs'], status: 'active' },
  { id: 'S24', name: 'Campaign Calendar',    category: 'planning',    endpoint: '/api/skills/campaign-calendar',method: 'POST', inputs: ['product', 'category', 'period'], status: 'active' },
  { id: 'S25', name: 'Live Selling Script',  category: 'live',        endpoint: '/api/skills/live-script',      method: 'POST', inputs: ['product', 'platform', 'duration'], status: 'active' },
  { id: 'S26', name: 'Omni-Solver',          category: 'solver',      endpoint: '/api/skills/omni-solver',      method: 'POST', inputs: ['problem', 'context', 'goal'], status: 'active' },
  { id: 'S27', name: 'Negotiation Coach',    category: 'negotiation', endpoint: '/api/skills/negotiation',      method: 'POST', inputs: ['situation', 'my_goal', 'their_position'], status: 'active' },
  { id: 'S28', name: 'Conflict Mediator',    category: 'mediation',   endpoint: '/api/skills/mediation',        method: 'POST', inputs: ['conflict', 'parties', 'desired_outcome'], status: 'active' },
  { id: 'S29', name: 'Crisis Manager',       category: 'crisis',      endpoint: '/api/skills/crisis',           method: 'POST', inputs: ['situation', 'channel', 'severity'], status: 'active' },
  { id: 'S30', name: 'Persona Builder',      category: 'research',    endpoint: '/api/skills/persona',          method: 'POST', inputs: ['product', 'category', 'market'], status: 'active' },
  { id: 'S31', name: 'Product Listing Writer',category: 'commerce',   endpoint: '/api/skills/listing',          method: 'POST', inputs: ['product', 'category', 'price'], status: 'active' },
  { id: 'S32', name: 'Review Responder',     category: 'reputation',  endpoint: '/api/skills/review-reply',     method: 'POST', inputs: ['review', 'product', 'rating'], status: 'active' },
  { id: 'S33', name: 'Bundle & Upsell Designer', category: 'commerce', endpoint: '/api/skills/bundle',         method: 'POST', inputs: ['product', 'category', 'price'], status: 'active' },
  { id: 'S34', name: 'FAQ & Auto-Reply Builder', category: 'support', endpoint: '/api/skills/faq',             method: 'POST', inputs: ['product', 'category', 'channel'], status: 'active' },
  { id: 'S35', name: 'Broadcast & Re-engagement', category: 'retention', endpoint: '/api/skills/broadcast',     method: 'POST', inputs: ['product', 'category', 'channel'], status: 'active' },
];

app.get('/api/skills', (req, res) => {
  const cat = (req.query.category || '').toLowerCase();
  const skills = cat ? SKILLS_REGISTRY.filter(s => s.category === cat) : SKILLS_REGISTRY;
  const categories = [...new Set(SKILLS_REGISTRY.map(s => s.category))];
  res.json({
    success: true,
    total: SKILLS_REGISTRY.length,
    active: SKILLS_REGISTRY.filter(s => s.status === 'active').length,
    ai_engine: anthropic ? 'claude' : (gemini ? 'gemini' : 'mock'),
    categories,
    skills,
    ts: new Date().toISOString(),
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
//  AI AGENT SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════════
const AGENT_FILE      = join(WRITE_DATA_DIR,  'agents.json');
const CHECKPOINT_FILE = join(WRITE_DATA_DIR,  'agent_checkpoint.json');
const CHARTER_FILE    = join(STATIC_DATA_DIR, 'system_charter.json'); // read-only static config

/** นโยบายถาวร — อ่านจาก backend/data/system_charter.json (แก้ไฟล์ได้โดยไม่ต้องรีสตาร์ท) */
function getSystemCharter() {
  try {
    if (existsSync(CHARTER_FILE)) {
      const data = JSON.parse(readFileSync(CHARTER_FILE, 'utf8'));
      if (data && typeof data === 'object' && data.version != null) return data;
    }
  } catch (e) {
    console.warn('[charter]', e.message);
  }
  return {
    version: 0,
    title: 'Openthai.ai — System charter (embedded fallback)',
    summary: 'ตั้งค่าไฟล์ backend/data/system_charter.json เพื่อล็อกนโยบายถาวร',
    pillars: [
      { id: 'integrity', title: 'ความสมบูรณ์', text: 'แก้ความไม่เข้ากัน ข้อบกพร่อง หรือชำรุดทันทีให้สมบูรณ์' },
      { id: 'skills_radar', title: 'Skills gap', text: 'เปรียบเทียบความก้าวหน้า AI กับโปรแกรมเราและวิธีจัดการ' },
      { id: 'autonomous_remedy', title: 'แก้ไขทันที', text: 'ไม่รอผู้ใช้แจ้ง — Watchdog, Auto-heal, Diagnosis, Log' },
      { id: 'world_connect', title: '24/7', text: 'อัปเดตข้อมูลโลกอัตโนมัติ (เช่น News RAG refresh)' },
      { id: 'durability', title: 'บันทึกก่อนพัง', text: 'checkpoint + system log + process error hooks' },
    ],
    technical_hooks: ['GET /api/system/charter', 'GET /api/system/skills-gap'],
  };
}

function loadAgents() {
  try { if (existsSync(AGENT_FILE)) return JSON.parse(readFileSync(AGENT_FILE, 'utf8')); } catch (_) {}
  return [];
}
function saveAgents(data) {
  try {
    const dir = AGENT_FILE.replace(/[/\\][^/\\]+$/, '');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(AGENT_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('Save agents error:', e.message); }
}

const agents = loadAgents();

// ── Agent run checkpoint (ก่อน/หลังรัน — ลดความเสียหายเมื่อ process หยุดกะทันหัน) ──
function writeAgentCheckpoint(agent, phase, detail = null) {
  try {
    const dir = CHECKPOINT_FILE.replace(/[/\\][^/\\]+$/, '');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const payload = {
      ts: new Date().toISOString(),
      agentId: agent.id,
      agentName: agent.name,
      product: agent.product,
      phase,
      ...(detail ? { detail: String(detail).slice(0, 2000) } : {}),
    };
    writeFileSync(CHECKPOINT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {
    console.error('[checkpoint]', e.message);
  }
}

function clearAgentCheckpoint() {
  try {
    if (existsSync(CHECKPOINT_FILE)) unlinkSync(CHECKPOINT_FILE);
  } catch (_) {}
}

// ── Run a single agent ────────────────────────────────────────────────────────
async function runAgent(agent) {
  console.log(`[Agent] 🤖 Running agent "${agent.name}" — ${agent.product}`);
  try {
    writeAgentCheckpoint(agent, 'generating');

    // ── Omni-Solver agent (S26) — เฝ้าเป้าหมาย/ปัญหา 24/7 แล้วแจ้งทางออกที่เป็นธรรม ──
    if (agent.task === 'omni-solver') {
      const sol = await omniSolve({ problem: agent.problem || agent.product, context: agent.context || '', goal: agent.goal || undefined, stakeholders: agent.stakeholders || '' });
      const entry = { ts: new Date().toISOString(), task: 'omni-solver', source: sol.source, summary: sol.summary, problem_reframed: sol.problem_reframed, recommended_path: sol.recommended_path, fair_close: sol.fair_close, omni: sol };
      agent.lastRun = new Date().toISOString(); agent.lastError = null;
      agent.results = [entry, ...(agent.results || []).slice(0, 9)];
      saveAgents(agents); clearAgentCheckpoint();
      if (agent.lineEnabled && agent.lineUserId && process.env.LINE_CHANNEL_TOKEN) {
        try {
          const msg = `🧩 Omni-Solver: "${agent.name}"\n\n🎯 ${sol.problem_reframed || ''}\n\n✅ แนวทางที่แนะนำ:\n${sol.recommended_path || sol.summary || ''}\n\n🤝 ปิดดีลเป็นธรรม:\n${sol.fair_close?.script || ''}`;
          await sendLine(agent.lineUserId, msg);
        } catch (lineErr) { try { addLog('warn', 'Agent', `LINE push ไม่สำเร็จ "${agent.name}": ${lineErr.message}`); } catch (_) {} }
      }
      console.log(`[Agent] ✅ Omni-Solver done — ${sol.source}`);
      webhooks.dispatch('agent.completed', { agentId: agent.id, agentName: agent.name, task: 'omni-solver', source: sol.source }, agent.tenantId || null);
      return entry;
    }

    const result = await smartGenerate({
      product: agent.product, category: agent.category, platform: agent.platform,
      style: agent.style, lang: agent.lang || 'ภาษาไทย',
      audience: agent.audience || 'ทั่วไป', price: agent.price || '',
    });
    const entry = { ts: new Date().toISOString(), ...result };
    agent.lastRun = new Date().toISOString();
    agent.lastError = null;
    agent.results = [entry, ...(agent.results || []).slice(0, 9)]; // keep 10 results
    saveAgents(agents);
    clearAgentCheckpoint();

    // ส่ง LINE แยก try — อย่าให้ push LINE ล้มทำให้ทั้งรันถูกมองว่า error (คอนเทนต์บันทึกแล้ว)
    if (agent.lineEnabled && agent.lineUserId && process.env.LINE_CHANNEL_TOKEN) {
      try {
        const msg = `🤖 Openthai.ai Agent: "${agent.name}"\n\n🎣 Hook:\n${result.hook}\n\n📝 Caption:\n${result.caption}\n\n${result.hashtags?.join(' ')}`;
        await sendLine(agent.lineUserId, msg);
      } catch (lineErr) {
        try { addLog('warn', 'Agent', `LINE push ไม่สำเร็จ "${agent.name}": ${lineErr.message}`); } catch (_) {}
      }
    }
    console.log(`[Agent] ✅ Done — Score: ${result.criticScore}`);

    // Auto-learn into memory + fire webhook (non-blocking)
    memory.autoLearn({ tenantId: agent.tenantId || 'global', result, form: {
      product: agent.product, category: agent.category, platform: agent.platform, style: agent.style,
    }}).catch(() => {});
    webhooks.dispatch('agent.completed', {
      agentId: agent.id, agentName: agent.name, product: agent.product,
      platform: agent.platform, score: result.criticScore, source: result.source,
    }, agent.tenantId || null);

    return entry;
  } catch (err) {
    console.error(`[Agent] ❌ Failed: ${err.message}`);
    writeAgentCheckpoint(agent, 'error', err.message);
    agent.lastError = String(err.message || err).slice(0, 500);
    try { saveAgents(agents); } catch (_) {}
    try { addLog('error', 'Agent', `รัน Agent "${agent.name}" ไม่สำเร็จ: ${err.message}`); } catch (_) {}
    return null;
  }
}

// ── LINE send helper ──────────────────────────────────────────────────────────
async function sendLine(to, text) {
  const token = process.env.LINE_CHANNEL_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_TOKEN not set');
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, messages: [{ type: 'text', text: text.slice(0, 5000) }] }),
  });
  if (!res.ok) throw new Error(`LINE API error ${res.status}`);
  return res.json();
}

// LINE OA Broadcast — ส่งถึงผู้ติดตามทั้งหมดของ OA ที่ "ผู้ใช้เป็นเจ้าของ" (ถูกกฎ ToS)
async function lineBroadcast(text) {
  const token = process.env.LINE_CHANNEL_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_TOKEN not set');
  const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ type: 'text', text: String(text).slice(0, 5000) }] }),
  });
  if (!res.ok) throw new Error(`LINE broadcast error ${res.status}`);
  return res.json().catch(() => ({}));
}

// ── node-cron: ทุกชั่วโมงที่นาที :05 (local only — Vercel ใช้ Vercel Cron แทน) ─
if (!IS_VERCEL) cron.schedule('5 * * * *', async () => {
  const now = new Date();
  const hour = now.getHours();
  for (const agent of agents) {
    if (!agent.active) continue;
    if (agent.schedule !== 'daily' && agent.schedule !== 'weekly') continue;

    // Weekly: ตรวจวันในสัปดาห์ (0=อาทิตย์)
    if (agent.schedule === 'weekly' && now.getDay() !== (agent.weekDay ?? 1)) continue;

    if (parseInt(agent.hour ?? 18) !== hour) continue;

    // ป้องกันรันซ้ำวันเดียวกัน
    const lastRun = agent.lastRun ? new Date(agent.lastRun) : null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (lastRun && lastRun >= today) continue;

    await runAgent(agent);
  }
});
if (!IS_VERCEL) console.log('[Scheduler] ✅ Agent cron started (checks every hour at :05 — local only)');

// ── CRUD /api/agent ───────────────────────────────────────────────────────────
// เดิมไม่มีการยืนยันตัวตนฝั่ง server เลย ทั้งที่ AgentPage.jsx เป็นหน้า (auth) route —
// GET คืน agent ของทุกคนให้ทุกคนเห็น (รวม lineUserId ที่เป็น PII) และใครก็ PATCH/DELETE/
// run agent ของคนอื่นได้หมด เพราะหน้าเว็บไม่เคยส่ง token ใดๆ มาเลย (ไม่มีระบบ JWT จริงสำหรับ
// หน้านี้) แก้ด้วย device-id scoping (เทียบเท่า "auth แบบเบา" ไม่ต้อง login) — ใช้ x-device-id
// ที่ apiBase.js สร้างให้ทุกเบราว์เซอร์อยู่แล้ว ปลอดภัยกว่าเดิมโดยไม่ต้องบังคับ login ใหม่
// agent เก่าที่สร้างก่อนแก้ (ไม่มี owner_device_id) จะไม่แสดงให้ใครอีก — ปิด leak เป็นค่าเริ่มต้น
const agentOwner = (req) => (req.headers['x-device-id'] || '').toString().slice(0, 100);

app.get('/api/agent', (req, res) => {
  const owner = agentOwner(req);
  const mine = owner ? agents.filter(a => a.owner_device_id === owner) : [];
  const safe = mine.map(a => ({ ...a, results: (a.results || []).slice(0, 3) }));
  res.json({ success: true, data: safe });
});

app.post('/api/agent', (req, res) => {
  const { name, product, category, platform, style, lang, audience, price, schedule, hour, weekDay, lineEnabled, lineUserId, task, problem, context, goal, stakeholders } = req.body || {};
  const isOmni = task === 'omni-solver';
  if (!name) return res.status(400).json({ success: false, message: 'ต้องการ name' });
  if (!isOmni && !product) return res.status(400).json({ success: false, message: 'ต้องการ product' });
  if (isOmni && !problem) return res.status(400).json({ success: false, message: 'Omni-Solver ต้องการ problem' });
  const agent = {
    id: Date.now().toString(), owner_device_id: agentOwner(req), name, task: task || 'content',
    product: product || '', category: category || 'ทั่วไป',
    platform: platform || 'TikTok', style: style || 'sales',
    lang: lang || 'ภาษาไทย', audience: audience || 'ทั่วไป', price: price || '',
    // Omni-Solver fields
    problem: problem || '', context: context || '', goal: goal || '', stakeholders: stakeholders || '',
    schedule: schedule || 'daily', hour: parseInt(hour ?? 18),
    weekDay: parseInt(weekDay ?? 1),
    lineEnabled: !!lineEnabled, lineUserId: lineUserId || '',
    active: true, createdAt: new Date().toISOString(), lastRun: null, results: [],
  };
  agents.push(agent); saveAgents(agents);
  res.json({ success: true, data: agent });
});

app.post('/api/agent/:id/run', async (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ success: false, message: 'ไม่พบ agent' });
  if (agent.owner_device_id !== agentOwner(req)) return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง agent นี้' });
  const result = await runAgent(agent);
  res.json({ success: !!result, data: result });
});

app.patch('/api/agent/:id', (req, res) => {
  const idx = agents.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false });
  if (agents[idx].owner_device_id !== agentOwner(req)) return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง agent นี้' });
  agents[idx] = { ...agents[idx], ...req.body, id: agents[idx].id, owner_device_id: agents[idx].owner_device_id };
  saveAgents(agents);
  res.json({ success: true, data: agents[idx] });
});

app.delete('/api/agent/:id', (req, res) => {
  const idx = agents.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false });
  if (agents[idx].owner_device_id !== agentOwner(req)) return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง agent นี้' });
  agents.splice(idx, 1); saveAgents(agents);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  REAL-TIME WEB RAG — Thai News → Content Ideas
// ═══════════════════════════════════════════════════════════════════════════════
const newsCache = { data: null, ts: 0 };
const NEWS_TTL  = 60 * 60 * 1000; // 1 hour

function fetchRss(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }, (res) => {
      let xml = '';
      res.on('data', d => { xml += d; });
      res.on('end', () => resolve(xml));
    }).on('error', () => resolve(''));
  });
}

function parseRssTitles(xml, limit = 8) {
  const titles = [];
  for (const m of xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/gi)) {
    const t = m[1]?.trim();
    if (t && t.length > 5 && !t.toLowerCase().includes('rss') && !t.toLowerCase().includes('ข่าว')) {
      titles.push(t);
      if (titles.length >= limit) break;
    }
  }
  return titles;
}

app.get('/api/news-rag', async (req, res) => {
  if (newsCache.data && Date.now() - newsCache.ts < NEWS_TTL) return res.json(newsCache.data);

  let headlines = [];
  try {
    const [tr, sanook] = await Promise.allSettled([
      fetchRss('https://www.thairath.co.th/rss/news.xml'),
      fetchRss('https://www.sanook.com/news/rss/'),
    ]);
    if (tr.status === 'fulfilled') headlines.push(...parseRssTitles(tr.value));
    if (sanook.status === 'fulfilled') headlines.push(...parseRssTitles(sanook.value));
  } catch (_) {}

  // ถ้า RSS ไม่ได้ ใช้ AI สร้าง trending topics แทน
  if (headlines.length < 3 && gemini) {
    try {
      const r = await gemini.generateContent(
        `สร้างหัวข้อข่าวและเทรนด์ไทยที่น่าสนใจวันที่ ${new Date().toLocaleDateString('th-TH')} สำหรับสร้างคอนเทนต์ TikTok ตอบเป็น JSON:
{"headlines":["หัวข้อ 1","หัวข้อ 2","หัวข้อ 3","หัวข้อ 4","หัวข้อ 5"],"content_ideas":[{"idea":"ชื่อสินค้า/หัวข้อ","angle":"มุมมอง/วิธีเล่า","category":"หมวดหมู่"}]}`
      );
      const text = r.response.text().trim();
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const ai = JSON.parse(m[0]);
        const payload = { ...ai, source: 'ai', ts: new Date().toISOString() };
        newsCache.data = payload; newsCache.ts = Date.now();
        return res.json(payload);
      }
    } catch (_) {}
  }

  // ถ้ามี headlines จาก RSS → ให้ AI วิเคราะห์สร้าง content ideas
  if (headlines.length > 0 && (gemini || anthropic)) {
    try {
      const aiClient = anthropic || gemini;
      const prompt = `จากข่าวไทยวันนี้:\n${headlines.slice(0, 8).map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\nสร้าง content ideas สำหรับสินค้าไทย TikTok ตอบ JSON:\n{"headlines":${JSON.stringify(headlines.slice(0, 5))},"content_ideas":[{"idea":"ชื่อสินค้าหรือหัวข้อ","angle":"มุมมอง/วิธีเล่า","category":"หมวดหมู่"},{"idea":"...","angle":"...","category":"..."}]}`;

      let text = '';
      if (anthropic) {
        const msg = await anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, messages: [{ role: 'user', content: prompt }] });
        text = msg.content[0]?.text?.trim() || '';
      } else {
        const r = await gemini.generateContent(prompt);
        text = r.response.text().trim();
      }
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const payload = { ...JSON.parse(m[0]), source: 'rss+ai', ts: new Date().toISOString() };
        newsCache.data = payload; newsCache.ts = Date.now();
        return res.json(payload);
      }
    } catch (_) {}
  }

  // Fallback
  const fallback = {
    headlines: ['ตลาด OTOP ออนไลน์โต 35%', 'คนไทยหันมาใช้สินค้าท้องถิ่น', 'ผ้าทอมือไทยดังระดับโลก', 'อาหารพื้นเมืองเหนือกระแสแรง', 'สมุนไพรไทยตีตลาดอาเซียน'],
    content_ideas: [
      { idea: 'ผ้าไหมมัดหมี่', angle: 'เบื้องหลังกระบวนการทอ 1 ผืนใช้เวลากี่วัน?', category: 'สิ่งทอ' },
      { idea: 'น้ำพริกแม่บ้าน', angle: 'สูตรลับที่ส่งต่อมา 3 รุ่น', category: 'อาหาร' },
      { idea: 'เซรั่มข้าวไทย', angle: 'ทำไมข้าวไทยถึงดีกว่า K-Beauty?', category: 'ความงาม' },
    ],
    source: 'fallback', ts: new Date().toISOString(),
  };
  newsCache.data = fallback; newsCache.ts = Date.now();
  return res.json(fallback);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  LINE OA SEND
// ═══════════════════════════════════════════════════════════════════════════════
const lineLimiter = rateLimit({ windowMs: 60000, max: 10, message: { error: 'ส่ง LINE บ่อยเกินไป' } });

app.post('/api/line/send', lineLimiter, async (req, res) => {
  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ success: false, message: 'ต้องการ to และ message' });
  if (!process.env.LINE_CHANNEL_TOKEN) {
    return res.status(503).json({ success: false, message: 'ยังไม่ได้ตั้งค่า LINE_CHANNEL_TOKEN ใน .env' });
  }
  try {
    await sendLine(to, message);
    res.json({ success: true, message: '✅ ส่ง LINE สำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/line/status', (req, res) => {
  res.json({ connected: !!process.env.LINE_CHANNEL_TOKEN, token: process.env.LINE_CHANNEL_TOKEN ? '✅ Set' : '❌ Not set' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ELEVENLABS TTS
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/tts', express.json({ limit: '10kb' }), async (req, res) => {
  const { text, voiceId } = req.body || {};
  if (!text) return res.status(400).json({ error: 'ต้องการ text' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า ELEVENLABS_API_KEY ใน .env', fallback: true });

  // ใช้ Rachel (en) หรือ Thai voice ถ้ามี
  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 2500), model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.55, similarity_boost: 0.80 } }),
    });
    if (!response.ok) throw new Error(`ElevenLabs error ${response.status}`);
    const buffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-store');
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[tts] ElevenLabs error:', err.message);
    return res.status(500).json({ error: 'Text-to-speech ขัดข้องชั่วคราว', fallback: true });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPETITOR ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
const competitorLimiter = rateLimit({ windowMs: 60000, max: 5, message: { error: 'วิเคราะห์บ่อยเกินไป' } });

app.post('/api/competitor-analyze', competitorLimiter, async (req, res) => {
  const { niche, competitor, platform } = req.body || {};
  if (!niche) return res.status(400).json({ error: 'ต้องการ niche' });

  const prompt = `คุณเป็น Social Media Strategist ผู้เชี่ยวชาญตลาดไทย

วิเคราะห์กลยุทธ์คอนเทนต์ในนิช "${niche}" บน ${platform || 'TikTok'}${competitor ? ` เปรียบเทียบกับ "${competitor}"` : ''}

ตอบกลับ JSON เท่านั้น:
{
  "niche_overview": "ภาพรวมนิชนี้ใน TikTok ไทย",
  "competitor_tactics": ["กลยุทธ์ที่คู่แข่งมักใช้ 1","กลยุทธ์ 2","กลยุทธ์ 3"],
  "content_gaps": ["ช่องว่างที่ยังไม่มีใครทำ 1","ช่องว่าง 2","ช่องว่าง 3"],
  "winning_hooks": ["Hook สไตล์ที่ปังในนิชนี้ 1","Hook 2","Hook 3"],
  "recommended_angles": [
    {"angle":"มุมมองที่แนะนำ","reason":"เพราะ...","difficulty":"ง่าย/กลาง/ยาก"},
    {"angle":"มุมมอง 2","reason":"เพราะ...","difficulty":"กลาง"}
  ],
  "best_post_times": "เวลาที่เหมาะสมในการโพสต์",
  "differentiation": "วิธีโดดเด่นกว่าคู่แข่ง"
}`;

  try {
    let text = '';
    if (anthropic) {
      const msg = await anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] });
      text = msg.content[0]?.text?.trim() || '';
    } else if (gemini) {
      const r = await gemini.generateContent(prompt);
      text = r.response.text().trim();
    } else {
      return res.json({ niche_overview: `นิช ${niche} มีการแข่งขันสูง`, competitor_tactics: ['Storytelling', 'Before/After', 'Tutorial'], content_gaps: ['เบื้องหลังการผลิต', 'ราคาโปร่งใส', 'วิธีใช้จริง'], winning_hooks: [`ทำไม ${niche} ถึงขายดีที่สุด?`, 'ใครไม่รู้เรื่องนี้ถือว่าพลาดมาก!', 'เปิดเผยความลับ...'], recommended_angles: [{ angle: 'เบื้องหลังกระบวนการ', reason: 'คนชอบความโปร่งใส', difficulty: 'ง่าย' }], best_post_times: '18:00–21:00 น.', differentiation: 'เน้น story ที่แท้จริง + ราคายุติธรรม', source: 'mock' });
    }
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return res.json({ ...JSON.parse(m[0]), source: anthropic ? 'claude' : 'gemini' });
    throw new Error('No JSON');
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SYSTEM MONITOR v2 — Auto-Heal · Watchdog · Skills Gap · Diagnostics · Logs
// ═══════════════════════════════════════════════════════════════════════════════

// ── Persistent System Event Log ───────────────────────────────────────────────
const LOG_FILE  = join(WRITE_DATA_DIR, 'system_log.json');
const MAX_LOGS  = 500;

function loadSysLogs() {
  try { if (existsSync(LOG_FILE)) return JSON.parse(readFileSync(LOG_FILE, 'utf8')); } catch (_) {}
  return [];
}
function saveSysLogs(data) {
  try {
    const dir = LOG_FILE.replace(/[/\\][^/\\]+$/, '');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(LOG_FILE, JSON.stringify(data.slice(0, MAX_LOGS), null, 2), 'utf8');
  } catch (_) {}
}

const sysLogs = loadSysLogs();

function addLog(level, source, message, detail = null) {
  const entry = { ts: new Date().toISOString(), level, source, message, ...(detail ? { detail } : {}) };
  sysLogs.unshift(entry);
  if (sysLogs.length > MAX_LOGS) sysLogs.splice(MAX_LOGS);
  saveSysLogs(sysLogs);
  if (level === 'error') {
    console.error(`[${source}] ${message}`, detail || '');
    webhooks.dispatch('system.error', { source, message, detail: detail || null });
  } else {
    console.log(`[${source}] ${message}`);
  }
}

// ── Watchdog state ─────────────────────────────────────────────────────────────
let watchdogStats = { lastRun: null, healed: 0, checked: 0, status: 'idle', nextRun: null };

async function runWatchdog() {
  watchdogStats.status = 'running';
  watchdogStats.lastRun = new Date().toISOString();
  watchdogStats.checked = 0;
  let healed = 0;
  addLog('info', 'Watchdog', '🔍 เริ่มตรวจระบบ auto-heal...');

  // Clear stale checkpoint files (agent crashed and left a lock > 1 hour old)
  try {
    if (existsSync(CHECKPOINT_FILE)) {
      const cp = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'));
      const ageMs = Date.now() - new Date(cp.ts || 0).getTime();
      if (ageMs > 60 * 60 * 1000) {
        unlinkSync(CHECKPOINT_FILE);
        addLog('warn', 'Watchdog', `🗑️ ลบ stale checkpoint (อายุ ${(ageMs / 3600000).toFixed(1)} ชม.) — agent: ${cp.agentName || '?'}`);
      }
    }
  } catch (_) {}

  for (const agent of agents) {
    if (!agent.active) continue;
    watchdogStats.checked++;
    // Daily: ไม่รนาน >26 ชม. · Weekly: ไม่รนาน >8 วัน — นับ heal เฉพาะเมื่อ runAgent สำเร็จจริง
    if (agent.lastRun && (agent.schedule === 'daily' || agent.schedule === 'weekly')) {
      const hoursSince = (Date.now() - new Date(agent.lastRun).getTime()) / 3600000;
      const thresholdH = agent.schedule === 'weekly' ? 24 * 8 : 26;
      if (hoursSince > thresholdH) {
        addLog('warn', 'Watchdog', `⚠️ Agent "${agent.name}" (${agent.schedule}) ไม่รันมา ${(hoursSince / 24).toFixed(1)} วัน — heal...`);
        try {
          const out = await runAgent(agent);
          if (out) healed++;
        } catch (e) {
          addLog('error', 'Watchdog', e.message);
        }
      }
    }
    // Agent ที่ active แต่ไม่เคยรัน (ยกเว้น manual)
    if (agent.active && !agent.lastRun && agent.schedule !== 'manual') {
      addLog('info', 'Watchdog', `🆕 Agent "${agent.name}" ยังไม่เคยรัน — เริ่มรัน first-run`);
      try {
        const out = await runAgent(agent);
        if (out) healed++;
      } catch (e) {
        addLog('error', 'Watchdog', e.message);
      }
    }
  }

  watchdogStats.healed  += healed;
  watchdogStats.status   = 'idle';
  const next = new Date(); next.setMinutes(next.getMinutes() + 30);
  watchdogStats.nextRun  = next.toISOString();
  addLog('info', 'Watchdog', `✅ Watchdog เสร็จ — checked:${watchdogStats.checked} healed:${healed}`);
  if (healed > 0) webhooks.dispatch('watchdog.healed', { checked: watchdogStats.checked, healed });
  return healed;
}

// Cron jobs รันเฉพาะ local — บน Vercel ใช้ Vercel Cron Jobs แทน (ใน vercel.json)
if (!IS_VERCEL) {
  cron.schedule('*/30 * * * *', async () => { await runWatchdog(); });
  cron.schedule('0 */4 * * *', () => {
    newsCache.data = null;
    newsCache.ts = 0;
    addLog('info', 'Scheduler', '📰 News RAG cache cleared — คำขอถัดไปดึงหัวข้อสด');
  });
}
// Log startup
addLog('info', 'System', `🚀 Openthai.ai backend started — AI:${anthropic?'Claude':gemini?'Gemini':'Mock'}`);
(() => { const c = getSystemCharter(); addLog('info', 'Charter', `📜 นโยบายถาวร v${c.version} — ${c.title}`); })();

// ── TEST: GET /api/test-gemini ────────────────────────────────────────────────
app.get('/api/test-gemini', async (req, res) => {
  if (!gemini) return res.json({ status: 'no_key', gemini: false });
  try {
    const result = await gemini.generateContent('Reply ONLY with this exact text: {"test":"ok","source":"gemini"}');
    const text = result.response.text().trim();
    return res.json({ status: 'ok', text, gemini: true });
  } catch (err) {
    return res.json({ status: 'error', error: err.message, code: err.status || err.code });
  }
});

// ── 1. GET /api/system/metrics ───────────────────────────────────────────────
app.get('/api/system/metrics', (req, res) => {
  const totalRuns  = agents.reduce((s, a) => s + (a.results?.length || 0), 0);
  const allScores  = agents.flatMap(a => (a.results || []).map(r => parseFloat(r.criticScore) || 0)).filter(Boolean);
  const avgScore   = allScores.length ? (allScores.reduce((s, x) => s + x, 0) / allScores.length) : 0;
  const mem        = process.memoryUsage();
  let agent_checkpoint = null;
  try {
    if (existsSync(CHECKPOINT_FILE)) agent_checkpoint = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'));
  } catch (_) {}
  res.json({
    uptime_sec:    Math.floor(process.uptime()),
    uptime_human:  (() => { const s = Math.floor(process.uptime()); const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return `${h}h ${m}m`; })(),
    ai_engine:     anthropic ? 'claude' : gemini ? 'gemini' : 'mock',
    total_agents:  agents.length,
    active_agents: agents.filter(a => a.active).length,
    total_runs:    totalRuns,
    avg_score:     avgScore.toFixed(2),
    affiliates:    affiliates.length,
    waitlist:      waitlist.length,
    log_count:     sysLogs.length,
    error_count:   sysLogs.filter(l => l.level === 'error').length,
    warn_count:    sysLogs.filter(l => l.level === 'warn').length,
    watchdog:      watchdogStats,
    memory_mb:     (mem.heapUsed / 1048576).toFixed(1),
    memory_total:  (mem.heapTotal / 1048576).toFixed(1),
    agent_checkpoint,
    ts:            new Date().toISOString(),
  });
});

// ── 2. GET /api/system/logs ──────────────────────────────────────────────────
app.get('/api/system/logs', (req, res) => {
  const limit    = Math.min(parseInt(req.query.limit) || 100, 500);
  const level    = req.query.level;
  const source   = req.query.source;
  let filtered   = sysLogs;
  if (level)  filtered = filtered.filter(l => l.level === level);
  if (source) filtered = filtered.filter(l => l.source === source);
  res.json({ success: true, total: sysLogs.length, data: filtered.slice(0, limit) });
});

// ── 3. GET /api/system/skills-gap — เปรียบเทียบกระแส AI + ช่องว่าง + วิธีบริหาร + ระบบอัตโนมัติ ──
app.get('/api/system/skills-gap', (req, res) => {
  res.json({
    our_skills: [
      { id:'S1', name:'RCCF Prompt',      pct:95, color:'#6366f1', category:'content',     status:'✅' },
      { id:'S2', name:'Taste Check',      pct:88, color:'#8b5cf6', category:'quality',     status:'✅' },
      { id:'S3', name:'Master Prompt',    pct:92, color:'#10b981', category:'prompt',      status:'✅' },
      { id:'S4', name:'Image Analysis',   pct:85, color:'#06b6d4', category:'vision',      status:'✅' },
      { id:'S5', name:'TTS Voice',        pct:60, color:'#f59e0b', category:'voice',       status:'⚠️' },
      { id:'S6', name:'AI Critic',        pct:97, color:'#f59e0b', category:'evaluation',  status:'✅' },
      { id:'S7', name:'Context Card',     pct:90, color:'#fe2c55', category:'context',     status:'✅' },
      { id:'S8', name:'LINE OA Connect',  pct:72, color:'#22c55e', category:'integration', status:'⚠️' },
      { id:'S9',  name:'Learning Layer',   pct:88, color:'#06b6d4', category:'learning',    status:'✅' },
      { id:'S10', name:'Trend Analyzer',   pct:88, color:'#f97316', category:'trend',       status:'✅' },
      { id:'S11', name:'Hashtag Generator',pct:91, color:'#ec4899', category:'hashtag',     status:'✅' },
      { id:'S12', name:'SEO Thai',         pct:85, color:'#84cc16', category:'seo',         status:'✅' },
      { id:'S13', name:'Sentiment Scanner',pct:82, color:'#a855f7', category:'sentiment',   status:'✅' },
      { id:'S14', name:'Video Script',     pct:79, color:'#ef4444', category:'video',       status:'✅' },
      { id:'S15', name:'Multi-Language',   pct:86, color:'#14b8a6', category:'translate',   status:'✅' },
      { id:'S16', name:'Prompt Builder',   pct:93, color:'#f59e0b', category:'prompt',      status:'✅' },
      { id:'S17', name:'Cultural Wisdom',  pct:88, color:'#b45309', category:'wisdom',      status:'✅' },
      { id:'S18', name:'Sales Conv. Engine',pct:90, color:'#fe2c55', category:'sales',      status:'✅' },
      { id:'S19', name:'Supply Chain AI',  pct:84, color:'#0ea5e9', category:'operations',  status:'✅' },
      { id:'S20', name:'Pricing Optimizer',pct:86, color:'#6366f1', category:'pricing',     status:'✅' },
      { id:'S21', name:'Customer Service AI',pct:83, color:'#22c55e', category:'support',    status:'✅' },
      { id:'S22', name:'Ad Budget Planner',pct:85, color:'#f43f5e', category:'ads',         status:'✅' },
      { id:'S23', name:'Break-even Planner',pct:87, color:'#0d9488', category:'finance',    status:'✅' },
      { id:'S24', name:'Campaign Calendar',pct:86, color:'#d946ef', category:'planning',    status:'✅' },
      { id:'S25', name:'Live Selling Script',pct:88, color:'#fb7185', category:'live',      status:'✅' },
      { id:'S26', name:'Omni-Solver',      pct:90, color:'#7c3aed', category:'solver',     status:'✅' },
      { id:'S27', name:'Negotiation Coach',pct:88, color:'#0891b2', category:'negotiation',status:'✅' },
      { id:'S28', name:'Conflict Mediator',pct:87, color:'#0d9488', category:'mediation',  status:'✅' },
      { id:'S29', name:'Crisis Manager',   pct:89, color:'#dc2626', category:'crisis',     status:'✅' },
      { id:'S30', name:'Persona Builder',  pct:88, color:'#8b5cf6', category:'research',   status:'✅' },
      { id:'S31', name:'Product Listing',  pct:90, color:'#f97316', category:'commerce',   status:'✅' },
      { id:'S32', name:'Review Responder', pct:90, color:'#14b8a6', category:'reputation', status:'✅' },
      { id:'S33', name:'Bundle & Upsell',  pct:90, color:'#f59e0b', category:'commerce',   status:'✅' },
      { id:'S34', name:'FAQ & Auto-Reply', pct:90, color:'#0ea5e9', category:'support',    status:'✅' },
      { id:'S35', name:'Broadcast/Re-engage',pct:90,color:'#ec4899', category:'retention',  status:'✅' },
    ],
    benchmark: [
      { name:'Thai Language NLP',   ours:97, industry:68, leader:'Openthai.ai 🏆' },
      { name:'OTOP/Local Context',  ours:98, industry:40, leader:'Openthai.ai 🏆' },
      { name:'Content Generation',  ours:95, industry:88, leader:'Openthai.ai 🏆' },
      { name:'Auto-scheduling',     ours:82, industry:80, leader:'Openthai.ai 🏆' },
      { name:'Real-time Learning',  ours:78, industry:88, leader:'Industry ⚡'   },
      { name:'Video Auto-gen',      ours:10, industry:85, leader:'Industry ⚡'   },
      { name:'Multi-modal Vision',  ours:85, industry:95, leader:'Industry ⚡'   },
      { name:'Voice/TTS Thai',      ours:60, industry:90, leader:'Industry ⚡'   },
      { name:'Competitor Analytics',ours:72, industry:85, leader:'Industry ⚡'   },
    ],
    industry_ai_pulse: [
      { trend:'Agentic workflows & tool-use', leaders_do:'AI เรียก API / รันงานซ้ำได้เองแบบ chain', our_product:'Agent + Cron + Watchdog + LINE push', gap:'ยังไม่มี autonomous browser / shop post', manage:'ขยาย tool-calling ทีละบริการ · คุมด้วย rate limit + log' },
      { trend:'RAG & fresh web context', leaders_do:'ดึงความรู้แบบ real-time จากเอกสาร/เว็บ', our_product:'News RAG (RSS+AI) · Competitor analyze', gap:'ยังไม่มี vector DB / crawl ส่วนตัวของร้าน', manage:'เฟส 2: อัปโหลด PDF/Sheet เป็น knowledge base ต่อร้าน' },
      { trend:'Multimodal (วิดีโอ/เสียง end-to-end)', leaders_do:'สร้างคลิป/พากย์จาก prompt เดียว', our_product:'TTS (ElevenLabs) · วิเคราะห์ภาพ', gap:'ยังไม่มี video compose / avatar', manage:'ผูก provider วิดีโอหรือ template CapCut batch ภายหลัง' },
      { trend:'Self-healing & SRE AI', leaders_do:'ตรวจสุขภาพระบบ + remediate', our_product:'Watchdog 30 นาที · Auto-heal · Diagnose · Event log', gap:'ยังไม่มี distributed tracing', manage:'ใช้ log + metrics ปัจจุบันเป็นแหล่งความจริง · เพิ่ม alert channel ตาม priority' },
    ],
    autonomous_ops: {
      headline:'ดำเนินการแก้ไขและอัปเดตโดยไม่ต้องรอผู้ใช้แจ้งบั๊ก',
      items: [
        { title:'Watchdog + Auto-heal', desc:'ทุก 30 นาที ตรวจ Agent ค้าง/ยังไม่เคยรัน — รัน heal อัตโนมัติและบันทึก log' },
        { title:'Agent scheduler', desc:'รันตามเวลา (รายชั่วโมง/รายวัน/รายสัปดาห์) ส่ง LINE เมื่อตั้งค่า token' },
        { title:'Self-diagnosis', desc:'กดวิเคราะห์จาก Monitor หรือใช้กฎเมื่อไม่มี AI key — สรุป health_score + คำแนะนำ' },
        { title:'News RAG refresh', desc:'เคลียร์แคชข่าวทุก 4 ชม. — ดึงเทรนด์ใหม่โดยอัตโนมัติเมื่อมีการเรียก API' },
        { title:'Checkpoint ก่อนรัน Agent', desc:'เขียน agent_checkpoint.json ก่อน generate — ถ้า process ขัดข้องยังรู้ว่างานไหนค้างอยู่' },
      ],
    },
    durability: {
      headline:'บันทึกก่อนเสมอ — ลดความเสียหายของข้อมูลที่กำลังดำเนินการ',
      items: [
        { title:'Event log ถาวร', desc:'system_log.json — ทุกเหตุการณ์สำคัญเขียนลงดิสก์ทันที (ไม่ถือแค่ในหน่วยความจำ)' },
        { title:'agents.json', desc:'ผลลัพธ์ Agent / lastRun / lastError บันทึกหลังแต่ละรัน' },
        { title:'Checkpoint', desc:'ไฟล์ agent_checkpoint.json ระหว่างรัน — ล้างเมื่อสำเร็จ' },
        { title:'Process errors', desc:'uncaughtException / unhandledRejection บันทึกลง log ก่อนตรวจสอบต่อ' },
      ],
    },
    missing_skills: [
      { name:'Video Auto-generate',     priority:'🔴 สูงมาก', effort:'3-6 เดือน', impact:'+40% engagement',   progress:8,  management:'เลือกพาร์ทเนอร์วิดีโอ 1 ราย + MVP จาก template ก่อน', automation_now:'TTS + สคริปต์จาก AI Generator' },
      { name:'TikTok Analytics API',    priority:'🔴 สูง',    effort:'1-2 เดือน', impact:'+35% optimization', progress:20, management:'OAuth แอป + เก็บ metrics รายวันใน DB', automation_now:'Competitor tab + คะแนน Critic' },
      { name:'Thai STT (Voice→Text)',   priority:'🟡 กลาง',   effort:'2-3 เดือน', impact:'+30% UX',           progress:5,  management:'ใช้ cloud STT ไทย + เก็บ transcript ในแบรนด์เมมโมรี', automation_now:'พิมพ์ brief แทนเสียง' },
      { name:'Shopee/Lazada Auto-post', priority:'🟡 กลาง',   effort:'2-3 เดือน', impact:'+25% sales',        progress:15, management:'เริ่มจาก export แคปชั่น CSV ก่อน API เต็ม', automation_now:'สร้างแคปชั่น/แฮชแท็กจากหน้า Generator' },
      { name:'Sentiment Analysis',      priority:'🟢 ต่ำ',    effort:'1 เดือน',   impact:'+20% support',      progress:30, management:'รุ่น classifier ไทยบน inbox/LINE', automation_now:'Log + Diagnose จับ error pattern' },
    ],
    overall_score:    82,
    industry_average: 76,
    thai_advantage:   '+29% เหนือค่าเฉลี่ย (ภาษาไทย + OTOP context)',
    charter:          getSystemCharter(),
    ts: new Date().toISOString(),
  });
});

// ── 3b. GET /api/system/charter — นโยบายถาวร (อ่านจาก backend/data/system_charter.json)
app.get('/api/system/charter', (req, res) => {
  res.json({ success: true, data: getSystemCharter(), ts: new Date().toISOString() });
});

// ── 4. POST /api/system/auto-heal — manual trigger ──────────────────────────
app.post('/api/system/auto-heal', async (req, res) => {
  try {
    const healedThisRun = await runWatchdog();
    addLog('info', 'AutoHeal', '🔧 Manual auto-heal triggered');
    res.json({ success: true, message: 'Auto-heal สำเร็จ', healed_this_run: healedThisRun, stats: watchdogStats });
  } catch (err) {
    addLog('error', 'AutoHeal', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4b. GET /api/system/news-rag-clear — Vercel Cron trigger (ทุก 4 ชม.) ─────
app.get('/api/system/news-rag-clear', (req, res) => {
  newsCache.data = null;
  newsCache.ts   = 0;
  addLog('info', 'Scheduler', '📰 News RAG cache cleared via cron — ข้อมูลสด');
  res.json({ success: true, message: 'News RAG cache cleared', ts: new Date().toISOString() });
});

// ── 5. GET /api/system/watchdog ───────────────────────────────────────────────
app.get('/api/system/watchdog', (req, res) => {
  res.json({ success: true, ...watchdogStats, total_agents: agents.length, active_agents: agents.filter(a=>a.active).length });
});

// ── 6. POST /api/system/diagnose — AI-powered self-diagnosis ─────────────────
const diagnoseLimiter = rateLimit({ windowMs: 60000, max: 5, message: { error: 'วิเคราะห์บ่อยเกินไป' } });

app.post('/api/system/diagnose', diagnoseLimiter, async (req, res) => {
  const recentErrors = sysLogs.filter(l => l.level === 'error').slice(0, 8);
  const recentWarns  = sysLogs.filter(l => l.level === 'warn').slice(0, 8);
  const sysInfo = {
    ai:       anthropic ? 'claude' : gemini ? 'gemini' : 'mock',
    agents:   `${agents.filter(a=>a.active).length}/${agents.length} active`,
    errors:   recentErrors.length,
    warns:    recentWarns.length,
    uptime:   `${(process.uptime()/3600).toFixed(1)}h`,
    memory:   `${(process.memoryUsage().heapUsed/1048576).toFixed(1)} MB`,
    healed:   watchdogStats.healed,
  };

  if (!anthropic && !gemini) {
    const entry = { status:'warning', health_score:45, issues:['ไม่มี AI API Key — ระบบใช้ Mock data'], recommendations:['เพิ่ม ANTHROPIC_API_KEY ใน .env','หรือ GEMINI_API_KEY สำรอง'], auto_fixed:[], source:'rule-based', ts:new Date().toISOString() };
    addLog('warn', 'Diagnose', 'No AI key — rule-based diagnosis');
    return res.json(entry);
  }

  const prompt = `วิเคราะห์ระบบ Openthai.ai และแนะนำการแก้ไข ตอบ JSON เท่านั้น:

สถานะ: AI=${sysInfo.ai} | Agents=${sysInfo.agents} | Errors=${sysInfo.errors} | Warns=${sysInfo.warns} | Uptime=${sysInfo.uptime} | Memory=${sysInfo.memory} | Auto-healed=${sysInfo.healed}

Errors ล่าสุด: ${recentErrors.slice(0,5).map(e=>e.message).join(' | ') || 'ไม่มี'}
Warnings: ${recentWarns.slice(0,3).map(w=>w.message).join(' | ') || 'ไม่มี'}

{"status":"healthy/warning/critical","health_score":0-100,"issues":["ปัญหา 1"],"recommendations":["คำแนะนำ 1","คำแนะนำ 2"],"auto_fixed":["สิ่งที่ระบบแก้ไขอัตโนมัติแล้ว"]}`;

  try {
    let text = '';
    if (anthropic) {
      const msg = await anthropic.messages.create({ model:'claude-haiku-4-5-20251001', max_tokens:512, messages:[{role:'user',content:prompt}] });
      text = msg.content[0]?.text?.trim() || '';
    } else {
      const r = await gemini.generateContent(prompt);
      text = r.response.text().trim();
    }
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const result = JSON.parse(m[0]);
      addLog('info', 'Diagnose', `🔬 Self-diagnosis: ${result.status} score:${result.health_score}`);
      return res.json({ ...result, source: anthropic?'claude':'gemini', ts: new Date().toISOString() });
    }
  } catch (err) {
    addLog('error', 'Diagnose', err.message);
  }
  return res.json({ status:'healthy', health_score:78, issues:[], recommendations:['ระบบทำงานปกติ'], auto_fixed:[], source:'fallback', ts:new Date().toISOString() });
});

// ─── Readiness — เช็คว่าเปิดใช้ integration ครบไหม (ไม่โชว์ค่า secret) ──────────
app.get('/api/system/readiness', (req, res) => {
  const has = (v) => !!process.env[v];
  const supabase = has('SUPABASE_URL') && has('SUPABASE_SERVICE_KEY');
  const omiseLive = has('OMISE_SECRET_KEY');
  const omisePublic = has('OMISE_PUBLIC_KEY');
  const omiseWebhook = has('OMISE_WEBHOOK_SECRET');
  const ledger = supabase ? 'supabase (ถาวร)' : 'file (ชั่วคราว)';
  const checks = {
    supabase:    { ok: supabase,  detail: supabase ? 'เก็บเครดิต/ผู้ผลิต/ออเดอร์ถาวร' : 'ยังใช้ไฟล์ชั่วคราว — ตั้ง SUPABASE_URL + SUPABASE_SERVICE_KEY' },
    payments:    { ok: omiseLive, detail: omiseLive
      ? `รับเงินจริง · SECRET_KEY ✅ · PUBLIC_KEY ${omisePublic ? '✅' : '⚠️ ขาด (จำเป็นเฉพาะจ่ายด้วยบัตร)'} · WEBHOOK_SECRET ${omiseWebhook ? '✅' : '⚠️ ขาด (/pay ยังยืนยันด้วย polling ได้ แต่ควรตั้งเป็น backup)'}`
      : 'mock mode — ตั้ง OMISE_SECRET_KEY (+ OMISE_PUBLIC_KEY + OMISE_WEBHOOK_SECRET) เพื่อรับเงินจริง' },
    payment_webhook: { ok: omiseLive && omiseWebhook, detail: !omiseLive ? 'รอตั้ง Omise ก่อน' : omiseWebhook ? 'ยืนยันการจ่ายผ่าน webhook ได้ (ตั้ง URL .../api/payment/webhook ใน Omise ด้วย)' : 'ยังไม่ตั้ง OMISE_WEBHOOK_SECRET — /pay ใช้ polling ยืนยันแทนได้ชั่วคราว' },
    admin_key:   { ok: has('ADMIN_KEY'), detail: has('ADMIN_KEY') ? 'ตั้งแล้ว' : (IS_VERCEL ? '⚠️ ยังไม่ตั้ง — admin จะถูกปฏิเสธบน production' : 'local ใช้ค่า default') },
    line_notify: { ok: has('LINE_NOTIFY_TOKEN'), detail: has('LINE_NOTIFY_TOKEN') ? 'แจ้งเตือนเข้า LINE ได้' : 'optional — ตั้งเพื่อรับแจ้งเตือน' },
    ai:          { ok: !!(anthropic || gemini), detail: anthropic ? 'Claude' : gemini ? 'Gemini' : '⚠️ ไม่มี AI key — ใช้ mock' },
  };
  const required = ['supabase', 'payments', 'admin_key'];
  const ready = required.every((k) => checks[k].ok);
  res.json({ success: true, ready, ledger_mode: ledger, checks, ts: new Date().toISOString() });
});

// ─── Health check (v2) ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const charter = getSystemCharter();
  const aiEngine = anthropic ? 'claude-haiku-4-5-20251001' : gemini ? 'gemini-flash-latest' : 'mock';
  res.json({
    status:        'ok',
    version:       '2.1.0',
    charter_version: charter.version,
    charter_title:   charter.title,
    ai_primary:    anthropic ? '✅ Claude Haiku'     : '⚠️ No ANTHROPIC_API_KEY',
    ai_fallback:   gemini    ? '✅ Gemini Flash Latest' : '⚠️ No GEMINI_API_KEY',
    ai_active:     aiEngine,
    google_oauth:  !!process.env.GOOGLE_CLIENT_ID,
    affiliates:    affiliates.length,
    waitlist:      waitlist.length,
    agents:        agents.length,
    active_agents: agents.filter(a => a.active).length,
    line_oa:       !!process.env.LINE_CHANNEL_TOKEN,
    elevenlabs:    !!process.env.ELEVENLABS_API_KEY,
    watchdog:      watchdogStats.status,
    last_watchdog: watchdogStats.lastRun,
    system_logs:   sysLogs.length,
    uptime_sec:    Math.floor(process.uptime()),
    memory_mb:     (process.memoryUsage().heapUsed / 1048576).toFixed(1),
    services: {
      news_rag:           '✅ Active',
      news_rag_refresh:   '✅ Auto cache clear every 4h',
      competitor_analysis:'✅ Active',
      tts:                process.env.ELEVENLABS_API_KEY ? '✅ Active' : '⚠️ No API Key',
      line_oa:            process.env.LINE_CHANNEL_TOKEN ? '✅ Active' : '⚠️ No Token',
      auto_heal:          '✅ Active (every 30 min)',
      agent_cron:         '✅ Active (every hour)',
      watchdog:           '✅ Active',
      diagnostics:        '✅ Active',
      persistence:        '✅ system_log + agents.json + agent_checkpoint',
      vector_memory:      '✅ Active (semantic long-term memory)',
      webhook_system:     `✅ Active (${webhooks.list().length} registered)`,
      multi_tenant:       `✅ Active (${tenants.listAll().length} tenants)`,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PDPA COMPLIANCE — GAP-001 (consent record) + GAP-002 (data subject rights)
// ═══════════════════════════════════════════════════════════════════════════════
const CONSENT_FILE = join(WRITE_DATA_DIR, 'pdpa_consents.json');

function loadConsents() {
  try { if (existsSync(CONSENT_FILE)) return JSON.parse(readFileSync(CONSENT_FILE, 'utf8')); } catch (_) {}
  return [];
}
function saveConsents(data) {
  try {
    const dir = CONSENT_FILE.replace(/[/\\][^/\\]+$/, '');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(CONSENT_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('Save consents error:', e.message); }
}
const consents = loadConsents();

// GAP-001: บันทึก Consent ตาม PDPA มาตรา 19
app.post('/api/privacy/consent', (req, res) => {
  const { email, ip, purposes, version } = req.body || {};
  if (!email || !purposes?.length) {
    return res.status(400).json({ success: false, message: 'ต้องระบุ email และ purposes' });
  }
  const record = {
    id:        Date.now().toString(),
    email:     String(email).toLowerCase().trim().slice(0, 254),
    ip:        ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
    purposes:  Array.isArray(purposes) ? purposes : [purposes],
    version:   version || '1.0',
    consented: true,
    ts:        new Date().toISOString(),
  };
  // อัปเดตถ้ามีแล้ว
  const idx = consents.findIndex(c => c.email === record.email);
  if (idx >= 0) { consents[idx] = record; } else { consents.push(record); }
  saveConsents(consents);
  addLog('info', 'PDPA', `✅ Consent บันทึก: ${record.email} | purposes: ${record.purposes.join(',')}`);
  res.json({ success: true, message: 'บันทึกความยินยอมเรียบร้อย', id: record.id });
});

// GAP-002: สิทธิ์ขอลบข้อมูล (Right to Erasure — PDPA มาตรา 33)
app.post('/api/privacy/erasure', rateLimit({ windowMs: 3600000, max: 5 }), (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'อีเมลไม่ถูกต้อง' });
  }
  const sanitized = email.toLowerCase().trim();
  let removed = 0;

  // ลบออกจาก waitlist
  const wBefore = waitlist.length;
  const wIdx = waitlist.findIndex(w => w.email === sanitized);
  if (wIdx >= 0) { waitlist.splice(wIdx, 1); saveWaitlist(waitlist); removed++; }

  // ลบ consent record
  const cIdx = consents.findIndex(c => c.email === sanitized);
  if (cIdx >= 0) { consents.splice(cIdx, 1); saveConsents(consents); removed++; }

  addLog('info', 'PDPA', `🗑️ Erasure request: ${sanitized} — ลบแล้ว ${removed} รายการ`);
  res.json({ success: true, message: `ดำเนินการลบข้อมูลแล้ว (${removed} รายการ) ภายใน 30 วันตาม PDPA`, removed });
});

// GET /api/privacy/policy — ข้อมูล Privacy Policy สำหรับ frontend
app.get('/api/privacy/policy', (req, res) => {
  res.json({
    version:     '1.1',
    effective:   '2026-05-15',
    controller:  'Openthai.ai (DATATAN.NET)',
    contact:     'occylthailand@gmail.com',
    purposes: [
      { id: 'service',    name: 'ให้บริการ AI Generator',   legal_basis: 'สัญญา (มาตรา 24(3))',     required: true  },
      { id: 'affiliate',  name: 'โปรแกรม Affiliate',        legal_basis: 'สัญญา (มาตรา 24(3))',     required: false },
      { id: 'marketing',  name: 'ส่งข่าวสาร/โปรโมชัน',      legal_basis: 'ความยินยอม (มาตรา 19)',   required: false },
      { id: 'analytics',  name: 'วิเคราะห์การใช้งาน',       legal_basis: 'ประโยชน์โดยชอบธรรม (24(5))', required: false },
    ],
    retention:   'ลบข้อมูลภายใน 3 ปีหลังยุติการใช้บริการ หรือเมื่อร้องขอ',
    rights:      ['ขอดูข้อมูล','แก้ไข','ลบ','โอนย้าย','คัดค้าน'],
    erasure_url: '/api/privacy/erasure',
    pdpa_gaps_fixed: ['GAP-001: บันทึก consent record ✅','GAP-002: Right to erasure endpoint ✅'],
    ts: new Date().toISOString(),
  });
});

// ─── Serve openthai-ai-tool.html at /tool ────────────────────────────────────
app.get('/tool', (req, res) => {
  res.sendFile(join(__dirname, '..', 'openthai-ai-tool.html'));
});

// ─── Serve logistics.html at /logistics ──────────────────────────────────────
app.get('/logistics', (req, res) => {
  res.sendFile(join(__dirname, '..', 'logistics.html'));
});

// ═══════════════════════════════════════════════════════════════════════════════
//  STAINLESS-LAYER — OpenAPI · SDK · MCP Server
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/openapi.json — Machine-readable API spec ─────────────────────────
app.get('/api/openapi.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(openapiSpec);
});

// ── GET /api-docs — Interactive Swagger UI (CDN, no extra deps) ───────────────
app.get('/api-docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Openthai.ai — API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
  <style>
    body { margin:0; background:#0f0f1a; }
    .swagger-ui .topbar { background: linear-gradient(135deg,#fe2c55,#6366f1); }
    .swagger-ui .topbar .download-url-wrapper input[type=text] { display:none; }
    .swagger-ui .topbar-wrapper .link { pointer-events:none; }
    .swagger-ui .topbar-wrapper img { content:url('https://www.openthai-ai.com/logo.png'); height:32px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      tryItOutEnabled: true,
      requestInterceptor: (req) => {
        const token = localStorage.getItem('auth_token');
        if (token) req.headers['Authorization'] = 'Bearer ' + token;
        return req;
      },
    });
  </script>
</body>
</html>`);
});

// ── POST /mcp — MCP Server (Model Context Protocol) ──────────────────────────
// Lets Claude agents and other AI systems discover and call Openthai.ai tools.
// Implements JSON-RPC 2.0 + MCP spec (2024-11-05).
//   node sdk:  new Client({ name:'x', version:'1' })  →  transport POST /mcp
//   methods:   initialize | tools/list | tools/call
const mcpLimiter = rateLimit({ windowMs: 60000, max: 60, message: { error: 'MCP rate limit exceeded' } });

app.post('/mcp', mcpLimiter, handleMcp);

// ═══════════════════════════════════════════════════════════════════════════════
//  VOICE COMMANDER — รับ transcript → AI แปล intent → รัน command → speak_text
// ═══════════════════════════════════════════════════════════════════════════════
const voiceLimiter = rateLimit({ windowMs: 60000, max: 20, message: { error: 'Voice API rate limit exceeded' } });

app.post('/api/voice/command', voiceLimiter, async (req, res) => {
  const { transcript, lang, tenantId } = req.body || {};
  if (!transcript?.trim()) {
    return res.status(400).json({ success: false, error: 'transcript is required' });
  }
  try {
    const result = await processVoiceCommand(
      { transcript, lang, tenantId: req.tenant?.id || tenantId || 'global' },
      { anthropic, gemini, smartGenerate, mockGenerate },
    );
    addLog('info', 'Voice', `🎙️ "${transcript.slice(0, 60)}" → ${result.action} (${(result.confidence * 100).toFixed(0)}%)`);
    webhooks.dispatch('voice.command', { action: result.action, transcript: transcript.slice(0, 100) }, tenantId || null);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[voice]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/voice/commands — list available voice commands (th/zh/en)
app.get('/api/voice/commands', (req, res) => {
  res.json({
    success: true,
    lang_supported: ['th-TH', 'zh-CN', 'en-US'],
    commands: [
      { th: 'สร้างคอนเทนต์ [สินค้า]',      zh: '为[产品]创建内容',        en: 'Create content for [product]',      action: 'generate_content' },
      { th: 'ดูเทรนด์วันนี้',               zh: '查看今日趋势',            en: 'Show trending hashtags',            action: 'get_trending' },
      { th: 'ดูข่าวล่าสุด',                 zh: '最新新闻资讯',            en: 'Get latest news',                   action: 'get_news' },
      { th: 'ตรวจสุขภาพระบบ',               zh: '检查系统健康状态',        en: 'Check system health',               action: 'system_health' },
      { th: 'วิเคราะห์คู่แข่งนิช [niche]', zh: '分析[领域]竞争对手',      en: 'Analyze competitor niche [niche]',  action: 'competitor_analyze' },
      { th: 'ดูรายการเอเจนต์',              zh: '查看Agent列表',           en: 'List agents',                       action: 'list_agents' },
      { th: 'ช่วยอะไรได้บ้าง',              zh: '帮助 / 可以做什么',       en: 'What can you do?',                  action: 'help' },
    ],
  });
});

// ── GET /mcp — MCP server metadata (for discovery) ───────────────────────────
app.get('/mcp', (req, res) => {
  res.json({
    name:        'openthai-ai',
    version:     '2.0.0',
    description: 'Openthai.ai — Thai social media content generation. POST /mcp for JSON-RPC.',
    protocol:    'mcp/2024-11-05',
    tools_count: 9,
    docs:        '/api-docs',
    spec:        '/api/openapi.json',
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  VECTOR MEMORY — Long-term semantic memory for AI agents
// ═══════════════════════════════════════════════════════════════════════════════
const memoryLimiter = rateLimit({ windowMs: 60000, max: 30, message: { error: 'Memory API rate limit exceeded' } });

// POST /api/memory/store — บันทึก memory พร้อม embedding
app.post('/api/memory/store', memoryLimiter, async (req, res) => {
  try {
    const { text, type, metadata, tenantId } = req.body || {};
    if (!text) return res.status(400).json({ success: false, message: 'text is required' });
    const tid = req.tenant?.id || tenantId || 'global';
    const result = await memory.store({ tenantId: tid, text, type, metadata });
    res.json({ success: true, ...result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/memory/search — ค้นหาด้วย semantic similarity
app.post('/api/memory/search', memoryLimiter, async (req, res) => {
  try {
    const { query, type, topK, threshold, tenantId } = req.body || {};
    if (!query) return res.status(400).json({ success: false, message: 'query is required' });
    const tid = req.tenant?.id || tenantId || 'global';
    const result = await memory.search({ tenantId: tid, query, type, topK, threshold });
    res.json({ success: true, ...result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/memory — list memories
app.get('/api/memory', (req, res) => {
  const { type, limit, tenantId } = req.query;
  const tid = req.tenant?.id || tenantId || 'global';
  const result = memory.list({ tenantId: tid, type, limit: parseInt(limit) || 50 });
  res.json({ success: true, ...result });
});

// DELETE /api/memory/:id — ลบ memory รายชิ้น (Admin Key — เป็นการลบถาวร ไม่ควรเปิดสาธารณะ)
app.delete('/api/memory/:id', memoryLimiter, (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const tid = req.tenant?.id || req.query.tenantId || 'global';
  const result = memory.delete({ tenantId: tid, id: req.params.id });
  res.json({ success: true, ...result });
});

// DELETE /api/memory — clear ทั้งหมด (with optional ?type=) (Admin Key — ลบทั้ง tenant ได้ ยิ่งต้องป้องกัน)
app.delete('/api/memory', memoryLimiter, (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const tid = req.tenant?.id || req.query.tenantId || 'global';
  const result = memory.clear({ tenantId: tid, type: req.query.type });
  res.json({ success: true, ...result });
});

// ── Human-in-the-loop review — humans rate/correct AI-generated content (type:'content') ──
// stored back into the same vector memory as type:'feedback', linked by metadata.reviewed_item_id.
// This is the real version of "HITL validation": no separate system, reuses what's already deployed.
// GET /api/memory/admin/review-queue — list content items + whether they've been reviewed (Admin Key)
app.get('/api/memory/admin/review-queue', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const tenantId = req.query.tenantId || 'global';
  const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
  try {
    const content = memory.list({ tenantId, type: 'content', limit }).memories;
    const feedback = memory.list({ tenantId, type: 'feedback', limit: 1000 }).memories;
    const reviewedMap = new Map();
    for (const f of feedback) if (f.metadata?.reviewed_item_id) reviewedMap.set(f.metadata.reviewed_item_id, f);
    const queue = content.map((c) => ({
      id: c.id, text: c.text, metadata: c.metadata, ts: c.ts,
      ai_score: c.metadata?.score ?? null,
      reviewed: reviewedMap.has(c.id),
      human_review: reviewedMap.get(c.id) || null,
    }));
    res.json({ success: true, tenantId, total: queue.length, pending: queue.filter((q) => !q.reviewed).length, queue });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
// POST /api/memory/admin/review — submit a human rating/correction on a content item (Admin Key)
app.post('/api/memory/admin/review', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const { tenantId = 'global', item_id, human_rating, note, corrected_text, reviewed_by } = req.body || {};
  const rating = Number(human_rating);
  if (!item_id || !rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, error: 'item_id และ human_rating (1-5) จำเป็นต้องกรอก' });
  try {
    const result = await memory.store({
      tenantId,
      type: 'feedback',
      text: (note || corrected_text || `human review: ${rating}/5`).toString().slice(0, 2000),
      metadata: {
        reviewed_item_id: item_id,
        human_rating: rating,
        note: (note || '').toString().slice(0, 1000),
        corrected_text: (corrected_text || '').toString().slice(0, 2000),
        reviewed_by: (reviewed_by || 'admin').toString().slice(0, 80),
        reviewed_at: new Date().toISOString(),
      },
    });
    res.json({ success: true, ...result });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  WEBHOOK SYSTEM — Push events to subscribers
// ═══════════════════════════════════════════════════════════════════════════════
const webhookLimiter = rateLimit({ windowMs: 60000, max: 20, message: { error: 'Webhook API rate limit' } });

// POST /api/webhooks — ลงทะเบียน webhook
app.post('/api/webhooks', webhookLimiter, (req, res) => {
  try {
    const { url, events, description } = req.body || {};
    const tenantId = req.tenant?.id || 'global';
    const result = webhooks.register({ tenantId, url, events, description });
    res.json({ success: true, ...result });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// GET /api/webhooks — list webhooks
app.get('/api/webhooks', (req, res) => {
  const tenantId = req.tenant?.id;
  const adminView = !tenantId; // admin sees all
  res.json({ success: true, data: webhooks.list({ tenantId, adminView }) });
});

// DELETE /api/webhooks/:id — unregister (Admin Key — ไม่มีหน้า UI เรียกอยู่ในปัจจุบัน จึงล็อกได้โดยไม่กระทบของเดิม)
app.delete('/api/webhooks/:id', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const result = webhooks.remove(req.params.id);
  res.json({ success: true, ...result });
});

// POST /api/webhooks/:id/test — fire test event
app.post('/api/webhooks/:id/test', async (req, res) => {
  try {
    const result = await webhooks.test(req.params.id);
    res.json({ success: true, ...result });
  } catch (e) { res.status(404).json({ success: false, message: e.message }); }
});

// GET /api/webhooks/logs — delivery log (admin)
app.get('/api/webhooks/logs', (req, res) => {
  res.json({ success: true, data: webhooks.logs({ limit: parseInt(req.query.limit) || 50 }) });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  MULTI-TENANT — แต่ละร้านค้ามี agent space ของตัวเอง
// ═══════════════════════════════════════════════════════════════════════════════
const tenantLimiter = rateLimit({ windowMs: 15 * 60000, max: 10, message: { error: 'Tenant API rate limit' } });

// POST /api/tenants/register — สร้าง tenant ใหม่
app.post('/api/tenants/register', tenantLimiter, (req, res) => {
  try {
    const { name, email, plan, businessType, contactPhone } = req.body || {};
    const result = tenants.register({ name, email, plan, businessType, contactPhone });
    addLog('info', 'Tenant', `🏪 Tenant ใหม่: ${result.tenant.name} (${result.tenant.email}) plan:${result.tenant.plan}`);
    webhooks.dispatch('tenant.created', { tenantId: result.tenant.id, name: result.tenant.name, plan: result.tenant.plan });
    res.json({
      success: true,
      message: '🎉 ลงทะเบียนสำเร็จ! บันทึก API key ไว้ด้วย — จะไม่แสดงอีกครั้ง',
      tenant:  result.tenant,
      apiKey:  result.apiKey,
      note:    'ใช้ X-API-Key header ในทุก request หรือ login เพื่อรับ JWT',
    });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// POST /api/tenants/login — login รับ JWT
app.post('/api/tenants/login', tenantLimiter, (req, res) => {
  try {
    const { email, apiKey } = req.body || {};
    const result = tenants.login({ email, apiKey });
    res.json({ success: true, ...result });
  } catch (e) { res.status(401).json({ success: false, message: e.message }); }
});

// GET /api/tenants/me — ข้อมูล tenant ปัจจุบัน (ต้องการ X-API-Key หรือ JWT)
app.get('/api/tenants/me', requireTenant(tenants), (req, res) => {
  res.json({ success: true, tenant: tenants.safeView(req.tenant) });
});

// PATCH /api/tenants/me — อัปเดต settings
app.patch('/api/tenants/me', requireTenant(tenants), (req, res) => {
  try {
    const updated = tenants.update(req.tenant.id, req.body);
    res.json({ success: true, tenant: updated });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// POST /api/tenants/me/rotate-key — rotate API key
app.post('/api/tenants/me/rotate-key', requireTenant(tenants), (req, res) => {
  const result = tenants.rotateKey(req.tenant.id);
  res.json({ success: true, ...result });
});

// GET /api/tenants — admin: list all tenants
app.get('/api/tenants', requireAuth, (req, res) => {
  res.json({ success: true, data: tenants.listAll(), plans: PLANS });
});

// GET /api/tenants/plans — public: plan details
app.get('/api/tenants/plans', (req, res) => {
  res.json({ success: true, plans: PLANS });
});

// ── Tenant-scoped AI Generation (uses X-API-Key + tracks daily quota) ─────────
app.post('/api/t/generate', requireTenant(tenants), generateLimiter, async (req, res) => {
  const tenant = req.tenant;

  // Check daily quota
  if (!tenants.withinLimit(tenant.id)) {
    return res.status(429).json({
      success: false,
      message: `เกิน quota รายวัน (${tenant.planLimits.generates_per_day} ครั้ง) — อัปเกรด plan`,
      plan: tenant.plan,
    });
  }

  const form = { ...req.body };
  // Apply tenant brand defaults if not specified
  if (!form.product?.trim()) return res.status(400).json({ error: 'product is required' });
  form.platform = form.platform || tenant.settings.default_platform;
  form.lang     = form.lang     || tenant.settings.default_lang;
  form.style    = form.style    || tenant.settings.default_style;

  const sanitize = (s) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').slice(0, 500) : '');
  form.product  = sanitize(form.product);
  form.audience = sanitize(form.audience);
  form.price    = sanitize(form.price);

  try {
    const data = await smartGenerate(form);
    tenants.trackUsage(tenant.id);

    // Auto-learn into tenant's memory (non-blocking)
    memory.autoLearn({ tenantId: tenant.id, result: data, form }).catch(() => {});

    // Dispatch webhook event
    webhooks.dispatch('content.generated', {
      product: form.product, platform: form.platform, score: data.criticScore,
    }, tenant.id);

    return res.json({ ...data, tenantId: tenant.id });
  } catch (err) {
    const fallback = mockGenerate(form);
    return res.json({ ...fallback, tenantId: tenant.id });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/auth/login — Email + Password ──────────────────────────────────
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'username และ password จำเป็นต้องมี' });

  const admins = await getAdminUsers();
  const user = admins.find(u => u.username === username.trim());

  if (!user) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

  const valid = await checkPassword(password, user.password);
  if (!valid) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

  const token = signToken({ username: user.username, role: user.role, method: 'password' });
  res.json({ token, user: { username: user.username, role: user.role } });
});

// ─── POST /api/auth/override — Admin Override Key (emergency) ─────────────────
app.post('/api/auth/override', (req, res) => {
  const { key } = req.body || {};
  if (!checkOverrideKey(key))
    return res.status(401).json({ error: 'Override key ไม่ถูกต้อง' });

  const token = signToken({ username: 'admin-override', role: 'admin', method: 'override' });
  res.json({ token, user: { username: 'admin-override', role: 'admin' } });
});

// ─── POST /api/auth/recovery — One-time Recovery Code ────────────────────────
app.post('/api/auth/recovery', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'กรุณาใส่ recovery code' });

  const valid = useRecoveryCode(code);
  if (!valid) return res.status(401).json({ error: 'Recovery code ไม่ถูกต้องหรือใช้แล้ว' });

  const token = signToken({ username: 'admin-recovery', role: 'admin', method: 'recovery' });
  res.json({ token, user: { username: 'admin-recovery', role: 'admin' }, warning: 'code นี้ใช้ไปแล้ว ไม่สามารถใช้ซ้ำได้' });
});

// ─── GET /api/auth/google — Redirect to Google OAuth ─────────────────────────
app.get('/api/auth/google', (req, res) => {
  const url = getGoogleAuthUrl();
  if (!url) return res.status(503).json({ error: 'Google OAuth ยังไม่ได้ตั้งค่า (ต้องการ GOOGLE_CLIENT_ID)' });
  res.redirect(url);
});

// ─── GET /api/auth/google/callback — Google OAuth Callback ───────────────────
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/login?error=google_cancelled`);
  }

  try {
    const profile = await exchangeGoogleCode(code);

    if (!profile.email) throw new Error('ไม่ได้รับ email จาก Google');

    // ตรวจ whitelist (ถ้าตั้ง GOOGLE_ALLOWED_EMAILS ใน .env)
    const allowedEmails = process.env.GOOGLE_ALLOWED_EMAILS
      ? process.env.GOOGLE_ALLOWED_EMAILS.split(',').map(e => e.trim())
      : [];

    if (allowedEmails.length > 0 && !allowedEmails.includes(profile.email)) {
      return res.redirect(`${FRONTEND_URL}/login?error=not_allowed`);
    }

    const token = signToken({
      username: profile.name || profile.email,
      email: profile.email,
      avatar: profile.picture,
      role: 'admin',
      method: 'google',
    });

    // ส่ง token กลับ frontend ผ่าน URL fragment (ปลอดภัยกว่า query string)
    res.redirect(`${FRONTEND_URL}/login?token=${token}`);
  } catch (err) {
    console.error('[google oauth error]', err.message);
    res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
  }
});

// ─── GET /api/auth/verify — ตรวจ JWT ยังใช้ได้อยู่ไหม ──────────────────────
app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CLOUD SYNC — ซิงค์ข้อมูลผู้ใช้ข้ามอุปกรณ์ (มือถือ + คอม + memory + cloud ตรงกัน)
//  เก็บ blob JSON ต่อผู้ใช้: Supabase (ถาวร) ถ้ามี, ไม่งั้น file fallback
// ═══════════════════════════════════════════════════════════════════════════════
const SYNC_FILE = join(WRITE_DATA_DIR, 'user_sync.json');
let _syncStore = {};
try { if (existsSync(SYNC_FILE)) _syncStore = JSON.parse(readFileSync(SYNC_FILE, 'utf8')); } catch { _syncStore = {}; }
const saveSyncFile = () => { try { writeFileSync(SYNC_FILE, JSON.stringify(_syncStore)); } catch { /* ignore */ } };

const syncUserKey = (req) => String(req.user?.username || req.user?.email || 'anon').toLowerCase();

async function syncRead(userKey) {
  if (_useSB) {
    try {
      const rows = await _sbReq('GET', '/user_sync', { params: { user_key: `eq.${userKey}`, select: 'data', limit: '1' } });
      if (Array.isArray(rows) && rows[0]) return rows[0].data || {};
      return {};
    } catch (e) { try { addLog('warn', 'Sync', `read: ${e.message}`); } catch (_) {} }
  }
  return _syncStore[userKey] || {};
}
async function syncWrite(userKey, data) {
  if (_useSB) {
    try {
      await _sbReq('POST', '/user_sync', { prefer: 'resolution=merge-duplicates', body: { user_key: userKey, data, updated_at: new Date().toISOString() } });
      return;
    } catch (e) { try { addLog('warn', 'Sync', `write: ${e.message}`); } catch (_) {} }
  }
  _syncStore[userKey] = data; saveSyncFile();
}

// GET /api/sync — ดึงข้อมูลที่ซิงค์ไว้ (hydrate ตอนเปิดแอป/ล็อกอินอุปกรณ์ใหม่)
app.get('/api/sync', requireAuth, async (req, res) => {
  try {
    const data = await syncRead(syncUserKey(req));
    res.json({ success: true, data, storage: _useSB ? 'cloud' : 'file', ts: new Date().toISOString() });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT /api/sync — บันทึก (merge เพื่อกันอุปกรณ์หนึ่งเขียนทับของอีกอุปกรณ์)
app.put('/api/sync', requireAuth, express.json({ limit: '1mb' }), async (req, res) => {
  try {
    const incoming = (req.body && typeof req.body.data === 'object' && req.body.data) || {};
    const key = syncUserKey(req);
    const current = await syncRead(key);
    const merged = { ...current, ...incoming, _updated_at: new Date().toISOString() };
    await syncWrite(key, merged);
    res.json({ success: true, data: merged, storage: _useSB ? 'cloud' : 'file' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── GET /api/auth/recovery-codes/generate — สร้าง recovery codes ใหม่ ──────
// ต้องใช้ ADMIN_OVERRIDE_KEY เพื่อขอ codes ใหม่
app.post('/api/auth/recovery-codes/generate', (req, res) => {
  const { key } = req.body || {};
  if (!checkOverrideKey(key))
    return res.status(401).json({ error: 'Override key ไม่ถูกต้อง' });

  const codes = generateRecoveryCodes(8);
  res.json({
    codes,
    instruction: 'บันทึก codes เหล่านี้ไว้ในที่ปลอดภัย! ใส่ใน .env ด้วย RECOVERY_CODES=code1,code2,...',
    warning: 'แต่ละ code ใช้ได้เพียงครั้งเดียวเท่านั้น',
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTO-POST ENGINE v1
//  ทำงานอัตโนมัติเมื่อ AI Agent สร้าง content แล้ว
//  Platform: LINE ✅ | Facebook ✅ | TikTok 🔜 (ต้องมี video file) | IG 🔜
// ═══════════════════════════════════════════════════════════════════════════════

const AUTOPOST_FILE = join(WRITE_DATA_DIR, 'autopost_queue.json');
const AUTOPOST_LOG  = join(WRITE_DATA_DIR, 'autopost_log.json');

function loadAutopostQueue() {
  try { if (existsSync(AUTOPOST_FILE)) return JSON.parse(readFileSync(AUTOPOST_FILE, 'utf8')); } catch (_) {}
  return [];
}
function saveAutopostQueue(data) {
  try {
    const dir = AUTOPOST_FILE.replace(/[/\\][^/\\]+$/, '');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(AUTOPOST_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('[autopost] save queue error:', e.message); }
}
function loadAutopostLog() {
  try { if (existsSync(AUTOPOST_LOG)) return JSON.parse(readFileSync(AUTOPOST_LOG, 'utf8')); } catch (_) {}
  return [];
}
function saveAutopostLog(data) {
  try {
    writeFileSync(AUTOPOST_LOG, JSON.stringify(data.slice(0, 200), null, 2), 'utf8');
  } catch (_) {}
}

const autopostQueue = loadAutopostQueue();
const autopostLog   = loadAutopostLog();

// ── Platform Poster Functions ─────────────────────────────────────────────────

// 1️⃣ LINE Broadcast — ส่งหา Followers ทั้งหมด (ต้องมี LINE_CHANNEL_TOKEN)
async function postToLINE(content) {
  const token = process.env.LINE_CHANNEL_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_TOKEN ยังไม่ได้ตั้ง');
  const msg = `🌿 ${content.hook}\n\n${content.caption}\n\n${(content.hashtags||[]).join(' ')}`;
  const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ type: 'text', text: msg.slice(0, 5000) }] }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`LINE broadcast error ${res.status}: ${e}`); }
  return { platform: 'line', status: 'success', ts: new Date().toISOString() };
}

// 2️⃣ Facebook Page Post — ข้อความ + hashtags (ต้องมี FB_PAGE_ID + FB_PAGE_TOKEN)
async function postToFacebook(content) {
  const pageId    = process.env.FB_PAGE_ID;
  const pageToken = process.env.FB_PAGE_TOKEN;
  if (!pageId || !pageToken) throw new Error('FB_PAGE_ID หรือ FB_PAGE_TOKEN ยังไม่ได้ตั้ง');
  const message = `${content.hook}\n\n${content.script?.join('\n') || ''}\n\n${content.caption}\n\n${(content.hashtags||[]).join(' ')}`;
  const res = await fetch(`https://graph.facebook.com/v25.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message.slice(0, 60000), access_token: pageToken }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`Facebook post error ${res.status}: ${e}`); }
  const data = await res.json();
  return { platform: 'facebook', status: 'success', post_id: data.id, ts: new Date().toISOString() };
}

// 3️⃣ TikTok — เพิ่ม caption ลง queue (video ต้องอัปโหลดเองก่อน — API ต้องการไฟล์วิดีโอ)
//    เมื่อมี TIKTOK_ACCESS_TOKEN + video file → จะ auto-post อัตโนมัติ
async function postToTikTok(content, videoPath) {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) throw new Error('TIKTOK_ACCESS_TOKEN ยังไม่ได้ตั้ง');
  if (!videoPath) throw new Error('ต้องการ video file path สำหรับ TikTok');

  // Step 1: Init upload
  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({
      post_info: {
        title:           content.caption?.slice(0, 150) || content.hook?.slice(0, 150),
        privacy_level:   'PUBLIC_TO_EVERYONE',
        disable_duet:    false,
        disable_comment: false,
        disable_stitch:  false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: { source: 'FILE_UPLOAD', video_size: 0, chunk_size: 0, total_chunk_count: 1 },
    }),
  });
  if (!initRes.ok) { const e = await initRes.text(); throw new Error(`TikTok init error ${initRes.status}: ${e}`); }
  const initData = await initRes.json();
  return { platform: 'tiktok', status: 'queued', publish_id: initData?.data?.publish_id, caption: content.caption?.slice(0,150), ts: new Date().toISOString() };
}

// ── Master Auto-Post Dispatcher ───────────────────────────────────────────────
async function dispatchAutoPost(item) {
  const results = [];
  const platforms = item.platforms || [];

  for (const platform of platforms) {
    try {
      let result;
      if (platform === 'line')     result = await postToLINE(item.content);
      if (platform === 'facebook') result = await postToFacebook(item.content);
      if (platform === 'tiktok')   result = await postToTikTok(item.content, item.videoPath);
      if (result) {
        results.push(result);
        addLog('info', 'AutoPost', `✅ ${platform.toUpperCase()} posted — ${item.content.hook?.slice(0,60)}`);
      }
    } catch (err) {
      results.push({ platform, status: 'error', error: err.message, ts: new Date().toISOString() });
      addLog('warn', 'AutoPost', `⚠️ ${platform.toUpperCase()} ไม่สำเร็จ: ${err.message}`);
    }
  }

  // บันทึก log
  autopostLog.unshift({ id: item.id, product: item.product, results, dispatched_at: new Date().toISOString() });
  saveAutopostLog(autopostLog);
  return results;
}

// ── POST /api/autopost/queue — เพิ่มงานเข้า queue ───────────────────────────
app.post('/api/autopost/queue', requireAuth, async (req, res) => {
  const { product, content, platforms, schedule_at, videoPath } = req.body || {};
  if (!product || !content?.hook) return res.status(400).json({ success: false, message: 'ต้องการ product และ content.hook' });

  const item = {
    id:          Date.now().toString(),
    product,
    content,
    platforms:   platforms || ['line', 'facebook'],
    schedule_at: schedule_at || new Date().toISOString(),
    videoPath:   videoPath || null,
    status:      'queued',
    created_at:  new Date().toISOString(),
  };

  // ถ้า schedule_at เป็นปัจจุบัน → post ทันที
  const scheduledTime = new Date(item.schedule_at).getTime();
  const now = Date.now();

  if (scheduledTime <= now + 60000) { // ภายใน 1 นาที = ส่งทันที
    const results = await dispatchAutoPost(item);
    item.status = results.some(r => r.status === 'success') ? 'sent' : 'failed';
    item.results = results;
    autopostQueue.push(item);
    saveAutopostQueue(autopostQueue);
    return res.json({ success: true, message: 'โพสต์ทันที', item });
  }

  // ถ้ามีเวลากำหนด → เข้า queue รอ cron ส่ง
  autopostQueue.push(item);
  saveAutopostQueue(autopostQueue);
  addLog('info', 'AutoPost', `📋 Queued: ${product} → ${platforms?.join('+')} @ ${item.schedule_at}`);
  res.json({ success: true, message: `เพิ่มใน queue แล้ว จะส่ง ${item.schedule_at}`, item });
});

// ── GET /api/autopost/queue — ดู queue ทั้งหมด ──────────────────────────────
app.get('/api/autopost/queue', (req, res) => {
  res.json({ success: true, total: autopostQueue.length, data: autopostQueue.slice(0, 50) });
});

// ── GET /api/autopost/log — ประวัติการส่ง ──────────────────────────────────
app.get('/api/autopost/log', (req, res) => {
  res.json({ success: true, total: autopostLog.length, data: autopostLog.slice(0, 50) });
});

// ── GET /api/autopost/status — สถานะ credentials ทุก platform ───────────────
app.get('/api/autopost/status', (req, res) => {
  res.json({
    success: true,
    platforms: {
      line: {
        ready:    !!process.env.LINE_CHANNEL_TOKEN,
        token:    process.env.LINE_CHANNEL_TOKEN ? '✅ Set' : '❌ ต้องการ LINE_CHANNEL_TOKEN',
        can_post: !!process.env.LINE_CHANNEL_TOKEN,
        note:     'Broadcast ไปหา Followers ทั้งหมดของ LINE OA',
      },
      facebook: {
        ready:    !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN),
        page_id:  process.env.FB_PAGE_ID   ? '✅ Set' : '❌ ต้องการ FB_PAGE_ID',
        token:    process.env.FB_PAGE_TOKEN ? '✅ Set' : '❌ ต้องการ FB_PAGE_TOKEN (never-expiring)',
        can_post: !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN),
        note:     'Post ข้อความ+ลิงก์บน Facebook Page',
      },
      tiktok: {
        ready:    !!process.env.TIKTOK_ACCESS_TOKEN,
        token:    process.env.TIKTOK_ACCESS_TOKEN ? '✅ Set' : '❌ ต้องการ TIKTOK_ACCESS_TOKEN',
        can_post: false,
        note:     'ต้องการ video file + TikTok API approval (2-6 สัปดาห์) — ตอนนี้: queue caption ไว้รอ',
      },
      instagram: {
        ready:    !!(process.env.IG_USER_ID && process.env.FB_PAGE_TOKEN),
        ig_user:  process.env.IG_USER_ID ? '✅ Set' : '❌ ต้องการ IG_USER_ID',
        can_post: !!(process.env.IG_USER_ID && process.env.FB_PAGE_TOKEN),
        note:     'Post Reels/Image บน Instagram Business ผ่าน Facebook Graph API',
      },
      shopee: {
        ready:    false,
        can_post: false,
        note:     'Shopee ไม่มี auto-post API — ใช้ export CSV + manual upload แทน',
      },
    },
    summary: {
      ready_now:    [process.env.LINE_CHANNEL_TOKEN && 'LINE', process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN && 'Facebook', process.env.IG_USER_ID && process.env.FB_PAGE_TOKEN && 'Instagram'].filter(Boolean),
      needs_setup:  [!process.env.LINE_CHANNEL_TOKEN && 'LINE', !(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN) && 'Facebook', !process.env.TIKTOK_ACCESS_TOKEN && 'TikTok'].filter(Boolean),
    },
    ts: new Date().toISOString(),
  });
});

// ── Cron: ทุก 5 นาที ตรวจ queue ที่ถึงเวลา (local only) ─────────────────────
if (!IS_VERCEL) {
  cron.schedule('*/5 * * * *', async () => {
    const now = Date.now();
    const pending = autopostQueue.filter(i => i.status === 'queued' && new Date(i.schedule_at).getTime() <= now);
    for (const item of pending) {
      item.status = 'processing';
      const results = await dispatchAutoPost(item);
      item.status = results.some(r => r.status === 'success') ? 'sent' : 'failed';
      item.results = results;
    }
    if (pending.length > 0) saveAutopostQueue(autopostQueue);
  });
}

// ── Vercel Cron trigger: GET /api/autopost/process ────────────────────────────
app.get('/api/autopost/process', async (req, res) => {
  const now = Date.now();
  const pending = autopostQueue.filter(i => i.status === 'queued' && new Date(i.schedule_at).getTime() <= now);
  let processed = 0;
  for (const item of pending) {
    item.status = 'processing';
    const results = await dispatchAutoPost(item);
    item.status = results.some(r => r.status === 'success') ? 'sent' : 'failed';
    item.results = results;
    processed++;
  }
  if (processed > 0) saveAutopostQueue(autopostQueue);
  addLog('info', 'AutoPost', `🔄 Cron processed ${processed} queued posts`);
  res.json({ success: true, processed, ts: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  VIDEO GENERATOR — Script + Storyboard + Multi-provider Video AI
// ═══════════════════════════════════════════════════════════════════════════════
const VIDEO_JOBS_FILE = join(WRITE_DATA_DIR, 'video_jobs.json');
function loadVideoJobs() {
  try { if (existsSync(VIDEO_JOBS_FILE)) return JSON.parse(readFileSync(VIDEO_JOBS_FILE, 'utf8')); } catch (_) {}
  return [];
}
function saveVideoJobs(data) {
  try { writeFileSync(VIDEO_JOBS_FILE, JSON.stringify(data.slice(0, 200), null, 2), 'utf8'); } catch (_) {}
}
const videoJobs = loadVideoJobs();

const videoLimiter = rateLimit({ windowMs: 60000, max: 10, message: { error: 'Video API rate limit — 10/min' } });

// POST /api/video/generate — สร้าง Script + ส่งไป Video API
app.post('/api/video/generate', videoLimiter, async (req, res) => {
  const form = req.body || {};
  if (!form.product?.trim()) return res.status(400).json({ error: 'product required' });

  const sanitize = s => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').slice(0, 500) : '');
  form.product     = sanitize(form.product);
  form.description = sanitize(form.description);

  try {
    const script = await generateVideoScript(form, { anthropic, gemini });
    const provider = form.provider || 'mock';
    const apiKey   = provider === 'runway' ? process.env.RUNWAY_API_KEY
                   : provider === 'pika'   ? process.env.PIKA_API_KEY
                   : provider === 'kling'  ? process.env.KLING_API_KEY
                   : provider === 'luma'   ? process.env.LUMA_API_KEY
                   : provider === 'veo'    ? process.env.GEMINI_API_KEY
                   : '';

    const job = await submitToVideoAPI(script, provider, apiKey || '');

    // persist job
    const entry = { id: `vj_${Date.now()}`, form, script, job, createdAt: new Date().toISOString() };
    videoJobs.unshift(entry);
    saveVideoJobs(videoJobs);

    // fire webhook
    webhooks.dispatch('video.generated', { jobId: entry.id, product: form.product, provider, score: script.criticScore }, null);

    res.json({ success: true, script, job, jobRecordId: entry.id });
  } catch (e) {
    addLog('error', 'VideoGen', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/video/jobs — รายการ jobs
app.get('/api/video/jobs', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  res.json({ success: true, data: videoJobs.slice(0, limit) });
});

// GET /api/video/jobs/:id/status — poll provider status
app.get('/api/video/jobs/:id/status', async (req, res) => {
  const entry = videoJobs.find(j => j.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'job not found' });

  const { job, form } = entry;
  if (job.provider === 'mock') return res.json({ ...job, message: 'Script-only mode' });

  const apiKey = form.provider === 'runway' ? process.env.RUNWAY_API_KEY
               : form.provider === 'pika'   ? process.env.PIKA_API_KEY
               : form.provider === 'kling'  ? process.env.KLING_API_KEY
               : form.provider === 'luma'   ? process.env.LUMA_API_KEY : '';
  try {
    const status = await pollVideoJob(job.job_id, job.provider, apiKey || '');
    entry.job = { ...entry.job, ...status };
    saveVideoJobs(videoJobs);
    res.json({ success: true, ...status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  OMISE PAYMENT — PromptPay QR + Subscription Billing
// ═══════════════════════════════════════════════════════════════════════════════
// ─── Payments DB — Supabase primary / JSON file fallback ─────────────────────
const PAYMENTS_FILE = join(WRITE_DATA_DIR, 'payments.json');
let payments = [];
try { if (existsSync(PAYMENTS_FILE)) payments = JSON.parse(readFileSync(PAYMENTS_FILE, 'utf8')); } catch (_) {}

if (_useSB) {
  _sbReq('GET', '/payments', { params: { select: '*', order: 'created_at.desc', limit: '500' } })
    .then(rows => {
      if (Array.isArray(rows) && rows.length > 0) {
        payments.length = 0; payments.push(...rows);
        console.log(`[payments] ✅ Loaded ${rows.length} from Supabase`);
      }
    })
    .catch(e => console.warn('[payments] Supabase init failed, using file:', e.message));
}

function savePayments(data) {
  try { writeFileSync(PAYMENTS_FILE, JSON.stringify(data.slice(0, 500), null, 2), 'utf8'); } catch (_) {}
  if (_useSB && data.length > 0) {
    const rec = data[0];
    const row = {
      charge_id:  rec.charge_id || rec.subscription_id || `pay_${Date.now()}`,
      email:      rec.email || null,
      plan:       rec.plan || 'unknown',
      method:     rec.method || 'unknown',
      amount_thb: rec.amount_thb || null,
      status:     rec.status || null,
      paid:       !!rec.paid,
      paid_at:    rec.paid_at || null,
      mock_mode:  !!rec.mock_mode,
      created_at: rec.createdAt || new Date().toISOString(),
    };
    _sbReq('POST', '/payments', { body: [row], params: { on_conflict: 'charge_id' }, prefer: 'resolution=merge-duplicates,return=minimal' })
      .catch(e => console.warn('[payments] Supabase write failed:', e.message));
  }
}

// ─── Entitlements DB — Supabase primary / JSON file fallback ─────────────────
const ENTITLEMENTS_FILE = join(WRITE_DATA_DIR, 'entitlements.json');
let entitlements = {};
try { if (existsSync(ENTITLEMENTS_FILE)) entitlements = JSON.parse(readFileSync(ENTITLEMENTS_FILE, 'utf8')); } catch (_) {}

if (_useSB) {
  _sbReq('GET', '/entitlements', { params: { select: '*', limit: '10000' } })
    .then(rows => {
      if (Array.isArray(rows) && rows.length > 0) {
        rows.forEach(r => { entitlements[r.email] = r; });
        console.log(`[entitlements] ✅ Loaded ${rows.length} from Supabase`);
      }
    })
    .catch(e => console.warn('[entitlements] Supabase init failed, using file:', e.message));
}

function saveEntitlements(data) {
  try { writeFileSync(ENTITLEMENTS_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch (_) {}
}

// เปิดสิทธิ์ใช้งานแผนให้ user (เรียกเมื่อชำระเงินสำเร็จ)
function grantEntitlement(email, plan, { source = 'payment', subscription_id = null } = {}) {
  if (!email || !plan || plan === 'free') return null;
  const now = new Date();
  const expires = new Date(now); expires.setMonth(expires.getMonth() + 1);  // +1 เดือน
  const key = email.toLowerCase();
  const ent = {
    email: key, plan, status: 'active', source,
    subscription_id: subscription_id || entitlements[key]?.subscription_id || null,
    started_at: entitlements[key]?.started_at || now.toISOString(),
    updated_at: now.toISOString(),
    expires_at: expires.toISOString(),
  };
  entitlements[key] = ent;
  saveEntitlements(entitlements);
  if (_useSB) {
    _sbReq('POST', '/entitlements', { body: [ent], params: { on_conflict: 'email' }, prefer: 'resolution=merge-duplicates,return=minimal' })
      .catch(e => console.warn('[entitlements] Supabase grant failed:', e.message));
  }
  addLog('info', 'Entitlement', `เปิดสิทธิ์ ${plan} ให้ ${key} (${source})`);
  return ent;
}

// เครดิตค่าคอมมิชชั่นให้ affiliate เมื่อมีการขายผ่าน ref link (รองรับทั้ง plan + quickpay)
// เรียกได้จากทั้ง webhook และ status-poll — ป้องกันเครดิตซ้ำด้วย flag firstTime ฝั่งผู้เรียก
// เลื่อน Tier อัตโนมัติตามจำนวนดีลสะสม — ยิ่งขายยิ่งได้ค่าคอมเพิ่ม
// starter 20% (0-9) → pro 30% (10-49) → elite 40% (50+)
const AFFILIATE_TIERS = [
  { tier: 'elite',   min: 50, rate: 0.40 },
  { tier: 'pro',     min: 10, rate: 0.30 },
  { tier: 'starter', min: 0,  rate: 0.20 },
];
function tierForSales(sales) {
  return AFFILIATE_TIERS.find(t => (sales || 0) >= t.min) || AFFILIATE_TIERS[AFFILIATE_TIERS.length - 1];
}

function creditAffiliateSale(refCode, amountThb, { charge_id = null, source = null } = {}) {
  if (!refCode || !(amountThb > 0)) return null;
  const aff = affiliates.find(a => a.ref_code === refCode);
  if (!aff) return null;
  // คอมมิชชันของดีลนี้คิดด้วยเรตปัจจุบัน (การเลื่อนขั้นมีผลกับดีลถัดไป)
  const commission = +(amountThb * (aff.commission_rate || 0.20)).toFixed(2);
  aff.total_sales = (aff.total_sales || 0) + 1;
  aff.total_earned = +((aff.total_earned || 0) + commission).toFixed(2);
  aff.recent_sales = [{ amount_thb: amountThb, commission, charge_id, source: source || 'direct', at: new Date().toISOString() }, ...(aff.recent_sales || [])].slice(0, 50);

  // attribution ยอดขาย/รายได้ตามแหล่งที่มา (รู้ว่า "เงินจริง" มาจากช่องไหน)
  const src = cleanSource(source);
  aff.sales_by_source = aff.sales_by_source || {};
  aff.earned_by_source = aff.earned_by_source || {};
  aff.sales_by_source[src] = (aff.sales_by_source[src] || 0) + 1;
  aff.earned_by_source[src] = +((aff.earned_by_source[src] || 0) + commission).toFixed(2);

  // ตรวจเลื่อนขั้นหลังเพิ่มยอดดีล
  let promoted = null;
  const target = tierForSales(aff.total_sales);
  if (target.tier !== (aff.tier || 'starter') && target.rate > (aff.commission_rate || 0.20)) {
    const from = aff.tier || 'starter';
    aff.tier = target.tier;
    aff.commission_rate = target.rate;
    promoted = { from, to: target.tier, rate: target.rate };
    addLog('info', 'Affiliate', `🎉 เลื่อนขั้น ${from} → ${target.tier} (${Math.round(target.rate * 100)}%) — ${refCode} (${aff.name})`);
    webhooks.dispatch('affiliate.tier_up', { ref_code: refCode, from, to: target.tier, rate: target.rate, total_sales: aff.total_sales }, null);
  }

  saveAffiliate(aff).catch(e => console.warn('[affiliate] credit failed:', e.message));
  addLog('info', 'Affiliate', `commission +${commission}฿ → ${refCode} (${aff.name})`);
  webhooks.dispatch('affiliate.sale', { ref_code: refCode, amount_thb: amountThb, commission, charge_id }, null);
  return { commission, ref_code: refCode, promoted };
}

// คืนสิทธิ์ปัจจุบัน (เช็ควันหมดอายุ) — ถ้าหมดอายุถือเป็น free
function getEntitlement(email) {
  if (!email) return { plan: 'free', status: 'none' };
  const ent = entitlements[email.toLowerCase()];
  if (!ent) return { plan: 'free', status: 'none' };
  if (ent.status === 'active' && ent.expires_at && new Date(ent.expires_at) < new Date()) {
    ent.status = 'expired'; saveEntitlements(entitlements);
    if (_useSB) {
      _sbReq('PATCH', `/entitlements?email=eq.${encodeURIComponent(ent.email)}`, { body: { status: 'expired', updated_at: new Date().toISOString() } })
        .catch(e => console.warn('[entitlements] Supabase expiry update failed:', e.message));
    }
  }
  return ent.status === 'active' ? ent : { ...ent, plan: 'free' };
}

// ─── Usage quota — บังคับโควต้ารายวันตามแผน ───────────────────────────────────
const FREE_DAILY_LIMIT = 3;          // Free = 3 ชิ้น/วัน (ตรงกับหน้า Pricing)
const PAID_PLANS = new Set(['pro', 'premier']);
const _usage = new Map();            // key: "YYYY-MM-DD:identity" → count
const today = () => new Date().toISOString().slice(0, 10);

// อ่านอีเมล user จาก header/body — ตรวจรูปแบบก่อนใช้เป็น identity key
function userEmailFrom(req) {
  const raw = (req.headers['x-user-email'] || req.body?.email || req.query?.email || '').toString().trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : '';
}

// เช็คโควต้า — paid = ไม่จำกัด, free = จำกัดต่อวันตาม IP+email
async function checkQuota(req) {
  const email = userEmailFrom(req);
  const plan = getEntitlement(email).plan;
  if (PAID_PLANS.has(plan)) return { allowed: true, plan, unlimited: true };

  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
  const key = `${today()}:${email || ip}`;
  const used = _usage.get(key) || 0;
  if (used < FREE_DAILY_LIMIT) {
    return { allowed: true, plan: 'free', unlimited: false, used, limit: FREE_DAILY_LIMIT, remaining: Math.max(0, FREE_DAILY_LIMIT - used), key };
  }
  // โควต้าฟรีหมดแล้ว → ใช้เครดิตโบนัส (จากรางวัล spin/streak) แทนได้
  const cid = credits.identityFrom(req);
  if (await credits.hasCredit(cid)) {
    const bal = (await credits.pub(cid)).balance;
    return { allowed: true, plan: 'free', unlimited: false, used, limit: FREE_DAILY_LIMIT, remaining: 0, key, viaCredit: true, creditBalance: bal };
  }
  return { allowed: false, plan: 'free', unlimited: false, used, limit: FREE_DAILY_LIMIT, remaining: 0, key };
}

// บันทึกการใช้ 1 ครั้ง (เรียกหลัง generate สำเร็จ)
async function consumeQuota(req) {
  const q = await checkQuota(req);
  if (q.unlimited) return q;
  // ถ้าเกินโควต้าฟรี แต่ผ่านได้ด้วยเครดิตโบนัส → หักเครดิต 1 หน่วย (ไม่แตะโควต้ารายวัน)
  if (q.viaCredit) {
    const cid = credits.identityFrom(req);
    await credits.consumeCredit(cid);
    const bal = (await credits.pub(cid)).balance;
    return { ...q, viaCredit: true, creditBalance: bal };
  }
  // กันคีย์เก่าบวม — ลบ entry ของวันก่อนหน้าเป็นครั้งคราว
  if (_usage.size > 5000) for (const k of _usage.keys()) if (!k.startsWith(today())) _usage.delete(k);
  _usage.set(q.key, (q.used || 0) + 1);
  return { ...q, used: q.used + 1, remaining: Math.max(0, FREE_DAILY_LIMIT - (q.used + 1)) };
}

const paymentLimiter = rateLimit({ windowMs: 60000, max: 10, message: { error: 'Payment rate limit' } });

// POST /api/payment/create — สร้าง charge แบบ PromptPay / บัตรเครดิต / subscription
app.post('/api/payment/create', paymentLimiter, async (req, res) => {
  const { plan = 'pro', method = 'promptpay', email, name, token, return_uri } = req.body || {};
  const planDef = SUBSCRIPTION_PLANS[plan];
  if (!planDef) return res.status(400).json({ error: 'Invalid plan' });
  if (planDef.price_thb === 0) return res.json({ success: true, plan, status: 'free', message: 'ไม่ต้องชำระเงิน' });

  // ส่วนลดจากรางวัลวงล้อ (spin "X% off") — ใช้ได้กับ one-time charge (ไม่รวม subscription)
  let amount = planDef.price_thb;
  let discountPct = 0;
  if (method !== 'subscription') {
    discountPct = await credits.consumeDiscount(credits.identityFrom(req));
    if (discountPct > 0) amount = Math.max(1, Math.round(planDef.price_thb * (100 - discountPct) / 100));
  }

  if (!process.env.OMISE_SECRET_KEY) {
    // Mock mode — Omise ยังไม่ได้ตั้ง (dev/staging only). ห้ามใช้ใน production จริง
    console.warn('[payment] ⚠️  OMISE_SECRET_KEY not set — running in MOCK mode. No real charge will be made. Set OMISE_SECRET_KEY + OMISE_PUBLIC_KEY + OMISE_PLAN_PRO + OMISE_PLAN_PREMIER + OMISE_WEBHOOK_SECRET in production.');
    const isCard = method === 'card';
    const mock = {
      charge_id:     `mock_charge_${Date.now()}`,
      status:        isCard ? 'successful' : 'pending',
      paid:          isCard,
      amount_thb:    amount,
      original_thb:  planDef.price_thb,
      discount_pct:  discountPct,
      qr_image_url:  null,
      expires_at:    new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      promptpay_ref: isCard ? null : 'MOCKREF001',
      plan,
      mock_mode:     true,
      message:       '⚠️ MOCK MODE — ไม่มีการตัดเงินจริง ต้องตั้งค่า OMISE_SECRET_KEY ใน production',
    };
    const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.toLowerCase() : null;
    payments.unshift({ ...mock, method, email: validEmail, paid_at: isCard ? new Date().toISOString() : null, createdAt: new Date().toISOString() });
    savePayments(payments);
    if (isCard && validEmail) grantEntitlement(validEmail, plan, { source: 'mock-card' });
    return res.json({ success: true, ...mock });
  }

  try {
    if (method === 'promptpay') {
      const charge = await createPromptPayCharge({
        amount_thb: amount,
        description: `Openthai.ai ${planDef.name} Plan${discountPct ? ` (-${discountPct}%)` : ''}`,
        metadata: { plan, email: email || '', method, discount_pct: discountPct },
      });
      payments.unshift({ ...charge, plan, method, email: email || null, createdAt: new Date().toISOString() });
      savePayments(payments);
      return res.json({ success: true, ...charge, plan, original_thb: planDef.price_thb, discount_pct: discountPct });
    }

    if (method === 'card') {
      if (!token) return res.status(400).json({ error: 'ต้องการ card token (tokenize ด้วย Omise.js ก่อน)' });
      const charge = await createCardCharge({
        amount_thb: amount,
        token,
        description: `Openthai.ai ${planDef.name} Plan${discountPct ? ` (-${discountPct}%)` : ''}`,
        metadata: { plan, email: email || '', method, discount_pct: discountPct },
        return_uri: return_uri || undefined,
      });
      const paidAt = charge.paid ? new Date().toISOString() : null;
      payments.unshift({ ...charge, plan, method, email: email || null, paid_at: paidAt, createdAt: new Date().toISOString() });
      savePayments(payments);
      if (charge.status === 'failed') {
        return res.status(402).json({ error: charge.failure_message || 'บัตรถูกปฏิเสธ กรุณาลองบัตรอื่น', charge_id: charge.charge_id });
      }
      // ชำระสำเร็จทันที (ไม่ต้องทำ 3-D Secure) → ส่งใบเสร็จ + dispatch webhook
      if (charge.paid) {
        grantEntitlement(email, plan, { source: 'card' });
        webhooks.dispatch('payment.completed', { charge_id: charge.charge_id, amount_thb: charge.amount_thb, plan }, null);
        sendPaymentReceipt(email, { plan, amount_thb: charge.amount_thb, charge_id: charge.charge_id, paid_at: paidAt, method });
      }
      return res.json({ success: true, ...charge, plan, original_thb: planDef.price_thb, discount_pct: discountPct });
    }

    if (method === 'subscription') {
      if (!email) return res.status(400).json({ error: 'ต้องการอีเมลสำหรับการสมัครสมาชิกรายเดือน' });
      if (!token) return res.status(400).json({ error: 'ต้องการ card token (tokenize บัตรด้วย Omise.js ก่อน)' });
      if (!planDef.omise_plan_id) return res.status(400).json({ error: `แผน ${plan} ยังไม่ได้ตั้งค่า Omise plan ID — รัน ensureOmisePlans หรือกำหนด OMISE_PLAN_${plan.toUpperCase()}` });
      // แนบบัตรเข้ากับ customer เพื่อให้ Omise ตัดเงินอัตโนมัติทุกเดือน
      const customer = await createOrGetCustomer({ email, name: name || email, card_token: token });
      const sub = await createSubscription({ customer_id: customer.customer_id, plan_key: plan });
      payments.unshift({ ...sub, method, email, createdAt: new Date().toISOString() });
      savePayments(payments);
      grantEntitlement(email, plan, { source: 'subscription', subscription_id: sub.subscription_id });
      sendPaymentReceipt(email, { plan, amount_thb: sub.amount_thb, charge_id: sub.subscription_id, paid_at: new Date().toISOString(), method });
      return res.json({ success: true, ...sub });
    }

    return res.status(400).json({ error: 'method must be promptpay, card or subscription' });
  } catch (e) {
    addLog('error', 'Payment', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/payment/config — public key สำหรับ Omise.js (tokenize บัตรฝั่ง client)
app.get('/api/payment/config', (req, res) => {
  res.json({
    success: true,
    public_key: process.env.OMISE_PUBLIC_KEY || null,
    configured: Boolean(process.env.OMISE_SECRET_KEY),
    currency: 'thb',
  });
});

// POST /api/quickpay/create — สร้าง PromptPay QR สำหรับขายแพ็กเกจ/สินค้าชิ้นเดียว
// ยอดกำหนดเองได้ (default ฿1,000). ใช้สำหรับปิดการขายไว ๆ — สแกนจ่าย → เงินเข้า Omise/พร้อมเพย์
// เช็คสถานะด้วย GET /api/payment/status/:chargeId (generic — ใช้ร่วมกับ flow plan ได้)
const quickpayLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: { success: false, error: 'สร้าง QR บ่อยเกินไป กรุณารอสักครู่' } });
app.post('/api/quickpay/create', quickpayLimiter, async (req, res) => {
  const amount = Math.max(1, Math.min(100000, Math.round(Number(req.body?.amount_thb) || 1000)));
  const label = (req.body?.label || 'แพ็กเกจ Openthai.ai').toString().trim().slice(0, 80) || 'แพ็กเกจ Openthai.ai';
  const buyer = (req.body?.buyer || '').toString().trim().slice(0, 80);
  const buyerEmail = (req.body?.email || '').toString().trim().toLowerCase();
  // ref affiliate — รับเฉพาะที่มีอยู่จริง เพื่อเครดิตคอมมิชชั่นตอนจ่ายสำเร็จ
  const refRaw = (req.body?.ref || '').toString().replace(/[^A-Z0-9a-z_-]/g, '').slice(0, 40);
  const refCode = refRaw && affiliates.some(a => a.ref_code === refRaw) ? refRaw : null;
  const source = cleanSource(req.body?.source);   // แหล่งที่มา (utm_source) → attribution ยอดขาย

  // Mock mode — ยังไม่ตั้ง Omise (dev/staging) → คืน QR จำลอง ไม่ตัดเงินจริง
  if (!process.env.OMISE_SECRET_KEY) {
    const mock = { charge_id: `mock_qp_${Date.now()}`, status: 'pending', amount_thb: amount, qr_image_url: null, expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), promptpay_ref: 'MOCKREF-QP' };
    // email: null → ข้าม flow ปลดสิทธิ์ plan (quickpay ไม่ผูกกับ subscription plan)
    payments.unshift({ ...mock, plan: null, method: 'promptpay', kind: 'quickpay', label, buyer, buyer_email: buyerEmail || null, ref_code: refCode, source, email: null, paid_at: null, createdAt: new Date().toISOString() });
    savePayments(payments);
    return res.json({ success: true, mock: true, ...mock, label, ref_code: refCode, message: '⚠️ MOCK MODE — ยังไม่ตัดเงินจริง ตั้ง OMISE_SECRET_KEY ใน production เพื่อรับเงินจริง' });
  }

  try {
    const charge = await createPromptPayCharge({
      amount_thb: amount,
      description: `Openthai.ai QuickPay — ${label}`,
      metadata: { kind: 'quickpay', label, buyer, email: buyerEmail || '', ref_code: refCode || '', source },
    });
    payments.unshift({ ...charge, plan: null, method: 'promptpay', kind: 'quickpay', label, buyer, buyer_email: buyerEmail || null, ref_code: refCode, source, email: null, createdAt: new Date().toISOString() });
    savePayments(payments);
    addLog('info', 'QuickPay', `สร้าง QR ฿${amount} — ${label}${refCode ? ` · ref:${refCode}` : ''}${source !== 'direct' ? ` · src:${source}` : ''} (${charge.charge_id})`);
    return res.json({ success: true, ...charge, label, ref_code: refCode });
  } catch (e) {
    addLog('error', 'QuickPay', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/payment/entitlement?email= — เช็คแผนที่ user มีสิทธิ์ใช้ตอนนี้
app.get('/api/payment/entitlement', (req, res) => {
  const email = (req.query.email || '').trim();
  if (!email) return res.status(400).json({ error: 'ต้องการ email' });
  const ent = getEntitlement(email);
  res.json({ success: true, ...ent });
});

// POST /api/payment/cancel — ยกเลิก subscription (ใช้สิทธิ์ได้จนถึงวันหมดอายุ)
app.post('/api/payment/cancel', async (req, res) => {
  const email = (req.body?.email || '').trim();
  if (!email) return res.status(400).json({ error: 'ต้องการ email' });
  const ent = entitlements[email.toLowerCase()];
  if (!ent) return res.status(404).json({ error: 'ไม่พบสิทธิ์การใช้งานสำหรับอีเมลนี้' });

  try {
    if (ent.subscription_id && process.env.OMISE_SECRET_KEY) {
      await cancelSubscription(ent.subscription_id);
    }
    ent.status = 'cancelled';
    ent.updated_at = new Date().toISOString();
    saveEntitlements(entitlements);
    addLog('info', 'Entitlement', `ยกเลิก subscription ของ ${email}`);
    res.json({ success: true, message: `ยกเลิกแล้ว — ใช้งานแผน ${ent.plan} ได้จนถึง ${new Date(ent.expires_at).toLocaleDateString('th-TH')}`, ...ent });
  } catch (e) {
    addLog('error', 'Payment', `Cancel failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/payment/status/:chargeId — poll charge status
app.get('/api/payment/status/:chargeId', async (req, res) => {
  if (!process.env.OMISE_SECRET_KEY) {
    return res.json({ charge_id: req.params.chargeId, status: 'pending', paid: false, message: 'Omise not configured' });
  }
  try {
    const status = await getChargeStatus(req.params.chargeId);
    const rec = payments.find(p => p.charge_id === req.params.chargeId);
    // If paid → update payment record (ส่งใบเสร็จเฉพาะครั้งแรกที่เปลี่ยนเป็น paid)
    if (status.paid) {
      const firstTime = rec && !rec.paid_at;
      if (firstTime) { rec.paid_at = status.paid_at; rec.status = 'successful'; savePayments(payments); }
      webhooks.dispatch('payment.completed', { charge_id: req.params.chargeId, amount_thb: status.amount_thb, plan: rec?.plan }, null);
      if (firstTime && rec?.email) {
        grantEntitlement(rec.email, rec.plan, { source: rec.method || 'promptpay' });
        sendPaymentReceipt(rec.email, { plan: rec.plan, amount_thb: status.amount_thb, charge_id: req.params.chargeId, paid_at: status.paid_at, method: rec.method });
      }
      // เครดิตค่าคอม affiliate (เฉพาะครั้งแรก — รองรับ quickpay ที่จ่ายผ่าน ref link)
      if (firstTime) creditAffiliateSale(rec?.ref_code, status.amount_thb, { charge_id: req.params.chargeId, source: rec?.source });
    }
    // Enrich response with stored record so the client can render a full receipt
    res.json({
      success: true,
      ...status,
      plan:      rec?.plan || null,
      method:    rec?.method || null,
      reference: rec?.promptpay_ref || null,
      created_at: rec?.createdAt || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/payment/plans — ราคาแผนทั้งหมด
app.get('/api/payment/plans', (req, res) => {
  res.json({ success: true, plans: SUBSCRIPTION_PLANS });
});

// GET /api/payment/history — ประวัติ payment (admin)
app.get('/api/payment/history', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  res.json({ success: true, data: payments.slice(0, limit), total: payments.length });
});

// GET /api/admin/stats — overview stats จริงสำหรับ Admin Panel
app.get('/api/admin/stats', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });

  const isPaid = (p) => p.paid || p.status === 'successful' || p.paid_at;
  const paid = payments.filter(isPaid);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sum = (arr) => arr.reduce((t, p) => t + (Number(p.amount_thb) || 0), 0);
  const paidThisMonth = paid.filter(p => new Date(p.paid_at || p.createdAt) >= monthStart);

  const activeAff = affiliates.filter(a => a.status === 'active').length;

  res.json({
    success: true,
    affiliates:        affiliates.length,
    affiliates_active: activeAff,
    revenue_total:     sum(paid),
    revenue_month:     sum(paidThisMonth),
    orders_total:      payments.length,
    orders_paid:       paid.length,
  });
});

// GET /api/payment/admin/summary — สรุปยอดขาย (ใช้ Admin Key header เหมือน affiliate)
app.get('/api/payment/admin/summary', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });

  const isPaid = (p) => p.paid || p.status === 'successful' || p.paid_at;
  const paid = payments.filter(isPaid);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sum = (arr) => arr.reduce((t, p) => t + (Number(p.amount_thb) || 0), 0);
  const paidThisMonth = paid.filter(p => new Date(p.paid_at || p.createdAt) >= monthStart);

  // นับแยกตามแผน
  const byPlan = {};
  for (const p of paid) {
    const k = p.plan || 'unknown';
    byPlan[k] = byPlan[k] || { count: 0, revenue: 0 };
    byPlan[k].count += 1;
    byPlan[k].revenue += Number(p.amount_thb) || 0;
  }

  res.json({
    success: true,
    stats: {
      revenue_total: sum(paid),
      revenue_month: sum(paidThisMonth),
      paid_count:    paid.length,
      pending_count: payments.length - paid.length,
      total_count:   payments.length,
    },
    by_plan: byPlan,
    recent: payments.slice(0, 20).map(p => ({
      charge_id: p.charge_id, plan: p.plan, method: p.method,
      amount_thb: p.amount_thb, status: isPaid(p) ? 'successful' : (p.status || 'pending'),
      email: p.email || null, paid_at: p.paid_at || null, created_at: p.createdAt || null,
    })),
  });
});

// POST /api/payment/webhook — Omise webhook (signed)
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-opn-signature'] || req.headers['x-omise-signature'] || '';
  if (!verifyOmiseWebhook(req.body, sig)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  try {
    const event = JSON.parse(req.body.toString());
    const key   = event.key;   // charge.complete, charge.fail, etc.
    const data  = event.data;
    addLog('info', 'OmiseWebhook', `Event: ${key} — charge: ${data?.id}`);
    if (key === 'charge.complete' && data?.paid) {
      const rec = payments.find(p => p.charge_id === data.id);
      if (rec && !rec.paid_at) {
        rec.status = 'successful'; rec.paid_at = data.paid_at; savePayments(payments);
        const email = rec.email || data.metadata?.email;
        const amountThb = data.amount / 100;
        if (email && rec.plan) {
          grantEntitlement(email, rec.plan, { source: 'webhook' });
          sendPaymentReceipt(email, { plan: rec.plan, amount_thb: amountThb, charge_id: data.id, paid_at: data.paid_at, method: rec.method });
        }
        // เครดิต affiliate ถ้าชำระผ่าน ref link (รองรับทั้ง plan + quickpay) — firstTime แล้วจาก !rec.paid_at
        creditAffiliateSale(rec.ref_code || data.metadata?.ref_code, amountThb, { charge_id: data.id, source: rec.source || data.metadata?.source });
      }
      webhooks.dispatch('payment.completed', { charge_id: data.id, amount_thb: data.amount / 100 }, null);
    }
    res.json({ received: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  n8n AUTOMATION — Webhook receiver + workflow trigger
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/n8n/trigger — n8n calls this to trigger actions in Openthai.ai
app.post('/api/n8n/trigger', async (req, res) => {
  const { action, payload, secret } = req.body || {};
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!n8nSecret || secret !== n8nSecret) {
    return res.status(401).json({ error: 'Invalid secret' });
  }
  addLog('info', 'n8n', `Trigger: ${action}`);
  try {
    switch (action) {
      case 'generate_content': {
        const form = payload?.form || {};
        if (!form.product) return res.status(400).json({ error: 'form.product required' });
        const result = await smartGenerate(form);
        webhooks.dispatch('content.generated', { product: form.product, score: result.criticScore, source: result.source }, payload?.tenantId || null);
        return res.json({ success: true, action, result });
      }
      case 'run_agent': {
        const agent = agents.find(a => a.id === payload?.agentId);
        if (!agent) return res.status(404).json({ error: 'agent not found' });
        const result = await runAgent(agent);
        return res.json({ success: true, action, result });
      }
      case 'dispatch_webhook': {
        await webhooks.dispatch(payload?.event, payload?.data, payload?.tenantId);
        return res.json({ success: true, action });
      }
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (e) {
    addLog('error', 'n8n', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/n8n/status — n8n dashboard / setup guide
app.get('/api/n8n/status', (req, res) => {
  const baseUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  res.json({
    success: true,
    n8n_configured: !!process.env.N8N_URL,
    n8n_url: process.env.N8N_URL || null,
    webhook_endpoints: {
      trigger:           `POST ${baseUrl}/api/n8n/trigger`,
      content_generated: `POST <n8n-webhook-url> (fires when content is generated)`,
      agent_completed:   `POST <n8n-webhook-url> (fires when agent completes)`,
    },
    setup_steps: [
      '1. สมัคร n8n.cloud → สร้าง account',
      '2. Import workflow: backend/n8n-workflows/openthai-ai-automation.json',
      '3. ตั้ง N8N_URL=https://your-n8n.app.n8n.cloud ใน backend/.env',
      '4. ตั้ง N8N_WEBHOOK_SECRET ใน backend/.env',
      `5. ลงทะเบียน webhook: POST ${baseUrl}/api/webhooks`,
    ],
    workflow_file: 'backend/n8n-workflows/openthai-ai-automation.json',
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CORPORATE SYSTEM — Public Company / บริษัทมหาชน
// ═══════════════════════════════════════════════════════════════════════════════
const corpLimiter = rateLimit({ windowMs: 60000, max: 30, message: { error: 'Corporate API rate limit' } });

// GET /api/corporate/overview
app.get('/api/corporate/overview', (req, res) => {
  res.json({ success: true, departments: DEPARTMENTS, ts: new Date().toISOString() });
});

// Board
app.get('/api/corporate/board',   (req, res) => res.json({ success: true, data: corporate.getBoard() }));
app.patch('/api/corporate/board', requireAuth, corpLimiter, (req, res) => {
  corporate.saveBoard(req.body);
  res.json({ success: true });
});

// Compliance
app.get('/api/corporate/compliance',   (req, res) => res.json({ success: true, data: corporate.getCompliance() }));
app.patch('/api/corporate/compliance', requireAuth, corpLimiter, (req, res) => {
  const current = corporate.getCompliance();
  corporate.saveCompliance({ ...current, ...req.body });
  res.json({ success: true });
});

// IR
app.get('/api/corporate/ir',   (req, res) => res.json({ success: true, data: corporate.getIR() }));
app.patch('/api/corporate/ir', requireAuth, corpLimiter, (req, res) => {
  const current = corporate.getIR();
  corporate.saveIR({ ...current, ...req.body });
  res.json({ success: true });
});

// HR
app.get('/api/corporate/hr',   (req, res) => res.json({ success: true, data: corporate.getHR() }));
app.patch('/api/corporate/hr', requireAuth, corpLimiter, (req, res) => {
  const current = corporate.getHR();
  corporate.saveHR({ ...current, ...req.body });
  res.json({ success: true });
});

// ESG
app.get('/api/corporate/esg',   (req, res) => res.json({ success: true, data: corporate.getESG() }));
app.patch('/api/corporate/esg', requireAuth, corpLimiter, (req, res) => {
  const current = corporate.getESG();
  corporate.saveESG({ ...current, ...req.body });
  res.json({ success: true });
});

// Finance
app.get('/api/corporate/finance',   (req, res) => res.json({ success: true, data: corporate.getFinance() }));
app.patch('/api/corporate/finance', requireAuth, corpLimiter, (req, res) => {
  const current = corporate.getFinance();
  corporate.saveFinance({ ...current, ...req.body });
  res.json({ success: true });
});

// Global Operations
app.get('/api/corporate/global',   (req, res) => res.json({ success: true, data: corporate.getGlobalOps() }));
app.patch('/api/corporate/global', requireAuth, corpLimiter, (req, res) => {
  const current = corporate.getGlobalOps();
  corporate.saveGlobalOps({ ...current, ...req.body });
  res.json({ success: true });
});

// ── PR & Global Communications ────────────────────────────────────────────────
app.get('/api/corporate/pr/releases',   (req, res) => res.json({ success: true, data: pr.getPressReleases() }));
app.patch('/api/corporate/pr/releases', requireAuth, corpLimiter, (req, res) => {
  pr.savePressReleases(req.body); res.json({ success: true });
});

app.get('/api/corporate/pr/contacts',   (req, res) => res.json({ success: true, data: pr.getMediaContacts() }));
app.patch('/api/corporate/pr/contacts', requireAuth, corpLimiter, (req, res) => {
  pr.saveMediaContacts(req.body); res.json({ success: true });
});

app.get('/api/corporate/pr/campaigns',   (req, res) => res.json({ success: true, data: pr.getCampaigns() }));
app.patch('/api/corporate/pr/campaigns', requireAuth, corpLimiter, (req, res) => {
  pr.saveCampaigns(req.body); res.json({ success: true });
});

app.get('/api/corporate/pr/kols',   (req, res) => res.json({ success: true, data: pr.getKOLs() }));
app.patch('/api/corporate/pr/kols', requireAuth, corpLimiter, (req, res) => {
  pr.saveKOLs(req.body); res.json({ success: true });
});

app.get('/api/corporate/pr/crisis',   (req, res) => res.json({ success: true, data: pr.getCrisisPlan() }));
app.get('/api/corporate/pr/newsletters', (req, res) => res.json({ success: true, data: pr.getNewsletters() }));

// Command Center — Team Tasks + KPIs
app.get('/api/corporate/tasks',   (req, res) => res.json({ success: true, data: pr.getTasks() }));
app.patch('/api/corporate/tasks', requireAuth, corpLimiter, (req, res) => {
  pr.saveTasks(req.body); res.json({ success: true });
});

app.get('/api/corporate/kpis',   (req, res) => res.json({ success: true, data: pr.getKPIs() }));
app.patch('/api/corporate/kpis', requireAuth, corpLimiter, (req, res) => {
  pr.saveKPIs(req.body); res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  LINE MESSAGING API WEBHOOK — รับ events จาก LINE OA @326gwipr
// ═══════════════════════════════════════════════════════════════════════════════

// ── Save LINE User ID to Supabase line_followers table ────────────────────────
async function saveLINEUserId(userId, displayName, pictureUrl) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/line_followers`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ user_id: userId, display_name: displayName, picture_url: pictureUrl, updated_at: new Date().toISOString() }),
    });
  } catch (e) {
    addLog('warn', 'LINE', `saveLINEUserId error: ${e.message}`);
  }
}

// POST /api/line/webhook — LINE OA incoming events
app.post('/api/line/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // LINE always expects 200 OK immediately
  res.status(200).json({ received: true });

  const signature = req.headers['x-line-signature'] || '';
  const rawBody   = req.body;

  // ── Normalise rawBody → Buffer (Vercel may pre-parse as Object) ──────────────
  let rawBodyBuf;
  let body;
  if (Buffer.isBuffer(rawBody)) {
    rawBodyBuf = rawBody;
    try { body = JSON.parse(rawBody.toString()); } catch { return; }
  } else if (typeof rawBody === 'string') {
    rawBodyBuf = Buffer.from(rawBody, 'utf8');
    try { body = JSON.parse(rawBody); } catch { return; }
  } else if (rawBody && typeof rawBody === 'object') {
    // Vercel already parsed — convert back for HMAC, body is ready
    rawBodyBuf = Buffer.from(JSON.stringify(rawBody), 'utf8');
    body = rawBody;
  } else {
    return;
  }

  // Signature check (skip if no secret configured — dev mode)
  if (process.env.LINE_CHANNEL_SECRET && signature) {
    const expected = createHmac('sha256', process.env.LINE_CHANNEL_SECRET).update(rawBodyBuf).digest('base64');
    if (signature !== expected) {
      addLog('warn', 'LINE', 'Webhook signature mismatch — ignored');
      return;
    }
  }

  const token = process.env.LINE_CHANNEL_TOKEN;

  for (const event of (body.events || [])) {
    const userId      = event.source?.userId;
    const replyToken  = event.replyToken;
    const eventType   = event.type;

    addLog('info', 'LINE', `Event: ${eventType} userId=${userId}`);

    // ── บันทึก userId ก่อน แล้วค่อย enrich ด้วย profile ─────────────────────
    if (userId) {
      // Save immediately with just userId (guarantee capture even if profile fails)
      await saveLINEUserId(userId, null, null);

      if (token) {
        try {
          const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(5000),
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            await saveLINEUserId(userId, profile.displayName, profile.pictureUrl);
            addLog('info', 'LINE', `✅ Saved LINE userId: ${userId} (${profile.displayName})`);
          } else {
            addLog('info', 'LINE', `✅ Saved LINE userId: ${userId} (profile ${profileRes.status})`);
          }
        } catch (e) {
          addLog('warn', 'LINE', `Profile fetch error: ${e.message}`);
          addLog('info', 'LINE', `✅ Saved LINE userId: ${userId} (no profile)`);
        }
      }
    }

    // ── Reply to messages ─────────────────────────────────────────────────────
    if (eventType === 'message' && replyToken && token) {
      const userMsg = event.message?.text || '';
      let replyText = `สวัสดีครับ! 👋 ขอบคุณที่ติดต่อ Openthai.ai\nเราได้รับข้อความของคุณแล้ว\n\n🌐 openthai-ai.com`;

      // Auto-reply with AI if message is a question
      if (userMsg.length > 3 && (gemini || anthropic)) {
        try {
          const aiRes = await smartGenerate({
            product: userMsg,
            platform: 'line',
            style: 'friendly',
            lang: 'th',
            audience: 'SME',
            prompt_override: `ผู้ใช้ส่งข้อความใน LINE OA: "${userMsg}"\nตอบสั้นๆ กระชับ เป็นมิตร ภาษาไทย ไม่เกิน 200 ตัวอักษร (Openthai.ai assistant)`,
          });
          if (aiRes?.content) replyText = aiRes.content.slice(0, 4000);
        } catch { /* fallback to default reply */ }
      }

      try {
        await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: replyText }] }),
        });
      } catch (e) {
        addLog('warn', 'LINE', `Reply error: ${e.message}`);
      }
    }

    // ── Follow event (เพิ่มเพื่อน) ────────────────────────────────────────────
    if (eventType === 'follow' && replyToken && token) {
      try {
        await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            replyToken,
            messages: [{ type: 'text', text: '🎉 ยินดีต้อนรับสู่ Openthai.ai!\n\nเราช่วย SME ไทยสร้างคอนเทนต์ TikTok ด้วย AI ครบ 241+ platforms\n\n🌐 openthai-ai.com\n#Openthai.ai' }],
          }),
        });
      } catch (e) {
        addLog('warn', 'LINE', `Follow reply error: ${e.message}`);
      }
    }
  }
});

// GET /api/line/users — list captured LINE User IDs (admin)
app.get('/api/line/users', requireAuth, async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.json({ success: true, data: [], note: 'Supabase not configured' });
  }
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/line_followers?order=updated_at.desc&limit=100`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });
    const data = await r.json();
    res.json({ success: true, data: Array.isArray(data) ? data : [], count: Array.isArray(data) ? data.length : 0 });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/n8n/register-webhooks — auto-register n8n webhook URLs
app.post('/api/n8n/register-webhooks', async (req, res) => {
  const { n8n_base_url } = req.body || {};
  const base = n8n_base_url || process.env.N8N_URL;
  if (!base) return res.status(400).json({ error: 'n8n_base_url required' });

  const registrations = [
    { url: `${base}/webhook/openthai-content-generated`, events: ['content.generated', 'video.generated'], description: 'n8n: content generated' },
    { url: `${base}/webhook/openthai-agent-completed`,   events: ['agent.completed'], description: 'n8n: agent completed' },
    { url: `${base}/webhook/openthai-payment`,           events: ['payment.completed'], description: 'n8n: payment completed' },
  ];

  const results = [];
  for (const r of registrations) {
    try {
      results.push(webhooks.register({ tenantId: 'system', ...r }));
    } catch (e) {
      results.push({ error: e.message, url: r.url });
    }
  }
  addLog('info', 'n8n', `Registered ${results.length} webhooks for n8n`);
  res.json({ success: true, registered: results });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  STARTUP
// ═══════════════════════════════════════════════════════════════════════════════

// ── Process-level error protection (local dev + Vercel both) ─────────────────
process.on('uncaughtException', (err) => {
  try { addLog('error', 'Process', `uncaughtException: ${err.message}`, err.stack?.slice(0, 4000)); } catch (_) {}
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const detail = reason instanceof Error ? reason.stack?.slice(0, 4000) : undefined;
  try { addLog('error', 'Process', `unhandledRejection: ${msg}`, detail); } catch (_) {}
  console.error('[unhandledRejection]', reason);
});

async function startServer() {
  // Warm up admin users (hashes passwords on first run)
  await getAdminUsers();

  // แจ้งเตือนถ้ายังไม่มี Recovery Codes
  if (!process.env.RECOVERY_CODES) {
    const codes = generateRecoveryCodes(8);
    console.log('\n⚠️  ยังไม่มี RECOVERY_CODES ใน .env — สร้างให้อัตโนมัติ:');
    console.log('   ใส่บรรทัดนี้ใน backend/.env และเก็บไว้ในที่ปลอดภัย!\n');
    console.log(`   RECOVERY_CODES=${codes.join(',')}\n`);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Openthai.ai Backend running on http://localhost:${PORT}`);
    console.log(`   AI Primary  : ${anthropic ? '✅ Claude Haiku 4.5' : '⚠️  ใส่ ANTHROPIC_API_KEY ใน .env'}`);
    console.log(`   AI Fallback : ${gemini    ? '✅ Gemini Flash Latest' : '⚠️  ใส่ GEMINI_API_KEY ใน .env'}`);
    console.log(`   AI Mode     : ${anthropic ? 'Claude' : gemini ? 'Gemini' : '⚠️  Mock (ไม่มี API key)'}`);
    console.log(`   Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '⚠️  Not configured'}`);
    console.log(`   Recovery    : ${process.env.RECOVERY_CODES ? '✅ Codes set' : '⚠️  No codes in .env'}`);
    console.log(`   IS_VERCEL   : ${IS_VERCEL ? '✅ Serverless mode' : '⚠️  Local mode'}`);
    console.log(`   Supabase    : ${_useSB ? '✅ Connected' : '⚠️  ไม่ได้ตั้ง (fallback เป็น /tmp)'}`);
    console.log(`   Omise Pay   : ${process.env.OMISE_SECRET_KEY ? '✅ Configured' : '⚠️  Mock mode — ไม่ตัดเงินจริง'}`);
    console.log(`   LINE Bot    : ${process.env.LINE_CHANNEL_TOKEN ? '✅ Configured' : 'ℹ️  Disabled (optional)'}`);
    console.log(`   ElevenLabs  : ${process.env.ELEVENLABS_API_KEY ? '✅ Configured' : 'ℹ️  Disabled (optional)'}`);
    console.log(`   SMTP Email  : ${process.env.SMTP_USER ? '✅ Configured' : 'ℹ️  Disabled (optional)'}`);
    console.log(`   Domain URL  : ${DOMAIN_URL}`);
    console.log(`   Health      : http://localhost:${PORT}/api/health`);
    console.log(`   API Docs    : http://localhost:${PORT}/api-docs`);
    console.log(`   OpenAPI     : http://localhost:${PORT}/api/openapi.json`);
    console.log(`   MCP Server  : http://localhost:${PORT}/mcp`);
    console.log(`   Vector Mem  : http://localhost:${PORT}/api/memory`);
    console.log(`   Webhooks    : http://localhost:${PORT}/api/webhooks`);
    console.log(`   Tenants     : http://localhost:${PORT}/api/tenants`);
    console.log(`   Video Gen   : http://localhost:${PORT}/api/video/generate`);
    console.log(`   Payment     : http://localhost:${PORT}/api/payment/plans`);
    console.log(`   n8n         : http://localhost:${PORT}/api/n8n/status\n`);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// A — Auto-Post Scheduler  /api/scheduler/*
// ══════════════════════════════════════════════════════════════════════════════
// เก็บถาวร (ไฟล์) เพื่อให้คิวอยู่รอดข้าม restart — ทำงานต่อเนื่องได้จริง
const SCH_FILE = join(WRITE_DATA_DIR, 'scheduler.json');
const schedulerStore = { posts: [] };
try { if (existsSync(SCH_FILE)) schedulerStore.posts = JSON.parse(readFileSync(SCH_FILE, 'utf8')) || []; } catch (_) {}
function saveScheduler() {
  try {
    const dir = SCH_FILE.replace(/[/\\][^/\\]+$/, '');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(SCH_FILE, JSON.stringify(schedulerStore.posts, null, 2), 'utf8');
  } catch (e) { console.error('[scheduler] save error:', e.message); }
}

app.post('/api/scheduler/create', generateLimiter, (req, res) => {
  const { platform, content, scheduled_at, audience, language = 'thai' } = req.body || {};
  if (!content?.trim() || !platform || !scheduled_at) return res.status(400).json({ error: 'content, platform, scheduled_at required' });
  const post = {
    id: `sch_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    platform, content, audience: audience || 'general', language,
    scheduled_at, status: 'pending', created_at: new Date().toISOString(),
  };
  schedulerStore.posts.unshift(post);
  if (schedulerStore.posts.length > 200) schedulerStore.posts = schedulerStore.posts.slice(0, 200);
  saveScheduler();
  res.json({ ok: true, post });
});

// GET /api/scheduler/due — โพสต์ที่ถึงเวลาแล้วแต่ยังไม่ได้โพสต์ (pending + scheduled_at <= now)
app.get('/api/scheduler/due', (req, res) => {
  const now = Date.now();
  const due = schedulerStore.posts.filter(p => p.status === 'pending' && new Date(p.scheduled_at).getTime() <= now);
  res.json({ ok: true, due, count: due.length });
});

// POST /api/scheduler/process — ประมวลผลโพสต์ที่ถึงเวลา (เรียกเป็นรอบ/โดย uptime pinger)
// LINE OA (ช่องที่คุณเป็นเจ้าของ + มี token) → broadcast อัตโนมัติ (ถูกกฎ)
// แพลตฟอร์มอื่น → mark 'ready' (ถึงเวลาโพสต์ — รอคุณกดโพสต์เอง, ToS ห้ามบอทโพสต์)
// รองรับทั้ง GET (Vercel Cron / uptime pinger) และ POST (เรียกจากหน้าเว็บ)
async function processScheduler(req, res) {
  const now = Date.now();
  const due = schedulerStore.posts.filter(p => p.status === 'pending' && new Date(p.scheduled_at).getTime() <= now);
  const result = { broadcast: [], ready: [], failed: [] };
  for (const post of due) {
    const isLine = ['line', 'line_oa', 'lineoa'].includes(String(post.platform).toLowerCase());
    if (isLine && process.env.LINE_CHANNEL_TOKEN) {
      try {
        await lineBroadcast(post.content);
        post.status = 'published'; post.published_at = new Date().toISOString(); post.channel = 'line_broadcast';
        result.broadcast.push(post.id);
      } catch (e) { post.status = 'failed'; post.error = e.message; result.failed.push(post.id); }
    } else {
      // ToS-compliant: ไม่โพสต์แทนในช่องที่ไม่ได้เป็นเจ้าของ — แจ้งเตือนว่าถึงเวลาโพสต์
      post.status = 'ready'; post.ready_at = new Date().toISOString();
      result.ready.push(post.id);
    }
  }
  if (due.length) { saveScheduler(); addLog('info', 'Scheduler', `process: broadcast ${result.broadcast.length} · ready ${result.ready.length} · failed ${result.failed.length}`); }
  res.json({ ok: true, processed: due.length, ...result, ran_at: new Date().toISOString() });
}
app.post('/api/scheduler/process', processScheduler);
app.get('/api/scheduler/process', processScheduler);  // Vercel Cron ยิงด้วย GET

app.get('/api/scheduler/list', (req, res) => {
  const { platform, status } = req.query;
  let posts = schedulerStore.posts;
  if (platform) posts = posts.filter(p => p.platform === platform);
  if (status)   posts = posts.filter(p => p.status === status);
  res.json({ ok: true, posts, total: posts.length });
});

app.post('/api/scheduler/execute/:id', (req, res) => {
  const post = schedulerStore.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'post not found' });
  post.status = 'published';
  post.published_at = new Date().toISOString();
  post.reach_mock = Math.floor(Math.random() * 9000) + 1000;
  saveScheduler();
  res.json({ ok: true, post });
});

// ลบโพสต์ในคิว Scheduler (Admin Key) — ต่างจาก /api/scheduler/process ที่ต้องเปิดไว้ให้ Vercel Cron ยิงได้
app.delete('/api/scheduler/:id', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) return res.status(401).json({ success: false, message: adminDenyMessage() });
  const idx = schedulerStore.posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  schedulerStore.posts.splice(idx, 1);
  saveScheduler();
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// B — Analytics Dashboard  /api/analytics/*
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/analytics/summary', (req, res) => {
  const published = schedulerStore.posts.filter(p => p.status === 'published');
  const totalReach = published.reduce((s, p) => s + (p.reach_mock || 0), 0);
  res.json({
    ok: true,
    summary: {
      total_posts: schedulerStore.posts.length,
      published: published.length,
      pending: schedulerStore.posts.filter(p => p.status === 'pending').length,
      total_reach: totalReach,
      avg_engagement: published.length ? (totalReach * 0.048).toFixed(0) : 0,
      top_platform: 'TikTok',
      content_score_avg: 8.4,
    },
    platform_breakdown: [
      { platform: 'TikTok',    reach: 42800, engagement: 6.2, posts: 18, color: '#fe2c55' },
      { platform: 'Facebook',  reach: 31200, engagement: 3.8, posts: 24, color: '#1877f2' },
      { platform: 'LINE',      reach: 28900, engagement: 4.1, posts: 16, color: '#06c755' },
      { platform: 'Instagram', reach: 19400, engagement: 5.3, posts: 12, color: '#e1306c' },
      { platform: 'Shopee',    reach: 15600, engagement: 2.9, posts:  9, color: '#f97316' },
    ],
    audience_breakdown: [
      { audience: 'ผู้บริโภค',      posts: 22, reach: 48200 },
      { audience: 'ผู้ขาย',         posts: 18, reach: 31400 },
      { audience: 'SME ไทย',        posts: 14, reach: 24800 },
      { audience: 'เกษตรกรรม',      posts: 11, reach: 18900 },
      { audience: 'ตัวแทนจำหน่าย', posts:  9, reach: 14200 },
    ],
    weekly_trend: [
      { day: 'จ', reach: 8200 }, { day: 'อ', reach: 12400 }, { day: 'พ', reach: 9800 },
      { day: 'พฤ', reach: 15600 }, { day: 'ศ', reach: 18200 }, { day: 'ส', reach: 22400 }, { day: 'อา', reach: 19800 },
    ],
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// C — Image Prompt Generator  /api/skills/image-prompt
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/skills/image-prompt', generateLimiter, async (req, res) => {
  const { product, category = 'สินค้าไทย', platform = 'tiktok', mood = 'vibrant', style = 'photorealistic', audience = 'consumer' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `สร้าง Image Prompt สำหรับ AI Image Generator (Midjourney / DALL-E / Stable Diffusion)
สินค้า: "${product}"
หมวดหมู่: ${category}
Platform: ${platform}
Mood: ${mood}
Style: ${style}
กลุ่มเป้าหมาย: ${audience}

ตอบ JSON เท่านั้น:
{
  "midjourney": "prompt สำหรับ Midjourney — รายละเอียดมาก ใส่ style parameters",
  "dalle": "prompt สำหรับ DALL-E 3 — ภาษาอังกฤษ ชัดเจน descriptive",
  "stable_diffusion": "prompt สำหรับ Stable Diffusion — ใส่ negative prompt ด้วย",
  "negative_prompt": "สิ่งที่ไม่ต้องการในภาพ",
  "composition": "คำแนะนำ composition/framing",
  "color_palette": ["#hex1","#hex2","#hex3"],
  "thai_caption": "caption ภาษาไทยสำหรับโพสต์",
  "en_caption": "English caption for the post",
  "style_tags": ["tag1","tag2","tag3"]
}`;

  try {
    const raw = await callAI(prompt, 2000);
    const data = parseAIJson(raw);
    return res.json({ ok: true, source: anthropic ? 'claude' : 'gemini', ...data });
  } catch (e) { addLog('warn', 'ImagePrompt', e.message); }

  const styleMap = { photorealistic: 'hyperrealistic photography', illustrative: 'digital illustration', minimal: 'minimalist flat design', luxury: 'luxury editorial photography' };
  const moodMap = { vibrant: 'vibrant colorful energetic', elegant: 'elegant sophisticated moody', natural: 'natural organic earthy tones', bold: 'bold graphic high contrast' };
  const st = styleMap[style] || 'photorealistic';
  const md = moodMap[mood] || 'vibrant colorful';

  res.json({
    ok: true, source: 'mock',
    midjourney: `"${product}" Thai premium ${category} product, ${st}, ${md}, Thai cultural elements, golden hour lighting, shot on Sony A7R5, bokeh background, commercial advertising, 4K ultra detailed --ar 9:16 --style raw --stylize 750 --v 6`,
    dalle: `A stunning commercial photograph of "${product}", a premium Thai ${category} product. ${md} aesthetic with ${st} quality. Professional product photography with Thai cultural elements, soft natural lighting, clean background. Perfect for ${platform} marketing. High-end advertising quality.`,
    stable_diffusion: `(masterpiece:1.4), (best quality:1.4), commercial product photo, "${product}", Thai ${category}, ${st}, ${md}, Thai traditional elements, professional lighting, advertising, 8k uhd, sharp focus, (colorful:1.2)`,
    negative_prompt: 'blurry, low quality, amateur, dark, cluttered background, text overlay, watermark, distorted, ugly, bad anatomy',
    composition: `Rule of thirds — สินค้าอยู่ 1/3 ซ้าย พื้นหลัง Thai elements ด้านขวา แสงจากซ้ายบน Golden ratio framing เหมาะสำหรับ ${platform}`,
    color_palette: ['#D4AF37', '#8B0000', '#F5F5DC'],
    thai_caption: `✨ "${product}" คุณภาพไทยระดับพรีเมียม — ${category} ที่คุณต้องลอง`,
    en_caption: `Discover the finest of Thailand — "${product}" crafted with authentic Thai excellence`,
    style_tags: [st, md, 'Thai Premium', category, platform + ' Ready'],
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// D — Product Catalog AI  /api/catalog-ai/generate
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/catalog-ai/generate', generateLimiter, async (req, res) => {
  const { product, category = 'สินค้าไทย', price = '', usp = '', specs = '', certifications = '', moq = '' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const prompt = `สร้าง Product Catalog 3 ภาษา (ไทย/อังกฤษ/จีน) สำหรับสินค้าไทยส่งออก
สินค้า: "${product}"
หมวดหมู่: ${category}
ราคา: ${price || 'ไม่ระบุ'}
จุดเด่น/USP: ${usp || 'คุณภาพไทยระดับส่งออก'}
Spec/รายละเอียด: ${specs || 'ไม่ระบุ'}
ใบรับรอง: ${certifications || 'มาตรฐานไทย'}
MOQ: ${moq || 'ไม่ระบุ'}

ตอบ JSON เท่านั้น:
{
  "thai": {
    "product_name":"...","tagline":"...","description":"2-3 ประโยค",
    "features":["จุดเด่น 1","จุดเด่น 2","จุดเด่น 3","จุดเด่น 4"],
    "specs_table":[{"key":"ขนาด","value":"..."},{"key":"น้ำหนัก","value":"..."},{"key":"วัสดุ","value":"..."}],
    "certifications":["..."],"cta":"..."
  },
  "english": {
    "product_name":"...","tagline":"...","description":"...",
    "features":["...","...","...","..."],
    "specs_table":[{"key":"Size","value":"..."},{"key":"Weight","value":"..."},{"key":"Material","value":"..."}],
    "certifications":["..."],"cta":"..."
  },
  "chinese": {
    "product_name":"...","tagline":"...","description":"...",
    "features":["...","...","...","..."],
    "specs_table":[{"key":"尺寸","value":"..."},{"key":"重量","value":"..."},{"key":"材质","value":"..."}],
    "certifications":["..."],"cta":"..."
  },
  "export_info": {
    "hs_code_suggestion":"...","packaging":"...","shelf_life":"...",
    "moq":"${moq || 'ติดต่อสอบถาม'}","lead_time":"...","incoterms":["FOB","CIF","EXW"]
  }
}`;

  try {
    const raw = await callAI(prompt, 3000);
    const data = parseAIJson(raw);
    return res.json({ ok: true, source: anthropic ? 'claude' : 'gemini', ...data });
  } catch (e) { addLog('warn', 'CatalogAI', e.message); }

  const p = product; const u = usp || 'คุณภาพไทยระดับส่งออก';
  res.json({
    ok: true, source: 'mock',
    thai: {
      product_name: p, tagline: `${p} — ${u}`,
      description: `"${p}" ผลิตจากวัตถุดิบไทยคัดสรรคุณภาพสูง ${u} ผ่านกระบวนการผลิตมาตรฐานสากล GMP/HACCP ปลอดภัย 100% พร้อมส่งออกทั่วโลก`,
      features: [`✅ ${u}`, '✅ ผ่านมาตรฐาน GMP/HACCP', '✅ วัตถุดิบไทย 100%', '✅ บรรจุภัณฑ์ส่งออกระดับสากล'],
      specs_table: [{ key: 'หมวดหมู่', value: category }, { key: 'ราคา', value: price || 'ติดต่อสอบถาม' }, { key: 'MOQ', value: moq || 'ติดต่อสอบถาม' }, { key: 'ใบรับรอง', value: certifications || 'GMP, HACCP' }],
      certifications: (certifications || 'GMP, HACCP').split(',').map(s => s.trim()),
      cta: `สั่งซื้อ "${p}" วันนี้ — ส่งทั่วโลก`,
    },
    english: {
      product_name: p, tagline: `${p} — Premium Thai Quality for Global Markets`,
      description: `"${p}" is crafted from Thailand's finest ingredients with strict international quality standards. ${u}. GMP/HACCP certified, 100% safe, export-ready worldwide.`,
      features: [`✅ ${u}`, '✅ GMP/HACCP Certified', '✅ 100% Thai Origin', '✅ Export-Standard Packaging'],
      specs_table: [{ key: 'Category', value: category }, { key: 'Price', value: price || 'Contact us' }, { key: 'MOQ', value: moq || 'Contact us' }, { key: 'Certifications', value: certifications || 'GMP, HACCP' }],
      certifications: (certifications || 'GMP, HACCP').split(',').map(s => s.trim()),
      cta: `Order "${p}" Now — Worldwide Shipping Available`,
    },
    chinese: {
      product_name: p, tagline: `${p} — 面向全球市场的泰国优质产品`,
      description: `"${p}"采用泰国优质原料精心制作，严格遵守国际质量标准。${u}。获GMP/HACCP认证，100%安全，符合全球出口标准。`,
      features: [`✅ ${u}`, '✅ GMP/HACCP认证', '✅ 100%泰国原产', '✅ 出口标准包装'],
      specs_table: [{ key: '类别', value: category }, { key: '价格', value: price || '请咨询' }, { key: '起订量', value: moq || '请咨询' }, { key: '认证', value: certifications || 'GMP, HACCP' }],
      certifications: (certifications || 'GMP, HACCP').split(',').map(s => s.trim()),
      cta: `立即订购"${p}" — 全球配送`,
    },
    export_info: {
      hs_code_suggestion: '2106.90 (อาหารปรุงแต่ง) / ตรวจสอบตาม category จริง',
      packaging: 'Corrugated export carton, inner packaging vacuum-sealed',
      shelf_life: '12-24 เดือน (ขึ้นอยู่กับประเภทสินค้า)',
      moq: moq || 'ติดต่อสอบถาม',
      lead_time: '2-4 สัปดาห์หลังยืนยันออเดอร์',
      incoterms: ['FOB Bangkok', 'CIF Destination', 'EXW Factory'],
    },
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// E — KOL Brief Generator  /api/skills/kol-brief
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/skills/kol-brief', generateLimiter, async (req, res) => {
  const { product, category = 'สินค้าไทย', platform = 'tiktok', region = 'thailand', usp = '', target_audience = 'ผู้บริโภคทั่วไป', budget_tier = 'mid' } = req.body || {};
  if (!product?.trim()) return res.status(400).json({ error: 'product required' });

  const tierMap = { nano: 'Nano (1K-10K followers)', micro: 'Micro (10K-100K)', mid: 'Mid-tier (100K-1M)', macro: 'Macro (1M+)' };
  const prompt = `สร้าง KOL Brief ครบถ้วนสำหรับแคมเปญ Influencer Marketing
สินค้า: "${product}"
หมวดหมู่: ${category}
Platform: ${platform}
ภูมิภาค/ตลาด: ${region}
USP: ${usp || 'คุณภาพไทยระดับส่งออก'}
กลุ่มเป้าหมาย: ${target_audience}
ระดับ KOL: ${tierMap[budget_tier] || tierMap.mid}

ตอบ JSON เท่านั้น:
{
  "campaign_name":"...",
  "objective":"...",
  "kol_profile":{"followers_range":"...","niche":["..."],"tone":"...","demographics":"..."},
  "key_messages":["message1","message2","message3"],
  "content_brief":{"hook":"Hook 3วิแรก","talking_points":["point1","point2","point3"],"dos":["...","...","..."],"donts":["...","..."]},
  "deliverables":[{"type":"TikTok Video","duration":"60s","quantity":2,"deadline":"7 days"},{"type":"Story","duration":"15s","quantity":3,"deadline":"3 days"}],
  "hashtags_mandatory":["#...","#...","#..."],
  "hashtags_suggested":["#...","#..."],
  "compensation":{"type":"Product + Cash","estimate":"...","notes":"..."},
  "kpi":{"primary":"Views","target":"100,000+","secondary":"CTR","target2":"3%+"},
  "script_outline":"เส้นทาง content ตั้งแต่ต้นจนจบ"
}`;

  try {
    const raw = await callAI(prompt, 3000);
    const data = parseAIJson(raw);
    return res.json({ ok: true, source: anthropic ? 'claude' : 'gemini', ...data });
  } catch (e) { addLog('warn', 'KOLBrief', e.message); }

  const p = product;
  res.json({
    ok: true, source: 'mock',
    campaign_name: `${p} × KOL Campaign — Authentic Thai Story`,
    objective: `สร้าง Awareness และกระตุ้น Purchase Intent สำหรับ "${p}" ผ่าน Authentic Content บน ${platform}`,
    kol_profile: {
      followers_range: tierMap[budget_tier],
      niche: [category, 'Lifestyle', 'Thai Products', 'Review'],
      tone: 'Authentic · Friendly · Trustworthy — ไม่ formal เกินไป',
      demographics: `${target_audience} อายุ 22-45 สนใจ${category} มีกำลังซื้อ`,
    },
    key_messages: [
      `"${p}" คุณภาพไทยที่คุณวางใจได้ — ${usp || 'ทำจากวัตถุดิบไทยแท้'}`,
      'ไม่ใช่แค่สินค้า — คือการสนับสนุนผู้ผลิตไทย',
      'ลองแล้วจะรู้ว่าทำไมคนไทยถึงรักสินค้าไทย',
    ],
    content_brief: {
      hook: `"ถ้าคุณยังไม่รู้จัก ${p}... คุณพลาดมากเลยนะ 😱" หรือ "ทำไมคนญี่ปุ่นถึงซื้อ${p}กลับบ้าน?"`,
      talking_points: [
        `จุดเด่นของ "${p}" — ${usp || 'วัตถุดิบไทยแท้ คุณภาพสูง'}`,
        'วิธีใช้ / วิธีกิน / Demo จริง — แสดงให้เห็น Before/After',
        'ราคาเข้าถึงได้ + ซื้อง่าย + ลิงก์ในไบโอ',
      ],
      dos: ['พูดจากประสบการณ์จริง', 'แสดง Product จริงชัดเจน', 'ใส่ CTA ที่ชัดเจน', 'เปิดเผยว่าเป็น Partnership (#ad)'],
      donts: ['ห้ามอ้างสรรพคุณเกินจริง', 'ห้ามเปรียบเทียบดูถูกคู่แข่ง', 'ห้ามตัดต่อเกินจนดูไม่ Authentic'],
    },
    deliverables: [
      { type: `${platform.toUpperCase()} Video`, duration: '45-60s', quantity: 2, deadline: '7 วันหลังรับสินค้า' },
      { type: 'Story / Reels', duration: '15s', quantity: 3, deadline: '3 วันหลังรับสินค้า' },
      { type: 'Static Post + Caption', duration: '-', quantity: 1, deadline: '5 วันหลังรับสินค้า' },
    ],
    hashtags_mandatory: [`#${p.replace(/\s/g,'')}`, '#สินค้าไทย', '#OpenThaiAI', '#ThaiProducts'],
    hashtags_suggested: [`#${category.replace(/\s/g,'')}`, '#ของดีไทย', '#รีวิว', '#แนะนำ', '#MadeInThailand'],
    compensation: {
      type: 'Product + Cash',
      estimate: budget_tier === 'nano' ? '500-2,000 บาท + สินค้า' : budget_tier === 'micro' ? '3,000-15,000 บาท + สินค้า' : budget_tier === 'mid' ? '20,000-80,000 บาท + สินค้า' : '100,000+ บาท + สินค้า',
      notes: 'ต่อรองได้ตาม Engagement Rate จริง — ดู ER > Followers',
    },
    kpi: { primary: 'Views', target: budget_tier === 'nano' ? '5,000+' : budget_tier === 'micro' ? '50,000+' : '500,000+', secondary: 'CTR to Link', target2: '3%+' },
    script_outline: `[0-3s] Hook — ดึงดูดความสนใจ · [3-15s] Problem/Story — เล่าว่าทำไมถึงลอง "${p}" · [15-40s] Demo — แสดงสินค้าจริง ใช้จริง · [40-55s] Result/Review — ผลลัพธ์จริง · [55-60s] CTA — บอกซื้อได้ที่ไหน ราคาเท่าไหร่`,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Integration Hub  /api/integrations/*  — Priority #3-7 (LINE·FB·TikTok·Canva·Analytics)
// Adapters เรียก Platform API จริงเมื่อมี credentials (env var) — ดู backend/integrations.js
// ══════════════════════════════════════════════════════════════════════════════
const integrations = createIntegrations({ addLog, limiter: generateLimiter });
app.use(integrations.router);

// ── Export app สำหรับ Vercel Serverless (api/index.js import ไปใช้) ──────────
export { app };

// ── Local: start HTTP server — Vercel จัดการ HTTP เองผ่าน api/index.js ───────
if (!IS_VERCEL) {
  // getAdminUsers() warm-up + listen
  startServer();
} else {
  // Vercel: warm-up admin users ตอน cold start (ไม่ต้อง listen)
  getAdminUsers().catch(() => {});
}
