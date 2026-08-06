// Security regression guard — the tenant-JWT signing secret must never be a source-visible constant.
//
// tenant-manager.js used to sign/verify tenant tokens with `process.env.JWT_SECRET || 'openthai-jwt-
// secret-2026'`. Whenever JWT_SECRET is unset in production (the current state — OWNER-DECISIONS #3),
// tenant tokens were therefore signed with a secret printed in this repo, so anyone could forge
// `{ tenantId, plan, role:'tenant' }` and authenticate as ANY tenant. It now fails CLOSED like
// server.js's UNSUB_SECRET: a per-process RANDOM key in prod when JWT_SECRET is unset.
//
// The signing secret is resolved once at module load from the environment, so each scenario runs in a
// fresh child process with a controlled env (this file re-execs itself with __CHILD=<scenario>).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SELF = fileURLToPath(import.meta.url);
const OLD_HARDCODED = 'openthai-jwt-secret-2026'; // the secret that used to be forgeable

// ── child: run one scenario, print a single JSON line of results ──────────────
if (process.env.__CHILD) {
  const { createTenantManager } = await import('../tenant-manager.js');
  const jwt = (await import('jsonwebtoken')).default;
  const dir = mkdtempSync(join(tmpdir(), 'tenanttok-'));
  const mgr = createTenantManager(dir);
  const reg = mgr.register({ name: 'บ.ทดสอบ', email: `t_${Date.now()}@x.com`, plan: 'pro' });
  const tenantId = reg.tenant.id;
  const { token } = mgr.login({ email: reg.tenant.email, apiKey: reg.apiKey });

  const forge = (secret) => { try { return jwt.sign({ tenantId, plan: 'enterprise', role: 'tenant' }, secret, { expiresIn: '30d' }); } catch { return 'x'; } };
  const out = {
    legit_verifies: !!mgr.verifyToken(token),                         // a real login token works in-process
    hardcoded_forge_rejected: mgr.verifyToken(forge(OLD_HARDCODED)) == null, // the old constant can't forge
    random_forge_rejected: mgr.verifyToken(forge('some-other-wrong-secret')) == null,
    // when a real JWT_SECRET is set, a token signed with it must verify (the "use it" branch)
    envsecret_verifies: process.env.JWT_SECRET ? !!mgr.verifyToken(forge(process.env.JWT_SECRET)) : null,
  };
  rmSync(dir, { recursive: true, force: true });
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

// ── parent: spawn the scenarios and assert ────────────────────────────────────
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
function run(env) {
  const r = spawnSync(process.execPath, [SELF], { env: { ...process.env, __CHILD: '1', ...env }, encoding: 'utf8' });
  if (r.status !== 0) { console.log(r.stderr); throw new Error('child failed'); }
  return JSON.parse(r.stdout);
}

console.log('=== prod-like (VERCEL=1) with NO JWT_SECRET → per-process random, fail CLOSED ===');
const prod = run({ VERCEL: '1', JWT_SECRET: '' });
ok(prod.legit_verifies, 'a real login token verifies within the same process (auth still works)');
ok(prod.hardcoded_forge_rejected, 'a token forged with the old hardcoded "openthai-jwt-secret-2026" is REJECTED (vuln closed)');
ok(prod.random_forge_rejected, 'a token forged with any other guessed secret is rejected');

console.log('\n=== JWT_SECRET explicitly set → use it (stable AND unforgeable) ===');
const withSecret = run({ VERCEL: '1', JWT_SECRET: 'a-real-long-random-production-secret' });
ok(withSecret.legit_verifies, 'a real login token verifies');
ok(withSecret.envsecret_verifies === true, 'a token signed with the configured JWT_SECRET verifies (the "use it" branch works)');
ok(withSecret.hardcoded_forge_rejected, 'the old hardcoded constant still cannot forge when JWT_SECRET is set');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
