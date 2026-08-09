import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import LandingPage from '../pages/LandingPage';

// Guard: the homepage (#1 market-entry page, targets Thai + global markets) must be fully localized —
// an English or Chinese visitor should see NO Thai text. Source scans miss strings that only appear once
// rendered (they hid inside template literals / child props), so this asserts on the real DOM: it renders
// LandingPage under LanguageProvider forced to 'en' (and 'zh') and fails if any Thai (U+0E00–U+0E7F) is
// shown. Three hardcoded-Thai leaks were fixed this way (footer About, hero/skills labels, the "เริ่มหารายได้"
// CTA); this pins that they can't come back.
//
// Two Thai tokens are LEGITIMATE and excluded, by design not by allowlisting a bug:
//   • the logo is an inline <svg> whose glyph is the Thai letter "อ" (brand art) → SVG subtrees are skipped
//   • the language switcher shows each language's name in its OWN script, so "ไทย" is correct in every UI
//     language → the language-name label is the only bare-Thai token permitted
const ALLOWED = new Set(['ไทย']); // language-switcher option label (see src/i18n LANGS)

// Collect visible text, skipping any <svg> subtree (the logo).
function textOutsideSvg(node) {
  let out = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) { out += child.textContent; continue; }        // text node
    if (child.nodeType !== 1) continue;                                       // non-element
    if (child.tagName && child.tagName.toLowerCase() === 'svg') continue;     // skip logo art
    out += textOutsideSvg(child);
  }
  return out;
}

function thaiRuns(lang) {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? lang : null));
  const { container, unmount } = render(
    <LanguageProvider><MemoryRouter><LandingPage /></MemoryRouter></LanguageProvider>,
  );
  const text = textOutsideSvg(container).replace(/฿/g, ''); // ฿ (Baht sign) is a currency symbol, not text
  const runs = [...new Set((text.match(/[฀-๿]+/g) || []))];
  unmount();
  vi.restoreAllMocks();
  return runs.filter((r) => !ALLOWED.has(r));
}

describe('homepage shows no stray Thai to non-Thai visitors', () => {
  beforeEach(() => {
    // LandingPage fetches /api/skills on mount; keep it from throwing in jsdom.
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, total: 18, active: 18, categories: ['a', 'b'] }) })));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  for (const lang of ['en', 'zh']) {
    it(`renders no un-localized Thai in the "${lang}" UI`, () => {
      const leaks = thaiRuns(lang);
      expect(leaks, `un-localized Thai leaked into the ${lang} homepage: ${JSON.stringify(leaks)}`).toEqual([]);
    });
  }
});
