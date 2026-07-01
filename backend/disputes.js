// ── Order Disputes — เปิดข้อพิพาท + AI-assist arbitration + ปล่อย/คืนเงินประกัน (escrow) ──
// Dual-mode: Supabase (REST) เมื่อตั้ง SUPABASE_URL+SERVICE_KEY, ไม่งั้น file JSON
// หมายเหตุ: ระบบนี้ไม่ได้โอนเงินจริงอัตโนมัติ (ไม่มี payment gateway ที่รองรับ transfer/payout อยู่)
// "released/refunded" คือการปรับสถานะบัญชี (ledger) ให้ทีมงานไปดำเนินการจ่ายจริงต่อ เช่นเดียวกับ affiliate payouts
// การตัดสินเป็นหน้าที่ของ admin เสมอ — AI เป็นแค่ผู้ช่วยเสนอความเห็น (aiSuggest) ไม่ auto-resolve
import express from 'express';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DISPUTE_STATUS = ['open', 'ai_reviewed', 'resolved_supplier', 'resolved_buyer', 'refunded'];
const DECISIONS = ['favor_supplier', 'favor_buyer', 'refund', 'split'];
const clip = (s, n = 800) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim().slice(0, n) : '');

export function createDisputes(dataDir, opts = {}) {
  const { orders, callAI, parseAIJson, notify } = opts;
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const useSB = !!(SB_URL && SB_KEY);

  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  const FILE = join(dataDir, 'disputes.json');
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

  async function persist(rec) {
    if (useSB) {
      try { await sbReq('POST', '/order_disputes', { body: [rec], params: { on_conflict: 'id' }, prefer: 'resolution=merge-duplicates,return=minimal' }); return; }
      catch (e) { console.warn('[disputes] Supabase write failed, using file:', e.message); }
    }
    store[rec.id] = rec; saveFile();
  }

  async function getOne(id) {
    if (useSB) {
      try { const rows = await sbReq('GET', '/order_disputes', { params: { id: `eq.${id}`, select: '*', limit: '1' } }); if (Array.isArray(rows) && rows[0]) return rows[0]; }
      catch (e) { console.warn('[disputes] Supabase read failed, using file:', e.message); }
    }
    return store[id] || null;
  }

  async function all() {
    if (useSB) {
      try { const rows = await sbReq('GET', '/order_disputes', { params: { select: '*', order: 'created_at.desc', limit: '1000' } }); return rows || []; }
      catch (e) { console.warn('[disputes] Supabase read failed, using file:', e.message); }
    }
    return Object.values(store).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  async function byOrder(order_id) {
    return (await all()).filter((d) => d.order_id === order_id);
  }

  const hist = (status, note) => ({ status, at: new Date().toISOString(), note: note || '' });

  // เปิดข้อพิพาท — ต้องระบุ order_id + contact ที่ตรงกับผู้ซื้อ (order.contact) หรือผู้ผลิต (order.producer_email)
  async function open(input) {
    const order_id = clip(input.order_id, 80);
    const opened_by = ['buyer', 'producer'].includes(input.opened_by) ? input.opened_by : null;
    const contact = clip(input.contact, 120).toLowerCase();
    const reason = clip(input.reason, 500);
    const evidence = clip(input.evidence, 800);
    if (!order_id || !opened_by || !contact || !reason) {
      return { ok: false, error: 'กรอกเลขคำสั่งซื้อ ฝ่ายที่เปิดข้อพิพาท ช่องทางติดต่อ และเหตุผลให้ครบ' };
    }
    if (!orders) return { ok: false, error: 'orders module not wired' };
    const order = await orders.getOne(order_id);
    if (!order) return { ok: false, error: 'ไม่พบคำสั่งซื้อนี้' };
    const matches = opened_by === 'buyer'
      ? (order.contact || '').toLowerCase() === contact
      : (order.producer_email || '').toLowerCase() === contact;
    if (!matches) return { ok: false, error: 'ช่องทางติดต่อไม่ตรงกับคำสั่งซื้อนี้' };
    const existingOpen = (await byOrder(order_id)).find((d) => d.status === 'open' || d.status === 'ai_reviewed');
    if (existingOpen) return { ok: false, error: 'คำสั่งซื้อนี้มีข้อพิพาทที่ยังไม่ปิดอยู่แล้ว', id: existingOpen.id };

    const rec = {
      id: `dsp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      order_id,
      opened_by,
      opener_contact: contact,
      reason,
      evidence,
      status: 'open',
      ai_suggestion: null,
      counter_response: null,
      resolution: null,
      history: [hist('open', reason)],
      created_at: new Date().toISOString(),
    };
    await persist(rec);
    try { await orders.setEscrowStatus(order_id, 'held', `dispute ${rec.id} opened`); } catch (_) { /* ignore */ }
    try { await notify?.opened?.(rec, order); } catch (e) { console.warn('[disputes] notify open failed:', e.message); }
    return { ok: true, id: rec.id };
  }

  // ฝ่ายตรงข้าม (ที่ไม่ได้เป็นคนเปิด) ตอบโต้ด้วยหลักฐาน/คำชี้แจงของตัวเอง ก่อน admin ตัดสิน
  // ให้ความเป็นธรรมกับทั้งสองฝ่าย — admin เห็นทั้งสองด้านก่อนตัดสินใจเสมอ
  async function respond(id, input) {
    const contact = clip(input.contact, 120).toLowerCase();
    const note = clip(input.note, 800);
    const evidence = clip(input.evidence, 800);
    if (!contact || !note) return { ok: false, error: 'กรอกช่องทางติดต่อและคำชี้แจงให้ครบ' };
    const d = await getOne(id);
    if (!d) return { ok: false, error: 'not found' };
    if (d.status !== 'open' && d.status !== 'ai_reviewed') return { ok: false, error: 'ข้อพิพาทนี้ปิดไปแล้ว ไม่รับคำตอบเพิ่ม' };
    if (!orders) return { ok: false, error: 'orders module not wired' };
    const order = await orders.getOne(d.order_id);
    if (!order) return { ok: false, error: 'ไม่พบคำสั่งซื้อนี้' };
    // ผู้ตอบต้องเป็น "อีกฝ่าย" ที่ไม่ใช่คนเปิดข้อพิพาท
    const otherPartyContact = (d.opened_by === 'buyer' ? order.producer_email : order.contact || '').toLowerCase();
    if (!otherPartyContact || otherPartyContact !== contact) {
      return { ok: false, error: 'ช่องทางติดต่อไม่ตรงกับอีกฝ่ายของคำสั่งซื้อนี้' };
    }
    d.counter_response = { note, evidence, responded_at: new Date().toISOString() };
    d.history = [...(d.history || []), hist(d.status, `counter-response: ${note}`)];
    await persist(d);
    try { await notify?.responded?.(d, order); } catch (e) { console.warn('[disputes] notify respond failed:', e.message); }
    return { ok: true, id };
  }

  // ตรวจสถานะสาธารณะ — ทั้งสองฝ่ายเช็คได้ (ต้องระบุ contact ของตัวเองให้ตรง เหมือน orders.track)
  async function track(id, contact) {
    const d = await getOne(id);
    if (!d) return { ok: false, error: 'ไม่พบข้อพิพาทนี้' };
    const c = (contact || '').toString().trim().toLowerCase();
    const order = orders ? await orders.getOne(d.order_id) : null;
    const otherPartyContact = order ? (d.opened_by === 'buyer' ? order.producer_email : order.contact || '').toLowerCase() : '';
    if (!c || (c !== d.opener_contact && c !== otherPartyContact)) {
      return { ok: false, error: 'ช่องทางติดต่อไม่ตรงกับข้อพิพาทนี้' };
    }
    return {
      ok: true,
      dispute: {
        id: d.id, order_id: d.order_id, opened_by: d.opened_by, reason: d.reason, status: d.status,
        ai_suggestion: d.ai_suggestion, counter_response: d.counter_response, resolution: d.resolution,
        created_at: d.created_at,
      },
    };
  }

  // AI-assist — เสนอความเห็นให้ admin พิจารณา (ไม่ auto-resolve เงินจริง)
  async function aiSuggest(id) {
    const d = await getOne(id);
    if (!d) return { ok: false, error: 'not found' };
    if (!orders || !callAI || !parseAIJson) return { ok: false, error: 'AI helper not wired' };
    const order = await orders.getOne(d.order_id);

    const prompt = `คุณเป็นผู้ช่วยประเมินข้อพิพาทคำสั่งซื้อ (escrow arbitration assistant) ที่เป็นกลาง หน้าที่ของคุณคือ "เสนอความเห็น" ให้แอดมินมนุษย์ตัดสินใจ ไม่ใช่ตัดสินเอง

รายละเอียดคำสั่งซื้อ: สินค้า "${order?.product_name || '-'}" จำนวน ${order?.qty || '-'} มูลค่า ${order?.amount ?? '-'} บาท สถานะจัดส่ง: ${order?.status || '-'}
ฝ่ายที่เปิดข้อพิพาท: ${d.opened_by === 'buyer' ? 'ผู้ซื้อ' : 'ผู้ผลิต'}
เหตุผล: "${d.reason}"
หลักฐานที่แนบมา: "${d.evidence || '(ไม่มี)'}"

ตอบกลับ JSON เท่านั้น:
{
  "recommendation": "favor_supplier | favor_buyer | refund | split | need_more_info",
  "confidence": 0.0,
  "reasoning": "เหตุผลสั้นๆ อ้างอิงข้อเท็จจริงที่มี ไม่ใช่การเดา",
  "missing_evidence": ["สิ่งที่ควรขอเพิ่มเติมก่อนตัดสินใจจริง ถ้ามี"]
}`;

    try {
      const text = await callAI(prompt, 800);
      const suggestion = parseAIJson(text);
      d.ai_suggestion = { ...suggestion, generated_at: new Date().toISOString(), source: 'ai' };
      d.status = 'ai_reviewed';
      d.history = [...(d.history || []), hist('ai_reviewed', suggestion?.recommendation)];
      await persist(d);
      return { ok: true, id, ai_suggestion: d.ai_suggestion };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // admin ตัดสินจริง — ปรับ escrow ของ order ตามคำตัดสิน แล้วปิดข้อพิพาท
  async function resolve(id, { decision, note, resolved_by }) {
    if (!DECISIONS.includes(decision)) return { ok: false, error: 'invalid decision' };
    const d = await getOne(id);
    if (!d) return { ok: false, error: 'not found' };
    if (d.status === 'resolved_supplier' || d.status === 'resolved_buyer' || d.status === 'refunded') {
      return { ok: false, error: 'ข้อพิพาทนี้ปิดไปแล้ว' };
    }
    const escrowNext = (decision === 'favor_supplier' || decision === 'split') ? 'released' : 'refunded';
    const statusNext = decision === 'favor_supplier' ? 'resolved_supplier' : decision === 'favor_buyer' ? 'resolved_buyer' : decision === 'refund' ? 'refunded' : 'resolved_supplier';
    if (orders) { try { await orders.setEscrowStatus(d.order_id, escrowNext, `dispute ${id} resolved: ${decision}`); } catch (_) { /* ignore */ } }

    d.status = statusNext;
    d.resolution = { decision, note: clip(note, 500), resolved_by: clip(resolved_by, 80), resolved_at: new Date().toISOString() };
    d.history = [...(d.history || []), hist(statusNext, note)];
    await persist(d);
    try {
      const order = orders ? await orders.getOne(d.order_id) : null;
      await notify?.resolved?.(d, order);
    } catch (e) { console.warn('[disputes] notify resolve failed:', e.message); }
    return { ok: true, id, status: d.status, escrow_status: escrowNext };
  }

  // สรุปภาพรวม — ใช้ทั้งหน้า admin และเป็น "monitoring" endpoint (คำนวณสดจาก DB ทุกครั้ง
  // แทนตัวนับ in-memory แบบ Prometheus ปกติ ซึ่งใช้ไม่ได้จริงบน Vercel serverless เพราะแต่ละ
  // invocation เป็นโปรเซสแยก ตัวนับจะรีเซ็ต/ไม่ sync ข้าม instance)
  const SLA_HOURS = 48; // เกินนี้แล้วยังไม่ตัดสิน = overdue ต้องรีบดูก่อนเงินค้าง escrow นานเกินไป
  async function summary() {
    const list = await all();
    const byStatus = {};
    let disputeRate5 = 0;
    const now = Date.now();
    const overdue = [];
    for (const d of list) {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      if (now - new Date(d.created_at).getTime() < 5 * 60 * 1000) disputeRate5++;
      const openStatuses = d.status === 'open' || d.status === 'ai_reviewed';
      const ageHours = (now - new Date(d.created_at).getTime()) / 3600000;
      if (openStatuses && ageHours > SLA_HOURS) overdue.push({ id: d.id, order_id: d.order_id, age_hours: Math.round(ageHours) });
    }
    const orderList = orders ? await orders.all() : [];
    let heldAmount = 0, releasedAmount = 0, refundedAmount = 0;
    for (const o of orderList) {
      const amt = Number(o.amount) || 0;
      if (o.escrow_status === 'held') heldAmount += amt;
      else if (o.escrow_status === 'released') releasedAmount += amt;
      else if (o.escrow_status === 'refunded') refundedAmount += amt;
    }
    return {
      mode: useSB ? 'supabase' : 'file',
      total: list.length,
      byStatus,
      open_count: (byStatus.open || 0) + (byStatus.ai_reviewed || 0),
      dispute_rate_5m: disputeRate5,
      overdue_count: overdue.length,
      overdue,
      sla_hours: SLA_HOURS,
      escrow: { held: heldAmount, released: releasedAmount, refunded: refundedAmount },
      recent: list.slice(0, 20),
    };
  }

  const openLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, error: 'เปิดข้อพิพาทบ่อยเกินไป กรุณารอแล้วลองใหม่' } });
  const trackLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
  const router = express.Router();
  const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error('[disputes route]', e.message); res.status(500).json({ success: false, error: 'dispute error' }); });

  // เปิดข้อพิพาท (สาธารณะ — ตรวจ contact ให้ตรงกับ order ก่อนเปิด)
  router.post('/api/disputes', openLimiter, wrap(async (req, res) => {
    const r = await open(req.body || {});
    if (!r.ok) return res.status(400).json({ success: false, error: r.error, id: r.id });
    res.json({ success: true, id: r.id, message: 'เปิดข้อพิพาทแล้ว เงินประกันของออเดอร์นี้ถูกพักไว้ระหว่างพิจารณา ทีมงานจะติดต่อกลับ' });
  }));

  // อีกฝ่ายตอบโต้ด้วยหลักฐาน/คำชี้แจงของตัวเอง (สาธารณะ — ตรวจ contact ก่อนรับ)
  router.post('/api/disputes/:id/respond', openLimiter, wrap(async (req, res) => {
    const r = await respond(req.params.id, req.body || {});
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, id: r.id, message: 'บันทึกคำชี้แจงแล้ว ทีมงานจะพิจารณาทั้งสองฝ่ายก่อนตัดสิน' });
  }));

  // ตรวจสถานะข้อพิพาท (สาธารณะ — ทั้งสองฝ่ายเช็คได้ ต้องระบุ contact ให้ตรง)
  router.get('/api/disputes/:id/track', trackLimiter, wrap(async (req, res) => {
    const r = await track(req.params.id, req.query.contact);
    if (!r.ok) return res.status(404).json({ success: false, error: r.error });
    res.json({ success: true, ...r });
  }));

  return { router, open, respond, track, all, getOne, byOrder, aiSuggest, resolve, summary, DISPUTE_STATUS, DECISIONS };
}
