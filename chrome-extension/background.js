// background.js — Service Worker: API proxy + Affiliate link builder

const DEFAULT_API = 'https://openthai-ai.vercel.app';

// ── สร้าง Affiliate Link จริงตาม Platform ────────────────────────────────────
// Shopee Affiliate: ต้องสมัคร affiliate.shopee.co.th → ได้ smtt code
// Lazada Affiliate: ต้องสมัคร affiliate.lazada.co.th → ได้ tracking ID
// OpenThai.ai Tracked: ใช้ระบบ internal พร้อมใช้งานทันที

function buildAffiliateLink(product, refCode) {
  const { url, platform, shopId, itemId } = product;
  const enc = encodeURIComponent;

  if (platform === 'shopee' && shopId && itemId) {
    // Shopee: ถ้ามี smtt code จากการสมัคร affiliate → ใช้เลย
    // ถ้าไม่มี → ใช้ OpenThai tracked link แทน
    const smtt = refCode ? `smtt=${enc(refCode)}` : '';
    const base = url.split('?')[0];
    return smtt ? `${base}?${smtt}` : buildOpenThaiLink(url, refCode);
  }

  if (platform === 'lazada') {
    // Lazada: format https://s.lazada.co.th/s.ID?cc=TRACKING
    const cc = refCode ? `?cc=${enc(refCode)}` : '';
    return `${url}${cc}`;
  }

  return buildOpenThaiLink(url, refCode);
}

function buildOpenThaiLink(originalUrl, refCode) {
  const api = DEFAULT_API;
  const ref = refCode || 'openthai';
  return `${api}/go?ref=${encodeURIComponent(ref)}&url=${encodeURIComponent(originalUrl)}&utm_source=chrome_ext&utm_medium=affiliate&utm_campaign=content`;
}

// ── Message Handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === 'BUILD_AFFILIATE') {
    chrome.storage.sync.get(['refCode'], ({ refCode }) => {
      reply({ link: buildAffiliateLink(msg.product, refCode || '') });
    });
    return true; // async
  }

  if (msg.type === 'GENERATE_CONTENT') {
    chrome.storage.sync.get(['apiUrl', 'refCode'], async ({ apiUrl, refCode }) => {
      const base = (apiUrl || DEFAULT_API).replace(/\/$/, '');
      try {
        const res = await fetch(`${base}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg.form),
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const affLink = buildAffiliateLink(msg.product, refCode || '');
        reply({ ok: true, data, affiliateLink: affLink });
      } catch (e) {
        reply({ ok: false, error: e.message });
      }
    });
    return true; // async
  }
});
