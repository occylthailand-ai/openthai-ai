// ── Credit ledger — เครดิตจริงจากรางวัล (spin / streak) ใช้ generate เกินโควต้าฟรีได้ ──
// Dual-mode persistence:
//   • Supabase (REST) เมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง → ถาวรข้าม instance
//   • ไฟล์ JSON เป็น fallback (local / ยังไม่ตั้ง Supabase)
import express from 'express';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const MAX_BALANCE = 200;        // กันบวมเกินเหตุ
const STREAK_MAX_BONUS = 5;     // โบนัส streak สูงสุด/วัน
const MAX_CLAIM = 50;           // กันยิงเครดิตทีละมากๆ

// รางวัลวงล้อ — server เป็นคนสุ่ม (กันโกง). index ต้องตรงกับฝั่ง frontend
const SPIN_PRIZES = [
  { label: '5 free credits',   credits: 5 },
  { label: '30% off',          credits: 0, discount: 30 },
  { label: '3 free credits',   credits: 3 },
  { label: '50% off',          credits: 0, discount: 50 },
  { label: '3 days Pro free',  credits: 0, proDays: 3 },
  { label: '10 free credits',  credits: 10 },
];

// claim ทั่วไปที่อนุญาต (idempotent ตาม source) — จำกัด amount ฝั่ง server
const ALLOWED_CLAIMS = { welcome: 3 };

