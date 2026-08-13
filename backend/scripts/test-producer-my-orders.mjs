// Self-contained regression — the producer self-serve dashboard feed (/api/producers/my-orders).
// Powers /producer/dashboard: one call must return the producer's own status + product/stock AND
// their orders + an income/work summary, WITHOUT leaking buyer PII. Seeds producers.json + orders.json
// in a throwaway data dir, spawns the real server on the file-fallback path (no Supabase), and asserts:
//   • an approved producer gets status + their orders (newest first)
//   • the summary counts are right and value_total EXCLUDES cancelled orders (no phantom revenue)
//   • buyer PII (customer_name / contact / address) never appears in the producer feed
//   • an unknown email → 404 (can't enumerate), a malformed email → 400
// รัน: node scripts/test-producer-my-orders.mjs   (no external services needed)
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8891;
const EMAIL = 'maker@test.com';
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── seed a throwaway data dir (file-fallback path — no Supabase) ───────────────
const DATA = mkdtempSync(join(tmpdir(), 'pmo-'));
writeFileSync(join(DATA, 'producers.json'), JSON.stringify({
  [EMAIL]: { email: EMAIL, status: 'approved', company: 'สวนสมุนไพรทดสอบ', product_name: 'สบู่สมุนไพร', category: 'สมุนไพร', price: 100, stock: 42, created_at: '2026-08-01T00:00:00Z' },
  'other@test.com': { email: 'other@test.com', status: 'approved', company: 'อื่น', product_name: 'x', category: 'อื่นๆ', price: 10, stock: 1, created_at: '2026-08-01T00:00:00Z' },
}, null, 2));
// 3 orders for EMAIL (new / delivered / cancelled) + 1 order for another producer (must NOT show up)
const buyerPII = { customer_name: 'สมชาย ผู้ซื้อ', contact: 'buyer@secret.com', address: '99 ถนนลับ กทม' };
writeFileSync(join(DATA, 'orders.json'), JSON.stringify({
  ord_a: { id: 'ord_a', producer_email: EMAIL, product_name: 'สบู่สมุนไพร', qty: 2, amount: 200, status: 'new',       ...buyerPII, escrow_status: 'none', history: [{ status: 'new', at: '2026-08-10T00:00:00Z', note: 'internal' }], created_at: '2026-08-10T00:00:00Z' },
  ord_b: { id: 'ord_b', producer_email: EMAIL, product_name: 'สบู่สมุนไพร', qty: 1, amount: 50,  status: 'delivered', ...buyerPII, escrow_status: 'released', history: [{ status: 'delivered', at: '2026-08-11T00:00:00Z', note: 'ส่งแล้ว' }], created_at: '2026-08-11T00:00:00Z' },
  ord_c: { id: 'ord_c', producer_email: EMAIL, product_name: 'สบู่สมุนไพร', qty: 3, amount: 300, status: 'cancelled', ...buyerPII, escrow_status: 'refunded', history: [{ status: 'cancelled', at: '2026-08-09T00:00:00Z', note: 'ยกเลิก' }], created_at: '2026-08-09T00:00:00Z' },
  ord_x: { id: 'ord_x', producer_email: 'other@test.com', product_name: 'x', qty: 9, amount: 999, status: 'new', ...buyerPII, escrow_status: 'none', history: [], created_at: '2026-08-12T00:00:00Z' },
}, null, 2));

const env = { ...process.env, PORT: String(PORT), OPENTHAI_DATA_DIR: DATA, WRITE_DATA_DIR: DATA };
delete env.SUPABASE_URL; delete env.SUPABASE_SERVICE_KEY; // force the file-fallback path
const srv = spawn('node', ['server.js'], { cwd: ROOT, env, stdio: 'ignore' });

async function get(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
  let data = null; try { data = await res.json(); } catch { /* non-json */ }
  return { status: res.status, data };
}

try {
  // wait for boot
  for (let i = 0; i < 40; i++) { try { const h = await get('/api/health'); if (h.status === 200) break; } catch { /* not up */ } await sleep(250); }

  console.log('\n=== approved producer gets status + product + their orders ===');
  const r = await get(`/api/producers/my-orders?email=${encodeURIComponent(EMAIL)}`);
  ok(r.status === 200 && r.data?.success, 'my-orders → 200 success');
  ok(r.data?.producer?.status === 'approved', 'returns the producer approval status');
  ok(r.data?.producer?.product_name === 'สบู่สมุนไพร' && r.data?.producer?.stock === 42, 'returns the producer product + stock');
  ok(Array.isArray(r.data?.orders) && r.data.orders.length === 3, 'returns exactly this producer\'s 3 orders (not another producer\'s)');
  ok(r.data.orders[0].id === 'ord_b', 'orders are newest-first (ord_b 08-11 first)');
  ok(!r.data.orders.some((o) => o.id === 'ord_x'), 'another producer\'s order (ord_x) is NOT included');

  console.log('\n=== summary counts + value_total excludes cancelled (no phantom revenue) ===');
  const s = r.data?.summary || {};
  ok(s.total === 3, 'summary.total = 3');
  ok(s.active === 2, 'summary.active = 2 (excludes the cancelled one)');
  ok(s.to_handle === 1, 'summary.to_handle = 1 (the "new" order awaiting the producer)');
  ok(s.delivered === 1, 'summary.delivered = 1');
  ok(s.cancelled === 1, 'summary.cancelled = 1');
  ok(s.value_total === 250, 'summary.value_total = 250 (200 + 50; the 300 cancelled order is excluded)');

  console.log('\n=== buyer PII never leaks into the producer feed ===');
  const asText = JSON.stringify(r.data);
  ok(!asText.includes('buyer@secret.com'), 'buyer contact is not in the response');
  ok(!asText.includes('สมชาย ผู้ซื้อ'), 'buyer name is not in the response');
  ok(!asText.includes('ถนนลับ'), 'buyer address is not in the response');
  ok(r.data.orders.every((o) => !('contact' in o) && !('customer_name' in o) && !('address' in o)), 'no order object carries buyer contact/name/address fields');

  console.log('\n=== identity gate ===');
  const unknown = await get('/api/producers/my-orders?email=nobody@test.com');
  ok(unknown.status === 404, 'unknown email → 404 (cannot enumerate)');
  const bad = await get('/api/producers/my-orders?email=not-an-email');
  ok(bad.status === 400, 'malformed email → 400');
} finally {
  srv.kill('SIGKILL');
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
