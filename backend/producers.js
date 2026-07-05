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
  // เดิม: ถ้าอีเมลมีอยู่แล้วไม่ว่าสถานะใด จะเขียนทับข้อมูลเดิมทันทีและดันสถานะกลับเป็น 'pending'
  // เสมอ — ไม่มีการยืนยันตัวตนเลย ใครก็ตามที่รู้อีเมลผู้ผลิตที่อนุมัติแล้ว (หาได้จาก
  // /api/producers/search ที่เปิดเผย email ต่อสาธารณะ) สามารถสมัครซ้ำด้วยอีเมลนั้นเพื่อ
  // เขียนทับร้าน/สินค้า/ราคาจริง และดันร้านนั้นหลุดจาก catalog สาธารณะทันที (flagged run 1,
  // แก้ตามการตัดสินใจของเจ้าของโปรเจกต์แล้ว) ตอนนี้: ถ้าอีเมลนั้นเป็นผู้ผลิตที่ approved/suspended
  // อยู่แล้ว ปฏิเสธการสมัครซ้ำแบบเขียนทับ — ผู้ผลิตที่อนุมัติแล้วมีทาง self-serve แก้ไขสินค้า
  // ของตัวเองอยู่แล้วที่ /producers/manage (POST /api/producers/update-listing, ยืนยันด้วย
  // สถานะ approved ที่มีอยู่จริง) ไม่จำเป็นต้องใช้ /apply เขียนทับอีก — pending/rejected ยังคง
  // ให้สมัครซ้ำได้ตามเดิม เพราะยังไม่มี catalog listing จริงให้ hijack
  // /join (ProducerJoinPage.jsx) เป็น flow สมัครผู้ผลิตอีกเส้นที่แยกจาก /portals/producer โดยสิ้นเชิง
  // (คนละหน้า คนละ backend endpoint) — เดิมไม่มี UI ยินยอม PDPA เลยแม้แต่ checkbox เดียว ทั้งที่เก็บ
  // ข้อมูลชุดเดียวกับ /portals/producer (ชื่อบริษัท ผู้ติดต่อ เบอร์ อีเมล) เหมือน run 40 ที่แก้ให้
  // /portals/* ทั้ง 9 หน้าไปแล้ว ตอนนี้บังคับ consent:true เช่นเดียวกันเพื่อให้ทั้งสอง flow สอดคล้องกัน
  async function register(input) {
    if (input?.consent !== true) return { ok: false, error: 'ต้องยินยอมตามนโยบายความเป็นส่วนตัว (PDPA) ก่อนส่งข้อมูล' };
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
      consent: true,
      created_at: new Date().toISOString(),
    };
    if (!rec.company || !rec.contact_name || !isEmail(rec.email)) {
      return { ok: false, error: 'กรอกชื่อบริษัท ชื่อผู้ติดต่อ และอีเมลให้ถูกต้อง' };
    }
    const existingRecord = (await all()).find((p) => (p.email || '').toLowerCase() === rec.email);
    if (existingRecord && ['approved', 'suspended'].includes(existingRecord.status)) {
      return { ok: false, error: 'อีเมลนี้เป็นผู้ผลิตในระบบอยู่แล้ว หากต้องการแก้ไขสินค้าของคุณ ใช้หน้า "จัดการสินค้าของฉัน" (/producers/manage) แทน', already_registered: true };
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

  // แก้ไขข้อมูลสินค้าของผู้ผลิตที่มีอยู่แล้ว (admin เท่านั้น) — เดิมไม่มีทางแก้ไข
  // product_name/price/stock/description ของผู้ผลิตที่อนุมัติแล้วเลย นอกจากให้ผู้ผลิต
  // ส่งใบสมัครซ้ำผ่าน /api/producers/apply ซึ่งจะรีเซ็ต status กลับเป็น 'pending' ทุกครั้ง
  // (หลุดจาก catalog สาธารณะทันที) — ทำให้สต๊อกที่หมดแล้วไม่มีทาง "เติม" กลับได้เลยจริงๆ
  async function updateListing(email, fields) {
    const e = (email || '').toString().trim().toLowerCase();
    if (!isEmail(e)) return { ok: false, error: 'invalid email' };
    const patch = {};
    if (fields.product_name !== undefined) patch.product_name = clip(fields.product_name, 120);
    if (fields.price !== undefined) patch.price = Number(fields.price) > 0 ? Number(fields.price) : null;
    if (fields.stock !== undefined) patch.stock = (fields.stock === '' || fields.stock == null) ? null : Math.max(0, parseInt(fields.stock, 10) || 0);
    if (fields.description !== undefined) patch.description = clip(fields.description, 500);
    if (fields.category !== undefined) patch.category = CATEGORIES.includes(fields.category) ? fields.category : undefined;
    if (Object.keys(patch).length === 0) return { ok: false, error: 'no fields to update' };

    if (useSB) {
      try {
        const rows = await sbReq('GET', '/producers', { params: { email: `eq.${e}`, select: 'email', limit: '1' } });
        if (!rows || rows.length === 0) return { ok: false, error: 'not found' };
        await sbReq('PATCH', '/producers', { body: patch, params: { email: `eq.${e}` }, prefer: 'return=minimal' });
        return { ok: true, email: e, ...patch };
      } catch (err) { console.warn('[producers] update SB failed, using file:', err.message); }
    }
    if (!store[e]) return { ok: false, error: 'not found' };
    store[e] = { ...store[e], ...patch };
    saveFile();
    return { ok: true, email: e, ...patch };
  }

  // เช็คสถานะใบสมัคร + ข้อมูลสินค้าของตัวเอง (ไม่ต้องใช้ admin key — ยืนยันตัวตนด้วยอีเมลที่สมัครไว้
  // เหมือนแพทเทิร์น contact-match ของ disputes.js/orders.js — ไม่ใช่ token/session เพราะระบบนี้ไม่มี login)
  async function myStatus(email) {
    const e = (email || '').toString().trim().toLowerCase();
    if (!isEmail(e)) return { ok: false, error: 'not found' };
    const rec = (await all()).find((p) => (p.email || '').toLowerCase() === e);
    if (!rec) return { ok: false, error: 'not found' };
    return { ok: true, status: rec.status, company: rec.company, category: rec.category, product_name: rec.product_name, price: rec.price, stock: rec.stock, description: rec.description };
  }

  // ผู้ผลิตที่อนุมัติแล้วแก้ไขสินค้าของตัวเองได้เอง (เติมสต๊อก/แก้ราคา/รายละเอียด) โดยไม่ต้องรอแอดมิน —
  // เดิมมีแค่ /api/producers/admin/update (ต้องใช้ admin key) ทำให้ผู้ผลิตที่อนุมัติแล้วไม่มีทาง
  // เติมสต๊อกเองเลยเวลาของหมด ต้องรอแอดมินทำให้ทุกครั้ง — จุดคอขวดที่ค้างมาตั้งแต่การสำรวจครั้งแรก
  async function selfUpdate(email, fields) {
    const e = (email || '').toString().trim().toLowerCase();
    if (!isEmail(e)) return { ok: false, error: 'not found' };
    const rec = (await all()).find((p) => (p.email || '').toLowerCase() === e);
    if (!rec || rec.status !== 'approved') return { ok: false, error: 'not found' };
    return updateListing(e, fields);
  }

  // catalog สาธารณะ — เฉพาะผู้ผลิตที่อนุมัติแล้ว + มีสินค้า
  async function catalog() {
    const list = await all();
    return list
      .filter((p) => p.status === 'approved' && p.product_name)
      .map((p) => ({ producer: p.company, email: p.email, product_name: p.product_name, price: p.price, category: p.category, description: p.description, website: p.website, stock: (p.stock == null ? null : p.stock) }));
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
  const selfServeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, error: 'ทำรายการบ่อยเกินไป กรุณารอแล้วลองใหม่' } });
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
    const list = (await all()).filter((p) => p.status === 'approved');
    const matched = list.filter((p) => {
      if (cat && cat !== 'ทั้งหมด' && p.category !== cat) return false;
      if (!q) return true;
      return [p.company, p.product_name, p.description, p.category].some((f) => (f || '').toString().toLowerCase().includes(q));
    }).map((p) => ({ company: p.company, category: p.category, product_name: p.product_name, price: p.price, description: p.description, website: p.website, email: p.email, stock: (p.stock == null ? null : p.stock) }));
    res.json({ success: true, count: matched.length, producers: matched });
  }));

  router.post('/api/producers/apply', applyLimiter, wrap(async (req, res) => {
    const r = await register(req.body || {});
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, status: r.status, message: 'รับใบสมัครแล้ว ทีมงานจะติดต่อกลับเพื่อยืนยันการเข้าร่วม' });
  }));

  // เช็คสถานะใบสมัคร + ข้อมูลสินค้าของตัวเอง (public — ยืนยันด้วยอีเมลที่สมัครไว้)
  router.get('/api/producers/my-status', selfServeLimiter, wrap(async (req, res) => {
    const r = await myStatus(req.query.email);
    if (!r.ok) return res.status(404).json({ success: false, error: 'ไม่พบใบสมัครด้วยอีเมลนี้' });
    res.json({ success: true, ...r });
  }));

  // ผู้ผลิตที่อนุมัติแล้วแก้ไขสินค้าของตัวเอง (public — ยืนยันด้วยอีเมลที่สมัครไว้, ไม่ใช้ admin key)
  router.post('/api/producers/update-listing', selfServeLimiter, wrap(async (req, res) => {
    const { email, product_name, price, stock, description, category } = req.body || {};
    const r = await selfUpdate(email, { product_name, price, stock, description, category });
    if (!r.ok) return res.status(404).json({ success: false, error: 'ไม่พบผู้ผลิตที่อนุมัติแล้วด้วยอีเมลนี้' });
    res.json({ success: true, ...r });
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

  return { router, register, all, summary, setStatus, updateListing, catalog, decrementStock, CATEGORIES };
}
