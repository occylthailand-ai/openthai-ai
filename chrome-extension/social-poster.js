// social-poster.js — Auto-fill + Auto-click Post button
// Runs on TikTok Studio, Instagram, Facebook pages

(function () {
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg.type !== 'AUTO_FILL') return;
    autoFill(msg).then(reply).catch(e => reply({ ok: false, error: e.message }));
    return true;
  });

  async function autoFill({ platform, content, affLink, autoSubmit }) {
    if (platform === 'tiktok')    return fillTikTok(content, affLink, autoSubmit);
    if (platform === 'instagram') return fillInstagram(content, affLink, autoSubmit);
    if (platform === 'facebook')  return fillFacebook(content, affLink, autoSubmit);
    return { ok: false, error: 'Unknown platform' };
  }

  // ── TikTok Studio ─────────────────────────────────────────────────────────
  async function fillTikTok(c, link, autoSubmit) {
    const captionSel = [
      '[data-e2e="caption-input"] [contenteditable]',
      'div[contenteditable="true"][class*="caption"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="caption"], textarea[placeholder*="Caption"]',
    ].join(', ');

    await waitFor(captionSel, 10_000);
    const el = document.querySelector(captionSel);
    if (!el) return { ok: false, error: 'TikTok caption field not found' };

    injectText(el, buildCaption(c, link, 'tiktok'));
    if (!autoSubmit) return { ok: true };

    // Auto-click Post button
    const posted = await clickButton([
      '[data-e2e="post-btn"]',
      'button[class*="post-btn"]',
      'button[class*="submit"]',
    ], /^post$|^发布$|^โพสต์$/i, 2000);
    return { ok: true, posted };
  }

  // ── Instagram ─────────────────────────────────────────────────────────────
  async function fillInstagram(c, link, autoSubmit) {
    // IG web: click "+" to open Create flow
    const plusBtn = document.querySelector('[aria-label="New post"], [aria-label="Create"], svg[aria-label="New post"]')
      ?.closest('a, button');
    if (plusBtn) { plusBtn.click(); await wait(1500); }

    const captionSel = 'textarea[aria-label*="caption" i], textarea[placeholder*="caption" i], textarea';
    await waitFor(captionSel, 8_000);
    const el = document.querySelector(captionSel);
    if (!el) return { ok: false, error: 'Instagram caption field not found' };

    injectText(el, buildCaption(c, link, 'instagram'));
    if (!autoSubmit) return { ok: true };

    const posted = await clickButton([
      'button[type="submit"]',
      '._acan._acap._acas button',
    ], /^share$|^post$|^แชร์$/i, 1500);
    return { ok: true, posted };
  }

  // ── Facebook Composer ─────────────────────────────────────────────────────
  async function fillFacebook(c, link, autoSubmit) {
    const composerSel = '[contenteditable][role="textbox"], [data-testid="status-attachment-mentions-input"]';
    await waitFor(composerSel, 6_000);
    const el = document.querySelector(composerSel);
    if (!el) return { ok: false, error: 'Facebook composer not found' };

    injectText(el, buildCaption(c, link, 'facebook'));
    if (!autoSubmit) return { ok: true };

    const posted = await clickButton([
      '[data-testid="react-composer-post-button"]',
      'button[name="post"]',
    ], /^post$/i, 1000);
    return { ok: true, posted };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function buildCaption(c, link, platform) {
    const tags   = (c.hashtags || []).join(' ');
    const script = Array.isArray(c.script) ? c.script.join('\n') : (c.script || '');
    const linkLine = link ? `\n\n🔗 สั่งซื้อ: ${link}` : '';

    if (platform === 'tiktok')
      return `${c.hook}\n\n${script}${linkLine}\n\n${c.caption}\n\n${tags}`;
    if (platform === 'instagram')
      return `${c.hook}\n\n${c.caption}${linkLine}\n\n${tags}`;
    return `${c.hook}\n\n${c.caption}${linkLine}\n\n${tags}`;
  }

  function injectText(el, text) {
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const desc = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')
                || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (desc?.set) desc.set.call(el, text);
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // contenteditable — use execCommand for SPA compatibility
      el.textContent = '';
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
      if (!el.textContent.trim()) {
        el.textContent = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
      }
    }
  }

  async function clickButton(selectors, textPattern, delayMs) {
    await wait(delayMs);
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) { btn.click(); return `clicked:${sel}`; }
    }
    // Text fallback
    const all = [...document.querySelectorAll('button, [role="button"]')];
    const btn = all.find(b => textPattern.test(b.textContent?.trim()));
    if (btn && !btn.disabled) { btn.click(); return 'clicked:text'; }
    return 'not_found';
  }

  function waitFor(sel, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(sel)) return resolve(document.querySelector(sel));
      const obs = new MutationObserver(() => {
        const el = document.querySelector(sel);
        if (el) { obs.disconnect(); resolve(el); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); reject(new Error(`Timeout: ${sel}`)); }, timeout);
    });
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));
})();
