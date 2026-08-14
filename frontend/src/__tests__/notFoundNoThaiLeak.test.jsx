import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import NotFoundPage from '../pages/NotFoundPage';

// Guard: the 404 catch-all is the recovery page for every mistyped URL / broken inbound link, and it's
// a real funnel entry. It shipped fully hardcoded in Thai (title, description, both buttons) with no
// i18n, so a visitor who picked English or Chinese (persisted in otai_lang, read by useLang across the
// SPA) still hit a Thai 404 and likely bounced. This renders NotFoundPage forced to 'en'/'zh' and fails
// on any bare-Thai run (U+0E00–U+0E7F). The page has no language switcher, so NO Thai token is allowed.

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
  const r = render(<LanguageProvider><MemoryRouter><NotFoundPage /></MemoryRouter></LanguageProvider>);
  return r;
}

describe('404 page shows no stray Thai to non-Thai visitors', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }))); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  for (const lang of ['en', 'zh']) {
    it(`renders no un-localized Thai in the "${lang}" UI`, () => {
      const { container, unmount } = renderAt(lang);
      const text = textOutsideSvg(container);
      const runs = [...new Set((text.match(/[฀-๿]+/g) || []))];
      unmount();
      expect(runs).toEqual([]);
    });
  }

  it('renders the English copy when lang=en', () => {
    const { getByText, unmount } = renderAt('en');
    expect(getByText("This page doesn't exist")).toBeTruthy();
    unmount();
  });

  it('renders the Chinese copy when lang=zh', () => {
    const { getByText, unmount } = renderAt('zh');
    expect(getByText('页面不存在')).toBeTruthy();
    unmount();
  });

  it('still renders Thai by default (no language chosen)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => null);
    const { getByText, unmount } = render(<LanguageProvider><MemoryRouter><NotFoundPage /></MemoryRouter></LanguageProvider>);
    expect(getByText('หน้านี้ไม่มีอยู่')).toBeTruthy();
    unmount();
  });
});
