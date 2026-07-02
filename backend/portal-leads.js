// ── Portal Leads — captures submissions from the /portals/* landing pages ──────
// Dual-mode: Supabase (REST) เมื่อตั้ง SUPABASE_URL+SERVICE_KEY, ไม่งั้น file JSON
//
// ก่อนหน้านี้ 7 หน้า portal ทั้งหมด (gov-thai, gov-intl, intl-org, foundation,
// creator, affiliate, producer) ยิง POST ไปที่ /api/leads/submit ซึ่ง "ไม่มีอยู่จริง"
// ใน backend — fetch ถูก wrap ด้วย try/catch เปล่าๆ ทำให้ทุกฟอร์มแสดง "สำเร็จ" ทั้งที่
// ข้อมูลหายไปเงียบๆ ไม่เคยถูกบันทึกที่ไหนเลย ไฟล์นี้คือ endpoint ที่ขาดหายไปนั้น
import express from 'express';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ประเภท portal ที่รู้จัก — ยังรับ type อื่นได้ (กันเคส portal ใหม่ในอนาคตที่ลืมเพิ่มที่นี่)
// แต่ log แจ้งเตือนถ้าเจอ type ที่ไม่รู้จัก
const KNOWN_TYPES = ['gov-thai', 'gov-intl', 'intl-org', 'foundation', 'creator', 'affiliate', 'producer'];
const clip = (s, n = 500) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim().slice(0, n) : '');
const isEmailLike = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');

export function createPortalLeads(dataDir, opts = {}) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const useSB = !!(SB_URL && SB_KEY);

  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  const FILE = join(dataDir, 'portal_leads.json');
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
      try { await sbReq('POST', '/portal_leads', { body: [rec], params: { on_conflict: 'id' }, prefer: 'resolution=merge-duplicates,return=minimal' }); return; }
      catch (e) { console.warn('[portal-leads] Supabase write failed, using file:', e.message); }
    }
    store[rec.id] = rec; saveFile();
  }

  async function all() {
    if (useSB) {
      try { const rows = await sbReq('GET', '/portal_leads', { params: { select: '*', order: 'created_at.desc', limit: '2000' } }); return rows || []; }
      catch (e) { console.warn('[portal-leads] Supabase read failed, using file:', e.message); }
    }
    return Object.values(store).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  // รับฟอร์มดิบทั้งก้อนจาก portal ใดก็ได้ — ไม่ตรึง schema ตายตัวเพราะแต่ละ portal มีฟิลด์ต่างกัน
  // (agency/org/foundation name ฯลฯ) ดึง name/email แบบ best-effort ไว้แสดงผล ที่เหลือเก็บใน form_data
  async function submit(input) {
    const type = clip(input.type, 40) || 'unknown';
    const lang = clip(input.lang, 8) || 'th';
    if (!KNOWN_TYPES.includes(type)) console.warn(`[portal-leads] unknown portal type "${type}" — accepted anyway, check portal page list`);

    const { type: _t, lang: _l, ...rest } = input || {};
    const form_data = {};
    for (const [k, v] of Object.entries(rest)) {
      if (typeof v === 'string') form_data[k] = clip(v, 800);
    }
    const name = form_data.name || form_data.agency || form_data.org || form_data.contact || '';
    const email = isEmailLike(form_data.email) ? form_data.email.toLowerCase() : '';

    if (!name && !email) return { ok: false, error: 'กรอกข้อมูลอย่างน้อยชื่อหรืออีเมลให้ครบ' };

    const rec = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type, lang, name, email, form_data,
      created_at: new Date().toISOString(),
    };
    await persist(rec);
    try { await opts.onNewLead?.(rec); } catch (e) { console.warn('[portal-leads] notify failed:', e.message); }
    return { ok: true, id: rec.id };
  }

  const submitLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, error: 'ส่งฟอร์มบ่อยเกินไป กรุณารอแล้วลองใหม่' } });
  const router = express.Router();
  const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error('[portal-leads route]', e.message); res.status(500).json({ success: false, error: 'submit error' }); });

  // นี่คือ endpoint ที่ 7 หน้า portal เรียกมาตลอดแต่ไม่เคยมีอยู่จริง
  router.post('/api/leads/submit', submitLimiter, wrap(async (req, res) => {
    const r = await submit(req.body || {});
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, id: r.id });
  }));

  return { router, submit, all, KNOWN_TYPES };
}
