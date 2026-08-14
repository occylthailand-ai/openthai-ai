// Unit test for the affiliate payout invariant (backend/affiliate-payout.js) —
// deterministic, no server/SMTP needed. Guards the money-critical rule that an
// admin "paid" action can never push paid_out beyond total_earned, including the
// resurrected-request over-pay path reservedFor() can't see (reject → pay a new
// full-balance request → re-approve+pay the rejected one).
import { payoutRemaining, canPayout } from '../affiliate-payout.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };
const approx = (a, b) => Math.abs(a - b) < 1e-9;

console.log('\n=== payoutRemaining ===');
ok(approx(payoutRemaining({ total_earned: 2300, paid_out: 0 }), 2300), 'earned 2300, paid 0 → remaining 2300');
ok(approx(payoutRemaining({ total_earned: 2300, paid_out: 300 }), 2000), 'earned 2300, paid 300 → remaining 2000');
ok(approx(payoutRemaining({ total_earned: 2300, paid_out: 2300 }), 0), 'fully paid → remaining 0');
ok(approx(payoutRemaining({}), 0), 'empty affiliate → 0 (no NaN)');
ok(approx(payoutRemaining({ total_earned: 100, paid_out: 250 }), 0), 'over-paid drift → clamped to 0 (never negative)');
ok(approx(payoutRemaining({ total_earned: 0.1 + 0.2, paid_out: 0.2 }), 0.1), 'float noise rounded to 2dp (0.3-0.2 → 0.10)');

console.log('\n=== canPayout ===');
ok(canPayout({ total_earned: 2300, paid_out: 0 }, 2300) === true, 'pay exactly the full remaining → allowed');
ok(canPayout({ total_earned: 2300, paid_out: 0 }, 100) === true, 'pay part of the remaining → allowed');
ok(canPayout({ total_earned: 2300, paid_out: 2300 }, 100) === false, 'nothing left to pay → blocked');
ok(canPayout({ total_earned: 2300, paid_out: 2000 }, 500) === false, 'amount 500 > remaining 300 → blocked');
ok(canPayout({ total_earned: 2300, paid_out: 0 }, 0) === false, 'zero amount → blocked');
ok(canPayout({ total_earned: 2300, paid_out: 0 }, -50) === false, 'negative amount → blocked');

console.log('\n=== the over-pay path this guard exists to stop ===');
// aff earns 2000. Request A (2000) is rejected; request B (2000) is requested and PAID
// (paid_out=2000). An admin then resurrects A (rejected→approved→paid). At that point
// remaining = 2000-2000 = 0, so paying A again must be refused.
const affAfterB = { total_earned: 2000, paid_out: 2000 };
ok(payoutRemaining(affAfterB) === 0, 'after paying request B in full, remaining is 0');
ok(canPayout(affAfterB, 2000) === false, 'resurrected request A cannot be paid again (would double paid_out to 4000)');

console.log(`\n${'='.repeat(48)}`);
console.log(`ผลทดสอบ: ✅ ${pass} ผ่าน · ❌ ${fail} ไม่ผ่าน`);
console.log('='.repeat(48));
process.exit(fail > 0 ? 1 : 0);
