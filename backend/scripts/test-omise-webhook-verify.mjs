import { createHmac } from 'node:crypto';
import { verifyOmiseWebhook } from '../omise-payment.js';

// Unit test for verifyOmiseWebhook — the guard that stops a forged Omise webhook from
// granting a free subscription/entitlement. A POST to /api/payment/webhook is trusted to
// mean "a real payment cleared"; the ONLY thing separating that from an attacker curling
// the endpoint is this HMAC-SHA256 check over the raw body. The revenue self-boot test
// asserts a bad signature → 401 through HTTP (secret set), but the pure function's most
// dangerous edge — FAIL CLOSED when OMISE_WEBHOOK_SECRET is unset (a common prod
// misconfig) — plus the length-mismatch / non-string cases that must reject without
// throwing, had no direct coverage. This pins them so a refactor can't silently open the hole.
const SECRET = 'whsec_test_123';
const rawBody = JSON.stringify({ key: 'charge.complete', data: { id: 'chrg_1', status: 'successful', amount: 29900 } });
const sign = (body, secret) => createHmac('sha256', secret).update(body).digest('hex');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const savedSecret = process.env.OMISE_WEBHOOK_SECRET;

console.log('=== with the secret set: only a correct signature over the exact body passes ===');
process.env.OMISE_WEBHOOK_SECRET = SECRET;
ok(verifyOmiseWebhook(rawBody, sign(rawBody, SECRET)) === true, 'a valid HMAC over the raw body → true');
ok(verifyOmiseWebhook(rawBody, sign(rawBody, 'wrong-secret')) === false, 'a signature made with the wrong secret → false');
ok(verifyOmiseWebhook(rawBody + ' ', sign(rawBody, SECRET)) === false, 'a tampered body (extra byte) invalidates the signature → false');
ok(verifyOmiseWebhook(rawBody, sign(rawBody, SECRET).replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))) === false, 'flipping one hex char of a same-length signature → false (timingSafeEqual path)');

console.log('\n=== the critical fail-closed: no secret configured → reject everything ===');
delete process.env.OMISE_WEBHOOK_SECRET;
ok(verifyOmiseWebhook(rawBody, sign(rawBody, SECRET)) === false, 'secret UNSET → false even for an otherwise-valid signature (forged webhooks can\'t grant free subs)');
ok(verifyOmiseWebhook(rawBody, '') === false, 'secret UNSET + empty signature → false');
process.env.OMISE_WEBHOOK_SECRET = '';
ok(verifyOmiseWebhook(rawBody, sign(rawBody, SECRET)) === false, 'secret set to empty string → false (falsy secret is treated as unconfigured)');

console.log('\n=== malformed / non-string signatures reject without throwing ===');
process.env.OMISE_WEBHOOK_SECRET = SECRET;
ok(verifyOmiseWebhook(rawBody, '') === false, 'empty signature → false');
ok(verifyOmiseWebhook(rawBody, 'deadbeef') === false, 'short (length-mismatch) signature → false, no throw');
ok(verifyOmiseWebhook(rawBody, undefined) === false, 'undefined signature → false, no throw');
ok(verifyOmiseWebhook(rawBody, null) === false, 'null signature → false, no throw');
ok(verifyOmiseWebhook(rawBody, 12345) === false, 'non-string signature → false, no throw');
ok(verifyOmiseWebhook(rawBody, sign(rawBody, SECRET).toUpperCase()) === false, 'right bytes but upper-cased hex → false (exact string match required)');

// restore env for any downstream tooling
if (savedSecret === undefined) delete process.env.OMISE_WEBHOOK_SECRET;
else process.env.OMISE_WEBHOOK_SECRET = savedSecret;

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
