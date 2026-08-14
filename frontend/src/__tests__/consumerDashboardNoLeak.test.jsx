import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import ConsumerDashboardPage from '../pages/ConsumerDashboardPage';

// Guard: the consumer dashboard (/consumer/dashboard) shows the consumer's interest category and each
// recommendation's category — both are canonical Thai category VALUES that must be localized for display
// via producerCategoryLabel(value, lang). If that localization regresses (raw value rendered), an
// English/Chinese consumer sees a Thai category string. This renders the loaded dashboard forced to en/zh
// and fails if any un-localized Thai run (U+0E00–U+0E7F) appears outside <svg>, or a raw mk.* i18n key
// leaks. Product name/producer/description are server-origin free text (English in this stub) — only the
// page's own chrome + the category labels are under test; the language switcher's own "ไทย" is allowed.
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

// interest + recommendation categories are canonical Thai values that live in portalCategories' map.
const feed = {
  success: true,
  consumer: { name: 'Alex', interest: 'สมุนไพร', created_at: '2026-08-10T00:00:00Z' },
  matched_count: 2,
  recommendations: [
    { producer: 'Herb Farm A', product_name: 'Herbal Balm', price: 120, category: 'สมุนไพร', description: 'All natural' },
    { producer: 'Herb Farm B', product_name: 'Herbal Tea', price: 90, category: 'สมุนไพร', description: 'Relaxing blend' },
  ],
};

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve(feed) })));
}

async function renderLoaded(lang) {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? lang : null));
  const { container, unmount } = render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/consumer/dashboard?email=shopper@x.com']}>
        <ConsumerDashboardPage />
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

describe('consumer dashboard localizes interest + recommendation categories (no raw key, no stray Thai)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  for (const lang of ['en', 'zh']) {
    it(`renders localized category labels in "${lang}" (no raw key / stray Thai)`, async () => {
      stubFetch();
      const { text, runs } = await renderLoaded(lang);
      expect(text, `raw i18n key leaked (${lang})`).not.toMatch(/mk\.cdash\./);
      expect(runs, `Thai leaked (${lang}): ${JSON.stringify(runs)}`).toEqual([]);
    });
  }
});
