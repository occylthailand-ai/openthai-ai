// Affiliate commission tiers — extracted from server.js so the money-critical
// tier boundaries can be unit-tested deterministically (see
// scripts/test-affiliate-tiers.mjs). Pure data + a pure function, no state.
//
// Ordered high→low `min` on purpose: tierForSales()'s Array.find() returns the
// FIRST match, i.e. the highest tier a given lifetime sales COUNT qualifies for.
// `rate` is the commission share paid on each qualifying sale.
export const AFFILIATE_TIERS = [
  { tier: 'elite',   min: 50, rate: 0.40 },
  { tier: 'pro',     min: 10, rate: 0.30 },
  { tier: 'starter', min: 0,  rate: 0.20 },
];

// Highest tier whose `min` lifetime-sales threshold is met by `sales`.
export function tierForSales(sales) {
  return AFFILIATE_TIERS.find((t) => (sales || 0) >= t.min) || AFFILIATE_TIERS[AFFILIATE_TIERS.length - 1];
}
