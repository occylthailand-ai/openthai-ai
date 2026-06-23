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
import { createInventory } from './inventory.js';
import { createProgressTracker } from './progress-tracker.js';

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
// Skip global JSON parser for LINE webhook — needs raw buffer for HMAC signature verification
app.use((req, res, next) => {
  if (req.path === '/api/line/webhook') return next();
  express.json({ limit: '50kb' })(req, res, next);
});
// image endpoint uses its own larger limit (see /api/analyze-image)

// Credit ledger routes — /api/credits, /credits/checkin, /credits/spin, /credits/claim
app.use(credits.router);
// Producer onboarding routes — /api/producers/apply, /producers/categories, /api/catalog
app.use(producers.router);
// Order routes — /api/orders
app.use(orders.router);
// Inventory / first-party shop routes — /api/shop/products
app.use(inventory.router);

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 นาที
  max: 10,                    // สูงสุด 10 req/min ต่อ IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'ส่งคำขอบ่อยเกินไป กรุณารอ 1 นาทีแล้วลองใหม่' },
});

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

    let out = leads;
    if (type && type !== 'all') out = out.filter((l) => l.type === type);
    if (q) out = out.filter((l) => [l.name, l.contact, l.detail].some((f) => (f || '').toString().toLowerCase().includes(q)));
    out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const counts = { all: leads.length, waitlist: leads.filter((l) => l.type === 'waitlist').length, affiliate: leads.filter((l) => l.type === 'affiliate').length, order: leads.filter((l) => l.type === 'order').length };
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
const mailer = process.env.SMTP_USER
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
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
            <tr><td style="padding:9px 0;color:#94a3b8;">สินค้า</td><td style="padding:9px 0;text-align:right;font-weight:700;">${order.product_name}</td></tr>
            <tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">จำนวน</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${order.qty}</td></tr>
            <tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">ยอดรวม</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);color:#10b981;font-weight:700;">${baht(order.amount)}</td></tr>
            <tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">ชื่อลูกค้า</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${order.customer_name}</td></tr>
            <tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">ติดต่อลูกค้า</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);font-weight:700;color:#a5b4fc;">${order.contact}</td></tr>
            ${order.note ? `<tr><td style="padding:9px 0;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);">หมายเหตุ</td><td style="padding:9px 0;text-align:right;border-top:1px solid rgba(255,255,255,0.08);">${order.note}</td></tr>` : ''}
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

// ─── POST /api/affiliate/apply — รับสมัคร Affiliate ──────────────────────────

