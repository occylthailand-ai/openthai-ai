// background.js — Service Worker
// Auto-post pipeline: 0-click API → auto-click share dialog → auto-fill SPA

const DEFAULT_API = 'https://openthai-ai.vercel.app';

// ── Affiliate Link ────────────────────────────────────────────────────────────
function buildAffiliateLink(product, s) {
  const { url, platform, shopId, itemId } = product;
  const { shopeeSmtt, lazadaCC, myRef, apiUrl } = s;
  const base = (apiUrl || DEFAULT_API).replace(/\/$/, '');
  const enc  = encodeURIComponent;
  if (platform === 'shopee' && shopId && itemId && shopeeSmtt)
    return `${url.split('?')[0]}?smtt=${enc(shopeeSmtt)}`;
  if (platform === 'lazada' && lazadaCC)
    return `${url.split('?')[0]}?cc=${enc(lazadaCC)}`;
  const ref = myRef || shopeeSmtt || lazadaCC || 'openthai';
  return `${base}/go?ref=${enc(ref)}&url=${enc(url)}&utm_source=chrome_ext&utm_medium=affiliate`;
}

// ── Open tab → wait load → inject & execute click function ───────────────────
// clickFn: serialisable function (no closures) injected into the tab
function openAndAutoSubmit(url, clickFn, delayMs = 2500) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: true }, (tab) => {
      function onUpdated(tabId, info) {
        if (tabId !== tab.id || info.status !== 'complete') return;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        setTimeout(() => {
          chrome.scripting.executeScript(
            { target: { tabId: tab.id }, func: clickFn },
            (results) => resolve({ tabId: tab.id, result: results?.[0]?.result })
          );
        }, delayMs);
      }
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

// Same but sends a message to the content script (for SPA fill + click)
function openAndFill(url, message, delayMs = 2500) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: true }, (tab) => {
      function onUpdated(tabId, info) {
        if (tabId !== tab.id || info.status !== 'complete') return;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, message, (resp) =>
            resolve({ tabId: tab.id, result: resp || {} })
          );
        }, delayMs);
      }
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

// ── LINE Notify API (0-click, requires token) ─────────────────────────────────
async function postToLineNotify(token, text) {
  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message: text }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `LINE Notify ${res.status}`);
  return data;
}

// ── Facebook Graph API (0-click, requires Page token) ────────────────────────
async function postToFacebook(pageId, token, message) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: token }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || `FB API ${res.status}`);
  return data;
}

// ── Auto-click functions (injected into share pages) ─────────────────────────
// NOTE: these must be self-contained (no outer scope references)

function clickLineSharePage() {
  // LINE Social Plugin share page
  const candidates = [
    document.querySelector('.MdBtnBlk'),            // LINE share button (common)
    document.querySelector('[class*="share"] button'),
    document.querySelector('button[type="submit"]'),
    document.querySelector('input[type="submit"]'),
    [...document.querySelectorAll('button, a')].find(
      b => /share|send|แชร์|ส่ง|送信/i.test(b.textContent)
    ),
  ].filter(Boolean);
  if (candidates[0]) { candidates[0].click(); return 'clicked'; }
  return 'button_not_found';
}

function clickFbSharePage() {
  // Facebook sharer.php dialog
  const candidates = [
    document.querySelector('[data-testid="react-composer-post-button"]'),
    document.querySelector('[aria-label="Share now"]'),
    document.querySelector('[aria-label="Post"]'),
    document.querySelector('button[name="post"]'),
    document.querySelector('._54bb button'),
    [...document.querySelectorAll('button')].find(
      b => /post|share now|share to facebook/i.test(b.textContent)
    ),
  ].filter(Boolean);
  if (candidates[0]) { candidates[0].click(); return 'clicked'; }
  return 'button_not_found';
}

// ── Message Dispatcher ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {

  if (msg.type === 'BUILD_AFFILIATE') {
    chrome.storage.sync.get(null, (s) => reply({ link: buildAffiliateLink(msg.product, s) }));
    return true;
  }

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
        reply({ ok: true, data, affiliateLink: buildAffiliateLink(msg.product, s) });
      } catch (e) { reply({ ok: false, error: e.message }); }
    });
    return true;
  }

  // ── LINE ──────────────────────────────────────────────────────────────────
  if (msg.type === 'POST_LINE') {
    chrome.storage.sync.get(null, async (s) => {
      try {
        if (s.lineNotifyToken) {
          // 0-click: LINE Notify API
          const text = `${msg.text}\n\n🔗 ${msg.affLink}`;
          await postToLineNotify(s.lineNotifyToken, text);
          reply({ ok: true, method: 'notify_api' });
        } else {
          // auto-click: เปิด LINE Share dialog + กดปุ่มอัตโนมัติ
          const enc  = encodeURIComponent;
          const url  = `https://social-plugins.line.me/lineit/share?url=${enc(msg.affLink || '')}&text=${enc(msg.text)}`;
          const r    = await openAndAutoSubmit(url, clickLineSharePage, 3000);
          reply({ ok: true, method: 'share_dialog', result: r.result });
        }
      } catch (e) { reply({ ok: false, error: e.message }); }
    });
    return true;
  }

  // ── Facebook ──────────────────────────────────────────────────────────────
  if (msg.type === 'POST_FACEBOOK') {
    chrome.storage.sync.get(null, async (s) => {
      try {
        if (s.fbPageId && s.fbPageToken) {
          // 0-click: Graph API
          const text = `${msg.text}\n\n🔗 ${msg.affLink}`;
          const r = await postToFacebook(s.fbPageId, s.fbPageToken, text);
          reply({ ok: true, method: 'graph_api', postId: r.id });
        } else {
          // auto-click: เปิด Share dialog + กดปุ่มอัตโนมัติ
          const enc  = encodeURIComponent;
          const url  = `https://www.facebook.com/sharer/sharer.php?u=${enc(msg.affLink || '')}&quote=${enc(msg.text.slice(0, 500))}`;
          const r    = await openAndAutoSubmit(url, clickFbSharePage, 3000);
          reply({ ok: true, method: 'share_dialog', result: r.result });
        }
      } catch (e) { reply({ ok: false, error: e.message }); }
    });
    return true;
  }

  // ── TikTok Studio (fill caption + auto-click Post) ────────────────────────
  if (msg.type === 'POST_TIKTOK') {
    openAndFill(
      'https://www.tiktok.com/tiktok-web-upload',
      { type: 'AUTO_FILL', platform: 'tiktok', content: msg.content, affLink: msg.affLink, autoSubmit: true, showCredit: msg.showCredit },
      3000
    ).then(r => reply({ ok: true, ...r })).catch(e => reply({ ok: false, error: e.message }));
    return true;
  }

  // ── Instagram (fill caption + auto-click Share) ───────────────────────────
  if (msg.type === 'POST_INSTAGRAM') {
    openAndFill(
      'https://www.instagram.com/',
      { type: 'AUTO_FILL', platform: 'instagram', content: msg.content, affLink: msg.affLink, autoSubmit: true, showCredit: msg.showCredit },
      3000
    ).then(r => reply({ ok: true, ...r })).catch(e => reply({ ok: false, error: e.message }));
    return true;
  }

});
