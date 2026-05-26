// social-poster.js — Auto-fill & post on TikTok Studio, Instagram, Facebook
// Injected into social media pages by Chrome Extension

(function () {
  // รับ command จาก popup
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg.type !== 'AUTO_FILL') return;
    autoFill(msg).then(reply).catch(e => reply({ ok: false, error: e.message }));
    return true;
  });

  async function autoFill({ platform, content, affLink }) {
    const host = location.hostname;

    if (host.includes('tiktok'))     return fillTikTok(content, affLink);
    if (host.includes('instagram'))  return fillInstagram(content, affLink);
    if (host.includes('facebook'))   return fillFacebook(content, affLink);
    return { ok: false, error: 'Platform not recognised on this page' };
  }

  // ── TikTok Studio ─────────────────────────────────────────────────────────
  async function fillTikTok(c, link) {
    await waitFor('[data-e2e="caption-input"], .caption-input-area, textarea[placeholder*="caption"], div[contenteditable="true"]', 8000);

    const caption = buildCaption(c, link, 'tiktok');
    const el = document.querySelector(
      '[data-e2e="caption-input"] [contenteditable], .caption-input-area [contenteditable], textarea[placeholder*="caption"], div[contenteditable="true"]'
    );
    if (!el) return { ok: false, error: 'Caption field not found on TikTok Studio' };

    injectText(el, caption);
    return { ok: true, platform: 'tiktok' };
  }

  // ── Instagram Create Post ─────────────────────────────────────────────────
  async function fillInstagram(c, link) {
    await waitFor('textarea[aria-label], textarea[placeholder]', 6000);
    const caption = buildCaption(c, link, 'instagram');
    const el = document.querySelector('textarea[aria-label*="caption"], textarea[placeholder*="caption"], textarea');
    if (!el) return { ok: false, error: 'Caption field not found on Instagram' };
    injectText(el, caption);
    return { ok: true, platform: 'instagram' };
  }

  // ── Facebook Composer ─────────────────────────────────────────────────────
  async function fillFacebook(c, link) {
    await waitFor('[contenteditable][role="textbox"], [data-testid="status-attachment-mentions-input"]', 5000);
    const caption = buildCaption(c, link, 'facebook');
    const el = document.querySelector('[contenteditable][role="textbox"], [data-testid="status-attachment-mentions-input"]');
    if (!el) return { ok: false, error: 'Post composer not found on Facebook' };
    injectText(el, caption);
    return { ok: true, platform: 'facebook' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function buildCaption(c, link, platform) {
    const tags  = (c.hashtags || []).join(' ');
    const script = Array.isArray(c.script) ? c.script.join('\n') : (c.script || '');
    const linkLine = link ? `\n\n🔗 สั่งซื้อ: ${link}` : '';

    if (platform === 'tiktok') {
      return `${c.hook}\n\n${script}${linkLine}\n\n${c.caption}\n\n${tags}`;
    }
    if (platform === 'instagram') {
      return `${c.hook}\n\n${c.caption}${linkLine}\n\n${tags}`;
    }
    // facebook, line
    return `${c.hook}\n\n${c.caption}${linkLine}\n\n${tags}`;
  }

  function injectText(el, text) {
    el.focus();
    // Try native input event first (works on most React apps)
    const nativeInput = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') ||
                        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      if (nativeInput?.set) nativeInput.set.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // contenteditable
      el.textContent = '';
      document.execCommand('insertText', false, text);
      // Fallback if execCommand doesn't work
      if (!el.textContent.trim()) {
        el.textContent = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
      }
    }
  }

  function waitFor(sel, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(sel);
      if (el) return resolve(el);
      const obs = new MutationObserver(() => {
        const found = document.querySelector(sel);
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); reject(new Error(`Timeout waiting for ${sel}`)); }, timeout);
    });
  }
})();