export function createCredits(dataDir) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const useSB = !!(SB_URL && SB_KEY);

  // ── file fallback store ──────────────────────────────────────────────────────
  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  const FILE = join(dataDir, 'credits.json');
  let store = {};
  try { if (existsSync(FILE)) store = JSON.parse(readFileSync(FILE, 'utf8')); } catch { store = {}; }
  const saveFile = () => { try { writeFileSync(FILE, JSON.stringify(store, null, 2), 'utf8'); } catch { /* ignore */ } };

  // ── Supabase REST helper ─────────────────────────────────────────────────────
  async function sbReq(method, path, { body, params, prefer } = {}) {
    const url = new URL(`${SB_URL}/rest/v1${path}`);
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
    if (prefer) headers.Prefer = prefer;
    const res = await fetch(url.toString(), { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && (data.message || data.hint)) || `Supabase HTTP ${res.status}`);
    return data;
  }

  const defAcct = () => ({ balance: 0, streakDays: 0, streakDate: null, spun: false, prize: null, claims: {} });
  const fromRow = (r) => ({ balance: r.balance || 0, streakDays: r.streak_days || 0, streakDate: r.streak_date || null, spun: !!r.spun, prize: r.prize || null, claims: r.claims || {} });
  const toRow = (id, a) => ({ id, balance: a.balance, streak_days: a.streakDays, streak_date: a.streakDate, spun: a.spun, prize: a.prize, claims: a.claims || {}, updated_at: new Date().toISOString() });

  async function getAcct(id) {
    if (useSB) {
      try {
        const rows = await sbReq('GET', '/credits', { params: { id: `eq.${id}`, select: '*', limit: '1' } });
        if (Array.isArray(rows) && rows[0]) return fromRow(rows[0]);
        return defAcct();
      } catch (e) { console.warn('[credits] Supabase read failed, using file:', e.message); }
    }
    return store[id] ? { ...defAcct(), ...store[id] } : defAcct();
  }

  async function putAcct(id, a) {
    if (useSB) {
      try {
        await sbReq('POST', '/credits', { body: [toRow(id, a)], params: { on_conflict: 'id' }, prefer: 'resolution=merge-duplicates,return=minimal' });
        return;
      } catch (e) { console.warn('[credits] Supabase write failed, using file:', e.message); }
    }
    store[id] = a; saveFile();
  }

  // identity: email > device id > ip (เหมือน quota เดิม แต่รองรับ device id)
  function identityFrom(req) {
    const email = (req.headers['x-user-email'] || req.body?.email || req.query?.email || '').toString().trim().toLowerCase();
    if (email) return `e:${email}`;
    const dev = (req.headers['x-device-id'] || req.body?.deviceId || req.query?.deviceId || '').toString().trim();
    if (dev) return `d:${dev.slice(0, 64)}`;
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
    return `i:${ip || 'unknown'}`;
  }

  // ส่วนลดที่ยังไม่ได้ใช้ (จากรางวัล spin "X% off") เก็บใน claims._discount
  const discOf = (a) => (a.claims && a.claims._discount && !a.claims._discount.used) ? (a.claims._discount.pct || 0) : 0;

  async function pub(id) {
    const a = await getAcct(id);
    return { balance: a.balance, streakDays: a.streakDays, streakDate: a.streakDate, spun: a.spun, prize: a.prize, discountPct: discOf(a) };
  }

  async function peekDiscount(id) { return discOf(await getAcct(id)); }

  // ใช้ส่วนลด 1 ครั้ง (mark used) — คืน % ที่ใช้ (0 ถ้าไม่มี)
  async function consumeDiscount(id) {
    const a = await getAcct(id);
    const d = a.claims && a.claims._discount;
    if (d && !d.used) { d.used = true; await putAcct(id, a); return d.pct || 0; }
    return 0;
  }

  async function addCredits(id, amount, source) {
    const a = await getAcct(id);
    if (source && a.claims[source]) return { added: 0, balance: a.balance, duplicate: true };
    const amt = clamp(Math.floor(amount || 0), 0, MAX_CLAIM);
    a.balance = clamp(a.balance + amt, 0, MAX_BALANCE);
    if (source) a.claims[source] = true;
    await putAcct(id, a);
    return { added: amt, balance: a.balance, duplicate: false };
  }

  async function hasCredit(id) { return (await getAcct(id)).balance > 0; }

  async function consumeCredit(id) {
    const a = await getAcct(id);
    if (a.balance > 0) { a.balance -= 1; await putAcct(id, a); return true; }
    return false;
  }

  // daily check-in → คำนวณ streak ฝั่ง server + ให้เครดิตโบนัส (idempotent ต่อวัน)
  async function checkin(id) {
    const a = await getAcct(id);
    const d = today();
    if (a.streakDate === d) return { streakDays: a.streakDays, awarded: 0, balance: a.balance, alreadyToday: true };
    a.streakDays = a.streakDate === yesterday() ? (a.streakDays || 0) + 1 : 1;
    a.streakDate = d;
    const award = clamp(a.streakDays, 1, STREAK_MAX_BONUS);
    a.balance = clamp(a.balance + award, 0, MAX_BALANCE);
    await putAcct(id, a);
    return { streakDays: a.streakDays, awarded: award, balance: a.balance, alreadyToday: false };
  }

  // spin วงล้อ — 1 ครั้ง/identity, server สุ่มรางวัล
  async function spin(id) {
    const a = await getAcct(id);
    if (a.spun) {
      const idx = SPIN_PRIZES.findIndex((p) => p.label === a.prize);
      return { already: true, index: Math.max(0, idx), prize: a.prize, credits: 0, balance: a.balance };
    }
    const i = Math.floor(Math.random() * SPIN_PRIZES.length);
    const p = SPIN_PRIZES[i];
    a.spun = true;
    a.prize = p.label;
    if (p.credits) a.balance = clamp(a.balance + p.credits, 0, MAX_BALANCE);
    if (p.discount) { a.claims = a.claims || {}; a.claims._discount = { pct: p.discount, used: false }; }
    await putAcct(id, a);
    return { already: false, index: i, prize: p.label, credits: p.credits || 0, discount: p.discount || 0, proDays: p.proDays || 0, balance: a.balance };
  }

  // ── Routes ──────────────────────────────────────────────────────────────────
  const limiter = rateLimit({ windowMs: 60000, max: 40, message: { success: false, error: 'rate limit' } });
  const router = express.Router();
  const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error('[credits route]', e.message); res.status(500).json({ success: false, error: 'credit error' }); });

  router.get('/api/credits', limiter, wrap(async (req, res) => {
    res.json({ success: true, mode: useSB ? 'supabase' : 'file', ...(await pub(identityFrom(req))) });
  }));
  router.post('/api/credits/checkin', limiter, wrap(async (req, res) => {
    res.json({ success: true, ...(await checkin(identityFrom(req))) });
  }));
  router.post('/api/credits/spin', limiter, wrap(async (req, res) => {
    res.json({ success: true, ...(await spin(identityFrom(req))) });
  }));
  router.post('/api/credits/claim', limiter, wrap(async (req, res) => {
    const source = (req.body?.source || '').toString();
    if (!(source in ALLOWED_CLAIMS)) return res.status(400).json({ success: false, error: 'invalid source' });
    res.json({ success: true, ...(await addCredits(identityFrom(req), ALLOWED_CLAIMS[source], source)) });
  }));

  console.log(`[credits] ledger mode: ${useSB ? 'Supabase' : 'file'}`);
  return { router, identityFrom, hasCredit, consumeCredit, pub, peekDiscount, consumeDiscount, SPIN_PRIZES };
}
