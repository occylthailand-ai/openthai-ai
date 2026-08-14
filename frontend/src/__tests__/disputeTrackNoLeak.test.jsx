import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import DisputeTrackPage from '../pages/DisputeTrackPage';

// Guard: the buyer/producer-facing dispute-status page (/dispute) renders three labels by DYNAMIC key
// suffix — mk.dispute.st.<status>, mk.dispute.openedby.<who>, mk.dispute.dec.<decision>. If any value
// the backend can produce lacks an i18n key, i18n's read() returns the RAW key, so a party in a live
// dispute sees "mk.dispute.st.resolved_supplier" instead of a real label — on a PDPA/trust-critical
// escrow screen. The canonical value sets are the backend's source of truth in backend/disputes.js:
//   DISPUTE_STATUS (line 12) · DECISIONS (line 17) · opened_by (line 111).
// This renders the loaded dispute view for EVERY status and EVERY decision, forced to en/zh, and fails
// if the DOM contains a raw "mk.dispute." key (a missing translation) or any un-localized Thai run
// (U+0E00–U+0E7F) outside <svg>. So adding a new dispute status/decision without its i18n key — in all
// three languages — breaks this test. Server-origin free text (reason/counter note) is English here so
// only the page's own labels are under test; only the LanguageSwitcher's own "ไทย" is allowed.
const STATUSES = ['open', 'ai_reviewed', 'resolved_supplier', 'resolved_buyer', 'refunded']; // disputes.js:12
const DECISIONS = ['favor_supplier', 'favor_buyer', 'refund'];                               // disputes.js:17
const OPENED_BY = ['buyer', 'producer'];                                                     // disputes.js:111
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

function disputeStub({ status, decision, opened_by }) {
  return {
    id: 'dsp_1', order_id: 'ord_1', opened_by, reason: 'Item never arrived',
    status,
    counter_response: { note: 'Shipped on time, tracking shows delivered' },
    resolution: decision ? { decision, resolved_at: '2026-08-05T09:00:00Z' } : null,
  };
}

function stubFetch(dispute) {
  vi.stubGlobal('fetch', vi.fn((url) => {
    if (String(url).includes('/track')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, dispute }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
  }));
}

async function renderLoaded(dispute, lang) {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? lang : null));
  const { container, unmount } = render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/dispute?id=dsp_1&contact=buyer@x.com']}>
        <DisputeTrackPage />
      </MemoryRouter>
    </LanguageProvider>,
  );
  await waitFor(() => expect(container.textContent).toContain('Item never arrived'));
  const text = textOutsideSvg(container);
  const runs = thaiRuns(container);
  unmount();
  vi.restoreAllMocks();
  return { text, runs };
}

describe('dispute-status page localizes every backend status/decision (no raw key, no stray Thai)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  for (const lang of ['en', 'zh']) {
    for (const status of STATUSES) {
      it(`status "${status}" renders a real label in "${lang}" (no raw key / Thai)`, async () => {
        const dispute = disputeStub({ status, decision: 'favor_buyer', opened_by: 'buyer' });
        stubFetch(dispute);
        const { text, runs } = await renderLoaded(dispute, lang);
        expect(text, `raw i18n key leaked for status ${status} (${lang})`).not.toMatch(/mk\.dispute\./);
        expect(runs, `Thai leaked for status ${status} (${lang}): ${JSON.stringify(runs)}`).toEqual([]);
      });
    }
    for (const decision of DECISIONS) {
      it(`decision "${decision}" + opened_by variants render real labels in "${lang}"`, async () => {
        const dispute = disputeStub({ status: 'resolved_buyer', decision, opened_by: OPENED_BY[decision === 'refund' ? 1 : 0] });
        stubFetch(dispute);
        const { text, runs } = await renderLoaded(dispute, lang);
        expect(text, `raw i18n key leaked for decision ${decision} (${lang})`).not.toMatch(/mk\.dispute\./);
        expect(runs, `Thai leaked for decision ${decision} (${lang}): ${JSON.stringify(runs)}`).toEqual([]);
      });
    }
  }
});
