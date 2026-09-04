// ── Orders — สั่งซื้อ + ติดตามสถานะจัดส่ง (สต๊อก→แพ็ค→ส่ง→ถึงปลายทาง→เซ็นรับ) ──
// Dual-mode: Supabase (REST) เมื่อตั้ง SUPABASE_URL+SERVICE_KEY, ไม่งั้น file JSON
import express from 'express';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// new → confirmed → packed → shipped → out_for_delivery → delivered (/ cancelled)
const ORDER_STATUS = ['new', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const ESCROW_STATUS = ['none', 'held', 'released', 'refunded'];
const clip = (s, n = 300) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim().slice(0, n) : '');
const lookupError = (status, code, error) => ({ ok: false, status, code, error });

function publicOrder(order) {
  return {
    id: order.id,
    product_name: order.product_name,
    qty: order.qty,
    amount: order.amount,
    status: order.status,
    tracking_no: order.tracking_no,
    carrier: order.carrier,
    delivered_at: order.delivered_at,
    received_by: order.received_by,
    drop_off: order.drop_off,
    history: order.history || [],
    created_at: order.created_at,
  };
}

export function createOrders(dataDir, opts = {}) {
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
    const headers = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };
    if (prefer) headers.Prefer = prefer;
    const res = await fetch(url.toString(), { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && (data.message || data.hint)) || `Supabase HTTP ${res.status}`);
    return data;
  }

  // เขียนทับทั้ง record (upsert by id) — รองรับฟิลด์ shipping ทั้งหมด
  async function persist(rec) {
    if (useSB) {
      try {
        await sbReq('POST', '/orders', { body: [rec], params: { on_conflict: 'id' }, prefer: 'resolution=merge-duplicates,return=minimal' });
        return;
      } catch (e) {
        console.warn('[orders] Supabase write failed, using file:', e.message);
      }
    }
    store[rec.id] = rec;
    saveFile();
  }

  async function getOne(id) {
    if (useSB) {
      try {
        const rows = await sbReq('GET', '/orders', { params: { id: `eq.${id}`, select: '*', limit: '1' } });
        if (Array.isArray(rows) && rows[0]) return rows[0];
      } catch (e) {
        console.warn('[orders] Supabase read failed, using file:', e.message);
      }
    }
    return store[id] || null;
  }

  const hist = (status, note) => ({ status, at: new Date().toISOString(), note: note || '' });

  async function place(input) {
    const qty = Math.max(1, Math.min(9999, parseInt(input.qty, 10) || 1));
    const price = Number(input.price) > 0 ? Number(input.price) : null;
    const now = new Date().toISOString();
    const rec = {
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      producer: clip(input.producer, 120),
      producer_email: clip(input.producer_email, 120).toLowerCase(),
      product_name: clip(input.product_name, 120),
      customer_name: clip(input.customer_name, 80),
      contact: clip(input.contact, 120),
      address: clip(input.address, 400),
      qty,
      amount: price ? price * qty : null,
      note: clip(input.note, 400),
      status: 'new',
      escrow_status: 'none',
      tracking_no: '', carrier: '', delivered_at: '', received_by: '', drop_off: '', proof_note: '',
      history: [hist('new')],
      created_at: now,
    };
    if (!rec.product_name || !rec.customer_name || !rec.contact) {
      return { ok: false, error: 'กรอกสินค้า ชื่อผู้สั่ง และช่องทางติดต่อให้ครบ' };
    }
    await persist(rec);
    try { await opts.onNewOrder?.(rec); } catch (e) { console.warn('[orders] notify failed:', e.message); }
    return { ok: true, id: rec.id };
  }

  async function resolveCatalogProduct(input) {
    const producer = clip(input.producer, 120);
    const product_name = clip(input.product_name, 120);
    if (!producer || !product_name) return lookupError(400, 'MALFORMED_REQUEST', 'ระบุชื่อร้านและชื่อสินค้าให้ครบ');
    if (typeof opts.listProducers !== 'function') return lookupError(503, 'LOOKUP_UNAVAILABLE', 'ระบบค้นหาสินค้าไม่พร้อมใช้งาน');

    let list;
    try {
      list = await opts.listProducers();
    } catch (e) {
      console.warn('[orders] product lookup failed:', e.message);
      return lookupError(503, 'LOOKUP_UNAVAILABLE', 'ระบบค้นหาสินค้าไม่พร้อมใช้งาน');
    }
    if (!Array.isArray(list)) return lookupError(503, 'LOOKUP_UNAVAILABLE', 'ระบบค้นหาสินค้าไม่พร้อมใช้งาน');

    const matched = list.filter((p) => (
      p?.status === 'approved'
      && clip(p.company, 120) === producer
      && clip(p.product_name, 120) === product_name
    ));

    if (matched.length === 0) return lookupError(404, 'PRODUCT_NOT_FOUND', 'ไม่พบสินค้าที่เลือก');
    if (matched.length > 1) return lookupError(409, 'AMBIGUOUS_PRODUCT', 'พบสินค้านี้มากกว่าหนึ่งรายการ');

    const producer_email = clip(matched[0]?.email, 120).toLowerCase();
    if (!producer_email) return lookupError(400, 'MALFORMED_REQUEST', 'ข้อมูลสินค้าไม่ครบ');

    return {
      ok: true,
      producer,
      product_name,
      producer_email,
      price: Number(matched[0]?.price) > 0 ? Number(matched[0].price) : null,
    };
  }

  async function all() {
    if (useSB) {
      try {
        const rows = await sbReq('GET', '/orders', { params: { select: '*', order: 'created_at.desc', limit: '1000' } });
        return rows || [];
      } catch (e) {
        console.warn('[orders] Supabase read failed, using file:', e.message);
      }
    }
    return Object.values(store).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  async function setStatus(id, status, note) {
    if (!ORDER_STATUS.includes(status)) return { ok: false, error: 'invalid status' };
    const o = await getOne(id);
    if (!o) return { ok: false, error: 'not found' };
    o.status = status;
    o.history = [...(o.history || []), hist(status, note)];
    await persist(o);
    return { ok: true, id, status };
  }

  // อัปเดตการจัดส่ง (เลขพัสดุ + ขนส่ง) → สถานะ shipped
  async function ship(id, { tracking_no, carrier, status }) {
    const o = await getOne(id);
    if (!o) return { ok: false, error: 'not found' };
    o.tracking_no = clip(tracking_no, 80);
    o.carrier = clip(carrier, 60);
    o.status = ORDER_STATUS.includes(status) ? status : 'shipped';
    o.history = [...(o.history || []), hist(o.status, `${o.carrier || ''} ${o.tracking_no || ''}`.trim())];
    await persist(o);
    return { ok: true, id, status: o.status, tracking_no: o.tracking_no, carrier: o.carrier };
  }

  // ยืนยันถึงปลายทาง + หลักฐาน (เซ็นรับ received_by หรือ จุดฝากพัสดุ drop_off)
  async function deliver(id, { received_by, drop_off, proof_note }) {
    const o = await getOne(id);
    if (!o) return { ok: false, error: 'not found' };
    o.status = 'delivered';
    o.delivered_at = new Date().toISOString();
    o.received_by = clip(received_by, 80);
    o.drop_off = clip(drop_off, 120);
    o.proof_note = clip(proof_note, 200);
    const proof = o.received_by ? `เซ็นรับโดย ${o.received_by}` : o.drop_off ? `ฝากไว้ที่ ${o.drop_off}` : 'จัดส่งสำเร็จ';
    o.history = [...(o.history || []), hist('delivered', proof)];
    await persist(o);
    return { ok: true, id, delivered_at: o.delivered_at };
  }

  // ปรับสถานะเงินประกัน (escrow) — ใช้โดย disputes.js ตอนเปิด/ปิดข้อพิพาท หรือ admin ปล่อยเงินตรงๆ
  async function setEscrowStatus(id, escrow_status, note) {
    if (!ESCROW_STATUS.includes(escrow_status)) return { ok: false, error: 'invalid escrow_status' };
    const o = await getOne(id);
    if (!o) return { ok: false, error: 'not found' };
    o.escrow_status = escrow_status;
    o.history = [...(o.history || []), hist(o.status, note || `escrow:${escrow_status}`)];
    await persist(o);
    return { ok: true, id, escrow_status };
  }

  // ติดตามสาธารณะ — ต้องระบุ contact ให้ตรง (กันคนอื่นดู)
  async function track(id, contact) {
    const o = await getOne(id);
    if (!o) return { ok: false, error: 'ไม่พบคำสั่งซื้อนี้' };
    const c = (contact || '').toString().trim().toLowerCase();
    if (!c || (o.contact || '').toLowerCase() !== c) return { ok: false, error: 'ช่องทางติดต่อไม่ตรงกับคำสั่งซื้อ' };
    return { ok: true, order: publicOrder(o) };
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
  const trackLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
  const router = express.Router();
  const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error('[orders route]', e.message); res.status(500).json({ success: false, error: 'order error' }); });
  const sendPublicError = (res, r) => res.status(r.status || 400).json({ success: false, code: r.code || 'ORDER_ERROR', error: r.error || 'order error' });

  router.post('/api/orders', orderLimiter, wrap(async (req, res) => {
    const body = req.body || {};
    const producer = clip(body.producer, 120);
    const product_name = clip(body.product_name, 120);
    const customer_name = clip(body.customer_name, 80);
    const contact = clip(body.contact, 120);

    if (!producer || !product_name || !customer_name || !contact) {
      return sendPublicError(res, lookupError(400, 'MALFORMED_REQUEST', 'กรอกชื่อร้าน ชื่อสินค้า ชื่อผู้สั่ง และช่องทางติดต่อให้ครบ'));
    }

    const resolved = await resolveCatalogProduct({ producer, product_name });
    if (!resolved.ok) return sendPublicError(res, resolved);

    const r = await place({
      ...body,
      producer,
      product_name,
      price: resolved.price,
      customer_name,
      contact,
      producer_email: resolved.producer_email,
    });
    if (!r.ok) return sendPublicError(res, lookupError(400, 'MALFORMED_REQUEST', r.error || 'กรอกข้อมูลไม่ครบ'));

    res.json({ success: true, id: r.id, message: 'รับคำสั่งซื้อแล้ว ติดตามสถานะได้ที่หน้า Track ด้วยเลขออเดอร์ + ช่องทางติดต่อ' });
  }));

  // ติดตามสถานะ (สาธารณะ) — /api/orders/track?id=&contact=
  router.get('/api/orders/track', trackLimiter, wrap(async (req, res) => {
    const r = await track(req.query.id, req.query.contact);
    if (!r.ok) return res.status(404).json({ success: false, error: r.error });
    res.json({ success: true, order: r.order });
  }));

  return { router, place, all, getOne, setStatus, setEscrowStatus, ship, deliver, track, summary, ORDER_STATUS, ESCROW_STATUS };
}
