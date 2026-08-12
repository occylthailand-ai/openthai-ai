import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PortalHubPage from '../pages/PortalHubPage';
import ProducerPortalPage from '../pages/portals/ProducerPortalPage';
import ConsumerPortalPage from '../pages/portals/ConsumerPortalPage';
import MiddlemanPortalPage from '../pages/portals/MiddlemanPortalPage';
import AffiliatePortalPage from '../pages/portals/AffiliatePortalPage';
import CreatorPortalPage from '../pages/portals/CreatorPortalPage';

// Guard for the WHOLE consent-signup funnel — the /portals hub + every self-signup portal that a
// producer / consumer / middleman / affiliate / creator lands on. Each page localizes its title,
// benefits and form labels via its own in-page language toggle, but individual UI strings kept
// leaking hardcoded Thai to non-Thai visitors because they lived OUTSIDE the page's th/en/zh dict:
//   • ConsumerPortalPage / ProducerPortalPage — the product-category <select> options (canonical Thai
//     category values rendered raw; fixed to producerCategoryLabel(c, lang), value unchanged).
//   • PortalHubPage — the "← Home" back button, the locked "Not yet active" badge, and the locked
//     "opens when profit > 10M" line were all bare Thai literals.
//   • MiddlemanPortalPage — the business-type <select> (ตัวแทนจำหน่าย/ผู้ค้าส่ง/นายหน้า/…) was a
//     Thai-only list; localized the label while keeping the stored `value`.
//   • AffiliatePortalPage — the "ยอดขาย {min}+" (sales) label under each commission tier.
// A source scan can't catch these (the Thai only appears once rendered from a data list / literal),
// and the earlier producer-funnel guard only mounts /join + /find-producers — never these /portals/*
// pages, which are a separate signup path with their own language toggle. So this asserts on the real
// DOM: render each funnel page, click the English / 中文 toggle, and fail on any Thai run
// (U+0E00–U+0E7F) left in the UI outside <svg>. The only permitted bare-Thai token is the toggle's
// own "ไทย" button label. ฿ (currency sign) is stripped — it is script-neutral, not Thai text.
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

// The portal pages that carry a SeasonalAnglesPanel fetch /api/seasonal/angles; that panel is purely
// additive (renders null on any error). Reject the fetch so it stays null and the probe sees only the
// page chrome + form — otherwise a live seasonal payload would inject unrelated Thai and mask the check.
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

const PAGES = [
  ['PortalHubPage', PortalHubPage],
  ['ProducerPortalPage', ProducerPortalPage],
  ['ConsumerPortalPage', ConsumerPortalPage],
  ['MiddlemanPortalPage', MiddlemanPortalPage],
  ['AffiliatePortalPage', AffiliatePortalPage],
  ['CreatorPortalPage', CreatorPortalPage],
];

describe('consent-signup funnel shows no stray Thai to non-Thai visitors', () => {
  beforeEach(() => { stubFetch(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  for (const [name, Comp] of PAGES) {
    for (const [lang, btn] of [['en', 'English'], ['zh', '中文']]) {
      it(`${name} renders no un-localized Thai after switching to "${lang}"`, () => {
        const leaks = leaksFor(Comp, btn);
        expect(leaks, `un-localized Thai leaked into ${name} (${lang}): ${JSON.stringify(leaks)}`).toEqual([]);
      });
    }
  }
});
