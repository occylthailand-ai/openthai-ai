// ── Credit ledger — เครดิตจริงจากรางวัล (spin / streak) ใช้ generate เกินโควต้าฟรีได้ ──
// เก็บเป็นไฟล์ JSON เหมือน module อื่น (entitlements/webhooks) — server-authoritative
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
  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  const FILE = join(dataDir, 'credits.json');

  let store = {};
  try { if (existsSync(FILE)) store = JSON.parse(readFileSync(FILE, 'utf8')); } catch { store = {}; }
  const save = () => { try { writeFileSync(FILE, JSON.stringify(store, null, 2), 'utf8'); } catch { /* ignore */ } };

  const acct = (id) => {
    if (!store[id]) store[id] = { balance: 0, streakDays: 0, streakDate: null, spun: false, prize: null, claims: {}, history: [] };
    return store[id];
  };

  // identity: email > device id > ip (เหมือน quota เดิม แต่รองรับ device id)
  function identityFrom(req) {
    const email = (req.headers['x-user-email'] || req.body?.email || req.query?.email || '').toString().trim().toLowerCase();
    if (email) return `e:${email}`;
    const dev = (req.headers['x-device-id'] || req.body?.deviceId || req.query?.deviceId || '').toString().trim();
    if (dev) return `d:${dev.slice(0, 64)}`;
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
    return `i:${ip || 'unknown'}`;
  }

  const pub = (id) => {
    const a = acct(id);
    return { balance: a.balance, streakDays: a.streakDays, streakDate: a.streakDate, spun: a.spun, prize: a.prize };
  };

  function pushHistory(a, amount, source) {
    a.history.unshift({ ts: Date.now(), amount, source });
    a.history = a.history.slice(0, 50);
  }

  function addCredits(id, amount, source) {
    const a = acct(id);
    if (source && a.claims[source]) return { added: 0, balance: a.balance, duplicate: true };
    const amt = clamp(Math.floor(amount || 0), 0, MAX_CLAIM);
    a.balance = clamp(a.balance + amt, 0, MAX_BALANCE);
    if (source) a.claims[source] = true;
    if (amt > 0) pushHistory(a, amt, source || 'manual');
    save();
    return { added: amt, balance: a.balance, duplicate: false };
  }

  const hasCredit = (id) => acct(id).balance > 0;
  function consumeCredit(id) {
    const a = acct(id);
    if (a.balance > 0) { a.balance -= 1; pushHistory(a, -1, 'generate'); save(); return true; }
    return false;
  }

  // daily check-in → คำนวณ streak ฝั่ง server + ให้เครดิตโบนัส (idempotent ต่อวัน)
  function checkin(id) {
    const a = acct(id);
    const d = today();
    if (a.streakDate === d) return { streakDays: a.streakDays, awarded: 0, balance: a.balance, alreadyToday: true };
    a.streakDays = a.streakDate === yesterday() ? (a.streakDays || 0) + 1 : 1;
    a.streakDate = d;
    const award = clamp(a.streakDays, 1, STREAK_MAX_BONUS);
    a.balance = clamp(a.balance + award, 0, MAX_BALANCE);
    pushHistory(a, award, `streak-${d}`);
    save();
    return { streakDays: a.streakDays, awarded: award, balance: a.balance, alreadyToday: false };
  }

  // spin วงล้อ — 1 ครั้ง/identity, server สุ่มรางวัล
  function spin(id) {
    const a = acct(id);
    if (a.spun) {
      const idx = SPIN_PRIZES.findIndex((p) => p.label === a.prize);
      return { already: true, index: Math.max(0, idx), prize: a.prize, credits: 0, balance: a.balance };
    }
    const i = Math.floor(Math.random() * SPIN_PRIZES.length);
    const p = SPIN_PRIZES[i];
    a.spun = true;
    a.prize = p.label;
    a.prizeMeta = { discount: p.discount || 0, proDays: p.proDays || 0 };
    if (p.credits) { a.balance = clamp(a.balance + p.credits, 0, MAX_BALANCE); pushHistory(a, p.credits, 'spin'); }
    save();
    return { already: false, index: i, prize: p.label, credits: p.credits || 0, discount: p.discount || 0, proDays: p.proDays || 0, balance: a.balance };
  }

  // ── Routes ──────────────────────────────────────────────────────────────────
  const limiter = rateLimit({ windowMs: 60000, max: 40, message: { success: false, error: 'rate limit' } });
  const router = express.Router();

  router.get('/api/credits', limiter, (req, res) => {
    res.json({ success: true, ...pub(identityFrom(req)) });
  });
  router.post('/api/credits/checkin', limiter, (req, res) => {
    res.json({ success: true, ...checkin(identityFrom(req)) });
  });
  router.post('/api/credits/spin', limiter, (req, res) => {
    res.json({ success: true, ...spin(identityFrom(req)) });
  });
  router.post('/api/credits/claim', limiter, (req, res) => {
    const source = (req.body?.source || '').toString();
    if (!(source in ALLOWED_CLAIMS)) return res.status(400).json({ success: false, error: 'invalid source' });
    res.json({ success: true, ...addCredits(identityFrom(req), ALLOWED_CLAIMS[source], source) });
  });

  return { router, identityFrom, hasCredit, consumeCredit, pub, SPIN_PRIZES };
}
