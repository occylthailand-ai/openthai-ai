// Regression test — PDPA data-subject rights (มาตรา 30 access / มาตรา 33 erasure) must cover
// EVERY store that holds personal data, not just waitlist/consents/producers/portalLeads/affiliates.
// Two stores were silently missed:
//   • tenants   — a business account (name, email, contactPhone, businessType, brand_name). A tenant
//                 who asked to see or delete their data got "0 records / removed 0" while the account
//                 sat untouched in tenants.json.
//   • user_sync — the cloud-sync blob keyed by the user's email.
// This self-boots the real server (file mode, known JWT_SECRET so the test computes the same HMAC
// tokens server.js checks) and pins:
//   1. Access (ม.30) returns the tenant account + cloud-sync blob — and NEVER the API-key hash.
//   2. The erasure-confirm HMAC gate rejects a forged token (403), on both GET and POST.
//   3. Erasure (ม.33) deletes the tenant + cloud blob (removed count reflects both).
//   4. Erasure is targeted — a DIFFERENT tenant's account is left completely intact.
//
// Hermetic: snapshots tenants.json + user_sync.json, seeds a cloud blob, then restores the originals
// byte-for-byte. (The CI wrapper additionally runs `git checkout -- data/` to drop any other files
// the booted server touches.)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, 'data');
const PORT = 8893, SECRET = 'pdpa-test-secret';
const TARGET = 'erase-me@example.com';   // the data subject asking to be erased
const KEEP = 'keep-me@example.com';      // a second tenant that must survive the erasure

// server.js: unsubToken(x, type) = HMAC-SHA256(UNSUB_SECRET, `${x}:${type}`).slice(0,16),
// UNSUB_SECRET = JWT_SECRET || fallback. With JWT_SECRET set below, this matches exactly.
const tok = (x, type) => createHmac('sha256', SECRET).update(`${x}:${type}`).digest('hex').slice(0, 16);
const accessTok = tok(TARGET, 'access');
const eraseTok = tok(TARGET, 'erasure');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FILES = ['tenants.json', 'user_sync.json'];
const bak = (f) => join('/tmp', `pdpa-bak-${f}`);
function snapshot() { for (const f of FILES) { const p = join(DATA, f); if (existsSync(p)) copyFileSync(p, bak(f)); else writeFileSync(bak(f), '\0MISSING'); } }
function restore() { for (const f of FILES) { const b = bak(f); const p = join(DATA, f); if (existsSync(b)) { if (readFileSync(b, 'utf8') === '\0MISSING') { if (existsSync(p)) rmSync(p); } else copyFileSync(b, p); rmSync(b, { force: true }); } } }

function seedSync() {
  // Cloud-sync blob keyed by the target email — must be reachable by access and removed by erasure.
  writeFileSync(join(DATA, 'user_sync.json'), JSON.stringify({ [TARGET]: { note: 'cloud blob secret', devices: 2 } }));
  // Start tenants empty so the two registers below are the only accounts.
  writeFileSync(join(DATA, 'tenants.json'), '[]');
}

async function j(method, path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`, { method });
  let body = null; try { body = await res.json(); } catch { /* html/text */ }
  return { status: res.status, body };
}
async function registerTenant(email) {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/tenants/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `Biz ${email}`, email, plan: 'free', contactPhone: '0812345678' }),
  });
  let body = null; try { body = await res.json(); } catch {}
  return { status: res.status, body };
}
async function accessRecords(email, token) {
  const r = await j('GET', `/api/privacy/access/confirm?email=${encodeURIComponent(email)}&token=${token}`);
  return r.body?.records || {};
}
async function waitHealth() { for (let i = 0; i < 25; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/health`); if (r.status === 200) return true; } catch {} await sleep(400); } return false; }

snapshot();
seedSync();
const app = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), JWT_SECRET: SECRET, SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', DISABLE_RATE_LIMIT: '1' },
  stdio: 'ignore',
});
try {
  ok(await waitHealth(), 'server booted');

  console.log('\n=== seed: register two tenant accounts ===');
  ok((await registerTenant(TARGET)).body?.success === true, `tenant ${TARGET} registered`);
  ok((await registerTenant(KEEP)).body?.success === true, `tenant ${KEEP} registered`);

  console.log('\n=== 1. Access (ม.30) sees the tenant + cloud blob, never the key hash ===');
  const before = await accessRecords(TARGET, accessTok);
  ok(Array.isArray(before.tenants) && before.tenants.length === 1, 'access returns the tenant account');
  ok(before.tenants?.[0]?.email === TARGET, 'the tenant record is the right one');
  ok(before.tenants?.[0]?.apiKeyHash === undefined, 'access NEVER leaks apiKeyHash (safeView)');
  ok(Array.isArray(before.cloud_sync) && before.cloud_sync.length === 1, 'access returns the cloud-sync blob');
  ok(before.cloud_sync?.[0]?.note === 'cloud blob secret', 'the cloud blob content is the seeded one');

  console.log('\n=== 2. Erasure-confirm HMAC gate ===');
  ok((await j('GET', `/api/privacy/erasure/confirm?email=${encodeURIComponent(TARGET)}&token=deadbeefdeadbeef`)).status === 403, 'GET with a wrong token → 403');
  ok((await j('POST', `/api/privacy/erasure/confirm?email=${encodeURIComponent(TARGET)}&token=deadbeefdeadbeef`)).status === 403, 'POST with a wrong token → 403');

  console.log('\n=== 3. Erasure (ม.33) deletes the tenant + cloud blob ===');
  const del = await j('POST', `/api/privacy/erasure/confirm?email=${encodeURIComponent(TARGET)}&token=${eraseTok}`);
  ok(del.status === 200 && del.body?.success === true, 'valid POST → 200 success');
  ok(typeof del.body?.removed === 'number' && del.body.removed >= 2, `removed count reflects tenant + cloud blob (got ${del.body?.removed})`);
  const after = await accessRecords(TARGET, accessTok);
  ok((after.tenants?.length || 0) === 0, 'tenant account is gone after erasure');
  ok((after.cloud_sync?.length || 0) === 0, 'cloud-sync blob is gone after erasure');

  console.log('\n=== 4. Erasure is targeted — the other tenant is untouched ===');
  const keepRec = await accessRecords(KEEP, tok(KEEP, 'access'));
  ok(Array.isArray(keepRec.tenants) && keepRec.tenants.length === 1, `${KEEP} account survives the erasure`);
  ok(keepRec.tenants?.[0]?.email === KEEP, 'the surviving account is the right one');
} finally {
  app.kill('SIGKILL');
  await sleep(150);
  restore();
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
