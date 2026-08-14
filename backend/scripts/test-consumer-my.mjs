// Self-contained regression — the consumer self-serve dashboard feed (/api/portals/consumer/my).
// Powers /consumer/dashboard: a consumer who signed up via /portals/consumer (portal lead type 'consumer'
// with form_data.category = their interest) enters that email and gets their signup + product
// recommendations matched to that interest from the real approved catalog. Seeds portal_leads.json +
// producers.json in a throwaway data dir, spawns the real server on the file-fallback path, and asserts:
//   • a signed-up consumer gets their interest + recommendations matched to it
//   • the producer's private contact email is NEVER in the response (privacy)
//   • an interest with no catalog match falls back to the wider catalog (never an empty dashboard)
//   • a non-consumer / unknown email → 404, a malformed email → 400
// รัน: node scripts/test-consumer-my.mjs   (no external services needed)
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8890;
const EMAIL = 'shopper@test.com';
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DATA = mkdtempSync(join(tmpdir(), 'cmy-'));
// consumer interested in 'สมุนไพร'; plus a non-consumer lead with the same email (must be ignored)
writeFileSync(join(DATA, 'portal_leads.json'), JSON.stringify({
  lead_c: { id: 'lead_c', type: 'consumer', name: 'ผู้ซื้อทดสอบ', email: EMAIL, form_data: { category: 'สมุนไพร', country: 'ไทย' }, consent: true, created_at: '2026-08-10T00:00:00Z' },
  lead_m: { id: 'lead_m', type: 'middleman', name: 'x', email: EMAIL, form_data: { category: 'อาหาร' }, consent: true, created_at: '2026-08-11T00:00:00Z' },
  lead_o: { id: 'lead_o', type: 'consumer', name: 'y', email: 'other@test.com', form_data: { category: 'สมุนไพร' }, consent: true, created_at: '2026-08-09T00:00:00Z' },
  // a consumer whose interest ('เครื่องดื่ม') has NO product in the catalog → exercises the fallback
  lead_z: { id: 'lead_z', type: 'consumer', name: 'z', email: 'thirsty@test.com', form_data: { category: 'เครื่องดื่ม' }, consent: true, created_at: '2026-08-12T00:00:00Z' },
}, null, 2));
const SECRET = 'maker-private@secret.com';
writeFileSync(join(DATA, 'producers.json'), JSON.stringify({
  p1: { email: SECRET, status: 'approved', company: 'สวนสมุนไพร ก', product_name: 'ยาหม่องสมุนไพร', category: 'สมุนไพร', price: 120, created_at: '2026-08-01T00:00:00Z' },
  p2: { email: 'p2@x.com', status: 'approved', company: 'สมุนไพร ข', product_name: 'ชาสมุนไพร', category: 'สมุนไพร', price: 90, created_at: '2026-08-02T00:00:00Z' },
  p3: { email: 'p3@x.com', status: 'approved', company: 'ร้านอาหาร', product_name: 'น้ำพริก', category: 'อาหาร', price: 60, created_at: '2026-08-03T00:00:00Z' },
  p4: { email: 'p4@x.com', status: 'pending', company: 'ยังไม่อนุมัติ', product_name: 'สมุนไพรรออนุมัติ', category: 'สมุนไพร', price: 50, created_at: '2026-08-04T00:00:00Z' },
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

  console.log('\n=== a signed-up consumer gets their interest + matched recommendations ===');
  const r = await get(`/api/portals/consumer/my?email=${encodeURIComponent(EMAIL)}`);
  ok(r.status === 200 && r.data?.success, 'consumer/my → 200 success');
  ok(r.data?.consumer?.interest === 'สมุนไพร', 'returns the consumer\'s interest category (from the consumer lead, not the middleman one)');
  const recs = r.data?.recommendations || [];
  ok(recs.length === 2, 'recommends exactly the 2 APPROVED สมุนไพร products (pending one excluded)');
  ok(recs.every((p) => p.category === 'สมุนไพร'), 'every recommendation matches the stated interest');
  ok(r.data?.matched_count === 2, 'matched_count = 2');

  console.log('\n=== the producer\'s private contact email never leaks ===');
  const asText = JSON.stringify(r.data);
  ok(!asText.includes(SECRET), 'the approved producer\'s private email is NOT in the response');
  ok(recs.every((p) => !('email' in p)), 'no recommendation object carries an email field');

  console.log('\n=== interest with no catalog match falls back to the wider catalog (never empty) ===');
  const fb = await get('/api/portals/consumer/my?email=thirsty@test.com');
  ok(fb.status === 200 && fb.data?.consumer?.interest === 'เครื่องดื่ม', 'the เครื่องดื่ม consumer loads (interest has no catalog product)');
  ok(fb.data?.matched_count === 0, 'matched_count = 0 (no product in the stated interest)');
  ok((fb.data?.recommendations || []).length > 0, 'recommendations fall back to the wider catalog — never an empty dashboard');

  console.log('\n=== identity gate ===');
  const notConsumer = await get('/api/portals/consumer/my?email=nobody@test.com');
  ok(notConsumer.status === 404, 'an email that never signed up as a consumer → 404');
  const bad = await get('/api/portals/consumer/my?email=not-an-email');
  ok(bad.status === 400, 'malformed email → 400');
} finally {
  srv.kill('SIGKILL');
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
