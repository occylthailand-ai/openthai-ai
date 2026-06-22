#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
//  OpenThai.ai — Pre-launch Preflight Check
//  รัน (จาก backend/): node preflight.js
//  ตรวจสอบว่า env vars, Supabase, Omise, AI API, SMTP พร้อมใช้งานก่อน go-live
// ═══════════════════════════════════════════════════════════════════════════════
import 'dotenv/config';
import { createTransport } from 'nodemailer';

const OK    = '✅';
const FAIL  = '❌';
const WARN  = '⚠️ ';
const INFO  = 'ℹ️ ';

let exitCode = 0;
const results = [];

function check(label, status, detail = '') {
  const icon = status === 'ok' ? OK : status === 'warn' ? WARN : FAIL;
  if (status === 'fail') exitCode = 1;
  results.push({ label, status, detail });
  const pad = label.padEnd(38, ' ');
  console.log(`  ${icon}  ${pad} ${detail}`);
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// ── Required env vars ─────────────────────────────────────────────────────────
function checkEnv(name, { required = true, hint = '' } = {}) {
  const val = process.env[name];
  const present = !!(val && val.trim() && !val.startsWith('change-me') && !val.includes('xxxxxxx'));
  const status = present ? 'ok' : required ? 'fail' : 'warn';
  const detail = present ? '(set)' : `ไม่ได้ตั้งค่า${hint ? ' — ' + hint : ''}`;
  check(name, status, detail);
  return present;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function httpGet(url, headers = {}) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  const body = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, body };
}

async function httpPost(url, body, headers = {}) {
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, body: data };
}

// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log('  OpenThai.ai — Pre-launch Preflight Check');
console.log('  ' + new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));
console.log('═'.repeat(60));

// ── 1. Environment Variables ──────────────────────────────────────────────────
section('1. Environment Variables');

checkEnv('JWT_SECRET',           { hint: 'ต้องการสตริงสุ่ม ≥ 32 ตัว' });
checkEnv('ADMIN_KEY',            { hint: 'กำหนดรหัสผ่าน Admin Panel' });
checkEnv('ADMIN_USERNAME',       { hint: 'ชื่อผู้ใช้ Admin' });
checkEnv('ADMIN_PASSWORD_PLAIN', { hint: 'รหัสผ่าน Admin' });

const hasGemini   = checkEnv('GEMINI_API_KEY',   { required: false, hint: 'AI หลัก (แนะนำ)' });
const hasClaude   = checkEnv('ANTHROPIC_API_KEY', { required: false, hint: 'AI ทางเลือก' });
if (!hasGemini && !hasClaude) check('AI_KEY (any)', 'fail', 'ต้องการ GEMINI_API_KEY หรือ ANTHROPIC_API_KEY');

const hasSupabase = checkEnv('SUPABASE_URL',      { required: false, hint: 'DB ถาวร (ถ้าไม่ตั้งจะ fallback เป็น /tmp)' });
                    checkEnv('SUPABASE_SERVICE_KEY', { required: false, hint: 'ต้องตั้งพร้อม SUPABASE_URL' });

const hasOmise    = checkEnv('OMISE_SECRET_KEY',  { required: false, hint: 'Payment — ถ้าไม่ตั้งจะ mock mode' });
                    checkEnv('OMISE_PUBLIC_KEY',   { required: false });
                    checkEnv('OMISE_WEBHOOK_SECRET',{ required: false, hint: 'ตรวจสอบ webhook จริง' });

const hasSMTP     = checkEnv('SMTP_HOST',         { required: false, hint: 'ส่งอีเมลใบเสร็จ / welcome' });
                    checkEnv('SMTP_USER',          { required: false });
                    checkEnv('SMTP_PASS',          { required: false });

checkEnv('GOOGLE_CLIENT_ID',     { required: false, hint: 'Login ด้วย Google' });
checkEnv('GOOGLE_CLIENT_SECRET', { required: false });
checkEnv('FRONTEND_URL',         { required: false, hint: 'URL หน้าเว็บ (CORS)' });

// ── 2. Supabase Connection ────────────────────────────────────────────────────
section('2. Supabase Connection');

