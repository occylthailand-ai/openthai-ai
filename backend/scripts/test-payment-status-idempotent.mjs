import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';

// Regression test — GET /api/payment/status/:chargeId must emit the
// 'payment.completed' webhook exactly ONCE per payment, even when a client polls the
// status endpoint many times (the frontend polls every few seconds until paid, and a
// refresh re-polls a charge that is already paid). The dispatch used to sit OUTSIDE
// the `if (firstTime)` guard that wraps the entitlement / receipt / affiliate-credit,
// so every poll after the charge turned paid re-fired 'payment.completed' — external
// subscribers double-processed a single payment.
//
// Self-contained: a stub Omise (OMISE_API_URL override) returns a paid charge on the
// status poll, and a local collector is registered as the webhook subscriber so we can
// count how many 'payment.completed' deliveries a single payment produces across two
// polls. No real Omise; backend/data is git-restored by the caller.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OMISE_PORT = 8869, COLLECT_PORT = 8868, APP_PORT = 8867, ADMIN = 'ci-admin';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── stub Omise: source + charge create (pending), charge GET (paid) ──
const CHARGE_ID = 'chrg_test_idem_1';
const omiseStub = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c));
  req.on('end', () => {
    const send = (o) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.method === 'POST' && req.url.startsWith('/sources')) return send({ id: 'src_test_1', type: 'promptpay', amount: 29900, currency: 'thb' });
    if (req.method === 'POST' && req.url.startsWith('/charges')) return send({ id: CHARGE_ID, status: 'pending', paid: false, amount: 29900, currency: 'thb', source: { scannable_code: { image: { download_uri: 'http://x/qr.png' } }, reference: 'REF1' }, expires_at: new Date(Date.now() + 9e5).toISOString() });
    if (req.method === 'GET' && req.url.startsWith('/charges/')) return send({ id: CHARGE_ID, status: 'successful', paid: true, amount: 29900, currency: 'thb', paid_at: '2026-07-23T00:00:00Z' });
    send({});
  });
});

// ── collector: counts 'payment.completed' webhook deliveries ──
let completedCount = 0;
const collector = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c));
  req.on('end', () => {
    let ev = req.headers['x-openthai-event'];
    if (!ev) { try { ev = JSON.parse(body).event; } catch {} }
    if (ev === 'payment.completed') completedCount++;
    res.writeHead(200); res.end('ok');
  });
});

async function j(method, path, body, headers = {}) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function waitHealth() { for (let i = 0; i < 25; i++) { try { if ((await j('GET', '/api/health')).status === 200) return true; } catch {} await sleep(400); } return false; }

// Hermetic file state: webhooks.json / payments.json are gitignored and accumulate
// across boots, so a stale subscriber from a previous run would receive our event too
// and inflate the count. Snapshot + clear them before boot, restore in finally.
const DATA = join(ROOT, 'data');
const guarded = ['webhooks.json', 'payments.json', 'webhook_deliveries.json'];
const snapshot = {};
for (const f of guarded) { const p = join(DATA, f); snapshot[f] = existsSync(p) ? readFileSync(p, 'utf8') : null; try { writeFileSync(p, '[]'); } catch {} }
const restoreData = () => { for (const f of guarded) { const p = join(DATA, f); if (snapshot[f] === null) { try { rmSync(p, { force: true }); } catch {} } else { try { writeFileSync(p, snapshot[f]); } catch {} } } };

let exitCode = 1;
await new Promise((r) => omiseStub.listen(OMISE_PORT, r));
await new Promise((r) => collector.listen(COLLECT_PORT, r));

const app = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: {
    ...process.env, PORT: String(APP_PORT), ADMIN_KEY: ADMIN,
    OMISE_SECRET_KEY: 'sk_test_stub', OMISE_API_URL: `http://127.0.0.1:${OMISE_PORT}`,
    WEBHOOK_RETRY_DELAYS: '[0,0,0]', SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '',
  },
  stdio: 'ignore',
});

try {
  ok(await waitHealth(), 'server booted (stub Omise + collector)');

  console.log('\n=== a paid charge polled twice fires payment.completed exactly once ===');
  const reg = await j('POST', '/api/webhooks', { url: `http://127.0.0.1:${COLLECT_PORT}/hook`, events: ['payment.completed'], description: 'idempotency test' }, { 'x-admin-key': ADMIN });
  ok(reg.status === 200 && reg.data?.id, `registered a payment.completed webhook subscriber (got ${reg.status})`);

  const pay = await j('POST', '/api/payment/create', { plan: 'pro', method: 'promptpay', email: 'poller@test.com' });
  ok(pay.data?.charge_id === CHARGE_ID, `created a PromptPay charge (${pay.data?.charge_id})`);

  const p1 = await j('GET', `/api/payment/status/${CHARGE_ID}`);
  ok(p1.data?.paid === true, 'first poll → paid');
  const p2 = await j('GET', `/api/payment/status/${CHARGE_ID}`);
  ok(p2.data?.paid === true, 'second poll (already paid) → still paid');

  await sleep(700); // let the fire-and-forget webhook deliveries land
  ok(completedCount === 1, `payment.completed delivered exactly ONCE across two polls (got ${completedCount})`);
} finally { app.kill('SIGKILL'); await sleep(200); omiseStub.close(); collector.close(); restoreData(); }

exitCode = fail ? 1 : 0;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(exitCode);
