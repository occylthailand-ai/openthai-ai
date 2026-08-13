// Self-contained regression — the middleman self-serve dashboard feed (/api/portals/middleman/my).
// Powers /middleman/dashboard: a distributor/wholesaler/broker who signed up via /portals/middleman
// (portal lead type 'middleman', form_data has business_type + region) enters that email and gets their
// signup + (1) products to distribute (the real approved catalog) and (2) demand signals = AGGREGATE
// consumer-signup counts per interest category. Seeds portal_leads.json + producers.json in a throwaway
// data dir, spawns the real server (file-fallback path), and asserts:
//   • a signed-up middleman gets business_type/region + distributable products
//   • the producer's private contact email is NEVER exposed (no email harvesting by signing up)
//   • demand is aggregate category COUNTS only — never a buyer's email/name
//   • a non-middleman / unknown email → 404, a malformed email → 400
// รัน: node scripts/test-middleman-my.mjs   (no external services needed)
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8889;
const EMAIL = 'broker@test.com';
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DATA = mkdtempSync(join(tmpdir(), 'mmy-'));
const BUYER = 'private-buyer@secret.com';
writeFileSync(join(DATA, 'portal_leads.json'), JSON.stringify({
  lead_m: { id: 'lead_m', type: 'middleman', name: 'บริษัทกระจายสินค้า', email: EMAIL, form_data: { business_type: 'ตัวแทนจำหน่าย (Distributor)', region: 'ภาคเหนือ' }, consent: true, created_at: '2026-08-10T00:00:00Z' },
  // consumer leads → demand signal (aggregate counts); their emails/names must never surface
  c1: { id: 'c1', type: 'consumer', name: 'ผู้ซื้อ 1', email: BUYER, form_data: { category: 'สมุนไพร' }, consent: true, created_at: '2026-08-01T00:00:00Z' },
  c2: { id: 'c2', type: 'consumer', name: 'ผู้ซื้อ 2', email: 'b2@secret.com', form_data: { category: 'สมุนไพร' }, consent: true, created_at: '2026-08-02T00:00:00Z' },
  c3: { id: 'c3', type: 'consumer', name: 'ผู้ซื้อ 3', email: 'b3@secret.com', form_data: { category: 'อาหาร' }, consent: true, created_at: '2026-08-03T00:00:00Z' },
}, null, 2));
const PRODSECRET = 'producer-private@secret.com';
writeFileSync(join(DATA, 'producers.json'), JSON.stringify({
  p1: { email: PRODSECRET, status: 'approved', company: 'สวนสมุนไพร', product_name: 'ยาหม่อง', category: 'สมุนไพร', price: 120, created_at: '2026-08-01T00:00:00Z' },
  p2: { email: 'p2@x.com', status: 'approved', company: 'ร้านอาหาร', product_name: 'น้ำพริก', category: 'อาหาร', price: 60, created_at: '2026-08-02T00:00:00Z' },
  p3: { email: 'p3@x.com', status: 'pending', company: 'รออนุมัติ', product_name: 'ยังไม่อนุมัติ', category: 'สมุนไพร', price: 50, created_at: '2026-08-03T00:00:00Z' },
}, null, 2));

const env = { ...process.env, PORT: String(PORT), OPENTHAI_DATA_DIR: DATA, WRITE_DATA_DIR: DATA };
delete env.SUPABASE_URL; delete env.SUPABASE_SERVICE_KEY;
const srv = spawn('node', ['server.js'], { cwd: ROOT, env, stdio: 'ignore' });

async function get(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
  let data = null; try { data = await res.json(); } catch { /* non-json */ }
  return { status: res.status, data };
}

try {
  for (let i = 0; i < 40; i++) { try { const h = await get('/api/health'); if (h.status === 200) break; } catch { /* not up */ } await sleep(250); }

  console.log('\n=== a signed-up middleman gets business_type/region + distributable products ===');
  const r = await get(`/api/portals/middleman/my?email=${encodeURIComponent(EMAIL)}`);
  ok(r.status === 200 && r.data?.success, 'middleman/my → 200 success');
  ok(r.data?.middleman?.business_type === 'ตัวแทนจำหน่าย (Distributor)' && r.data?.middleman?.region === 'ภาคเหนือ', 'returns the middleman business_type + region');
  const dist = r.data?.distribute || [];
  ok(dist.length === 2, 'distributes exactly the 2 APPROVED products (the pending one is excluded)');
  ok(dist.every((p) => p.product_name && p.category), 'each distributable product has name + category');

  console.log('\n=== demand = aggregate category counts (no buyer identities) ===');
  const demand = r.data?.demand || [];
  const herb = demand.find((d) => d.category === 'สมุนไพร');
  const food = demand.find((d) => d.category === 'อาหาร');
  ok(herb && herb.count === 2, 'demand shows สมุนไพร = 2 consumer signups');
  ok(food && food.count === 1, 'demand shows อาหาร = 1 consumer signup');
  ok(demand[0].category === 'สมุนไพร', 'demand is sorted by count (highest first)');

  console.log('\n=== no private email (producer OR buyer) ever leaks ===');
  const asText = JSON.stringify(r.data);
  ok(!asText.includes(PRODSECRET), 'the approved producer\'s private email is NOT in the response');
  ok(!asText.includes(BUYER) && !asText.includes('secret.com'), 'no consumer/buyer email is in the response');
  ok(!asText.includes('ผู้ซื้อ'), 'no buyer name is in the response (demand is counts only)');
  ok(dist.every((p) => !('email' in p)), 'no distributable product carries an email field');

  console.log('\n=== identity gate ===');
  const unknown = await get('/api/portals/middleman/my?email=nobody@test.com');
  ok(unknown.status === 404, 'an email that never signed up as a middleman → 404');
  const bad = await get('/api/portals/middleman/my?email=not-an-email');
  ok(bad.status === 400, 'malformed email → 400');
} finally {
  srv.kill('SIGKILL');
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
