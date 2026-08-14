import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import TrackOrderPage from '../pages/TrackOrderPage';

// Guard: the buyer-facing order-tracking page (/track) must be fully localized for the non-Thai buyer
// who paid and now wants to follow their order — a trust-critical, post-purchase, market-entry surface.
// Its highest-risk strings (the status timeline via stLabel, the shipping/delivery detail rows, the
// timeline history, and the dispute CTA) only appear once an ORDER LOADS, which a static render-probe
// of the empty form never reaches. So this stubs /api/orders/track to return a rich order and drives
// the auto-track-on-mount path (?id=&contact= in the URL), then, forced to en/zh, fails on any Thai run
// (U+0E00–U+0E7F) left in the DOM outside <svg>. The order's own server-side fields (product_name,
// history notes) are supplied in English so the only text under test is the page's own copy — a real
// Thai order note is dynamic data, not a localization bug. Only "ไทย" (the LanguageSwitcher's own
// option label) is allowed.
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

// A delivered order that exercises every conditional branch: the full status timeline (status far
// enough along that early steps are "done"), shipping detail, delivered detail, and a multi-entry
// history. All server-origin text is English so it can't itself trip the Thai probe.
const ORDER = {
  product_name: 'Organic Herbal Tea', qty: 2, created_at: '2026-08-01T03:00:00Z',
  status: 'delivered', carrier: 'Kerry', tracking_no: 'KE123456789',
  received_by: 'Front desk', drop_off: 'Lobby', delivered_at: '2026-08-05T09:00:00Z',
  history: [
    { status: 'new', note: 'placed', at: '2026-08-01T03:00:00Z' },
    { status: 'confirmed', note: 'paid', at: '2026-08-01T03:05:00Z' },
    { status: 'shipped', note: 'handed to carrier', at: '2026-08-03T02:00:00Z' },
    { status: 'delivered', note: 'signed', at: '2026-08-05T09:00:00Z' },
  ],
};

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn((url) => {
    if (String(url).includes('/api/orders/track')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, order: ORDER }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
  }));
}

async function leaksFor(lang) {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? lang : null));
  const { container, unmount } = render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/track?id=ord_1&contact=buyer@x.com']}>
        <TrackOrderPage />
      </MemoryRouter>
    </LanguageProvider>,
  );
  // wait for the auto-track-on-mount fetch to resolve and the loaded order to render
  await waitFor(() => expect(container.textContent).toContain('Organic Herbal Tea'));
  const runs = thaiRuns(container);
  unmount();
  vi.restoreAllMocks();
  return runs;
}

describe('order-tracking page shows no stray Thai to a non-Thai buyer (loaded-order state)', () => {
  beforeEach(() => { stubFetch(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  for (const lang of ['en', 'zh']) {
    it(`renders no un-localized Thai in the loaded /track view ("${lang}")`, async () => {
      const leaks = await leaksFor(lang);
      expect(leaks, `un-localized Thai leaked into /track (${lang}): ${JSON.stringify(leaks)}`).toEqual([]);
    });
  }
});
