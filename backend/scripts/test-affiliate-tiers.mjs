import { AFFILIATE_TIERS, tierForSales } from '../affiliate-tiers.js';

// Money-critical guard for the affiliate commission tiers. tierForSales(count)
// decides the commission rate an affiliate is promoted to, so a wrong boundary
// or a reordered array silently pays the wrong commission. Pure/deterministic.
// รัน: node scripts/test-affiliate-tiers.mjs
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const rate = (n) => tierForSales(n).rate;
const tier = (n) => tierForSales(n).tier;

console.log('\n=== boundaries: starter (0–9) → pro (10–49) → elite (50+) ===');
ok(tier(0) === 'starter' && rate(0) === 0.20, '0 sales → starter 20%');
ok(tier(9) === 'starter' && rate(9) === 0.20, '9 sales → still starter (just below pro)');
ok(tier(10) === 'pro' && rate(10) === 0.30, '10 sales → pro 30% (boundary is inclusive)');
ok(tier(49) === 'pro' && rate(49) === 0.30, '49 sales → still pro (just below elite)');
ok(tier(50) === 'elite' && rate(50) === 0.40, '50 sales → elite 40% (boundary is inclusive)');
ok(tier(1000) === 'elite' && rate(1000) === 0.40, 'far above → capped at elite 40%');

console.log('\n=== robustness ===');
ok(tier(undefined) === 'starter' && tier(null) === 'starter', 'undefined/null sales → starter (never crashes)');
ok(tier(-5) === 'starter', 'negative sales → starter (no lower tier than starter)');
// rate must never decrease as sales grow (promotions never demote)
let mono = true, prev = 0;
for (let n = 0; n <= 60; n++) { const r = rate(n); if (r < prev) mono = false; prev = r; }
ok(mono, 'rate is monotonic non-decreasing from 0..60 (a growing affiliate is never demoted)');
// every tier is actually reachable at its own min
ok(AFFILIATE_TIERS.every((t) => tierForSales(t.min).tier === t.tier), 'each tier is selected exactly at its own min threshold');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
