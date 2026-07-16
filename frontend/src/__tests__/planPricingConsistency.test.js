import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PLANS } from '../pages/PaymentPage';       // checkout tiers (what actually charges)
import { PP_META } from '../pages/PricingPage';      // /pricing cards → route to /payment?plan=<id>
import { PLAN_META } from '../pages/LandingPage';    // marketing landing pricing cards

// Guards the exact class of bug fixed on 2026-07-15: the frontend duplicates the
// canonical plan set (backend SUBSCRIPTION_PLANS = free/pro/premier/enterprise at
// 0/299/599/1299 THB) across three hand-maintained arrays. When one drifts, real
// money bugs ship silently — PaymentPage once carried placeholder ฿20/฿30 while
// /pricing showed ฿299/฿599, and Enterprise was advertised+clickable everywhere
// but missing from PaymentPage.PLANS, so selecting it silently charged Pro ฿299.
// These assertions fail if any source drifts from the others or from canon.

// Canonical prices — must equal backend SUBSCRIPTION_PLANS.price_thb (omise-payment.js).
const CANON = { free: 0, pro: 299, premier: 599, enterprise: 1299 };
const num = (p) => Number(String(p).replace(/,/g, '')); // LandingPage uses '1,299' strings

const paymentPrice = Object.fromEntries(PLANS.map((p) => [p.key, num(p.price)]));
const pricingPrice = Object.fromEntries(PP_META.map((m) => [m.id, num(m.thb)]));
const landingPrice = Object.fromEntries(PLAN_META.map((m) => [m.id, num(m.price)]));

describe('plan pricing consistency across the frontend', () => {
  it('every source lists exactly the canonical plan keys', () => {
    const canonKeys = Object.keys(CANON).sort();
    expect(Object.keys(paymentPrice).sort()).toEqual(canonKeys);
    expect(Object.keys(pricingPrice).sort()).toEqual(canonKeys);
    expect(Object.keys(landingPrice).sort()).toEqual(canonKeys);
  });

  it('each source prices every plan at the canonical THB amount', () => {
    for (const [key, thb] of Object.entries(CANON)) {
      expect(paymentPrice[key], `PaymentPage ${key}`).toBe(thb);
      expect(pricingPrice[key], `PricingPage ${key}`).toBe(thb);
      expect(landingPrice[key], `LandingPage ${key}`).toBe(thb);
    }
  });

  it('index.html JSON-LD Offer prices match canon (what Google shows in rich results)', () => {
    // The structured-data offers in index.html are the ONE pricing source not covered
    // above — and they are hand-maintained. If they drift, Google advertises a price
    // that no longer matches checkout (a trust/SEO defect: rich-result price ≠ what we
    // charge). Parse the ld+json @graph and pin the SoftwareApplication offers to canon.
    const here = dirname(fileURLToPath(import.meta.url));
    const html = readFileSync(join(here, '..', '..', 'index.html'), 'utf8');
    const m = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    expect(m, 'index.html has a ld+json block').toBeTruthy();
    const graph = JSON.parse(m[1])['@graph'];
    const app = graph.find((n) => n['@type'] === 'SoftwareApplication');
    expect(app?.offers, 'SoftwareApplication has offers').toBeTruthy();
    const offerPrice = Object.fromEntries(app.offers.map((o) => [String(o.name).toLowerCase(), num(o.price)]));
    expect(Object.keys(offerPrice).sort()).toEqual(Object.keys(CANON).sort());
    for (const [key, thb] of Object.entries(CANON)) {
      expect(offerPrice[key], `JSON-LD Offer ${key}`).toBe(thb);
      expect(app.offers.find((o) => String(o.name).toLowerCase() === key)?.priceCurrency, `JSON-LD Offer ${key} currency`).toBe('THB');
    }
  });

  it('every plan advertised on /pricing is actually purchasable (exists in checkout)', () => {
    // PricingPage routes each non-free card to /payment?plan=<id>; PaymentPage must
    // recognise it or the funnel silently falls back to Pro (the Enterprise bug).
    for (const id of Object.keys(pricingPrice)) {
      expect(paymentPrice, `checkout must include advertised plan "${id}"`).toHaveProperty(id);
    }
  });
});
