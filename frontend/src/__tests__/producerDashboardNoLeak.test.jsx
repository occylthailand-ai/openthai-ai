import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import ProducerDashboardPage from '../pages/ProducerDashboardPage';

// Guard: the producer dashboard (/producer/dashboard) renders producer status + order-status labels by
// DYNAMIC key suffix — mk.pmanage.st.<status> and mk.pdash.os.<orderStatus>. If any value the backend
// can return lacks an i18n key, i18n's read() returns the RAW key, so an English/Chinese producer sees
// "mk.pdash.os.out_for_delivery" instead of a real label. The canonical value sets are the backend's
// source of truth: producer status = producers.js register()/admin status; order status =
// orders.js ORDER_STATUS (['new','confirmed','packed','shipped','out_for_delivery','delivered','cancelled']).
// This renders the loaded dashboard for EVERY order status forced to en/zh and fails if the DOM contains a
// raw "mk." key (a missing translation) or any un-localized Thai run (U+0E00–U+0E7F) outside <svg>. Adding
// a new order/producer status without its i18n key in all three languages breaks this test.
const ORDER_STATUS = ['new', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']; // orders.js
const PRODUCER_STATUS = ['pending', 'approved', 'rejected', 'suspended'];
const ALLOWED = new Set(['ไทย']); // the language switcher's own label

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

function feedStub(producerStatus) {
  // one order per status so every mk.pdash.os.* key is exercised in a single render
  const orders = ORDER_STATUS.map((st, i) => ({
    id: `ord_${i}`, product_name: `Item ${i}`, qty: i + 1, amount: (i + 1) * 100, status: st,
    created_at: `2026-08-0${i + 1}T00:00:00Z`, history: [],
  }));
  return {
    success: true,
    producer: { status: producerStatus, company: 'Test Co', product_name: 'Item', category: 'x', stock: 10, price: 100 },
    orders,
    summary: { total: 7, active: 6, to_handle: 3, delivered: 1, cancelled: 1, value_total: 2100 },
  };
}

function stubFetch(feed) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve(feed) })));
}

async function renderLoaded(feed, lang) {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? lang : null));
  const { container, unmount } = render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/producer/dashboard?email=maker@x.com']}>
        <ProducerDashboardPage />
      </MemoryRouter>
    </LanguageProvider>,
  );
  await waitFor(() => expect(container.textContent).toContain('Item 0'));
  const text = textOutsideSvg(container);
  const runs = thaiRuns(container);
  unmount();
  vi.restoreAllMocks();
  return { text, runs };
}

describe('producer dashboard localizes every order/producer status (no raw key, no stray Thai)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  for (const lang of ['en', 'zh']) {
    for (const pStatus of PRODUCER_STATUS) {
      it(`producer status "${pStatus}" + all order statuses render real labels in "${lang}"`, async () => {
        stubFetch(feedStub(pStatus));
        const { text, runs } = await renderLoaded(feedStub(pStatus), lang);
        expect(text, `raw i18n key leaked (${pStatus}/${lang})`).not.toMatch(/mk\.(pdash|pmanage)\./);
        expect(runs, `Thai leaked (${pStatus}/${lang}): ${JSON.stringify(runs)}`).toEqual([]);
      });
    }
  }
});
