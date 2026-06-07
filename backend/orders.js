// ── Orders — ลูกค้าสั่งซื้อสินค้าจากผู้ผลิตในแพลตฟอร์ม ──────────────────────────
// Dual-mode: Supabase (REST) เมื่อตั้ง SUPABASE_URL+SERVICE_KEY, ไม่งั้น file JSON
import express from 'express';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ORDER_STATUS = ['new', 'contacted', 'confirmed', 'shipped', 'cancelled'];
const clip = (s, n = 300) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim().slice(0, n) : '');

export function createOrders(dataDir) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const useSB = !!(SB_URL && SB_KEY);

  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  const FILE = join(dataDir, 'orders.json');
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

  async function place(input) {
    const qty = Math.max(1, Math.min(9999, parseInt(input.qty, 10) || 1));
    const price = Number(input.price) > 0 ? Number(input.price) : null;
    const rec = {
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      producer_email: clip(input.producer_email, 120).toLowerCase(),
      product_name: clip(input.product_name, 120),
      customer_name: clip(input.customer_name, 80),
      contact: clip(input.contact, 120),
      qty,
      amount: price ? price * qty : null,
      note: clip(input.note, 400),
      status: 'new',
      created_at: new Date().toISOString(),
    };
    if (!rec.product_name || !rec.customer_name || !rec.contact) {
      return { ok: false, error: 'กรอกสินค้า ชื่อผู้สั่ง และช่องทางติดต่อให้ครบ' };
    }
    if (useSB) {
      try { await sbReq('POST', '/orders', { body: [rec], prefer: 'return=minimal' }); return { ok: true, id: rec.id }; }
      catch (e) { console.warn('[orders] Supabase write failed, using file:', e.message); }
    }
    store[rec.id] = rec; saveFile();
    return { ok: true, id: rec.id };
  }

  async function all() {
    if (useSB) {
      try { const rows = await sbReq('GET', '/orders', { params: { select: '*', order: 'created_at.desc', limit: '1000' } }); return rows || []; }
      catch (e) { console.warn('[orders] Supabase read failed, using file:', e.message); }
    }
    return Object.values(store).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  async function setStatus(id, status) {
    if (!ORDER_STATUS.includes(status)) return { ok: false, error: 'invalid status' };
    if (useSB) {
      try { await sbReq('PATCH', '/orders', { body: { status }, params: { id: `eq.${id}` }, prefer: 'return=minimal' }); return { ok: true, id, status }; }
      catch (e) { console.warn('[orders] Supabase patch failed, using file:', e.message); }
    }
    if (!store[id]) return { ok: false, error: 'not found' };
    store[id].status = status; saveFile();
    return { ok: true, id, status };
  }

  async function summary() {
    const list = await all();
    const byStatus = {};
    let revenue = 0;
    for (const o of list) {
      byStatus[o.status || 'new'] = (byStatus[o.status || 'new'] || 0) + 1;
      if (o.status !== 'cancelled') revenue += Number(o.amount) || 0;
    }
    return { mode: useSB ? 'supabase' : 'file', total: list.length, byStatus, revenue, recent: list.slice(0, 20) };
  }

  const orderLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, message: { success: false, error: 'สั่งซื้อบ่อยเกินไป กรุณารอแล้วลองใหม่' } });
  const router = express.Router();
  const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error('[orders route]', e.message); res.status(500).json({ success: false, error: 'order error' }); });

  router.post('/api/orders', orderLimiter, wrap(async (req, res) => {
    const r = await place(req.body || {});
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, id: r.id, message: 'รับคำสั่งซื้อแล้ว ผู้ผลิตจะติดต่อกลับเพื่อยืนยันและจัดส่ง' });
  }));

  return { router, place, all, setStatus, summary, ORDER_STATUS };
}
