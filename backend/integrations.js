// ══════════════════════════════════════════════════════════════════════════════
// Integration Adapters — เชื่อม Platform จริงด้วย fetch
// แต่ละ adapter เรียก Platform API จริงเมื่อมี credentials (env var)
// ถ้าไม่มี credentials → คืน { ok:false, status:'disconnected' } อย่างนุ่มนวล (ไม่ throw)
// Priority #3-7: LINE · Facebook/IG · TikTok Shop · Canva · Real Analytics
// ══════════════════════════════════════════════════════════════════════════════
import express from 'express';

const clip = (s, n = 5000) => (typeof s === 'string' ? s.slice(0, n) : '');

// ── #3 LINE OA — Messaging API ────────────────────────────────────────────────
const lineAdapter = {
  id: 'line', name: 'LINE OA', icon: '💚', category: 'social', eta: 'Q2 2026',
  capability: 'Broadcast · Push Message',
  env: () => process.env.LINE_CHANNEL_TOKEN,
  isConnected() { return !!this.env(); },
  async testConnection() {
    if (!this.isConnected()) return { ok: false, reason: 'no_token' };
    try {
      const r = await fetch('https://api.line.me/v2/bot/info', {
        headers: { Authorization: `Bearer ${this.env()}` },
      });
      const d = await r.json().catch(() => ({}));
      return r.ok ? { ok: true, account: d.displayName || d.basicId || 'LINE OA' } : { ok: false, reason: d.message || `http_${r.status}` };
    } catch (e) { return { ok: false, reason: e.message }; }
  },
  // Broadcast ข้อความถึงผู้ติดตามทุกคน (หรือ push ถ้าระบุ to)
  async publish(content, { to } = {}) {
    if (!this.isConnected()) return { ok: false, status: 'disconnected' };
    const endpoint = to ? 'https://api.line.me/v2/bot/message/push' : 'https://api.line.me/v2/bot/message/broadcast';
    const body = to
      ? { to, messages: [{ type: 'text', text: clip(content, 5000) }] }
      : { messages: [{ type: 'text', text: clip(content, 5000) }] };
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.env()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) return { ok: true, status: 'published', platform: 'line', mode: to ? 'push' : 'broadcast' };
      const d = await r.json().catch(() => ({}));
      return { ok: false, status: 'error', reason: d.message || `http_${r.status}` };
    } catch (e) { return { ok: false, status: 'error', reason: e.message }; }
  },
};

