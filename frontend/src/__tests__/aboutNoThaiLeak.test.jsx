import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import AboutPage from '../pages/AboutPage';

// Guard: /about is a public, sitemap-listed trust page. It shipped fully hardcoded in Thai (back
// button, header title, hero title + subtitle) with no i18n, so a visitor who picked English or
// Chinese on the homepage (persisted in otai_lang and read by useLang across the SPA) still saw a
// Thai About page. This renders AboutPage forced to 'en'/'zh' and fails on any Thai run
// (U+0E00–U+0E7F). The tech-skills chips (Artificial Intelligence, Python, …) are English already;
// the "About — Openthai.ai" subline is a fixed bilingual brand label. The only permitted bare-Thai
// token is the language-switcher's own name — and AboutPage has no switcher, so none should appear.
const ALLOWED = new Set(['ไทย']);

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

function thaiRuns(lang) {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? lang : null));
  const { container, unmount } = render(
    <LanguageProvider><MemoryRouter><AboutPage /></MemoryRouter></LanguageProvider>,
  );
  const text = textOutsideSvg(container).replace(/฿/g, '');
  const runs = [...new Set((text.match(/[฀-๿]+/g) || []))];
  unmount();
  vi.restoreAllMocks();
  return runs.filter((r) => !ALLOWED.has(r));
}

describe('/about shows no stray Thai to non-Thai visitors', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }))); });
  afterEach(() => { vi.unstubAllGlobals(); });

  for (const lang of ['en', 'zh']) {
    it(`renders no un-localized Thai in the "${lang}" UI`, () => {
      const leaks = thaiRuns(lang);
      expect(leaks, `un-localized Thai leaked into the ${lang} About page: ${JSON.stringify(leaks)}`).toEqual([]);
    });
  }
});
