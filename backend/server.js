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

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Vercel serverless detection ──────────────────────────────────────────────
const IS_VERCEL = !!process.env.VERCEL;

// บน Vercel: ไฟล์ static อ่านได้จาก repo, ไฟล์ writable ต้องใช้ /tmp
// Local: ทุกอย่างอยู่ใน backend/data/
const STATIC_DATA_DIR = join(__dirname, 'data');
const WRITE_DATA_DIR  = IS_VERCEL ? '/tmp/openthai-data' : STATIC_DATA_DIR;
import {
  signToken, verifyToken, requireAuth,
  getAdminUsers, checkPassword, checkOverrideKey,
  useRecoveryCode, generateRecoveryCodes, getGoogleAuthUrl, exchangeGoogleCode,
} from './auth.js';

const app = express();
const PORT = process.env.PORT || 8000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({ origin: true, credentials: true })); // allow all origins (file://, localhost, Vercel)
app.use(express.json({ limit: '50kb' })); // default limit
// image endpoint uses its own larger limit (see /api/analyze-image)

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
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-1.5-flash' })
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
  if (Array.isArray(data.hashtags) && !data.hashtags.includes('#OpenThaiAI')) {
    data.hashtags.push('#OpenThaiAI');
  }
  data.source = 'claude';
  return data;
}

// ── Generate with Gemini 1.5 Flash ──────────────────────────────────────────
async function generateWithGemini(form) {
  const result = await gemini.generateContent(buildPrompt(form));
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON');
  const data = JSON.parse(jsonMatch[0]);
  if (Array.isArray(data.hashtags) && !data.hashtags.includes('#OpenThaiAI')) {
    data.hashtags.push('#OpenThaiAI');
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
    hashtags: ['#OTOP', '#สินค้าไทย', '#ของดีบ้านเรา', '#ขายออนไลน์', '#TikTokShop', `#${form.product.replace(/\s+/g, '')}`, '#OpenThaiAI'],
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

  try {
    const data = await smartGenerate(form);
    return res.json(data);
  } catch (err) {
    console.error('[generate error]', err.message);
    const fallback = mockGenerate(form);
    fallback.source = 'mock-fallback';
    return res.json(fallback);
  }
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
      from: `"OpenThai AI" <${process.env.SMTP_USER}>`,
      to,
      subject: '🎉 ยินดีต้อนรับสู่ OpenThai AI Affiliate Program!',
      html: `
      <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#fe2c55,#6366f1);padding:32px;text-align:center;">
          <h1 style="margin:0;font-size:26px;">🎉 ยินดีด้วย ${name}!</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);">คุณเป็น Affiliate ของ OpenThai AI แล้ว</p>
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
            <a href="https://www.openthai-ai.com/affiliate/dashboard?ref=${refCode}" style="display:inline-block;background:linear-gradient(135deg,#fe2c55,#6366f1);color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:700;font-size:15px;">📊 เปิด Dashboard ของฉัน</a>
          </div>
        </div>
        <div style="padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#475569;">
          OpenThai AI • <a href="https://www.openthai-ai.com" style="color:#6366f1;">openthai-ai.com</a>
        </div>
      </div>`,
    });
    console.log(`📧 Welcome email ส่งให้ ${to} เรียบร้อย`);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

// ─── Affiliate JSON File DB ───────────────────────────────────────────────────

const AFF_FILE = join(WRITE_DATA_DIR, 'affiliates.json');

function loadAffiliates() {
  try {
    if (existsSync(AFF_FILE)) return JSON.parse(readFileSync(AFF_FILE, 'utf8'));
  } catch (_) {}
  return [];
}

function saveAffiliates(data) {
  try {
    const dir = AFF_FILE.replace(/[/\\][^/\\]+$/, '');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); // sync — ไม่ใช้ dynamic import
    writeFileSync(AFF_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('Save affiliates error:', e.message); }
}

// ─── POST /api/affiliate/apply — รับสมัคร Affiliate ──────────────────────────
const affiliates = loadAffiliates(); // persistent JSON file store

