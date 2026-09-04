// ── Producer / Supplier onboarding — รับสมัครผู้ผลิตมาสังกัดแพลตฟอร์ม ─────────────
// Dual-mode: Supabase (REST) เมื่อตั้ง SUPABASE_URL+SERVICE_KEY, ไม่งั้น file JSON
import express from 'express';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// เดิมไม่มี 'อาหารสัตว์เลี้ยง'/'สินค้าดิจิทัล' ทั้งที่เพิ่มเข้า CATEGORIES ฝั่งผู้บริโภคแล้ว
// (ConsumerPortalPage.jsx) — ทำให้ผู้ผลิตสินค้ากลุ่มนี้ที่สมัครผ่าน /join ไม่มีหมวดให้เลือกตรง
// ต้องเลือก 'อื่นๆ' ทั้งที่ผู้บริโภคเลือกหมวดที่ถูกต้องได้แล้ว
const CATEGORIES = ['OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'เฟอร์นิเจอร์', 'เกษตร', 'อาหารสัตว์เลี้ยง', 'สินค้าดิจิทัล', 'อื่นๆ'];
const clip = (s, n = 300) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim().slice(0, n) : '');
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');

export function createProducers(dataDir) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const useSB = !!(SB_URL && SB_KEY);

  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  const FILE = join(dataDir, 'producers.json');
  let store = {};
  try { if (existsSync(FILE)) store = JSON.parse(readFileSync(FILE, 'utf8')); } catch { store = {}; }
  const saveFile = () => { try { writeFileSync(FILE, JSON.stringify(store, null, 2), 'utf8'); } catch { /* ignore */ } };

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

  // สมัครเป็นผู้ผลิต (dedupe ตามอีเมล, status เริ่ม 'pending')
  async function register(input) {
    const rec = {
      email: clip(input.email, 120).toLowerCase(),
      company: clip(input.company, 120),
      contact_name: clip(input.contact_name, 80),
      phone: clip(input.phone, 40),
      website: clip(input.website, 120),
      category: CATEGORIES.includes(input.category) ? input.category : 'อื่นๆ',
      description: clip(input.description, 500),
      product_name: clip(input.product_name, 120),
      price: Number(input.price) > 0 ? Number(input.price) : null,
      stock: (input.stock === '' || input.stock == null) ? null : Math.max(0, parseInt(input.stock, 10) || 0),
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    if (!rec.company || !rec.contact_name || !isEmail(rec.email)) {
      return { ok: false, error: 'กรอกชื่อบริษัท ชื่อผู้ติดต่อ และอีเมลให้ถูกต้อง' };
    }
    if (useSB) {
      try {
        await sbReq('POST', '/producers', { body: [rec], params: { on_conflict: 'email' }, prefer: 'resolution=merge-duplicates,return=minimal' });
        return { ok: true, status: rec.status };
      } catch (e) { console.warn('[producers] Supabase write failed, using file:', e.message); }
    }
    const existed = !!store[rec.email];
    store[rec.email] = { ...(store[rec.email] || {}), ...rec, created_at: store[rec.email]?.created_at || rec.created_at };
    saveFile();
    return { ok: true, status: rec.status, duplicate: existed };
  }

  async function all() {
    if (useSB) {
      try { const rows = await sbReq('GET', '/producers', { params: { select: '*', order: 'created_at.desc', limit: '1000' } }); return rows || []; }
      catch (e) { console.warn('[producers] Supabase read failed, using file:', e.message); }
    }
    return Object.values(store).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  function toPublicProduct(p) {
    if (p?.status !== 'approved' || !p?.product_name) return null;
    return {
      producer: p.company,
      product_name: p.product_name,
      price: p.price,
      category: p.category,
      description: p.description,
      stock: (p.stock == null ? null : p.stock),
    };
  }

  // อัปเดตสถานะผู้ผลิต (admin อนุมัติ/ปฏิเสธ)
  async function setStatus(email, status) {
    const e = (email || '').toString().trim().toLowerCase();
    const ok = ['pending', 'approved', 'rejected', 'suspended'];
    if (!ok.includes(status)) return { ok: false, error: 'invalid status' };
    if (useSB) {
      try {
        await sbReq('PATCH', '/producers', { body: { status }, params: { email: `eq.${e}` }, prefer: 'return=minimal' });
        return { ok: true, email: e, status };
      } catch (err) { console.warn('[producers] Supabase patch failed, using file:', err.message); }
    }
    if (!store[e]) return { ok: false, error: 'not found' };
    store[e].status = status; saveFile();
    return { ok: true, email: e, status };
  }

  // catalog สาธารณะ — เฉพาะผู้ผลิตที่อนุมัติแล้ว + มีสินค้า
  async function catalog() {
    const list = await all();
    return list
      .map(toPublicProduct)
      .filter(Boolean);
  }

  async function summary() {
    const list = await all();
    const byStatus = {}; const byCategory = {};
    for (const p of list) {
      byStatus[p.status || 'pending'] = (byStatus[p.status || 'pending'] || 0) + 1;
      byCategory[p.category || 'อื่นๆ'] = (byCategory[p.category || 'อื่นๆ'] || 0) + 1;
    }
    return { mode: useSB ? 'supabase' : 'file', total: list.length, byStatus, byCategory, recent: list.slice(0, 10) };
  }

  // ── Routes ──────────────────────────────────────────────────────────────────
  const applyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, error: 'สมัครบ่อยเกินไป กรุณารอแล้วลองใหม่' } });
  const router = express.Router();
  const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error('[producers route]', e.message); res.status(500).json({ success: false, error: 'producer error' }); });

  router.get('/api/producers/categories', (req, res) => res.json({ success: true, categories: CATEGORIES }));

  // catalog สาธารณะ — สินค้าจากผู้ผลิตที่อนุมัติแล้ว
  router.get('/api/catalog', wrap(async (req, res) => {
    res.json({ success: true, products: await catalog() });
  }));

  // ค้นหาผู้ผลิต (เฉพาะที่อนุมัติแล้ว) — q (ชื่อ/สินค้า/รายละเอียด) + category
  router.get('/api/producers/search', wrap(async (req, res) => {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const cat = (req.query.category || '').toString().trim();
    const matched = (await catalog()).filter((p) => {
      if (cat && cat !== 'ทั้งหมด' && p.category !== cat) return false;
      if (!q) return true;
      return [p.producer, p.product_name, p.description, p.category].some((f) => (f || '').toString().toLowerCase().includes(q));
    });
    res.json({ success: true, count: matched.length, producers: matched });
  }));

  router.post('/api/producers/apply', applyLimiter, wrap(async (req, res) => {
    const r = await register(req.body || {});
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, status: r.status, message: 'รับใบสมัครแล้ว ทีมงานจะติดต่อกลับเพื่อยืนยันการเข้าร่วม' });
  }));

  // ลดสต๊อกเมื่อมีออเดอร์ (เฉพาะผู้ผลิตที่ตั้งสต๊อกไว้ — stock != null)
  async function decrementStock(email, qty) {
    const e = (email || '').toString().trim().toLowerCase();
    const n = Math.max(0, parseInt(qty, 10) || 0);
    if (!e || !n) return;
    if (useSB) {
      try {
        const rows = await sbReq('GET', '/producers', { params: { email: `eq.${e}`, select: 'stock', limit: '1' } });
        const cur = rows?.[0]?.stock;
        if (cur != null) await sbReq('PATCH', '/producers', { body: { stock: Math.max(0, cur - n) }, params: { email: `eq.${e}` }, prefer: 'return=minimal' });
        return;
      } catch (err) { console.warn('[producers] stock SB failed, using file:', err.message); }
    }
    if (store[e] && store[e].stock != null) { store[e].stock = Math.max(0, store[e].stock - n); saveFile(); }
  }

  return { router, register, all, summary, setStatus, catalog, decrementStock, CATEGORIES };
}
