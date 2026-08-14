import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import EarnHubPage from '../pages/EarnHubPage';

// Guard: /earn is a homepage hero CTA ("💸 หารายได้") and a shareable earning/affiliate landing
// (/earn?ref=CODE) — the same market-entry funnel as the rest of the site. It shipped fully hardcoded
// in Thai (hero goal, the TikTok/offer/products cards, the become-affiliate CTAs, share box and the
// 24/7 flow) with no i18n, so an affiliate sharing it (or a non-Thai visitor landing on it) still saw
// an all-Thai page. This renders EarnHubPage forced to 'en'/'zh' — with ?ref=TEST (exercises the
// affiliate-ref badge) and a stubbed /api/shop/products returning an English-named product (exercises
// the ready-to-ship products card) — and fails on any bare-Thai run (U+0E00–U+0E7F). The page has no
// language switcher, so NO Thai token is allowed (฿ is a currency symbol, not Thai script, so it is
// stripped before the check).

function textOutsideSvg(node) {
  let out = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) { out += child.textContent; continue; }
    if (child.nodeType !== 1) continue;
    if (child.tagName && child.tagName.toLowerCase() === 'svg') continue;
    out += textOutsideSvg(child);
  }
  return out;
}

function renderAt(lang) {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? lang : null));
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/earn?ref=TEST']}><EarnHubPage /></MemoryRouter>
    </LanguageProvider>,
  );
}

describe('/earn shows no stray Thai to non-Thai visitors', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true, products: [{ id: 1, name: 'Sample Product', price: 500, in_stock: true }] }),
    })));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  for (const lang of ['en', 'zh']) {
    it(`renders no un-localized Thai in the "${lang}" UI`, async () => {
      const { container, unmount } = renderAt(lang);
      // wait for the async /api/shop/products load so the products card is in the DOM under test
      await waitFor(() => expect(textOutsideSvg(container)).toContain('Sample Product'));
      const text = textOutsideSvg(container).replace(/฿/g, '');
      const runs = [...new Set((text.match(/[฀-๿]+/g) || []))];
      unmount();
      expect(runs).toEqual([]);
    });
  }

  it('renders the English copy when lang=en', () => {
    const { getByText, unmount } = renderAt('en');
    expect(getByText('💸 Earning Hub')).toBeTruthy();
    unmount();
  });

  it('renders the Chinese copy when lang=zh', () => {
    const { getByText, unmount } = renderAt('zh');
    expect(getByText('💸 赚钱中心')).toBeTruthy();
    unmount();
  });

  it('still renders Thai by default (no language chosen)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => null);
    const { getByText, unmount } = render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/earn']}><EarnHubPage /></MemoryRouter>
      </LanguageProvider>,
    );
    expect(getByText('💸 ศูนย์สร้างรายได้')).toBeTruthy();
    unmount();
  });
});