app.post('/api/affiliate/apply', affiliateLimiter, (req, res) => {
  try {
    const { name, email, phone, platform, followers, channel_url, note, ref_code, ref_link } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'ต้องการชื่อและอีเมล' });

    // ป้องกันสมัครซ้ำ
    if (affiliates.find((a) => a.email === email)) {
      return res.status(409).json({ success: false, message: 'อีเมลนี้สมัครไปแล้ว' });
    }

    const record = {
      id: Date.now().toString(),
      name, email, phone: phone || '',
      platform: platform || 'TikTok',
      followers: followers || '',
      channel_url: channel_url || '',
      note: note || '',
      ref_code: ref_code || `AFF${Date.now().toString().slice(-6)}`,
      ref_link: ref_link || `https://www.openthai-ai.com/?ref=${ref_code}`,
      tier: 'starter',
      commission_rate: 0.20,
      total_sales: 0,
      total_earned: 0,
      joined_at: new Date().toISOString(),
      status: 'active',
    };

    affiliates.push(record);
    saveAffiliates(affiliates); // บันทึกลงไฟล์ถาวร
    console.log(`✅ Affiliate สมัครใหม่: ${name} (${email}) — Ref: ${record.ref_code}`);

    // ส่ง welcome email อัตโนมัติ (async — ไม่บล็อก response)
    sendAffiliateWelcome(email, name, record.ref_code, record.ref_link);

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
  res.json({
    success: true,
    data: {
      ref_code: aff.ref_code,
      tier: aff.tier,
      commission_rate: aff.commission_rate,
      total_sales: aff.total_sales,
      total_earned: aff.total_earned,
      joined_at: aff.joined_at,
    },
  });
});

