// ── Orders — สั่งซื้อ + ติดตามสถานะจัดส่ง (สต๊อก→แพ็ค→ส่ง→ถึงปลายทาง→เซ็นรับ) ──
// Dual-mode: Supabase (REST) เมื่อตั้ง SUPABASE_URL+SERVICE_KEY, ไม่งั้น file JSON
import express from 'express';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// new → confirmed → packed → shipped → out_for_delivery → delivered (/ cancelled)
const ORDER_STATUS = ['new', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const clip = (s, n = 300) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim().slice(0, n) : '');

// Buyer-facing projection of an order for the public /api/orders/track endpoint.
// The internal order carries free-text history notes written for admins/the system:
// the oversold "race" refund note (which embeds the Omise charge id), escrow:* state
// strings, "ชำระเงินสำเร็จ", and whatever an admin typed when cancelling (possibly an
// internal remark not meant for the buyer). None of that belongs in the buyer's public
// timeline — and the details that ARE buyer-facing (carrier / tracking no / delivery
// proof) are already returned as dedicated fields and rendered separately on the Track
// page. So the public history keeps only { status, at } (the progression + when) and
// drops the raw note. Pure + exported for deterministic unit testing.
export function publicOrderView(o) {
  if (!o) return null;
  return {
    id: o.id, product_name: o.product_name, qty: o.qty, amount: o.amount,
    status: o.status, tracking_no: o.tracking_no, carrier: o.carrier,
    delivered_at: o.delivered_at, received_by: o.received_by, drop_off: o.drop_off,
    history: (Array.isArray(o.history) ? o.history : []).map((h) => ({ status: h.status, at: h.at })),
    created_at: o.created_at,
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
    const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
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
      try { await sbReq('POST', '/orders', { body: [rec], params: { on_conflict: 'id' }, prefer: 'resolution=merge-duplicates,return=minimal' }); return; }
      catch (e) { console.warn('[orders] Supabase write failed, using file:', e.message); }
    }
    store[rec.id] = rec; saveFile();
  }

  async function getOne(id) {
    if (useSB) {
      try { const rows = await sbReq('GET', '/orders', { params: { id: `eq.${id}`, select: '*', limit: '1' } }); if (Array.isArray(rows) && rows[0]) return rows[0]; }
      catch (e) { console.warn('[orders] Supabase read failed, using file:', e.message); }
    }
    return store[id] || null;
  }

  const hist = (status, note) => ({ status, at: new Date().toISOString(), note: note || '' });

  async function place(input) {
    const qty = Math.max(1, Math.min(9999, parseInt(input.qty, 10) || 1));
    const producer_email = clip(input.producer_email, 120).toLowerCase();
    const product_name = clip(input.product_name, 120);
    // Price authority: prefer the producer's CURRENT server-side price over whatever the client posted,
    // so a tampered POST or a stale catalog tab can't record — and email a receipt for — the wrong
    // amount (the same "server truth wins" principle the stock guard below already applies). Falls back
    // to the client price when no authoritative price is available (producer lists none / lookup throws),
    // so the first-party store path — which passes its own verified price and has no producer record —
    // keeps recording exactly what it sent.
    let price = Number(input.price) > 0 ? Number(input.price) : null;
    if (typeof opts.getProducerPrice === 'function') {
      try {
        const authoritative = await opts.getProducerPrice(producer_email, product_name);
        if (authoritative != null && Number(authoritative) > 0) price = Number(authoritative);
      } catch (e) { console.warn('[orders] price lookup skipped:', e.message); }
    }
    const now = new Date().toISOString();
    const rec = {
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      producer_email,
      product_name,
      customer_name: clip(input.customer_name, 80),
      contact: clip(input.contact, 120),
      address: clip(input.address, 400),
      qty,
      amount: price ? price * qty : null,
      note: clip(input.note, 400),
      status: 'new',
      escrow_status: 'none', // none → held → released|refunded (จัดการผ่าน disputes.js / setEscrowStatus)
      tracking_no: '', carrier: '', delivered_at: '', received_by: '', drop_off: '', proof_note: '',
      history: [hist('new')],
      created_at: now,
    };
    if (!rec.product_name || !rec.customer_name || !rec.contact) {
      return { ok: false, error: 'กรอกสินค้า ชื่อผู้สั่ง และช่องทางติดต่อให้ครบ' };
    }
    // Server-side stock guard (companion to the CatalogPage "สินค้าหมด" UI): reject an order the
    // producer can't fulfil, so a direct POST — or a stale catalog tab — can't place a doomed order.
    // getProducerStock returns the producer's current stock, or null when they don't track stock
    // (null = always orderable, matching /api/catalog + the digest selector). If the lookup throws,
    // we do NOT block the order — degrade to the prior always-accept behaviour rather than lose a sale.
    if (typeof opts.getProducerStock === 'function') {
      try {
        const stock = await opts.getProducerStock(rec.producer_email, rec.product_name);
        if (stock != null && Number(stock) < qty) {
          return { ok: false, out_of_stock: true, stock: Number(stock),
            error: Number(stock) <= 0 ? 'สินค้าหมด' : `สต๊อกไม่พอ (เหลือ ${Number(stock)} ชิ้น)` };
        }
      } catch (e) { console.warn('[orders] stock guard skipped:', e.message); }
    }
    await persist(rec);
    try { await opts.onNewOrder?.(rec); } catch (e) { console.warn('[orders] notify failed:', e.message); }
    // Return the recorded amount so the caller can confirm the REAL total to the buyer — since place()
    // now records the producer's authoritative price, that total may differ from a stale catalog tab,
    // and the buyer should see the same figure the receipt email shows, not a client-side guess.
    return { ok: true, id: rec.id, amount: rec.amount };
  }

  async function all() {
    if (useSB) {
      try { const rows = await sbReq('GET', '/orders', { params: { select: '*', order: 'created_at.desc', limit: '1000' } }); return rows || []; }
      catch (e) { console.warn('[orders] Supabase read failed, using file:', e.message); }
    }
    return Object.values(store).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  async function setStatus(id, status, note) {
    if (!ORDER_STATUS.includes(status)) return { ok: false, error: 'invalid status' };
    const o = await getOne(id);
    if (!o) return { ok: false, error: 'not found' };
    const prev = o.status;
    o.status = status;
    o.history = [...(o.history || []), hist(status, note)];
    await persist(o);
    // Fire onCancel exactly once, only on the transition INTO 'cancelled' (prev !== 'cancelled'),
    // so stock is restored once per order and re-cancelling an already-cancelled order is a no-op.
    if (status === 'cancelled' && prev !== 'cancelled') {
      try { await opts.onCancel?.(o); } catch (e) { console.warn('[orders] onCancel hook failed:', e.message); }
    }
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
  const ESCROW_STATUS = ['none', 'held', 'released', 'refunded'];
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
    // orders created via place() always carry a non-empty string contact, but a row read back
    // from Supabase could have a null contact column — o.contact.toLowerCase() would then throw
    // (a 500) instead of the clean mismatch below. Guard it like the input side already is.
    if (!c || (o.contact || '').toLowerCase() !== c) return { ok: false, error: 'ช่องทางติดต่อไม่ตรงกับคำสั่งซื้อ' };
    // sanitized buyer-facing view — never leaks internal history notes (charge id / escrow / admin remarks)
    return { ok: true, order: publicOrderView(o) };
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

  router.post('/api/orders', orderLimiter, wrap(async (req, res) => {
    const r = await place(req.body || {});
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, id: r.id, amount: r.amount, message: 'รับคำสั่งซื้อแล้ว ติดตามสถานะได้ที่หน้า Track ด้วยเลขออเดอร์ + ช่องทางติดต่อ' });
  }));

  // ติดตามสถานะ (สาธารณะ) — /api/orders/track?id=&contact=
  router.get('/api/orders/track', trackLimiter, wrap(async (req, res) => {
    const r = await track(req.query.id, req.query.contact);
    if (!r.ok) return res.status(404).json({ success: false, error: r.error });
    res.json({ success: true, ...r });
  }));

  return { router, place, all, getOne, setStatus, setEscrowStatus, ship, deliver, track, summary, ORDER_STATUS, ESCROW_STATUS };
}