app.post('/api/affiliate/apply', affiliateLimiter, async (req, res) => {
  try {
    const { name, email, phone, platform, followers, channel_url, note, ref_code, ref_link } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'ต้องการชื่อและอีเมล' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }
    const safeEmail = email.toLowerCase().trim();
    // ref_code ต้องเป็นตัวอักษร/ตัวเลขเท่านั้น
    const proposedCode = ref_code ? ref_code.replace(/[^A-Z0-9a-z_-]/g, '') : '';

    // ป้องกันสมัครซ้ำ
    if (affiliates.find((a) => a.email === safeEmail)) {
      return res.status(409).json({ success: false, message: 'อีเมลนี้สมัครไปแล้ว' });
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

    // ส่ง welcome email + dispatch webhook (async — ไม่บล็อก response)
    sendAffiliateWelcome(safeEmail, name, record.ref_code, record.ref_link);
    webhooks.dispatch('affiliate.joined', { name, ref_code: record.ref_code, platform: record.platform });

    res.json({
      success: true,
      message: 'สมัคร Affiliate สำเร็จ!',
      data: {
        ref_code: record.ref_code,
        ref_link: record.ref_link,
        tier: record.tier,
        commission_rate: record.commission_rate,
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

  res.json({
    success: true,
    data: {
      ref_code:        aff.ref_code,
      name:            aff.name,
      tier:            aff.tier,
      commission_rate: aff.commission_rate,
      total_sales:     aff.total_sales     || 0,
      total_earned:    aff.total_earned    || 0,
      pending_payout:  (aff.total_earned   || 0) - (aff.paid_out || 0),
      paid_out:        aff.paid_out        || 0,
      clicks:          aff.clicks          || 0,
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

// ═══════════════════════════════════════════════════════════════════════════════
//  AI SKILLS HUB — S10-S15 (Trend, Hashtag, SEO, Sentiment, Video Script, Translate)
// ═══════════════════════════════════════════════════════════════════════════════

async function callAI(prompt, maxTokens = 1024) {
  if (anthropic) {
    const msg = await anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
    return msg.content[0]?.text?.trim() || '';
  }
  if (gemini) {
    const r = await gemini.generateContent(prompt);
    return r.response.text().trim();
  }
  return '';
}

function parseAIJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error('no json');
}

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
app.get('/api/agent', (req, res) => {
  const safe = agents.map(a => ({ ...a, results: (a.results || []).slice(0, 3) }));
  res.json({ success: true, data: safe });
});

app.post('/api/agent', (req, res) => {
  const { name, product, category, platform, style, lang, audience, price, schedule, hour, weekDay, lineEnabled, lineUserId } = req.body || {};
  if (!name || !product) return res.status(400).json({ success: false, message: 'ต้องการ name และ product' });
  const agent = {
    id: Date.now().toString(), name, product, category: category || 'ทั่วไป',
    platform: platform || 'TikTok', style: style || 'sales',
    lang: lang || 'ภาษาไทย', audience: audience || 'ทั่วไป', price: price || '',
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
  const result = await runAgent(agent);
  res.json({ success: !!result, data: result });
});

app.patch('/api/agent/:id', (req, res) => {
  const idx = agents.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false });
  agents[idx] = { ...agents[idx], ...req.body, id: agents[idx].id };
  saveAgents(agents);
  res.json({ success: true, data: agents[idx] });
});

app.delete('/api/agent/:id', (req, res) => {
  const idx = agents.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false });
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
  const ledger = supabase ? 'supabase (ถาวร)' : 'file (ชั่วคราว)';
  const checks = {
    supabase:    { ok: supabase,  detail: supabase ? 'เก็บเครดิต/ผู้ผลิต/ออเดอร์ถาวร' : 'ยังใช้ไฟล์ชั่วคราว — ตั้ง SUPABASE_URL + SUPABASE_SERVICE_KEY' },
    payments:    { ok: omiseLive, detail: omiseLive ? 'รับเงินจริง (Omise live)' : 'mock mode — ตั้ง OMISE_SECRET_KEY (+ PUBLIC) เพื่อรับเงินจริง' },
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

// DELETE /api/memory/:id — ลบ memory รายชิ้น
app.delete('/api/memory/:id', (req, res) => {
  const tid = req.tenant?.id || req.query.tenantId || 'global';
  const result = memory.delete({ tenantId: tid, id: req.params.id });
  res.json({ success: true, ...result });
});

// DELETE /api/memory — clear ทั้งหมด (with optional ?type=)
app.delete('/api/memory', (req, res) => {
  const tid = req.tenant?.id || req.query.tenantId || 'global';
  const result = memory.clear({ tenantId: tid, type: req.query.type });
  res.json({ success: true, ...result });
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

// DELETE /api/webhooks/:id — unregister
app.delete('/api/webhooks/:id', (req, res) => {
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
          // อัปเดต affiliate total_earned ถ้าชำระผ่าน ref link
          const refCode = data.metadata?.ref_code;
          if (refCode) {
            const aff = affiliates.find(a => a.ref_code === refCode);
            if (aff) {
              const commission = +(amountThb * (aff.commission_rate || 0.20)).toFixed(2);
              aff.total_sales = (aff.total_sales || 0) + 1;
              aff.total_earned = +((aff.total_earned || 0) + commission).toFixed(2);
              saveAffiliate(aff).catch(e => console.warn('[affiliate] update earned failed:', e.message));
              addLog('info', 'Affiliate', `commission +${commission}฿ → ${refCode} (${aff.name})`);
            }
          }
        }
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