if (hasSupabase && process.env.SUPABASE_SERVICE_KEY) {
  try {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_KEY;
    const tables = ['credits', 'producers', 'orders', 'products', 'affiliates', 'payments', 'entitlements'];
    const { ok, status, body } = await httpGet(
      `${sbUrl}/rest/v1/credits?limit=1`,
      { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    );
    if (ok || status === 406) {
      check('Supabase connection', 'ok', `HTTP ${status} — เชื่อมต่อได้`);
      // Check each table exists
      for (const tbl of tables) {
        try {
          const r = await httpGet(`${sbUrl}/rest/v1/${tbl}?limit=0`, { apikey: sbKey, Authorization: `Bearer ${sbKey}` });
          check(`  table: public.${tbl}`, r.ok || r.status === 406 ? 'ok' : 'fail',
            r.ok || r.status === 406 ? 'พบตาราง' : `HTTP ${r.status} — รัน FULL-MIGRATION.sql ก่อน`);
        } catch (e) {
          check(`  table: public.${tbl}`, 'fail', e.message);
        }
      }
    } else {
      check('Supabase connection', 'fail', `HTTP ${status} — ${body?.message || 'ตรวจสอบ SUPABASE_URL และ SERVICE_KEY'}`);
    }
  } catch (e) {
    check('Supabase connection', 'fail', e.message);
  }
} else {
  check('Supabase connection', 'warn', 'ไม่ได้ตั้ง SUPABASE_URL/KEY — ข้อมูลจะเก็บใน /tmp (หายเมื่อ restart)');
}

// ── 3. AI API ─────────────────────────────────────────────────────────────────
section('3. AI API Keys');

if (hasGemini) {
  try {
    const r = await httpGet(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
    );
    check('Gemini API key', r.ok ? 'ok' : 'fail',
      r.ok ? `${r.body?.models?.length || '?'} models` : `HTTP ${r.status} — key ไม่ถูกต้อง`);
  } catch (e) { check('Gemini API key', 'fail', e.message); }
} else {
  check('Gemini API key', 'warn', 'ไม่ได้ตั้ง (ข้ามการทดสอบ)');
}

if (hasClaude) {
  try {
    const r = await httpGet('https://api.anthropic.com/v1/models', {
      'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01',
    });
    check('Anthropic API key', r.ok ? 'ok' : 'fail',
      r.ok ? `${r.body?.data?.length || '?'} models` : `HTTP ${r.status} — key ไม่ถูกต้อง`);
  } catch (e) { check('Anthropic API key', 'fail', e.message); }
} else {
  check('Anthropic API key', 'warn', 'ไม่ได้ตั้ง (ข้ามการทดสอบ)');
}

// ── 4. Omise Payment ──────────────────────────────────────────────────────────
section('4. Omise Payment');

if (hasOmise) {
  try {
    const sk = process.env.OMISE_SECRET_KEY;
    const basicAuth = 'Basic ' + Buffer.from(`${sk}:`).toString('base64');
    const r = await httpGet('https://api.omise.co/account', { Authorization: basicAuth });
    if (r.ok) {
      check('Omise secret key', 'ok', `account: ${r.body?.email || r.body?.id || 'ok'}`);
      check('Omise mode', r.body?.livemode ? 'ok' : 'warn',
        r.body?.livemode ? 'LIVE mode ✅' : 'TEST mode (อย่าลืมเปลี่ยนเป็น live key ก่อน launch)');
    } else {
      check('Omise secret key', 'fail', `HTTP ${r.status} — ${r.body?.message || 'key ไม่ถูกต้อง'}`);
    }
    const planPro = process.env.OMISE_PLAN_PRO;
    const planPremier = process.env.OMISE_PLAN_PREMIER;
    check('OMISE_PLAN_PRO',     planPro     && !planPro.includes('xxx')     ? 'ok' : 'warn', planPro     || 'ยังไม่ตั้ง — subscription Pro ยังใช้ไม่ได้');
    check('OMISE_PLAN_PREMIER', planPremier && !planPremier.includes('xxx') ? 'ok' : 'warn', planPremier || 'ยังไม่ตั้ง — subscription Premier ยังใช้ไม่ได้');
    check('OMISE_WEBHOOK_SECRET', process.env.OMISE_WEBHOOK_SECRET && !process.env.OMISE_WEBHOOK_SECRET.includes('xxx') ? 'ok' : 'warn',
      process.env.OMISE_WEBHOOK_SECRET ? '(set)' : 'ยังไม่ตั้ง — webhook verification จะ reject ทุก request');
  } catch (e) { check('Omise connection', 'fail', e.message); }
} else {
  check('Omise payment', 'warn', 'ไม่ได้ตั้ง OMISE_SECRET_KEY — จะ mock mode เท่านั้น');
}

// ── 5. SMTP / Email ───────────────────────────────────────────────────────────
section('5. SMTP / Email');

if (hasSMTP && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (Number(process.env.SMTP_PORT) || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.verify();
    check('SMTP connection', 'ok', `${process.env.SMTP_HOST} — เชื่อมต่อสำเร็จ`);
  } catch (e) { check('SMTP connection', 'fail', e.message); }
} else {
  check('SMTP / Email', 'warn', 'ไม่ได้ตั้ง SMTP_HOST/USER/PASS — ส่งอีเมลไม่ได้');
}

// ── 6. Optional Services ──────────────────────────────────────────────────────
section('6. Optional Services');

const optionals = [
  ['LINE_CHANNEL_TOKEN',    'LINE Messaging'],
  ['FB_PAGE_TOKEN',         'Facebook / IG'],
  ['ELEVENLABS_API_KEY',    'ElevenLabs TTS'],
  ['RUNWAY_API_KEY',        'RunwayML Video'],
  ['SLACK_WEBHOOK_URL',     'Slack Notifications'],
  ['N8N_URL',               'n8n Automation'],
];
for (const [env, label] of optionals) {
  const val = process.env[env];
  const set = !!(val && !val.includes('xxx') && !val.includes('your-'));
  check(label.padEnd(24), set ? 'ok' : 'warn', set ? '(set)' : 'ไม่ได้ตั้ง (optional)');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
const fails  = results.filter(r => r.status === 'fail').length;
const warns  = results.filter(r => r.status === 'warn').length;
const passed = results.filter(r => r.status === 'ok').length;
console.log(`\n  สรุป: ${OK} ${passed} ผ่าน  ${WARN} ${warns} คำเตือน  ${FAIL} ${fails} ล้มเหลว\n`);

if (fails > 0) {
  console.log(`  ${FAIL} ยังไม่พร้อม launch — แก้ไขรายการ ❌ ข้างบนก่อน\n`);
} else if (warns > 0) {
  console.log(`  ${WARN} เกือบพร้อม — ตรวจสอบคำเตือน ⚠️  ด้านบนก่อน launch production\n`);
} else {
  console.log(`  ${OK} พร้อม launch! ทุกอย่างผ่านการตรวจสอบ\n`);
}
console.log('═'.repeat(60) + '\n');

process.exit(exitCode);