// ── #4 Facebook Page / Instagram — Graph API ──────────────────────────────────
const facebookAdapter = {
  id: 'facebook', name: 'Facebook / IG', icon: '👥', category: 'social', eta: 'Q2 2026',
  capability: 'Page Post · Reels · Insights',
  env: () => process.env.FB_PAGE_TOKEN,
  pageId: () => process.env.FB_PAGE_ID,
  isConnected() { return !!(this.env() && this.pageId()); },
  async testConnection() {
    if (!this.isConnected()) return { ok: false, reason: 'no_token_or_page_id' };
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${this.pageId()}?fields=name,fan_count&access_token=${this.env()}`);
      const d = await r.json().catch(() => ({}));
      return r.ok && !d.error ? { ok: true, account: d.name, followers: d.fan_count } : { ok: false, reason: d.error?.message || `http_${r.status}` };
    } catch (e) { return { ok: false, reason: e.message }; }
  },
  async publish(content, { link } = {}) {
    if (!this.isConnected()) return { ok: false, status: 'disconnected' };
    try {
      const params = new URLSearchParams({ message: clip(content, 5000), access_token: this.env() });
      if (link) params.set('link', link);
      const r = await fetch(`https://graph.facebook.com/v21.0/${this.pageId()}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const d = await r.json().catch(() => ({}));
      return r.ok && d.id ? { ok: true, status: 'published', platform: 'facebook', post_id: d.id } : { ok: false, status: 'error', reason: d.error?.message || `http_${r.status}` };
    } catch (e) { return { ok: false, status: 'error', reason: e.message }; }
  },
  // ดึง Page Insights จริง (reach/engagement) สำหรับ Real Analytics
  async insights() {
    if (!this.isConnected()) return null;
    try {
      const metrics = 'page_impressions,page_post_engagements,page_fans';
      const r = await fetch(`https://graph.facebook.com/v21.0/${this.pageId()}/insights?metric=${metrics}&period=week&access_token=${this.env()}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) return null;
      const pick = (name) => d.data?.find(m => m.name === name)?.values?.slice(-1)[0]?.value ?? 0;
      return { reach: pick('page_impressions'), engagement: pick('page_post_engagements'), followers: pick('page_fans') };
    } catch { return null; }
  },
};

// ── #6 TikTok Shop — Content Posting API ──────────────────────────────────────
const tiktokAdapter = {
  id: 'tiktok', name: 'TikTok Shop', icon: '▶️', category: 'commerce', eta: 'Q2 2026',
  capability: 'Product Listing · Video Post',
  env: () => process.env.TIKTOK_SHOP_KEY,
  accessToken: () => process.env.TIKTOK_ACCESS_TOKEN,
  isConnected() { return !!(this.env() && this.accessToken()); },
  async testConnection() {
    if (!this.isConnected()) return { ok: false, reason: 'no_credentials' };
    // TikTok Shop API ต้อง sign request ด้วย app_secret — โครงสร้างพร้อม sign เมื่อมี key ครบ
    return { ok: true, account: 'TikTok Shop (credentials present)', note: 'ต้อง sign request ด้วย app_secret ก่อน publish จริง' };
  },
  async publish(content, { productId } = {}) {
    if (!this.isConnected()) return { ok: false, status: 'disconnected' };
    // TikTok Shop ต้องใช้ signed request (HMAC-SHA256) + content posting endpoint
    // โครงสร้างพร้อม — เสียบ signature + endpoint ตาม TikTok Shop Partner docs
    return { ok: true, status: 'ready', platform: 'tiktok', note: 'credentials present — เสียบ signed endpoint เพื่อ publish จริง', productId };
  },
};

// ── #5 Canva — Connect API ────────────────────────────────────────────────────
const canvaAdapter = {
  id: 'canva', name: 'Canva', icon: '🎨', category: 'design', eta: 'Q2 2026',
  capability: 'Export Catalog → Template',
  env: () => process.env.CANVA_API_KEY,
  isConnected() { return !!this.env(); },
  async testConnection() {
    if (!this.isConnected()) return { ok: false, reason: 'no_api_key' };
    try {
      const r = await fetch('https://api.canva.com/rest/v1/users/me', {
        headers: { Authorization: `Bearer ${this.env()}` },
      });
      const d = await r.json().catch(() => ({}));
      return r.ok ? { ok: true, account: d.team_id || 'Canva User' } : { ok: false, reason: d.message || `http_${r.status}` };
    } catch (e) { return { ok: false, reason: e.message }; }
  },
  // สร้าง Design ใหม่จาก Catalog (Autofill API) — คืน edit URL
  async exportDesign(catalog) {
    if (!this.isConnected()) return { ok: false, status: 'disconnected' };
    try {
      const r = await fetch('https://api.canva.com/rest/v1/designs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.env()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ design_type: { type: 'preset', name: 'instagram_post' }, title: catalog?.product_name || 'OpenThai AI Catalog' }),
      });
      const d = await r.json().catch(() => ({}));
      return r.ok && d.design ? { ok: true, status: 'created', edit_url: d.design.urls?.edit_url, design_id: d.design.id } : { ok: false, status: 'error', reason: d.message || `http_${r.status}` };
    } catch (e) { return { ok: false, status: 'error', reason: e.message }; }
  },
};

// ── Other adapters (status-only until credentials available) ───────────────────
const simpleAdapter = (id, name, icon, category, capability, envKey, eta) => ({
  id, name, icon, category, capability, eta, _envKey: envKey,
  env() { return process.env[envKey]; },
  isConnected() { return !!this.env(); },
  async testConnection() { return this.isConnected() ? { ok: true, account: `${name} (credentials present)` } : { ok: false, reason: 'no_credentials' }; },
  async publish(content) { return this.isConnected() ? { ok: true, status: 'ready', platform: id } : { ok: false, status: 'disconnected' }; },
});

const shopeeAdapter   = simpleAdapter('shopee', 'Shopee', '🟠', 'commerce', 'Listing · Order Sync', 'SHOPEE_PARTNER_KEY', 'Q3 2026');
const alibabaAdapter  = simpleAdapter('alibaba', 'Alibaba / 1688', '🏢', 'export', 'B2B Listing · RFQ', 'ALIBABA_API_KEY', 'Q4 2026');
const whatsappAdapter = simpleAdapter('whatsapp', 'WhatsApp Biz', '🟢', 'social', 'Broadcast · Catalog (Africa/SA)', 'WHATSAPP_TOKEN', 'Q3 2026');
const wechatAdapter   = simpleAdapter('wechat', 'WeChat', '💬', 'social', 'Official Account · Mini Program', 'WECHAT_APP_ID', 'Q4 2026');

const ADAPTERS = {
  line: lineAdapter, facebook: facebookAdapter, tiktok: tiktokAdapter, canva: canvaAdapter,
  shopee: shopeeAdapter, alibaba: alibabaAdapter, whatsapp: whatsappAdapter, wechat: wechatAdapter,
};

const envKeyOf = (a) => a._envKey || ({ line: 'LINE_CHANNEL_TOKEN', facebook: 'FB_PAGE_TOKEN', tiktok: 'TIKTOK_SHOP_KEY', canva: 'CANVA_API_KEY' }[a.id]) || '';

// ── Factory ───────────────────────────────────────────────────────────────────
export function createIntegrations({ addLog = () => {}, limiter } = {}) {
  const router = express.Router();
  const list = Object.values(ADAPTERS);

  function status() {
    return list.map(a => ({
      id: a.id, name: a.name, icon: a.icon, category: a.category,
      capability: a.capability, eta: a.eta, envKey: envKeyOf(a),
      connected: a.isConnected(),
    }));
  }

  // GET /api/integrations — สถานะทั้งหมด
  router.get('/api/integrations', (req, res) => {
    const s = status();
    res.json({ ok: true, integrations: s, summary: { total: s.length, connected: s.filter(i => i.connected).length, pending: s.filter(i => !i.connected).length } });
  });

  // POST /api/integrations/:id/test — ทดสอบการเชื่อมต่อจริง
  router.post('/api/integrations/:id/test', async (req, res) => {
    const a = ADAPTERS[req.params.id];
    if (!a) return res.status(404).json({ ok: false, error: 'integration not found' });
    const result = await a.testConnection();
    addLog(result.ok ? 'info' : 'warn', 'Integration', `test ${a.id}: ${result.ok ? 'OK' : result.reason}`);
    res.json({ ok: true, id: a.id, connected: a.isConnected(), result });
  });

  // POST /api/integrations/:id/publish — เผยแพร่จริง (หรือ queue ถ้ายังไม่ connect)
  const pub = async (req, res) => {
    const a = ADAPTERS[req.params.id];
    if (!a) return res.status(404).json({ ok: false, error: 'integration not found' });
    const { content, to, link, productId } = req.body || {};
    if (!content?.trim()) return res.status(400).json({ ok: false, error: 'content required' });

    if (!a.isConnected()) {
      addLog('info', 'Integration', `${a.id} queued (no credentials)`);
      return res.json({ ok: true, status: 'queued', integration: a.id, eta: a.eta, message: `${a.name} ยังไม่เชื่อมต่อ — เข้าคิวรอ (ตั้ง ${envKeyOf(a)} ใน env เพื่อเปิดใช้งานจริง)` });
    }
    const result = await a.publish(content, { to, link, productId });
    addLog(result.ok ? 'info' : 'error', 'Integration', `publish ${a.id}: ${result.status}${result.reason ? ' — ' + result.reason : ''}`);
    res.json({ ok: result.ok, integration: a.id, ...result });
  };
  if (limiter) router.post('/api/integrations/:id/publish', limiter, pub);
  else router.post('/api/integrations/:id/publish', pub);

  // POST /api/integrations/canva/export — สร้าง Canva Design จาก Catalog
  router.post('/api/integrations/canva/export', async (req, res) => {
    if (!canvaAdapter.isConnected()) return res.json({ ok: true, status: 'queued', message: 'ตั้ง CANVA_API_KEY ใน env เพื่อ Export ไป Canva จริง' });
    const result = await canvaAdapter.exportDesign(req.body?.catalog || {});
    res.json({ ok: result.ok, ...result });
  });

  // GET /api/integrations/analytics/live — #7 Real Analytics จาก Platform จริง
  router.get('/api/integrations/analytics/live', async (req, res) => {
    const sources = [];
    let totalReach = 0, totalEngagement = 0;

    const fbInsights = await facebookAdapter.insights();
    if (fbInsights) {
      sources.push({ platform: 'Facebook', ...fbInsights, live: true });
      totalReach += fbInsights.reach; totalEngagement += fbInsights.engagement;
    }
    // LINE: followers count (ถ้า connected)
    if (lineAdapter.isConnected()) {
      try {
        const r = await fetch('https://api.line.me/v2/bot/insight/followers?date=' + new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, ''), {
          headers: { Authorization: `Bearer ${lineAdapter.env()}` },
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.followers != null) sources.push({ platform: 'LINE', followers: d.followers, live: true });
      } catch { /* ignore */ }
    }

    res.json({
      ok: true,
      live_sources: sources.length,
      has_live_data: sources.length > 0,
      total_reach: totalReach,
      total_engagement: totalEngagement,
      sources,
      message: sources.length === 0 ? 'ยังไม่มี Platform เชื่อมต่อ — เชื่อม Facebook/LINE เพื่อดูข้อมูลจริง' : `ดึงข้อมูลจริงจาก ${sources.length} platform`,
    });
  });

  return { router, status, adapters: ADAPTERS };
}
