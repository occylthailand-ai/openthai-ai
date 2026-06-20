// backend/link-tracker.js — Click & Conversion Tracker
// สร้าง short trackable link → บันทึก click ทุก ms → แสดง analytics สด

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { join } from 'path';

export function createLinkTracker(dataDir, deps = {}) {
  const LINKS_FILE  = join(dataDir, 'tracking_links.json');
  const CLICKS_FILE = join(dataDir, 'tracking_clicks.json');
  const { kvPush = async () => {}, addLog = () => {} } = deps;

  const clickBuffer = [];       // in-memory buffer — flush every 5s
  let flushTimer = null;

  // ── Persistence helpers ────────────────────────────────────────────────────
  function loadLinks()  { try { if (existsSync(LINKS_FILE))  return JSON.parse(readFileSync(LINKS_FILE, 'utf8')); } catch (_) {} return {}; }
  function saveLinks(d) { try { writeFileSync(LINKS_FILE, JSON.stringify(d, null, 2), 'utf8'); } catch (_) {} }
  function loadClicks() { try { if (existsSync(CLICKS_FILE)) return JSON.parse(readFileSync(CLICKS_FILE, 'utf8')); } catch (_) {} return []; }
  function saveClicks(d){ try { writeFileSync(CLICKS_FILE, JSON.stringify(d, null, 2), 'utf8'); } catch (_) {} }

  function flushClicks() {
    if (!clickBuffer.length) return;
    const batch = clickBuffer.splice(0);
    const clicks = loadClicks();
    clicks.push(...batch);
    // keep last 100k clicks
    saveClicks(clicks.slice(-100000));
  }

  function scheduleFlush() {
    if (!flushTimer) flushTimer = setInterval(flushClicks, 5000);
  }

  // ── Create tracking link ───────────────────────────────────────────────────
  async function createTrackingLink({ affiliateRef, platform, postBatchId, productId, destination = null }) {
    scheduleFlush();
    const code = randomBytes(5).toString('base64url'); // 7-char short code
    const links = loadLinks();

    // destination = checkout page with ref pre-filled
    const BASE = process.env.FRONTEND_URL || process.env.VITE_API_BASE || 'https://OpenThaiAi.com';
    const dest = destination || `${BASE}/store?ref=${affiliateRef}&utm_source=${platform}&utm_medium=social&utm_campaign=autopost&pid=${productId || ''}`;

    const link = {
      code,
      affiliate_ref: affiliateRef,
      platform,
      post_batch_id: postBatchId,
      product_id: productId,
      destination: dest,
      created_at: new Date().toISOString(),
      clicks: 0,
      unique_clicks: 0,
      conversions: 0,
      revenue: 0,
      seen_ips: [],          // for unique click dedup (last 10k)
    };
    links[code] = link;
    saveLinks(links);

    const shortUrl = `${BASE}/go/${code}`;
    addLog('info', 'LinkTracker', `สร้าง tracking link ${code} → ${platform} (${affiliateRef})`);
    return { code, shortUrl, destination: dest };
  }

  // ── Record click (called on /go/:code redirect) ───────────────────────────
  function recordClick(code, meta = {}) {
    const links = loadLinks();
    const link = links[code];
    if (!link) return null;

    const ip = meta.ip || 'unknown';
    const isUnique = !link.seen_ips.includes(ip);
    link.clicks++;
    if (isUnique) {
      link.unique_clicks++;
      link.seen_ips = [...link.seen_ips.slice(-9999), ip];
    }
    link.last_click_at = new Date().toISOString();
    saveLinks(links);

    // Buffer click event
    clickBuffer.push({
      code,
      ts: Date.now(),
      ip,
      is_unique: isUnique,
      platform: link.platform,
      affiliate_ref: link.affiliate_ref,
      product_id: link.product_id,
      ua: (meta.userAgent || '').slice(0, 200),
      country: meta.country || '',
      referer: (meta.referer || '').slice(0, 200),
    });

    return { destination: link.destination, code };
  }

  // ── Record conversion (called when order is placed with ref) ─────────────
  function recordConversion(affiliateRef, { orderId, amount, platform }) {
    const links = loadLinks();
    // find most recent link for this ref+platform
    const match = Object.values(links)
      .filter(l => l.affiliate_ref === affiliateRef && (!platform || l.platform === platform))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    if (match) {
      match.conversions++;
      match.revenue = (match.revenue || 0) + (amount || 0);
      links[match.code] = match;
      saveLinks(links);
    }

    clickBuffer.push({
      code: match?.code || 'unknown',
      ts: Date.now(),
      event: 'conversion',
      order_id: orderId,
      amount: amount || 0,
      affiliate_ref: affiliateRef,
      platform: platform || '',
    });
    return { updated: match ? 1 : 0, link: match };
  }

  // ── Get stats for a link ──────────────────────────────────────────────────
  function getLinkStats(code) {
    const links = loadLinks();
    const link = links[code];
    if (!link) return null;
    const allClicks = loadClicks().filter(c => c.code === code);

    // clicks per hour (last 24h)
    const now = Date.now();
    const byHour = {};
    for (const c of allClicks) {
      if (now - c.ts < 86400000) {
        const h = new Date(c.ts).getUTCHours();
        byHour[h] = (byHour[h] || 0) + 1;
      }
    }
    const ctr = link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : '0';
    return { ...link, ctr: `${ctr}%`, clicks_by_hour: byHour, recent: allClicks.slice(-10).reverse() };
  }

  // ── Analytics dashboard ───────────────────────────────────────────────────
  function getDashboard({ affiliateRef = null, limit = 50 } = {}) {
    flushClicks();
    const links = loadLinks();
    let items = Object.values(links);
    if (affiliateRef) items = items.filter(l => l.affiliate_ref === affiliateRef);
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const totals = items.reduce((acc, l) => ({
      clicks: acc.clicks + l.clicks,
      unique_clicks: acc.unique_clicks + l.unique_clicks,
      conversions: acc.conversions + l.conversions,
      revenue: acc.revenue + (l.revenue || 0),
    }), { clicks: 0, unique_clicks: 0, conversions: 0, revenue: 0 });

    // platform breakdown
    const byPlatform = {};
    for (const l of items) {
      const p = l.platform || 'unknown';
      if (!byPlatform[p]) byPlatform[p] = { clicks: 0, conversions: 0, revenue: 0 };
      byPlatform[p].clicks += l.clicks;
      byPlatform[p].conversions += l.conversions;
      byPlatform[p].revenue += l.revenue || 0;
    }

    return {
      totals,
      by_platform: byPlatform,
      top_links: items.slice(0, limit).map(l => ({
        code: l.code, platform: l.platform, affiliate_ref: l.affiliate_ref,
        clicks: l.clicks, unique_clicks: l.unique_clicks, conversions: l.conversions,
        revenue: l.revenue || 0, ctr: l.clicks ? `${((l.conversions / l.clicks) * 100).toFixed(1)}%` : '0%',
        created_at: l.created_at, last_click_at: l.last_click_at,
      })),
    };
  }

  // ── Express router ────────────────────────────────────────────────────────
  function buildRouter(express) {
    const router = express.Router();

    // GET /go/:code — redirect + track
    router.get('/go/:code', (req, res) => {
      const result = recordClick(req.params.code, {
        ip: req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        referer: req.headers.referer || '',
        country: req.headers['cf-ipcountry'] || req.headers['x-country'] || '',
      });
      if (!result) return res.redirect(302, process.env.FRONTEND_URL || '/');
      res.redirect(302, result.destination);
    });

    // GET /api/track/dashboard — analytics overview
    router.get('/api/track/dashboard', (req, res) => {
      const { ref } = req.query;
      res.json({ success: true, dashboard: getDashboard({ affiliateRef: ref }) });
    });

    // GET /api/track/stats/:code — single link stats
    router.get('/api/track/stats/:code', (req, res) => {
      const stats = getLinkStats(req.params.code);
      if (!stats) return res.status(404).json({ success: false, error: 'Link not found' });
      res.json({ success: true, stats });
    });

    // POST /api/track/create — สร้าง tracking link ใหม่
    router.post('/api/track/create', async (req, res) => {
      try {
        const { affiliateRef, platform, productId, destination } = req.body || {};
        if (!affiliateRef) return res.status(400).json({ success: false, error: 'affiliateRef required' });
        const link = await createTrackingLink({ affiliateRef, platform: platform || 'manual', postBatchId: null, productId, destination });
        res.json({ success: true, ...link });
      } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    });

    return router;
  }

  return { createTrackingLink, recordClick, recordConversion, getLinkStats, getDashboard, buildRouter };
}
