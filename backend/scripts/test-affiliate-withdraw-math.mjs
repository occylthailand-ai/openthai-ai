// Unit test for the affiliate withdraw-REQUEST money invariant
// (backend/affiliate-withdraw-math.js) — deterministic, no server/SMTP.
//
// Complements test-affiliate-payout.mjs (the admin PAY side). This guards the
// REQUEST side: how much an affiliate may ask to withdraw right now must subtract
// funds already RESERVED by in-flight requests (pending/approved), so several
// requests that each fit the earned balance can't together exceed it and make the
// platform owe more than was earned. server.js's withdraw route rejects any
// amount > affAvailable(aff, withdrawals).
import { reservedFor, affAvailable } from '../affiliate-withdraw-math.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const approx = (a, b) => Math.abs(a - b) < 1e-9;

const aff = { ref_code: 'AFF1', total_earned: 1000, paid_out: 0 };

console.log('\n=== reservedFor: only pending/approved lock funds ===');
const wds = [
  { ref_code: 'AFF1', amount: 300, status: 'pending' },
  { ref_code: 'AFF1', amount: 200, status: 'approved' },
  { ref_code: 'AFF1', amount: 150, status: 'paid' },      // already in paid_out — must NOT reserve
  { ref_code: 'AFF1', amount: 500, status: 'rejected' },  // freed — must NOT reserve
  { ref_code: 'AFF2', amount: 999, status: 'pending' },   // another affiliate — must NOT count
];
ok(reservedFor(wds, 'AFF1') === 500, `pending+approved for AFF1 reserved (300+200=500), got ${reservedFor(wds, 'AFF1')}`);
ok(reservedFor(wds, 'AFF1') !== 650, "a 'paid' request does not double-reserve on top of paid_out");
ok(reservedFor([], 'AFF1') === 0, 'no withdrawals → 0 reserved (no crash on empty)');
ok(reservedFor(undefined, 'AFF1') === 0, 'undefined withdrawals → 0 (defensive)');
ok(reservedFor(wds, 'AFF2') === 999, 'reservation is scoped per ref_code');

console.log('\n=== affAvailable: earned − paid − reserved ===');
ok(approx(affAvailable(aff, []), 1000), 'nothing reserved/paid → full earned available');
ok(approx(affAvailable(aff, wds), 500), `500 reserved → 500 available (1000−0−500), got ${affAvailable(aff, wds)}`);
ok(approx(affAvailable({ ref_code: 'AFF1', total_earned: 1000, paid_out: 400 }, wds), 100), 'earned 1000 − paid 400 − reserved 500 = 100');
ok(approx(affAvailable({}, []), 0), 'empty affiliate → 0 (no NaN)');

console.log('\n=== the double-request over-withdraw this guard exists to stop ===');
// Affiliate earns 1000. Requests A=1000 (pending → reserves 1000). A second request
// must see 0 available, so the withdraw route rejects amount > 0. Without reservedFor,
// both requests would pass the earned-balance check and total 2000 owed on 1000 earned.
const afterA = [{ ref_code: 'AFF1', amount: 1000, status: 'pending' }];
ok(affAvailable(aff, afterA) === 0, 'after a pending full-balance request, available is 0');
const availForSecond = affAvailable(aff, afterA);
ok(!(1 > availForSecond) === false, 'any positive second request (amount > available) is refused'); // 1 > 0 → refused
ok(approx(affAvailable(aff, afterA.concat({ ref_code: 'AFF1', amount: 1, status: 'pending' })), -1),
  'over-reserved drift reads negative (server rejects all requests either way) — matches server.js (no clamp)');

console.log('\n=== float safety (satang rounding) ===');
ok(approx(affAvailable({ ref_code: 'AFF1', total_earned: 0.1 + 0.2, paid_out: 0.2 }, []), 0.1),
  'float noise rounded to 2dp (0.3−0.2 → 0.10)');

console.log(`\n${'='.repeat(48)}`);
console.log(`ผลทดสอบ: ✅ ${pass} ผ่าน · ❌ ${fail} ไม่ผ่าน`);
console.log('='.repeat(48));
process.exit(fail > 0 ? 1 : 0);