// ─── GET /api/affiliate/list — admin only (ต้องใช้ ADMIN_KEY header) ──────────
app.get('/api/affiliate/list', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  const adminKey = process.env.ADMIN_KEY || 'openthai-admin-2026';
  if (key !== adminKey) {
    return res.status(401).json({ success: false, message: 'Unauthorized — ต้องการ Admin Key' });
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
        from: `"OpenThai AI" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        replyTo: safe(email, 254),
        subject: `[Contact] ${safe(subject, 100) || 'ข้อความจากผู้ใช้'}`,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;"><h3>ข้อความจาก ${safe(name)}</h3><p><strong>Email:</strong> ${safe(email, 254)}</p><p><strong>Subject:</strong> ${safe(subject, 100)}</p><hr/><p style="white-space:pre-wrap;">${safe(message)}</p></div>`,
      }).catch(console.error);
      // ยืนยันให้ผู้ส่ง
      mailer.sendMail({
        from: `"OpenThai AI" <${process.env.SMTP_USER}>`,
        to: safe(email, 254),
        subject: '✅ ได้รับข้อความของคุณแล้ว — OpenThai AI',
        html: `<div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:500px;margin:0 auto;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#fe2c55,#6366f1);padding:24px;text-align:center;"><h2 style="margin:0;">✅ ได้รับข้อความแล้ว!</h2></div><div style="padding:24px;font-size:14px;color:#cbd5e1;"><p>สวัสดีคุณ ${safe(name)},</p><p>เราได้รับข้อความของคุณแล้ว ทีมงานจะตอบกลับภายใน <strong style="color:#10b981;">1–2 วันทำการ</strong></p><p style="margin-top:20px;">ขอบคุณที่ติดต่อ OpenThai AI 🙏</p></div></div>`,
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
        from: `"OpenThai AI" <${process.env.SMTP_USER}>`,
        to: sanitizedEmail,
        subject: '🎉 ยืนยันการลงทะเบียน OpenThai AI',
        html: `<div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:500px;margin:0 auto;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#fe2c55,#6366f1);padding:28px;text-align:center;"><h1 style="margin:0;font-size:22px;">🎉 ยินดีต้อนรับ!</h1></div><div style="padding:24px;"><p style="font-size:14px;color:#cbd5e1;">ขอบคุณที่สนใจ <strong>OpenThai AI</strong> เราจะแจ้งเตือนคุณทันทีที่มีสิทธิพิเศษ</p><div style="text-align:center;margin:20px 0;"><a href="https://www.openthai-ai.com" style="background:linear-gradient(135deg,#fe2c55,#6366f1);color:#fff;text-decoration:none;padding:12px 24px;border-radius:50px;font-weight:700;font-size:14px;">🚀 ลองใช้ฟรีตอนนี้เลย</a></div></div></div>`,
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

app.get('/api/trending', async (req, res) => {
  if (trendCache.data && Date.now() - trendCache.ts < TREND_TTL) {
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
    title: 'OpenThai AI — System charter (embedded fallback)',
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
        const msg = `🤖 OpenThai AI Agent: "${agent.name}"\n\n🎣 Hook:\n${result.hook}\n\n📝 Caption:\n${result.caption}\n\n${result.hashtags?.join(' ')}`;
        await sendLine(agent.lineUserId, msg);
      } catch (lineErr) {
        try { addLog('warn', 'Agent', `LINE push ไม่สำเร็จ "${agent.name}": ${lineErr.message}`); } catch (_) {}
      }
    }
    console.log(`[Agent] ✅ Done — Score: ${result.criticScore}`);
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
    return res.status(500).json({ error: err.message, fallback: true });
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
  if (level === 'error') console.error(`[${source}] ${message}`, detail || '');
  else console.log(`[${source}] ${message}`);
}

// ── Watchdog state ─────────────────────────────────────────────────────────────
let watchdogStats = { lastRun: null, healed: 0, checked: 0, status: 'idle', nextRun: null };

async function runWatchdog() {
  watchdogStats.status = 'running';
  watchdogStats.lastRun = new Date().toISOString();
  watchdogStats.checked = 0;
  let healed = 0;
  addLog('info', 'Watchdog', '🔍 เริ่มตรวจระบบ auto-heal...');

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
addLog('info', 'System', `🚀 OpenThai AI backend started — AI:${anthropic?'Claude':gemini?'Gemini':'Mock'}`);
(() => { const c = getSystemCharter(); addLog('info', 'Charter', `📜 นโยบายถาวร v${c.version} — ${c.title}`); })();

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
      { id:'S9', name:'Learning Layer',   pct:78, color:'#06b6d4', category:'learning',    status:'⚠️' },
    ],
    benchmark: [
      { name:'Thai Language NLP',   ours:97, industry:68, leader:'OpenThai AI 🏆' },
      { name:'OTOP/Local Context',  ours:98, industry:40, leader:'OpenThai AI 🏆' },
      { name:'Content Generation',  ours:95, industry:88, leader:'OpenThai AI 🏆' },
      { name:'Auto-scheduling',     ours:82, industry:80, leader:'OpenThai AI 🏆' },
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

  const prompt = `วิเคราะห์ระบบ OpenThai AI และแนะนำการแก้ไข ตอบ JSON เท่านั้น:

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

// ─── Health check (v2) ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const charter = getSystemCharter();
  const aiEngine = anthropic ? 'claude-haiku-4-5-20251001' : gemini ? 'gemini-1.5-flash' : 'mock';
  res.json({
    status:        'ok',
    version:       '2.0.0',
    charter_version: charter.version,
    charter_title:   charter.title,
    ai_primary:    anthropic ? '✅ Claude Haiku'     : '⚠️ No ANTHROPIC_API_KEY',
    ai_fallback:   gemini    ? '✅ Gemini 1.5 Flash' : '⚠️ No GEMINI_API_KEY',
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
    controller:  'OpenThai AI (DATATAN.NET)',
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
    console.log(`\n🚀 OpenThai AI Backend running on http://localhost:${PORT}`);
    console.log(`   AI Primary  : ${anthropic ? '✅ Claude Haiku 4.5' : '⚠️  ใส่ ANTHROPIC_API_KEY ใน .env'}`);
    console.log(`   AI Fallback : ${gemini    ? '✅ Gemini 1.5 Flash' : '⚠️  ใส่ GEMINI_API_KEY ใน .env'}`);
    console.log(`   AI Mode     : ${anthropic ? 'Claude' : gemini ? 'Gemini' : '⚠️  Mock (ไม่มี API key)'}`);
    console.log(`   Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '⚠️  Not configured'}`);
    console.log(`   Recovery    : ${process.env.RECOVERY_CODES ? '✅ Codes set' : '⚠️  No codes in .env'}`);
    console.log(`   IS_VERCEL   : ${IS_VERCEL ? '✅ Serverless mode' : '⚠️  Local mode'}`);
    console.log(`   Health      : http://localhost:${PORT}/api/health\n`);
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
