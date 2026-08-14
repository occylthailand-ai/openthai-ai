import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import AffiliateProgramsPage from '../pages/AffiliateProgramsPage';

// Guard: /affiliate-programs is a public, shareable affiliate directory (reads ?ref=CODE) reachable
// from /earn. It shipped fully hardcoded in Thai — the page chrome AND the 57 program notes + 6 category
// labels/notes in src/data/affiliatePrograms.js — with no i18n, so an affiliate sharing the link, or a
// non-Thai visitor, saw an all-Thai directory. Data notes/labels are now { th, en, zh } and the chrome
// uses a local T dict. This renders forced to 'en'/'zh' and fails on any bare-Thai run (U+0E00–U+0E7F)
// in the rendered text OR the search placeholder. It also selects a category to exercise the per-cat
// note line. The page has no language switcher, so NO Thai token is allowed (฿ stripped first).

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
const thaiRuns = (s) => [...new Set(((s || '').replace(/฿/g, '').match(/[฀-๿]+/g) || []))];

function renderAt(lang) {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? lang : null));
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/affiliate-programs?ref=TEST']}><AffiliateProgramsPage /></MemoryRouter>
    </LanguageProvider>,
  );
}

describe('/affiliate-programs shows no stray Thai to non-Thai visitors', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }))); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  for (const lang of ['en', 'zh']) {
    it(`renders no un-localized Thai in the "${lang}" UI (all 57 programs + a selected category)`, () => {
      const { container, unmount } = renderAt(lang);
      // default view: header, pinned card, all category chips, all program notes, disclaimer
      expect(thaiRuns(textOutsideSvg(container))).toEqual([]);
      // search placeholder is an attribute, not textContent — check it too
      const input = container.querySelector('input');
      expect(thaiRuns(input?.getAttribute('placeholder'))).toEqual([]);
      // select the first category chip to render the per-category note line
      const chips = container.querySelectorAll('button');
      const firstCatChip = [...chips].find(b => /Thai|泰国/.test(b.textContent));
      if (firstCatChip) fireEvent.click(firstCatChip);
      expect(thaiRuns(textOutsideSvg(container))).toEqual([]);
      unmount();
    });
  }

  it('renders the English copy when lang=en', () => {
    const { getByText, unmount } = renderAt('en');
    expect(getByText('🔗 Affiliate Programs Directory')).toBeTruthy();
    unmount();
  });

  it('renders the Chinese copy when lang=zh', () => {
    const { getByText, unmount } = renderAt('zh');
    expect(getByText('🔗 联盟计划目录')).toBeTruthy();
    unmount();
  });

  it('still renders Thai by default (no language chosen)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => null);
    const { getByText, unmount } = render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/affiliate-programs']}><AffiliateProgramsPage /></MemoryRouter>
      </LanguageProvider>,
    );
    expect(getByText('🔗 ศูนย์รวมโปรแกรม Affiliate')).toBeTruthy();
    unmount();
  });
});
