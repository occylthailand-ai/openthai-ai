// ── Matching Engine — จับคู่ B2B / B2C / B2G / B2B2C / C2B / G2G / G2B ──────
// อ่านข้อมูลจาก producers + portal_leads แล้วคำนวณ score เพื่อแนะนำคู่ที่เหมาะสม
// ไม่ต้องการ DB table ใหม่ — ใช้ match_requests.json เก็บคำขอจับคู่
import express from 'express';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const clip = (s, n = 200) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim().slice(0, n) : '');

// กลุ่ม portal ที่ map กับแต่ละประเภท
const B2B_PARTNER_TYPES  = ['middleman', 'creator', 'affiliate'];
const B2C_PARTNER_TYPES  = ['consumer'];
const B2G_PARTNER_TYPES  = ['gov-thai', 'gov-intl', 'intl-org', 'foundation'];
const G2G_THAI_TYPES     = ['gov-thai'];
const G2G_INTL_TYPES     = ['gov-intl', 'intl-org', 'foundation'];

const ALL_VALID_TYPES = ['B2B', 'B2C', 'B2G', 'B2B2C', 'C2B', 'G2G', 'G2B', 'all'];

// หมวดหมู่ที่ "ใกล้เคียงกัน" — ถ้าไม่ตรงแน่นะจะได้คะแนนบางส่วน
const RELATED_CATEGORIES = {
  'อาหาร':       ['เครื่องดื่ม', 'สมุนไพร', 'OTOP', 'เกษตร'],
  'เครื่องดื่ม': ['อาหาร', 'สมุนไพร', 'OTOP'],
  'สมุนไพร':     ['ความงาม', 'อาหาร', 'เกษตร', 'OTOP'],
  'ความงาม':     ['สมุนไพร', 'สิ่งทอ'],
  'สิ่งทอ':      ['เครื่องประดับ', 'ความงาม', 'OTOP'],
  'เครื่องประดับ': ['สิ่งทอ', 'OTOP'],
  'เฟอร์นิเจอร์': ['OTOP'],
  'เกษตร':       ['อาหาร', 'สมุนไพร', 'OTOP', 'อาหารสัตว์เลี้ยง'],
  'OTOP':        ['อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องประดับ', 'เฟอร์นิเจอร์'],
};

function categoryScore(producerCat, leadData) {
  const interests = [
    leadData.category, leadData.business_type,
    leadData.interest, leadData.product_interest,
    leadData.sector,
  ].filter(Boolean).map(s => s.toString().trim());

  if (interests.some(i => i === producerCat)) return 10;
  const related = RELATED_CATEGORIES[producerCat] || [];
  if (interests.some(i => related.includes(i))) return 5;
  if (!interests.length) return 3; // ถ้าไม่มีข้อมูล interest ให้คะแนนพื้นฐาน
  return 0;
}

function regionScore(producerData, leadData) {
  const pRegion = (producerData.region || producerData.country || '').toLowerCase();
  const lRegion = (leadData.region || leadData.country || '').toLowerCase();
  if (!pRegion || !lRegion) return 2;
  if (pRegion === lRegion) return 8;
  if (pRegion.includes('ไทย') || pRegion.includes('thai') || pRegion.includes('thailand')) {
    if (lRegion.includes('ไทย') || lRegion.includes('thai') || lRegion.includes('thailand')) return 8;
  }
  return 1;
}

function buildMatch(producer, lead, matchType) {
  const score = categoryScore(producer.category, lead.form_data) +
                regionScore(producer, lead.form_data) +
                (producer.status === 'approved' ? 5 : 0);
  return {
    producer_email: producer.email,
    producer_name:  producer.company || producer.contact_name,
    producer_category: producer.category,
    producer_product:  producer.product_name,
    lead_id:   lead.id,
    lead_type: lead.type,
    lead_name: lead.name || lead.form_data?.name || '',
    lead_email: lead.email || lead.form_data?.email || '',
    match_type: matchType,
    score,
  };
}

