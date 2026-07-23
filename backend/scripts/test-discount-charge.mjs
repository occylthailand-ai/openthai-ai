import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression test — a spin "X% off" discount must be burned only when a charge is
// actually created, never on a request that fails before payment.
// /api/payment/create used to call credits.consumeDiscount() at the very top (marking
// the one-time discount used) and only THEN try to create the Omise charge. So a
// request that 400s on a missing card token, or a charge that throws / is declined,
// silently ate the user's spin discount with no payment made — on retry they'd pay
// full price. Fixed: peek the discount to compute the amount, and consume it only on a
// success path (mock/prod charge issued, card not declined).
//
// Self-contained: a mock Supabase backs the credits store so we can seed an unused
// discount and read back whether it was consumed, with no real Omise and no touching
// backend/data. รัน: node scripts/test-discount-charge.mjs
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SB_PORT = 8874;
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── mock Supabase: an in-memory `credits` table keyed by id (other tables → []) ──
let creditsRows = {}; // id → row
const sb = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const isCredits = req.url.includes('/credits');
    if (isCredits && req.method === 'GET') {
      const m = decodeURIComponent(req.url).match(/id=eq\.([^&]+)/);
      const row = m && creditsRows[m[1]];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(row ? [row] : []));
    }
    if (isCredits && req.method === 'POST') {
      try { for (const r of JSON.parse(body)) creditsRows[r.id] = { ...creditsRows[r.id], ...r }; } catch {}
      res.writeHead(201); return res.end('[]');
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]');
  });
});

// seed an account that spun a 30%-off prize and hasn't used it yet
function seedDiscount(id, pct = 30) {
  creditsRows[id] = { id, balance: 0, streak_days: 0, streak_date: null, spun: true, prize: `${pct}% off`, claims: { _discount: { pct, used: false } } };
}

function boot(extraEnv, port) {
  return spawn('node', ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), SUPABASE_URL: `http://127.0.0.1:${SB_PORT}`, SUPABASE_SERVICE_KEY: 'svc', ...extraEnv },
    stdio: 'ignore',
  });
}
async function j(port, method, path, body, headers = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function waitHealth(port) {
  for (let i = 0; i < 25; i++) { try { if ((await j(port, 'GET', '/api/health')).status === 200) return true; } catch {} await sleep(400); }
  return false;
}

let exitCode = 1;
await new Promise((r) => sb.listen(SB_PORT, r));

// ── Scenario A: a request that FAILS before payment must NOT burn the discount ──
// OMISE_SECRET_KEY is set (skips mock mode); method:'card' with no token → the route
// 400s on the missing token, before any charge — so the discount must survive.
const APP_A = 8873;
const email = 'disc-fail@test.com';
seedDiscount(`e:${email}`);
const procA = boot({ OMISE_SECRET_KEY: 'sk_test_fake_no_network_needed' }, APP_A);
try {
  ok(await waitHealth(APP_A), 'scenario A: server booted');
  console.log('\n=== a discount survives a request that fails before payment (card, no token → 400) ===');
  const pre = await j(APP_A, 'GET', '/api/credits', null, { 'x-user-email': email });
  ok(pre.data?.discountPct === 30, `discount is 30% before the attempt (got ${pre.data?.discountPct})`);
  const pay = await j(APP_A, 'POST', '/api/payment/create', { plan: 'pro', method: 'card', email }, { 'x-user-email': email });
  ok(pay.status === 400 && !pay.data?.success, `card charge with no token → 400 (got ${pay.status})`);
  const post = await j(APP_A, 'GET', '/api/credits', null, { 'x-user-email': email });
  ok(post.data?.discountPct === 30, `the discount is STILL 30% after the failed attempt — not burned (got ${post.data?.discountPct})`);
} finally { procA.kill('SIGKILL'); await sleep(300); }

// ── Scenario B: a successfully issued charge DOES consume the discount ──
// No OMISE key → mock payment mode → the promptpay "charge" is issued at the
// discounted amount, and the one-time discount is then consumed.
const APP_B = 8872;
const email2 = 'disc-win@test.com';
seedDiscount(`e:${email2}`);
const procB = boot({ OMISE_SECRET_KEY: '' }, APP_B);
try {
  ok(await waitHealth(APP_B), 'scenario B: server booted (mock payment mode)');
  console.log('\n=== an issued charge applies the discount to the amount AND consumes it ===');
  const pay = await j(APP_B, 'POST', '/api/payment/create', { plan: 'pro', method: 'promptpay', email: email2 }, { 'x-user-email': email2 });
  ok(pay.data?.discount_pct === 30, `charge reports discount_pct 30 (got ${pay.data?.discount_pct})`);
  const base = pay.data?.original_thb;
  ok(base > 0 && pay.data?.amount_thb === Math.max(1, Math.round(base * 0.7)), `amount is the 30%-off price (${pay.data?.amount_thb} of ${base})`);
  const post = await j(APP_B, 'GET', '/api/credits', null, { 'x-user-email': email2 });
  ok(post.data?.discountPct === 0, `the discount is consumed after the charge is issued (got ${post.data?.discountPct})`);
} finally { procB.kill('SIGKILL'); await sleep(300); }

exitCode = fail ? 1 : 0;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
sb.close();
process.exit(exitCode);
