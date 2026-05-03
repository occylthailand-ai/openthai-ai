import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import nodemailer from 'nodemailer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import {
  signToken, verifyToken, requireAuth,
  getAdminUsers, checkPassword, checkOverrideKey,
  useRecoveryCode, generateRecoveryCodes, getGoogleAuthUrl, exchangeGoogleCode,
} from './auth.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: true, credentials: true })); // allow all origins (file://, localhost, Vercel)
app.use(express.json());

// ─── Gemini client (ฟรี 100% ที่ aistudio.google.com) ───────────────────────
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-1.5-flash' })
  : null;

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
app.post('/api/generate', async (req, res) => {
  const form = req.body;

  if (!form?.product?.trim()) {
    return res.status(400).json({ error: 'product is required' });
  }

  // ถ้าไม่มี Gemini key ใช้ mock
  if (!gemini) {
    console.log('[mock] no GEMINI_API_KEY — using mock data');
    return res.json(mockGenerate(form));
  }

  try {
    const result = await gemini.generateContent(buildPrompt(form));
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini did not return valid JSON');

    const data = JSON.parse(jsonMatch[0]);

    if (Array.isArray(data.hashtags) && !data.hashtags.includes('#OpenThaiAI')) {
      data.hashtags.push('#OpenThaiAI');
    }
    data.source = 'gemini';

    return res.json(data);
  } catch (err) {
    console.error('[gemini error]', err.message);
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

// ─── POST /api/affiliate/apply — รับสมัคร Affiliate ──────────────────────────
const affiliates = []; // in-memory store (เปลี่ยนเป็น DB ได้ทีหลัง)

app.post('/api/affiliate/apply', (req, res) => {
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
      ref_link: ref_link || `https://openthai-ai.vercel.app/?ref=${ref_code}`,
      tier: 'starter',
      commission_rate: 0.20,
      total_sales: 0,
      total_earned: 0,
      joined_at: new Date().toISOString(),
      status: 'active',
    };

    affiliates.push(record);
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

// ─── GET /api/affiliate/list — list ทั้งหมด (admin only ในอนาคต) ─────────────
app.get('/api/affiliate/list', (req, res) => {
  res.json({ success: true, count: affiliates.length, data: affiliates });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ai: gemini ? 'gemini-1.5-flash' : 'mock',
    google_oauth: !!process.env.GOOGLE_CLIENT_ID,
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
app.post('/api/auth/login', async (req, res) => {
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
    console.log(`   AI Engine   : ${gemini ? '✅ Gemini 1.5 Flash (ฟรี)' : '⚠️  Mock mode — ใส่ GEMINI_API_KEY ใน .env'}`);
    console.log(`   Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '⚠️  Not configured'}`);
    console.log(`   Recovery    : ${process.env.RECOVERY_CODES ? '✅ Codes set' : '⚠️  No codes in .env'}`);
    console.log(`   Health      : http://localhost:${PORT}/api/health\n`);
  });
}

startServer();
