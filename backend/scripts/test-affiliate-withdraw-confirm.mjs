// Regression test — the affiliate withdraw CONFIRM flow (money-out). Complements
// test-affiliate-withdraw-math.mjs (which only covers the reservedFor/affAvailable
// math). This self-boots the real server and drives the confirm endpoints to pin
// three money-critical invariants:
//   1. HMAC gate — a bad/missing token → 403 (a withdrawal confirmation can't be forged).
//   2. GET is bot-safe — the confirm LINK (GET) renders the page but does NOT create a
//      withdrawal, so an email link-scanner/prefetch that only issues GETs can't trigger
//      a real payout. The withdrawal is created only on the explicit button-press → POST.
//   3. POST is idempotent — a valid POST finalizes exactly once; a second POST → 404
//      ("already confirmed"), so a double-click / re-submit can't double-withdraw.
//
// Hermetic: snapshots the three JSON state files, seeds a known pending confirmation +
// an affiliate with enough earned balance, then restores the originals byte-for-byte.
// Uses a known JWT_SECRET so the test can compute the same HMAC token server.js checks.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, 'data');
const PORT = 8891, SECRET = 'wd-test-secret';
const ID = 'wdc_testconfirm_0001';
const token = createHmac('sha256', SECRET).update(`${ID}:affiliate-withdraw`).digest('hex').slice(0, 16);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FILES = ['affiliates.json', 'withdrawals.json', 'withdraw_confirmations.json'];
const bak = (f) => join('/tmp', `wdc-bak-${f}`);
function snapshot() { for (const f of FILES) { const p = join(DATA, f); if (existsSync(p)) copyFileSync(p, bak(f)); else writeFileSync(bak(f), '\0MISSING'); } }
function restore() { for (const f of FILES) { const b = bak(f); const p = join(DATA, f); if (existsSync(b)) { if (readFileSync(b, 'utf8') === '\0MISSING') { if (existsSync(p)) rmSync(p); } else copyFileSync(b, p); rmSync(b, { force: true }); } } }

function seed() {
  writeFileSync(join(DATA, 'affiliates.json'), JSON.stringify([
    { ref_code: 'WDTEST', name: 'WD Test', email: 'wd@example.com', phone: '', platform: 'TikTok',
      tier: 'starter', commission_rate: 0.2, total_earned: 500, total_sales: 500, paid_out: 0,
      status: 'active', joined_at: new Date().toISOString() },
  ], null, 2));
  writeFileSync(join(DATA, 'withdrawals.json'), '[]');
  writeFileSync(join(DATA, 'withdraw_confirmations.json'), JSON.stringify([
    { id: ID, ref_code: 'WDTEST', name: 'WD Test', amount: 200, promptpay: '0812345678', created_at: new Date().toISOString() },
  ], null, 2));
}

async function req(method, path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`, { method });
  let body = null; try { body = await res.json(); } catch { /* html/text */ }
  return { status: res.status, body };
}
async function withdrawalsCount() {
  const r = await req('GET', '/api/affiliate/withdrawals?ref_code=WDTEST');
  return Array.isArray(r.body?.withdrawals) ? r.body.withdrawals.length : -1;
}
async function waitHealth() { for (let i = 0; i < 25; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/health`); if (r.status === 200) return true; } catch {} await sleep(400); } return false; }

snapshot();
seed();
const app = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), JWT_SECRET: SECRET, SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', DISABLE_RATE_LIMIT: '1' },
  stdio: 'ignore',
});
try {
  ok(await waitHealth(), 'server booted');

  console.log('\n=== 1. HMAC gate ===');
  ok((await req('GET', `/api/affiliate/withdraw/confirm?id=${ID}&token=deadbeefdeadbeef`)).status === 403, 'GET with a wrong token → 403');
  ok((await req('POST', `/api/affiliate/withdraw/confirm?id=${ID}&token=deadbeefdeadbeef`)).status === 403, 'POST with a wrong token → 403');

  console.log('\n=== 2. GET is bot-safe (renders page, does NOT finalize) ===');
  const g = await req('GET', `/api/affiliate/withdraw/confirm?id=${ID}&token=${token}`);
  ok(g.status === 200, 'GET with a valid token → 200 (confirmation page)');
  ok(await withdrawalsCount() === 0, 'no withdrawal created by the GET (a prefetch/scanner can’t trigger a payout)');

  console.log('\n=== 3. POST finalizes exactly once (idempotent) ===');
  const p1 = await req('POST', `/api/affiliate/withdraw/confirm?id=${ID}&token=${token}`);
  ok(p1.status === 200 && p1.body?.success === true && p1.body?.amount === 200, 'first POST → 200, success, amount 200');
  ok(await withdrawalsCount() === 1, 'exactly one withdrawal now exists');
  const p2 = await req('POST', `/api/affiliate/withdraw/confirm?id=${ID}&token=${token}`);
  ok(p2.status === 404, 'second POST (same token) → 404 (already confirmed)');
  ok(await withdrawalsCount() === 1, 'still exactly one withdrawal — no double-withdrawal');
} finally {
  app.kill('SIGKILL');
  await sleep(150);
  restore();
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
