// Pins the LINE webhook signature check to FAIL CLOSED. The check used to be inline in server.js
// as `if (LINE_CHANNEL_SECRET && signature) { verify }`, which skipped verification entirely when
// the secret was set but the request omitted the x-line-signature header — so an attacker could
// inject fake LINE events (fake follows/messages/userIds into the CRM) just by not sending a
// signature. verifyLineSignature() now returns false in that case; server.js drops the request.
import { createHmac } from 'crypto';
import { verifyLineSignature } from '../line-signature.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const SECRET = 'test-line-channel-secret';
const body = Buffer.from(JSON.stringify({ events: [{ type: 'message', source: { userId: 'U123' } }] }), 'utf8');
const goodSig = createHmac('sha256', SECRET).update(body).digest('base64');

console.log('=== verifyLineSignature fails CLOSED when a secret is configured ===');
ok(verifyLineSignature(body, goodSig, SECRET) === true, 'valid signature → true (accepted)');
// THE BUG THIS GUARDS: secret set, but the request carries no signature header → must be false.
ok(verifyLineSignature(body, '', SECRET) === false, 'secret set + EMPTY signature → false (rejected, not skipped)');
ok(verifyLineSignature(body, undefined, SECRET) === false, 'secret set + MISSING signature header → false (rejected)');
ok(verifyLineSignature(body, null, SECRET) === false, 'secret set + null signature → false (rejected)');
ok(verifyLineSignature(body, 'not-a-valid-signature', SECRET) === false, 'secret set + garbage signature → false');
ok(verifyLineSignature(body, goodSig + 'x', SECRET) === false, 'secret set + wrong-length signature → false (no throw)');
// a signature that is valid for a DIFFERENT body must not verify this one (tamper detection)
const otherSig = createHmac('sha256', SECRET).update(Buffer.from('{}')).digest('base64');
ok(verifyLineSignature(body, otherSig, SECRET) === false, 'signature computed over a different body → false');

console.log('\n=== dev mode (no secret configured) is a distinct signal, never a silent accept ===');
ok(verifyLineSignature(body, goodSig, '') === null, 'no secret → null (dev-mode sentinel, caller decides)');
ok(verifyLineSignature(body, '', undefined) === null, 'no secret + no signature → null (dev mode)');

console.log('\n=== server.js consumes it fail-closed (rejects only on an explicit false) ===');
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const here = dirname(fileURLToPath(import.meta.url));
const server = readFileSync(join(here, '..', 'server.js'), 'utf8');
ok(/verifyLineSignature\(\s*rawBodyBuf\s*,\s*signature\s*,\s*process\.env\.LINE_CHANNEL_SECRET\s*\)/.test(server),
   'server.js calls verifyLineSignature(rawBodyBuf, signature, secret)');
ok(/sigResult\s*===\s*false/.test(server), 'server.js drops the request when the result is === false');
// the old fail-open guard must be gone
ok(!/LINE_CHANNEL_SECRET\s*&&\s*signature/.test(server), 'the old `LINE_CHANNEL_SECRET && signature` fail-open guard is removed');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
