import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import ProducerJoinPage from '../pages/ProducerJoinPage';
import ProducerDirectoryPage from '../pages/ProducerDirectoryPage';

// Guard: the producer funnel — /join (producer signup, part of the consent funnel) and
// /find-producers (the directory) — must be fully localized for non-Thai visitors. Both pages
// showed the product-category values (อาหาร, ความงาม, …) raw: /join in its <select>, the directory
// in its filter dropdown AND in each producer card's category tag. Those values are the canonical
// Thai identifiers the backend stores, so they can't change — the fix localizes the DISPLAY via
// producerCategoryLabel(). A source scan misses this (the Thai only appears once rendered from the
// data list), so this asserts on the real DOM: render each page forced to 'en'/'zh' and fail on any
// Thai run (U+0E00–U+0E7F). The only permitted bare-Thai token is the language switcher's own label.
const ALLOWED = new Set(['ไทย']); // language-switcher option label

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

// A producer whose category is a real Thai category value — so the directory card's category tag
// is exercised (it would leak the raw value if the card weren't localized).
const PRODUCER = { company: 'Thai Herbs Co', product_name: 'Organic Tea', category: 'สมุนไพร', price: 120, description: 'x' };

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn((url) => {
    const u = String(url);
    if (u.includes('/api/producers/categories')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, categories: ['OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'เฟอร์นิเจอร์', 'เกษตร', 'อาหารสัตว์เลี้ยง', 'สินค้าดิจิทัล', 'อื่นๆ'] }) });
    }
    if (u.includes('/api/producers/search')) {
      return Promise.resolve({ json: () => Promise.resolve({ producers: [PRODUCER] }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
  }));
}

async function leaksFor(Comp, lang) {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? lang : null));
  const { container, unmount } = render(
    <LanguageProvider><MemoryRouter><Comp /></MemoryRouter></LanguageProvider>,
  );
  // let the mounted fetches (categories + search) resolve and re-render
  await waitFor(() => {});
  const runs = thaiRuns(container);
  unmount();
  vi.restoreAllMocks();
  return runs;
}

describe('producer funnel shows no stray Thai to non-Thai visitors', () => {
  beforeEach(() => { stubFetch(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  for (const [name, Comp] of [['ProducerJoinPage', ProducerJoinPage], ['ProducerDirectoryPage', ProducerDirectoryPage]]) {
    for (const lang of ['en', 'zh']) {
      it(`${name} renders no un-localized Thai in the "${lang}" UI`, async () => {
        const leaks = await leaksFor(Comp, lang);
        expect(leaks, `un-localized Thai leaked into ${name} (${lang}): ${JSON.stringify(leaks)}`).toEqual([]);
      });
    }
  }
});
