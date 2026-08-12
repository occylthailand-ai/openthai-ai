import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression test — affiliate commission on a STORE purchase paid via PromptPay (#9).
//
// test-shop-commission.mjs already guards the CARD path (credited synchronously in
// /api/shop/checkout's finalizePaid). But PromptPay — Thailand's dominant payment method — is paid
// LATER: checkout only creates the 'new' order + a QR, and the commission is credited when Omise
// POSTs a signed `charge.complete` to /api/payment/webhook. That deferred path is more fragile (it
// recovers the affiliate ref from the charge's `metadata.channel` = "ref:<CODE>", guards on order
// status==='new' for idempotency + oversold, and runs in an async block) and was UNTESTED — a
// refactor breaking it would silently drop commission on most real Thai sales, with nothing to catch
// it. This pins it: a PromptPay shop order whose webhook fires credits the affiliate exactly once;
// a redelivered webhook does not double-credit; and a ref-less PromptPay order credits nobody.
//
// Self-contained + hermetic: boots its own server in mock-payment mode (no OMISE_SECRET_KEY, so
// checkout returns the QR without real Omise) with OMISE_WEBHOOK_SECRET set to sign the webhook, and
// OPENTHAI_DATA_DIR pointed at a throwaway dir so no tracked data/ file is touched. Since mock mode
// creates no real charge, the webhook we POST carries the same metadata the real Omise charge would
// (order_id / product_id / qty / channel) — faithfully reproducing the production payload.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const APP_PORT = 8901, ADMIN = 'ci-admin', WH_SECRET = 'whsec_test';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function j(method, path, body, headers = {}) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
const stats = async (ref) => (await j('GET', `/api/affiliate/stats/${ref}`)).data?.data || {};

// POST a signed Omise charge.complete webhook (raw body + hex HMAC-SHA256 signature over that body).
async function sendWebhook({ chargeId, amountSatang, metadata }) {
  const raw = JSON.stringify({
    key: 'charge.complete',
    data: { id: chargeId, paid: true, amount: amountSatang, paid_at: '2026-08-12T00:00:00Z', metadata },
  });
  const sig = createHmac('sha256', WH_SECRET).update(raw).digest('hex');
  const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/payment/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-omise-signature': sig }, body: raw,
  });
  return res.status;
}
async function waitHealth() { for (let i = 0; i < 25; i++) { try { if ((await j('GET', '/api/health')).status === 200) return true; } catch {} await sleep(400); } return false; }

const DATA_DIR = mkdtempSync(join(tmpdir(), 'shopcomm-pp-'));
const app = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: {
    ...process.env, PORT: String(APP_PORT), ADMIN_KEY: ADMIN, OMISE_WEBHOOK_SECRET: WH_SECRET,
    OPENTHAI_DATA_DIR: DATA_DIR, OMISE_SECRET_KEY: '', SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '',
  },
  stdio: 'ignore',
});

try {
  ok(await waitHealth(), 'server booted (mock payment mode + signed webhooks + throwaway data dir)');

  console.log('\n=== register affiliate (rate 0.20) + create a ฿500 product ===');
  const EMAIL = `ppaff_${Date.now()}@test.com`;
  let r = await j('POST', '/api/affiliate/apply', { name: 'PP Aff', email: EMAIL, platform: 'TikTok', consent: true });
  const REF = r.data?.data?.ref_code;
  ok(r.status === 200 && REF, `registered, ref_code=${REF}`);
  r = await j('POST', '/api/inventory/admin/upsert', { sku: `SKU${Date.now()}`, name: 'ครีมทดสอบ', price: 500, stock: 10, status: 'active' }, { 'x-admin-key': ADMIN });
  const PID = r.data?.id || r.data?.product?.id;
  ok(r.status === 200 && PID, `product created, id=${PID}`);

  console.log('\n=== PromptPay checkout qty 2 WITH ref → order created, NOT yet credited ===');
  r = await j('POST', '/api/shop/checkout', { product_id: PID, qty: 2, customer_name: 'ลูกค้า', contact: 'c@x.com', method: 'promptpay', ref: REF });
  const orderId = r.data?.order_id;
  ok(r.status === 200 && r.data?.paid === false && orderId, `promptpay checkout → QR pending, order_id=${orderId}`);
  const s0 = await stats(REF);
  ok((s0.total_sales || 0) === 0, `affiliate NOT credited before payment confirmed (sales=${s0.total_sales || 0})`);

  console.log('\n=== charge.complete webhook (metadata.channel = ref:CODE) credits the affiliate once ===');
  const meta = { order_id: orderId, product_id: PID, qty: 2, channel: `ref:${REF}` };
  ok(await sendWebhook({ chargeId: `chrg_pp_${orderId}`, amountSatang: 500 * 2 * 100, metadata: meta }) === 200, 'webhook delivery → 200');
  await sleep(900); // shop finalize runs in an async block after the 200
  const s1 = await stats(REF);
  ok(s1.total_sales === 1, `affiliate total_sales = 1 (got ${s1.total_sales})`);
  ok(Math.abs((s1.total_earned ?? 0) - 200) < 1e-9, `affiliate total_earned = 200 (฿1000 × 0.20) (got ${s1.total_earned})`);

  console.log('\n=== redelivered webhook (Omise at-least-once) does NOT double-credit ===');
  ok(await sendWebhook({ chargeId: `chrg_pp_${orderId}`, amountSatang: 500 * 2 * 100, metadata: meta }) === 200, 'redelivery → 200');
  await sleep(700);
  const s2 = await stats(REF);
  ok(s2.total_sales === 1 && Math.abs((s2.total_earned ?? 0) - 200) < 1e-9, `still 1 sale / ฿200 — idempotent (got ${s2.total_sales}/${s2.total_earned})`);

  console.log('\n=== a ref-less PromptPay order (channel = store) credits nobody ===');
  r = await j('POST', '/api/shop/checkout', { product_id: PID, qty: 1, customer_name: 'ลูกค้า2', contact: 'c2@x.com', method: 'promptpay' });
  const orderId2 = r.data?.order_id;
  ok(r.status === 200 && orderId2, `no-ref promptpay checkout → order_id=${orderId2}`);
  await sendWebhook({ chargeId: `chrg_pp_${orderId2}`, amountSatang: 500 * 1 * 100, metadata: { order_id: orderId2, product_id: PID, qty: 1, channel: 'store' } });
  await sleep(800);
  const s3 = await stats(REF);
  ok(s3.total_sales === 1 && Math.abs((s3.total_earned ?? 0) - 200) < 1e-9, `affiliate unchanged after a ref-less sale (got ${s3.total_sales}/${s3.total_earned})`);
} finally {
  app.kill('SIGKILL'); await sleep(200);
  try { rmSync(DATA_DIR, { recursive: true, force: true }); } catch {}
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
