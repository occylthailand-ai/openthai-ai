// Guards that the one-click confirm-link secret (UNSUB_SECRET in server.js) is NOT a hardcoded,
// source-visible constant in production. These links move money (affiliate withdraw) and delete
// user data (PDPA erasure), so a guessable signing key = anyone with repo access can forge them.
//
// server.js now signs with: JWT_SECRET, else a per-process RANDOM key when prod-like (VERCEL or
// NODE_ENV=production) — unforgeable, fails closed — else a stable dev-only constant in local dev.
// This test boots the real server in each config and probes GET /api/broadcast/unsubscribe (a
// confirm link: 200 on a valid token, 403 on an invalid one, no auth/setup needed).
//
// NOTE: the prod-like branch is exercised via NODE_ENV=production, not VERCEL=1 — under VERCEL the
// server intentionally does NOT app.listen() (Vercel invokes the exported handler), so it can't be
// boot-probed here. Both flags feed the SAME `IS_PROD_LIKE` branch; a structural assert below pins
// that IS_PROD_LIKE also covers VERCEL, and that the old hardcoded constant is gone from source.
import { spawn } from 'child_process';
import { createHmac } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OLD_HARDCODED = 'openthai-jwt-secret-2026';       // the removed, forgeable prod fallback
const DEV_FALLBACK  = 'openthai-dev-only-unsub-secret'; // the dev-only stable constant server.js uses now
const EMAIL = 'victim@example.com';
const tokenFor = (secret) => createHmac('sha256', secret).update(`${EMAIL}:broadcast`).digest('hex').slice(0, 16);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

let portSeq = 8931;
async function bootAndProbe(env, token) {
  const PORT = portSeq++;
  const srv = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '',
           DISABLE_RATE_LIMIT: '1', JWT_SECRET: '', VERCEL: '', NODE_ENV: '', ...env },
    stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${PORT}`;
    let up = false;
    for (let i = 0; i < 40; i++) {
      try { const r = await fetch(base + '/api/health'); if (r.ok) { up = true; break; } } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!up) return { status: 0 };
    const res = await fetch(`${base}/api/broadcast/unsubscribe?email=${encodeURIComponent(EMAIL)}&token=${token}`);
    return { status: res.status };
  } finally {
    srv.kill();
    await new Promise((r) => setTimeout(r, 150));
  }
}

console.log('=== production (NODE_ENV=production) without JWT_SECRET: old hardcoded secret must NOT sign links ===');
const prodForged = await bootAndProbe({ NODE_ENV: 'production' }, tokenFor(OLD_HARDCODED));
ok(prodForged.status === 403, `prod + token forged with the old hardcoded secret → 403 (got ${prodForged.status})`);

console.log('\n=== production WITH JWT_SECRET set: a properly-signed link still verifies (happy path) ===');
const realSecret = 'a-real-32char-min-production-secret-value';
const prodValid = await bootAndProbe({ NODE_ENV: 'production', JWT_SECRET: realSecret }, tokenFor(realSecret));
ok(prodValid.status === 200, `prod + JWT_SECRET set + correctly-signed token → 200 (got ${prodValid.status})`);
const prodWrong = await bootAndProbe({ NODE_ENV: 'production', JWT_SECRET: realSecret }, tokenFor(OLD_HARDCODED));
ok(prodWrong.status === 403, `prod + JWT_SECRET set + old-hardcoded-secret token → 403 (got ${prodWrong.status})`);

console.log('\n=== local dev (no prod signal, no JWT_SECRET): stable dev fallback so hand-tested links work ===');
const devValid = await bootAndProbe({}, tokenFor(DEV_FALLBACK));
ok(devValid.status === 200, `dev + token signed with the dev fallback → 200 (got ${devValid.status})`);
const devOldConst = await bootAndProbe({}, tokenFor(OLD_HARDCODED));
ok(devOldConst.status === 403, `dev + old removed hardcoded constant → 403 (the constant is gone) (got ${devOldConst.status})`);

console.log('\n=== source: prod-like branch covers Vercel, and the forgeable constant is gone ===');
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'server.js'), 'utf8');
ok(/IS_PROD_LIKE\s*=\s*IS_VERCEL\s*\|\|\s*process\.env\.NODE_ENV\s*===\s*['"]production['"]/.test(src),
   'IS_PROD_LIKE = IS_VERCEL || NODE_ENV===production (so Vercel gets the random key too)');
ok(/IS_PROD_LIKE\s*\?\s*randomBytes\(32\)/.test(src), 'prod-like without JWT_SECRET falls back to randomBytes(32), not a constant');
ok(!src.includes(OLD_HARDCODED), `the old forgeable constant "${OLD_HARDCODED}" no longer appears in server.js`);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
