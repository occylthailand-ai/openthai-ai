// Unit test for safeTokenEqual (backend/token-verify.js) — the constant-time
// comparison now used to verify every one-click confirm-link token (unsubscribe,
// PDPA erasure/access, affiliate withdrawal, payment-cancel). Deterministic, no
// server needed. Guards two things: it still accepts the exact correct token and
// rejects everything else, AND it never throws on the odd shapes a URL query param
// can take (undefined, array, wrong length) — a throw there would surface as a 500
// instead of a clean 403 on those security-sensitive links.
import { safeTokenEqual } from '../token-verify.js';
import { createHmac } from 'crypto';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };
// mirrors server.js unsubToken(): 16-hex-char truncated HMAC
const token = (email, type) => createHmac('sha256', 'test-secret').update(`${email}:${type}`).digest('hex').slice(0, 16);

console.log('\n=== accepts the exact correct token ===');
const good = token('a@shop.co', 'erasure');
ok(safeTokenEqual(good, good) === true, 'identical 16-hex tokens → true');
ok(safeTokenEqual(token('x@y.co', 'affiliate-withdraw'), token('x@y.co', 'affiliate-withdraw')) === true, 'same email+type recomputed → true');

console.log('\n=== rejects wrong tokens ===');
ok(safeTokenEqual(token('a@shop.co', 'erasure'), token('b@shop.co', 'erasure')) === false, 'different email → false');
ok(safeTokenEqual(token('a@shop.co', 'erasure'), token('a@shop.co', 'access')) === false, 'different type (erasure vs access) → false');
ok(safeTokenEqual('0000000000000000', good) === false, 'all-zeros guess → false');
ok(safeTokenEqual(good.slice(0, 15) + (good[15] === 'a' ? 'b' : 'a'), good) === false, 'one flipped last char → false');

console.log('\n=== never throws on the odd shapes a URL query param takes ===');
ok(safeTokenEqual(undefined, good) === false, 'undefined token → false (no throw)');
ok(safeTokenEqual(['a', 'b'], good) === false, 'array token (?token=a&token=b) → false (no throw)');
ok(safeTokenEqual(null, good) === false, 'null token → false');
ok(safeTokenEqual('', good) === false, 'empty string → false');
ok(safeTokenEqual('short', good) === false, 'wrong-length token → false (timingSafeEqual would otherwise throw)');
ok(safeTokenEqual(good, undefined) === false, 'undefined expected → false');
ok(safeTokenEqual(good + 'extra', good) === false, 'longer-than-expected token → false');

console.log('\n=== a value that stringifies the same is still compared as a string ===');
ok(safeTokenEqual(1234567890123456, token('n', 'n')) === false, 'number token (not a string) → false');

// checkAdminKey() now compares the master ADMIN_KEY with safeTokenEqual (not `===`), so the same
// function must be correct for arbitrary secret strings — variable length, symbols, non-hex — not
// only the 16-hex confirm-link tokens above.
console.log('\n=== correct for arbitrary admin-key-style secrets (used by checkAdminKey) ===');
const adminKey = 'otai-admin_9fK3!zQx-2026';
ok(safeTokenEqual(adminKey, adminKey) === true, 'exact admin key → true');
ok(safeTokenEqual('otai-admin_9fK3!zQx-2027', adminKey) === false, 'same-length but one char off → false (constant-time reject)');
ok(safeTokenEqual('wrong', adminKey) === false, 'shorter wrong key → false');
ok(safeTokenEqual(adminKey + 'x', adminKey) === false, 'longer wrong key → false');
ok(safeTokenEqual('', adminKey) === false, 'empty provided vs a set key → false (never authorises on blank)');

console.log(`\n${'='.repeat(48)}`);
console.log(`ผลทดสอบ: ✅ ${pass} ผ่าน · ❌ ${fail} ไม่ผ่าน`);
console.log('='.repeat(48));
process.exit(fail > 0 ? 1 : 0);
