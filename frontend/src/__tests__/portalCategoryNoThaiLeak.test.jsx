import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConsumerPortalPage from '../pages/portals/ConsumerPortalPage';
import ProducerPortalPage from '../pages/portals/ProducerPortalPage';

// Guard: the /portals/consumer and /portals/producer signup pages must be fully localized for the
// non-Thai visitor who switches the in-page language toggle to English/中文. Both pages localize
// their title/benefits/labels but rendered the product-category <select> options RAW — the canonical
// Thai category values (อาหาร, ความงาม, สมุนไพร, …) that the backend stores and the consumer digest
// matches on (p.category === category). Those values must NOT change (the digest match depends on
// them), so the fix localizes the DISPLAY label via producerCategoryLabel(c, lang) while the option
// `value` stays the Thai identifier. A source scan can't see this (the Thai only appears once the
// option list renders from the data array), and the existing producer-funnel guard only covers
// /join + /find-producers — never these /portals/* pages. So this asserts on the real DOM: render
// each page, click the language button, and fail on any Thai run (U+0E00–U+0E7F) left in the UI.
// The only permitted bare-Thai token is the language toggle's own "ไทย" button label.
const ALLOWED = new Set(['ไทย']); // language-toggle button label

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

// SeasonalAnglesPanel fetches /api/seasonal/angles and is purely additive (renders null on any
// error). Reject the fetch so the panel stays null and the probe sees only the form + category
// dropdown — otherwise a live seasonal payload would inject unrelated Thai and mask the real check.
function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
}

function leaksFor(Comp, label) {
  const { container, getByText, unmount } = render(
    <MemoryRouter><Comp /></MemoryRouter>,
  );
  fireEvent.click(getByText(label)); // switch the in-page language toggle
  const runs = thaiRuns(container);
  unmount();
  return runs;
}

describe('portal signup pages show no stray Thai to non-Thai visitors', () => {
  beforeEach(() => { stubFetch(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  for (const [name, Comp] of [['ConsumerPortalPage', ConsumerPortalPage], ['ProducerPortalPage', ProducerPortalPage]]) {
    for (const [lang, btn] of [['en', 'English'], ['zh', '中文']]) {
      it(`${name} renders no un-localized Thai after switching to "${lang}"`, () => {
        const leaks = leaksFor(Comp, btn);
        expect(leaks, `un-localized Thai leaked into ${name} (${lang}): ${JSON.stringify(leaks)}`).toEqual([]);
      });
    }
  }
});
