import { describe, it, expect } from 'vitest';
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

  it('every plan advertised on /pricing is actually purchasable (exists in checkout)', () => {
    // PricingPage routes each non-free card to /payment?plan=<id>; PaymentPage must
    // recognise it or the funnel silently falls back to Pro (the Enterprise bug).
    for (const id of Object.keys(pricingPrice)) {
      expect(paymentPrice, `checkout must include advertised plan "${id}"`).toHaveProperty(id);
    }
  });
});
