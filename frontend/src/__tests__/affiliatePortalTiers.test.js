import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { AFFILIATE_TIERS } from '../../../backend/affiliate-tiers.js';

// The /portals/affiliate landing page shows a commission-tier table (rate + the
// lifetime-sales COUNT that unlocks it) to recruit affiliates. That table is
// hand-written copy in AffiliatePortalPage.jsx, but the ACTUAL rates an affiliate
// earns come from backend/affiliate-tiers.js (AFFILIATE_TIERS, consumed by
// creditAffiliateSale/tierForSales). Before this guard the page advertised
// 10/20/30% at ฿0/50k/200k thresholds while the code pays 20/30/40% at 0/10/50
// sales — every rate understated and the unit wrong (฿ vs sales count), so a
// recruit saw one deal and got paid another. This pins the displayed table to the
// real tier data so the two can't drift again (same source-structural approach as
// portalCategories.test.js / seoInvariants.test.js).
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'pages', 'portals', 'AffiliatePortalPage.jsx'), 'utf8');

// Source of truth, low→high rate: [{min:0,rate:0.20},{min:10,rate:0.30},{min:50,rate:0.40}]
const truth = [...AFFILIATE_TIERS].sort((a, b) => a.rate - b.rate);
const expectedRates = truth.map((t) => `${Math.round(t.rate * 100)}%`); // ['20%','30%','40%']
const expectedMins = truth.map((t) => String(t.min));                    // ['0','10','50']
const maxRate = expectedRates[expectedRates.length - 1];                  // '40%'

describe('/portals/affiliate tier table matches backend AFFILIATE_TIERS', () => {
  it('backend exposes exactly three tiers (0/10/50 sales → 20/30/40%)', () => {
    expect(expectedRates).toEqual(['20%', '30%', '40%']);
    expect(expectedMins).toEqual(['0', '10', '50']);
  });

  // The page repeats the tiers array once per language (th/en/zh) — every copy
  // must carry the real rate/threshold pairs.
  for (const rate of expectedRates) {
    it(`advertises the real rate ${rate} in each language block`, () => {
      const count = (src.match(new RegExp(`rate:'${rate}'`, 'g')) || []).length;
      expect(count, `rate:'${rate}' should appear 3x (th/en/zh)`).toBe(3);
    });
  }
  for (const min of expectedMins) {
    it(`advertises the real sales-count threshold ${min} in each language block`, () => {
      const count = (src.match(new RegExp(`min:'${min}'`, 'g')) || []).length;
      expect(count, `min:'${min}' should appear 3x (th/en/zh)`).toBe(3);
    });
  }

  it('never shows the stale understated rates (10%/20%… as a tier max)', () => {
    // The old wrong table had rate:'10%'. The real ladder starts at 20%.
    expect(/rate:'10%'/.test(src)).toBe(false);
  });

  it(`headline copy promises the real max commission (${maxRate}), not the old 30%`, () => {
    // 30% is a legit tier rate (Pro), so only the "max = 30%" claims must be gone:
    // "สูงสุด 30%" / "up to 30%" / "高达30%" / "最高30%". The real max is 40%.
    for (const stale of ['สูงสุด 30%', 'up to 30%', '高达30%', '最高30%']) {
      expect(src.includes(stale), `stale max-commission claim "${stale}" must be gone`).toBe(false);
    }
    expect(src.includes(maxRate)).toBe(true); // "40%" is now advertised as the max
  });
});
