import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';

// Regression test — POST /api/payment/webhook (Omise charge.complete) must emit the
// 'payment.completed' webhook to subscribers exactly ONCE per payment, even though
// Omise delivers webhooks at-least-once (it retries / can resend the same event).
// The dispatch used to sit unguarded at the end of the charge.complete block, so a
// redelivered event re-fired 'payment.completed' — external subscribers double-processed
// a single payment. Fixed: dispatch is anchored to each case's dedup state (payments
// record's paid_at for plan/quickpay, order status for shop). A charge with neither
// anchor (a recurring subscription cycle) keeps at-least-once — verified unchanged.
//
// Self-contained: mock-payment mode (no OMISE_SECRET_KEY) so quickpay stores a record
// without real Omise; OMISE_WEBHOOK_SECRET signs the webhook. A local collector is the
// registered subscriber. Hermetic: clears the gitignored webhooks/payments files.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const COLLECT_PORT = 8859, APP_PORT = 8858, ADMIN = 'ci-admin', WH_SECRET = 'whsec_test';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// collector: count payment.completed deliveries, keyed by the charge id in the body
const hits = {};
const collector = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c));
  req.on('end', () => {
    let ev = req.headers['x-openthai-event'], cid = null;
    try { const p = JSON.parse(body); ev = ev || p.event; cid = p.data?.charge_id; } catch {}
    if (ev === 'payment.completed') hits[cid] = (hits[cid] || 0) + 1;
    res.writeHead(200); res.end('ok');
  });
});

async function j(method, path, body, headers = {}) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
// POST a signed Omise charge.complete webhook (raw body + hex HMAC-SHA256 signature)
async function sendWebhook(chargeId, extraData = {}) {
  const raw = JSON.stringify({ key: 'charge.complete', data: { id: chargeId, paid: true, amount: 100000, paid_at: '2026-07-23T00:00:00Z', ...extraData } });
  const sig = createHmac('sha256', WH_SECRET).update(raw).digest('hex');
  const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/payment/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-omise-signature': sig }, body: raw });
  return res.status;
}
async function waitHealth() { for (let i = 0; i < 25; i++) { try { if ((await j('GET', '/api/health')).status === 200) return true; } catch {} await sleep(400); } return false; }

const DATA = join(ROOT, 'data');
const guarded = ['webhooks.json', 'payments.json', 'webhook_deliveries.json'];
const snap = {};
for (const f of guarded) { const p = join(DATA, f); snap[f] = existsSync(p) ? readFileSync(p, 'utf8') : null; try { writeFileSync(p, '[]'); } catch {} }
const restoreData = () => { for (const f of guarded) { const p = join(DATA, f); if (snap[f] === null) { try { rmSync(p, { force: true }); } catch {} } else { try { writeFileSync(p, snap[f]); } catch {} } } };

let exitCode = 1;
await new Promise((r) => collector.listen(COLLECT_PORT, r));
const app = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(APP_PORT), ADMIN_KEY: ADMIN, OMISE_WEBHOOK_SECRET: WH_SECRET, WEBHOOK_RETRY_DELAYS: '[0,0,0]', SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '' },
  stdio: 'ignore',
});

try {
  ok(await waitHealth(), 'server booted (mock payment mode + signed webhooks)');
  const reg = await j('POST', '/api/webhooks', { url: `http://127.0.0.1:${COLLECT_PORT}/hook`, events: ['payment.completed'], description: 'idempotency test' }, { 'x-admin-key': ADMIN });
  ok(reg.status === 200 && reg.data?.id, `registered a payment.completed subscriber (got ${reg.status})`);

  console.log('\n=== a quickpay charge whose webhook is delivered twice fires payment.completed once ===');
  const qp = await j('POST', '/api/quickpay/create', { amount_thb: 1000, label: 'ทดสอบ' });
  const chargeId = qp.data?.charge_id;
  ok(chargeId && qp.data?.mock, `created a mock quickpay charge (${chargeId})`);
  ok(await sendWebhook(chargeId) === 200, 'first charge.complete delivery → 200');
  ok(await sendWebhook(chargeId) === 200, 'redelivered charge.complete (same event) → 200');
  await sleep(700);
  ok(hits[chargeId] === 1, `payment.completed delivered exactly ONCE for the quickpay charge (got ${hits[chargeId] || 0})`);

  console.log('\n=== a charge with no local record (recurring subscription cycle) keeps at-least-once ===');
  // no payments record and no shop order → no dedup anchor exists; behaviour is intentionally
  // unchanged (Omise webhooks are at-least-once and such events cannot be deduped locally).
  const recur = 'chrg_recurring_none';
  await sendWebhook(recur); await sendWebhook(recur);
  await sleep(600);
  ok(hits[recur] === 2, `an anchorless (recurring) charge still delivers per webhook — unchanged (got ${hits[recur] || 0})`);
} finally { app.kill('SIGKILL'); await sleep(200); collector.close(); restoreData(); }

exitCode = fail ? 1 : 0;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(exitCode);
