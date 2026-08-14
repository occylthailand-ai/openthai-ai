import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import MiddlemanDashboardPage from '../pages/MiddlemanDashboardPage';

// Guard: the middleman dashboard (/middleman/dashboard) shows the middleman's business_type (a canonical
// bilingual value stored on the lead) and each demand/product category — all localized for display via
// businessTypeLabel / producerCategoryLabel. If that localization regresses, an English/Chinese
// distributor sees a Thai string. This renders the loaded dashboard forced to en/zh and fails if any
// un-localized Thai run (U+0E00–U+0E7F) appears outside <svg>, or a raw mk.* key leaks. The territory
// (region) and product name/producer/description are server-origin free text (English in this stub) — only
// the page's own chrome + the business-type/category labels are under test; "ไทย" (switcher) is allowed.
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
function thaiRuns(container) {
  const text = textOutsideSvg(container).replace(/฿/g, '');
  return [...new Set((text.match(/[฀-๿]+/g) || []))].filter((r) => !ALLOWED.has(r));
}

// business_type is a canonical value from businessTypes.js; categories are canonical values from
// portalCategories' map — both must localize. region + free text are English so only labels are tested.
const feed = {
  success: true,
  middleman: { name: 'Alex Co', business_type: 'ตัวแทนจำหน่าย (Distributor)', region: 'North', created_at: '2026-08-10T00:00:00Z' },
  distribute: [
    { producer: 'Herb Farm', product_name: 'Herbal Balm', price: 120, category: 'สมุนไพร', description: 'All natural' },
  ],
  demand: [
    { category: 'สมุนไพร', count: 2 },
    { category: 'อาหาร', count: 1 },
  ],
};

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve(feed) })));
}

async function renderLoaded(lang) {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? lang : null));
  const { container, unmount } = render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/middleman/dashboard?email=broker@x.com']}>
        <MiddlemanDashboardPage />
      </MemoryRouter>
    </LanguageProvider>,
  );
  await waitFor(() => expect(container.textContent).toContain('Herbal Balm'));
  const text = textOutsideSvg(container);
  const runs = thaiRuns(container);
  unmount();
  vi.restoreAllMocks();
  return { text, runs };
}

describe('middleman dashboard localizes business type + categories (no raw key, no stray Thai)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  for (const lang of ['en', 'zh']) {
    it(`renders localized business-type + category labels in "${lang}" (no raw key / stray Thai)`, async () => {
      stubFetch();
      const { text, runs } = await renderLoaded(lang);
      expect(text, `raw i18n key leaked (${lang})`).not.toMatch(/mk\.mdash\./);
      expect(runs, `Thai leaked (${lang}): ${JSON.stringify(runs)}`).toEqual([]);
    });
  }
});