// ── G2G: Thai gov ↔ International gov/org ────────────────────────────────────
function g2gCategoryScore(thaiData, intlData) {
  const fields = d => [d.sector, d.category, d.interest, d.business_type].filter(Boolean).map(s => s.toString().trim());
  const tFields = fields(thaiData);
  const iFields = fields(intlData);
  if (!tFields.length || !iFields.length) return 3;
  if (tFields.some(t => iFields.includes(t))) return 10;
  if (tFields.some(t => (RELATED_CATEGORIES[t] || []).some(r => iFields.includes(r)))) return 5;
  return 1;
}

function buildG2GMatch(thaiLead, intlLead) {
  const tData = thaiLead.form_data || {};
  const iData = intlLead.form_data || {};
  const score = g2gCategoryScore(tData, iData) + 5; // +5 base for cross-border connection
  return {
    producer_email:    thaiLead.email || tData.email || '',
    producer_name:     thaiLead.name  || tData.name  || tData.organization || '',
    producer_category: tData.sector   || tData.category || '',
    producer_product:  '',
    lead_id:    intlLead.id,
    lead_type:  intlLead.type,
    lead_name:  intlLead.name || iData.name || iData.organization || '',
    lead_email: intlLead.email || iData.email || '',
    match_type: 'G2G',
    score,
  };
}

