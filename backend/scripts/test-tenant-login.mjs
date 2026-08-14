import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTenantManager } from '../tenant-manager.js';

// Security regression guard for tenant-manager.js login().
// The API key (returned once at register) is the ONLY tenant credential — email is not secret.
// login() used to have an `else if (email)` branch that issued a valid 30-day JWT for ANY tenant
// given just its email and NO secret: a full authentication bypass (impersonate a tenant, read/
// patch their settings, rotate their API key, burn their quota). This test pins that login now
// REQUIRES a valid API key, and that email — if given — is only a consistency check.
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const throws = (fn, m) => { try { fn(); ok(false, `${m} (expected throw, none)`); } catch { ok(true, m); } };

const dir = mkdtempSync(join(tmpdir(), 'tenant-login-'));
try {
  const mgr = createTenantManager(dir);
  const { tenant, apiKey } = mgr.register({ name: 'ร้านทดสอบ', email: 'Owner@Shop.CO' });
  ok(apiKey?.startsWith('otai_sk_'), 'register returns a raw API key (the one credential)');
  ok(tenant && tenant.apiKeyHash === undefined, 'the returned tenant view never exposes apiKeyHash');

  console.log('\n=== the email-only auth bypass is closed ===');
  throws(() => mgr.login({ email: 'owner@shop.co' }), 'login with ONLY an email (the victim knows) → throws, no token issued');
  throws(() => mgr.login({ email: 'owner@shop.co', apiKey: '' }), 'login with email + empty apiKey → throws');
  throws(() => mgr.login({}), 'login with no credentials at all → throws');
  throws(() => mgr.login({ apiKey: 'otai_sk_not-a-real-key' }), 'login with a wrong API key → throws');

  console.log('\n=== a valid API key still logs in, and email is a consistency check ===');
  const good = mgr.login({ apiKey });
  ok(good?.token && good.tenant?.id === tenant.id, 'login with the valid API key → issues a token for that tenant');
  const resolved = mgr.verifyToken(good.token);
  ok(resolved?.id === tenant.id, 'the issued token resolves back to the same tenant');
  ok(mgr.login({ email: 'OWNER@shop.co', apiKey }).token, 'login with a MATCHING email + valid key → ok (email case-insensitive)');
  throws(() => mgr.login({ email: 'someone-else@shop.co', apiKey }), 'a valid key but a MISMATCHED email → throws (no cross-tenant confusion)');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
