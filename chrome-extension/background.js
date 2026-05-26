// background.js — Service Worker
// จัดการ: API calls, Affiliate links, Auto-post (LINE Notify / Facebook API)

const DEFAULT_API = 'https://openthai-ai.vercel.app';

// ── Affiliate Link Builder ────────────────────────────────────────────────────
function buildAffiliateLink(product, settings) {
  const { url, platform, shopId, itemId } = product;
  const { shopeeSmtt, lazadaCC, myRef, apiUrl } = settings;
  const base = (apiUrl || DEFAULT_API).replace(/\/$/, '');
  const enc  = encodeURIComponent;

  if (platform === 'shopee' && shopId && itemId && shopeeSmtt) {
    return `${url.split('?')[0]}?smtt=${enc(shopeeSmtt)}`;
  }
  if (platform === 'lazada' && lazadaCC) {
    return `${url.split('?')[0]}?cc=${enc(lazadaCC)}`;
  }
  // OpenThai tracked link (works for all platforms)
  const ref = myRef || shopeeSmtt || lazadaCC || 'openthai';
  return `${base}/go?ref=${enc(ref)}&url=${enc(url)}&utm_source=chrome_ext&utm_medium=affiliate`;
}

// ── Open tab + wait for load + send message ───────────────────────────────────
async function openAndFill(url, message) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      const listener = (tabId, info) => {
        if (tabId !== tab.id || info.status !== 'complete') return;
        chrome.tabs.onUpdated.removeListener(listener);
        // Wait a bit for React/SPA to mount
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, message, (resp) => {
            resolve({ tabId: tab.id, result: resp || {} });
          });
        }, 2000);
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

// ── LINE Notify Direct Post (ไม่ต้องกดอะไร — โพสต์ตรงเข้า LINE ทันที) ─────────
// ต้องมี LINE Notify Token จาก notify-bot.line.me (ฟรี สมัครครั้งเดียว)
async function postToLineNotify(token, text) {
  const params = new URLSearchParams({ message: text });
  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `LINE Notify error ${res.status}`);
  return data;
}

// ── Facebook Graph API Direct Post (โพสต์ตรงเข้า Page ทันที) ─────────────────
// ต้องมี Page Access Token จาก developers.facebook.com
async function postToFacebook(pageId, token, message) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: token }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || `FB API error ${res.status}`);
  return data;
}

// ── Message Dispatcher ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {

  // ── สร้าง Affiliate Link ──────────────────────────────────────────────────
  if (msg.type === 'BUILD_AFFILIATE') {
    chrome.storage.sync.get(null, (s) => {
      reply({ link: buildAffiliateLink(msg.product, s) });
    });
    return true;
  }

  // ── Generate Content จาก API ──────────────────────────────────────────────
  if (msg.type === 'GENERATE_CONTENT') {
    chrome.storage.sync.get(null, async (s) => {
      const base = (s.apiUrl || DEFAULT_API).replace(/\/$/, '');
      try {
        const res = await fetch(`${base}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg.form),
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        const affLink = buildAffiliateLink(msg.product, s);
        reply({ ok: true, data, affiliateLink: affLink });
      } catch (e) {
        reply({ ok: false, error: e.message });
      }
    });
    return true;
  }

  // ── Auto-Post: LINE Share URL (1-tap confirm) ─────────────────────────────
  if (msg.type === 'SHARE_LINE') {
    const text = encodeURIComponent(msg.text);
    const url  = encodeURIComponent(msg.affLink || '');
    chrome.tabs.create({ url: `https://social-plugins.line.me/lineit/share?url=${url}&text=${text}` });
    reply({ ok: true });
    return true;
  }

  // ── Auto-Post: LINE Notify DIRECT (0-click ถ้ามี token) ───────────────────
  if (msg.type === 'POST_LINE_NOTIFY') {
    chrome.storage.sync.get(['lineNotifyToken'], async ({ lineNotifyToken }) => {
      if (!lineNotifyToken) { reply({ ok: false, error: 'ไม่มี LINE Notify Token — ตั้งค่าก่อน' }); return; }
      try {
        await postToLineNotify(lineNotifyToken, msg.text);
        reply({ ok: true });
      } catch (e) { reply({ ok: false, error: e.message }); }
    });
    return true;
  }

  // ── Auto-Post: Facebook Share Dialog (1-click confirm) ───────────────────
  if (msg.type === 'SHARE_FACEBOOK') {
    const u = encodeURIComponent(msg.affLink || '');
    const q = encodeURIComponent(msg.text.slice(0, 500));
    chrome.tabs.create({ url: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${q}` });
    reply({ ok: true });
    return true;
  }

  // ── Auto-Post: Facebook Page API DIRECT (0-click ถ้ามี token) ────────────
  if (msg.type === 'POST_FACEBOOK_API') {
    chrome.storage.sync.get(['fbPageId', 'fbPageToken'], async ({ fbPageId, fbPageToken }) => {
      if (!fbPageId || !fbPageToken) { reply({ ok: false, error: 'ไม่มี Facebook Page Token — ตั้งค่าก่อน' }); return; }
      try {
        const r = await postToFacebook(fbPageId, fbPageToken, msg.text);
        reply({ ok: true, postId: r.id });
      } catch (e) { reply({ ok: false, error: e.message }); }
    });
    return true;
  }

  // ── Auto-Post: TikTok Studio (auto-fill caption) ─────────────────────────
  if (msg.type === 'FILL_TIKTOK') {
    openAndFill('https://www.tiktok.com/tiktok-web-upload', {
      type: 'AUTO_FILL', platform: 'tiktok', content: msg.content, affLink: msg.affLink,
    }).then(r => reply({ ok: true, ...r })).catch(e => reply({ ok: false, error: e.message }));
    return true;
  }

  // ── Auto-Post: Instagram (auto-fill caption) ──────────────────────────────
  if (msg.type === 'FILL_INSTAGRAM') {
    openAndFill('https://www.instagram.com/', {
      type: 'AUTO_FILL', platform: 'instagram', content: msg.content, affLink: msg.affLink,
    }).then(r => reply({ ok: true, ...r })).catch(e => reply({ ok: false, error: e.message }));
    return true;
  }

});
