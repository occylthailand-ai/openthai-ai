import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PortalHubPage from '../pages/PortalHubPage';
import ProducerPortalPage from '../pages/portals/ProducerPortalPage';
import ConsumerPortalPage from '../pages/portals/ConsumerPortalPage';
import MiddlemanPortalPage from '../pages/portals/MiddlemanPortalPage';
import AffiliatePortalPage from '../pages/portals/AffiliatePortalPage';
import CreatorPortalPage from '../pages/portals/CreatorPortalPage';
import GovThaiPortalPage from '../pages/portals/GovThaiPortalPage';
import GovIntlPortalPage from '../pages/portals/GovIntlPortalPage';
import IntlOrgPortalPage from '../pages/portals/IntlOrgPortalPage';
import FoundationPortalPage from '../pages/portals/FoundationPortalPage';

// Guard for the WHOLE consent-signup funnel — the /portals hub + every portal a producer / consumer /
// middleman / affiliate / creator / government / international-org / foundation lands on and submits a
// lead from. Each page localizes its title, benefits and form labels via its own in-page language
// toggle, but individual UI strings kept leaking hardcoded Thai to non-Thai visitors because they
// lived OUTSIDE the page's th/en/zh dict, so switching the toggle never touched them:
//   • ConsumerPortalPage / ProducerPortalPage — the product-category <select> options.
//   • MiddlemanPortalPage — the business-type <select> options.
//   • PortalHubPage — the back button, locked badge, and locked "opens at 10M profit" line.
//   • AffiliatePortalPage — the "ยอดขาย {min}+" (sales) caption under each commission tier.
//   • GovThaiPortalPage — the MOU box title + body (an English-reading Thai-gov official saw one Thai
//     block among English content).
// A source scan can't catch these (the Thai only appears once rendered from a data list / literal),
// and the earlier producer-funnel guard only mounts /join + /find-producers — never these /portals/*
// pages, a separate signup path with their own toggle. So this asserts on the real DOM: render each
// funnel page, click each non-Thai language the page ACTUALLY offers, and fail on any Thai run
// (U+0E00–U+0E7F) left in the UI outside <svg>. The only permitted bare-Thai token is the toggle's own
// "ไทย" button label. ฿ (currency sign) is stripped — it is script-neutral, not Thai text.
//
// Each page's supported non-Thai languages are declared explicitly: most portals offer en+zh; the Thai
// government portal is intentionally th/en only (its audience is Thai officials), so it is checked in
// English only — this list is the single place that intent is recorded.
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

// Portal pages that carry a SeasonalAnglesPanel fetch /api/seasonal/angles; that panel is purely
// additive (renders null on any error). Reject the fetch so it stays null and the probe sees only the
// page chrome + form — otherwise a live seasonal payload would inject unrelated Thai and mask the check.
function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
}

function leaksFor(Comp, label) {
  const { container, getByText, unmount } = render(
    <MemoryRouter><Comp /></MemoryRouter>,
  );
  fireEvent.click(getByText(label)); // switch to the language under test via its toggle button
  const runs = thaiRuns(container);
  unmount();
  return runs;
}

// [displayName, component, [non-Thai language toggle labels this page offers]]
const PAGES = [
  ['PortalHubPage', PortalHubPage, ['English', '中文']],
  ['ProducerPortalPage', ProducerPortalPage, ['English', '中文']],
  ['ConsumerPortalPage', ConsumerPortalPage, ['English', '中文']],
  ['MiddlemanPortalPage', MiddlemanPortalPage, ['English', '中文']],
  ['AffiliatePortalPage', AffiliatePortalPage, ['English', '中文']],
  ['CreatorPortalPage', CreatorPortalPage, ['English', '中文']],
  ['GovThaiPortalPage', GovThaiPortalPage, ['English']], // th/en only by design
  ['GovIntlPortalPage', GovIntlPortalPage, ['English', '中文']],
  ['IntlOrgPortalPage', IntlOrgPortalPage, ['English', '中文']],
  ['FoundationPortalPage', FoundationPortalPage, ['English', '中文']],
];

describe('consent-signup funnel shows no stray Thai to non-Thai visitors', () => {
  beforeEach(() => { stubFetch(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  for (const [name, Comp, labels] of PAGES) {
    for (const label of labels) {
      it(`${name} renders no un-localized Thai after switching to "${label}"`, () => {
        const leaks = leaksFor(Comp, label);
        expect(leaks, `un-localized Thai leaked into ${name} (${label}): ${JSON.stringify(leaks)}`).toEqual([]);
      });
    }
  }
});
