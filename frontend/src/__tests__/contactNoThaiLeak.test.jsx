import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import { ToastProvider } from '../components/ToastContext';
import ContactPage from '../pages/ContactPage';

// Guard: /contact is a public, nav/footer-linked page. It shipped fully hardcoded in Thai (header,
// hero, contact channels, response-time block, every form label + placeholder, subjects, buttons and
// toasts) with no i18n, so a visitor who picked English or Chinese (persisted in otai_lang, read by
// useLang across the SPA) still saw an all-Thai contact form. This renders ContactPage forced to
// 'en'/'zh' and fails on any bare-Thai run (U+0E00–U+0E7F). The page has no language switcher, so NO
// Thai token is allowed. The "Contact — Openthai.ai" subline + the email/website values are English.

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
    <LanguageProvider><MemoryRouter><ToastProvider><ContactPage /></ToastProvider></MemoryRouter></LanguageProvider>,
  );
}

describe('/contact shows no stray Thai to non-Thai visitors', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }))); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  for (const lang of ['en', 'zh']) {
    it(`renders no un-localized Thai in the "${lang}" UI`, () => {
      const { container, unmount } = renderAt(lang);
      const text = textOutsideSvg(container).replace(/฿/g, '');
      const runs = [...new Set((text.match(/[฀-๿]+/g) || []))];
      unmount();
      expect(runs).toEqual([]);
    });
  }

  it('renders the English copy when lang=en', () => {
    const { getByText, unmount } = renderAt('en');
    expect(getByText('Contact the Openthai.ai team')).toBeTruthy();
    unmount();
  });

  it('renders the Chinese copy when lang=zh', () => {
    const { getByText, unmount } = renderAt('zh');
    expect(getByText('联系 Openthai.ai 团队')).toBeTruthy();
    unmount();
  });

  it('still renders Thai by default (no language chosen)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => null);
    const { getByText, unmount } = render(
      <LanguageProvider><MemoryRouter><ToastProvider><ContactPage /></ToastProvider></MemoryRouter></LanguageProvider>,
    );
    expect(getByText('ติดต่อทีมงาน Openthai.ai')).toBeTruthy();
    unmount();
  });
});