function topMatchesG2G(allLeads, limit) {
  const thaiLeads = allLeads.filter(l => G2G_THAI_TYPES.includes(l.type));
  const intlLeads = allLeads.filter(l => G2G_INTL_TYPES.includes(l.type));
  const all = [];
  for (const thai of thaiLeads) {
    for (const intl of intlLeads) {
      const m = buildG2GMatch(thai, intl);
      if (m.score >= 5) all.push(m);
    }
  }
  return all.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ── B2B2C: Producer → Channel Partner (middleman/creator) → Consumer market ──
function topMatchesB2B2C(approvedProducers, allLeads, limit) {
  const channelLeads  = allLeads.filter(l => B2B_PARTNER_TYPES.includes(l.type));
  const consumerLeads = allLeads.filter(l => B2C_PARTNER_TYPES.includes(l.type));
  const all = [];
  for (const producer of approvedProducers) {
    const consumerDemand = consumerLeads.filter(c => categoryScore(producer.category, c.form_data) > 0).length;
    if (!consumerDemand) continue; // only include if there's end-consumer demand
    for (const channel of channelLeads) {
      const base = buildMatch(producer, channel, 'B2B2C');
      if (base.score < 5) continue;
      const bonus = Math.min(consumerDemand * 2, 6);
      all.push({ ...base, score: base.score + bonus, consumer_count: consumerDemand });
    }
  }
  return all.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function createMatching(dataDir, { getProducers, getLeads, requireAuth }) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const useSB  = !!(SB_URL && SB_KEY);

  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  const FILE = join(dataDir, 'match_requests.json');
  let requests = {};
  try { if (existsSync(FILE)) requests = JSON.parse(readFileSync(FILE, 'utf8')); } catch { requests = {}; }
  const save = () => { try { writeFileSync(FILE, JSON.stringify(requests, null, 2)); } catch { /* ignore */ } };

  async function sbReq(method, path, { body, params, prefer } = {}) {
    const url = new URL(`${SB_URL}/rest/v1${path}`);
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
    if (prefer) headers.Prefer = prefer;
    const res = await fetch(url.toString(), { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data?.message || data?.hint) || `Supabase HTTP ${res.status}`);
    return data;
  }

  // คำนวณ match suggestions สำหรับ producer คนหนึ่ง
  async function suggestForProducer(producerEmail, matchType = 'all', limit = 10) {
    const [allProducers, allLeads] = await Promise.all([getProducers(), getLeads()]);
    const producer = allProducers.find(p => p.email === producerEmail);
    if (!producer) return { ok: false, error: 'ไม่พบผู้ผลิตนี้' };

    let targetTypes;
    if (matchType === 'B2B') targetTypes = B2B_PARTNER_TYPES;
    else if (matchType === 'B2C') targetTypes = B2C_PARTNER_TYPES;
    else if (matchType === 'B2G') targetTypes = B2G_PARTNER_TYPES;
    else targetTypes = [...B2B_PARTNER_TYPES, ...B2C_PARTNER_TYPES, ...B2G_PARTNER_TYPES];

    const candidates = allLeads.filter(l => targetTypes.includes(l.type));
    const matches = candidates
      .map(lead => {
        const mt = B2B_PARTNER_TYPES.includes(lead.type) ? 'B2B'
                 : B2C_PARTNER_TYPES.includes(lead.type) ? 'B2C' : 'B2G';
        return buildMatch(producer, lead, mt);
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { ok: true, producer_email: producerEmail, matches };
  }

  // ดึง top matches ทั้งระบบ (admin / dashboard)
  async function topMatches(matchType = 'all', limit = 50) {
    const [allProducers, allLeads] = await Promise.all([getProducers(), getLeads()]);
    const approvedProducers = allProducers.filter(p => p.status === 'approved');

    // Types that need special handling
    if (matchType === 'G2G') return topMatchesG2G(allLeads, limit);
    if (matchType === 'B2B2C') return topMatchesB2B2C(approvedProducers, allLeads, limit);

    // Producer ↔ Lead types (B2B, B2C, B2G, C2B, G2B, all)
    let targetTypes;
    let mtOverride = null;
    if (matchType === 'B2B') targetTypes = B2B_PARTNER_TYPES;
    else if (matchType === 'B2C') targetTypes = B2C_PARTNER_TYPES;
    else if (matchType === 'B2G') targetTypes = B2G_PARTNER_TYPES;
    else if (matchType === 'C2B') { targetTypes = B2C_PARTNER_TYPES; mtOverride = 'C2B'; }
    else if (matchType === 'G2B') { targetTypes = B2G_PARTNER_TYPES; mtOverride = 'G2B'; }
    else targetTypes = [...B2B_PARTNER_TYPES, ...B2C_PARTNER_TYPES, ...B2G_PARTNER_TYPES];

    const candidates = allLeads.filter(l => targetTypes.includes(l.type));
    const all = [];
    for (const producer of approvedProducers) {
      for (const lead of candidates) {
        const mt = mtOverride || (
          B2B_PARTNER_TYPES.includes(lead.type) ? 'B2B'
          : B2C_PARTNER_TYPES.includes(lead.type) ? 'B2C' : 'B2G'
        );
        const m = buildMatch(producer, lead, mt);
        if (m.score >= 5) all.push(m);
      }
    }

    // For 'all', mix in G2G and B2B2C results
    if (matchType === 'all') {
      const slice = Math.ceil(limit / 5);
      all.push(...topMatchesG2G(allLeads, slice));
      all.push(...topMatchesB2B2C(approvedProducers, allLeads, slice));
    }

    return all.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  // สรุปจำนวน matches แยกประเภท
  async function summary() {
    const [allProducers, allLeads] = await Promise.all([getProducers(), getLeads()]);
    const approved = allProducers.filter(p => p.status === 'approved').length;
    let totalRequests = Object.keys(requests).length;
    if (useSB) {
      try {
        const rows = await sbReq('GET', '/match_requests', { params: { select: 'id', limit: '1' } });
        // Supabase returns the count via Content-Range header; rows array gives us actual data
        // Use allRequests() length for accuracy
        const all = await sbReq('GET', '/match_requests', { params: { select: 'id', limit: '10000' } });
        totalRequests = (all || []).length;
      } catch { /* fallback to local */ }
    }
    return {
      approved_producers: approved,
      b2b_leads:   allLeads.filter(l => B2B_PARTNER_TYPES.includes(l.type)).length,
      b2c_leads:   allLeads.filter(l => B2C_PARTNER_TYPES.includes(l.type)).length,
      b2g_leads:   allLeads.filter(l => B2G_PARTNER_TYPES.includes(l.type)).length,
      g2g_thai:    allLeads.filter(l => G2G_THAI_TYPES.includes(l.type)).length,
      g2g_intl:    allLeads.filter(l => G2G_INTL_TYPES.includes(l.type)).length,
      total_requests: totalRequests,
    };
  }

  // บันทึกคำขอจับคู่ (producer แสดงความสนใจ lead)
  async function requestMatch(producerEmail, leadId, note) {
    const id = `mr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const rec = {
      id, producer_email: clip(producerEmail, 120),
      lead_id: clip(leadId, 60),
      note: clip(note, 500),
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    if (useSB) {
      try {
        await sbReq('POST', '/match_requests', { body: [rec], prefer: 'return=minimal' });
        return { ok: true, id };
      } catch (e) { console.warn('[matching] Supabase write failed:', e.message); }
    }
    requests[id] = rec; save();
    return { ok: true, id };
  }

  async function allRequests() {
    if (useSB) {
      try {
        const rows = await sbReq('GET', '/match_requests', { params: { select: '*', order: 'created_at.desc', limit: '1000' } });
        return rows || [];
      } catch (e) { console.warn('[matching] Supabase read failed:', e.message); }
    }
    return Object.values(requests).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  const matchLimiter   = rateLimit({ windowMs: 60_000, max: 30, message: { success: false, error: 'ร้องขอบ่อยเกินไป' } });
  const requestLimiter = rateLimit({ windowMs: 60_000, max: 5,  message: { success: false, error: 'ส่งคำขอบ่อยเกินไป' } });
  const router = express.Router();
  const wrap = (fn) => (req, res) => fn(req, res).catch(e => { console.error('[matching]', e.message); res.status(500).json({ success: false, error: 'matching error' }); });

  const auth = requireAuth || ((req, res, next) => next());
  const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    next();
  };

  // GET /api/match/summary — จำนวน leads/producers แยกประเภท
  router.get('/api/match/summary', auth, matchLimiter, wrap(async (req, res) => {
    res.json({ success: true, ...(await summary()) });
  }));

  // GET /api/match/suggestions?type=B2B|B2C|B2G|B2B2C|C2B|G2G|G2B|all&limit=20
  router.get('/api/match/suggestions', auth, matchLimiter, wrap(async (req, res) => {
    const type  = ALL_VALID_TYPES.includes(req.query.type) ? req.query.type : 'all';
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const matches = await topMatches(type, limit);
    res.json({ success: true, type, matches });
  }));

  // GET /api/match/for-producer?email=xxx&type=... — matches สำหรับ producer คนหนึ่ง
  router.get('/api/match/for-producer', auth, matchLimiter, wrap(async (req, res) => {
    const email = (req.query.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ success: false, error: 'ระบุ email ด้วย' });
    const type  = ALL_VALID_TYPES.includes(req.query.type) ? req.query.type : 'all';
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const result = await suggestForProducer(email, type, limit);
    if (!result.ok) return res.status(404).json({ success: false, error: result.error });
    res.json({ success: true, ...result });
  }));

  // POST /api/match/request — producer แสดงความสนใจ
  router.post('/api/match/request', auth, requestLimiter, wrap(async (req, res) => {
    const raw = req.body || {};
    const producer_email = String(raw.producer_email || '').toLowerCase().trim();
    const lead_id        = String(raw.lead_id        || '').trim();
    const note           = raw.note !== undefined ? String(raw.note) : '';
    if (!producer_email || !lead_id) return res.status(400).json({ success: false, error: 'ระบุ producer_email และ lead_id' });
    const r = await requestMatch(producer_email, lead_id, note);
    res.json({ success: true, id: r.id });
  }));

  // GET /api/match/requests — admin ดูคำขอทั้งหมด
  router.get('/api/match/requests', auth, adminOnly, matchLimiter, wrap(async (req, res) => {
    const all = await allRequests();
    res.json({ success: true, requests: all });
  }));

  return { router, summary, topMatches, suggestForProducer };
}
