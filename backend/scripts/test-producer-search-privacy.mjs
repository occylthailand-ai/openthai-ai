import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync } from 'node:fs';

// Privacy regression guard (self-boot) for the PUBLIC producer directory search.
//
// /api/producers/search is unauthenticated. It once mapped each approved producer's `email` into the
// response even though ProducerDirectoryPage used it only as a React key — so anyone could hit
// `/api/producers/search?q=` (empty query = match-all) and harvest every approved producer's email in
// one call (PDPA: needlessly exposing personal contact data). producers.js:235 was fixed to project only
// company/category/product_name/price/description/website/stock. That fix had NO test, so a future
// refactor could silently re-add email and re-open the harvest hole. This boots the real server and
// asserts the public search response carries the producer's product data but NEVER their email —
// including the empty-query match-all case that made harvesting trivial.
//
// /api/catalog is ALSO public and unauthenticated. It used to return the producer's raw email (the same
// harvest hole) because CatalogPage posted producer_email back at checkout. It now returns an opaque
// `ref` (a hash) instead; the order flow resolves the ref → email server-side. This test pins BOTH: the
// search endpoint and the catalog carry no producer email, and an order placed with only the catalog
// `ref` still reaches the right producer (checkout path intact, at the producer's authoritative price).
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8975;
const DATA_DIR = join('/tmp', `prodsearch-${Date.now()}`);
const ADMIN = 'ci-admin';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = `http://127.0.0.1:${PORT}`;
async function j(method, path, body, headers = {}) {
  const res = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
}

const env = { ...process.env, PORT: String(PORT), ADMIN_KEY: ADMIN, DISABLE_RATE_LIMIT: '1', OPENTHAI_DATA_DIR: DATA_DIR };
delete env.OMISE_SECRET_KEY; delete env.SUPABASE_URL; delete env.SUPABASE_SERVICE_KEY;
const app = spawn('node', ['server.js'], { cwd: ROOT, env, stdio: 'ignore' });

let exitCode = 1;
try {
  let up = false;
  for (let i = 0; i < 30; i++) { try { const r = await fetch(`${base}/api/health`); if (r.status === 200) { up = true; break; } } catch {} await sleep(400); }
  ok(up, 'server booted (/api/health 200)');

  console.log('\n=== register + approve a producer (so it is publicly searchable) ===');
  const EMAIL = `prod_${Date.now()}@test.com`;
  const COMPANY = `ไร่ทดสอบ ${Date.now()}`;
  let r = await j('POST', '/api/producers/apply', { company: COMPANY, contact_name: 'สมชาย', email: EMAIL, product_name: 'ข้าวหอมมะลิ', price: 120, stock: 8, category: 'OTOP', consent: true });
  ok(r.status === 200, `apply accepted (got ${r.status})`);
  r = await j('POST', '/api/producers/admin/status', { email: EMAIL, status: 'approved' }, { 'x-admin-key': ADMIN });
  ok(r.status === 200, `admin approved the producer (got ${r.status})`);

  const hasEmailAnywhere = (rec) =>
    Object.prototype.hasOwnProperty.call(rec, 'email') ||
    Object.values(rec).some((v) => typeof v === 'string' && v.includes(EMAIL));

  console.log('\n=== empty query (match-all) must NOT expose any producer email — the harvest case ===');
  r = await j('GET', '/api/producers/search?q=');
  ok(r.status === 200, `search returned 200 (got ${r.status})`);
  const all = r.data?.producers || [];
  ok(all.length >= 1, `the approved producer is searchable (got ${all.length} result(s))`);
  ok(all.every((p) => !hasEmailAnywhere(p)), 'no result carries an email field or the raw address (no bulk harvest)');
  const mine = all.find((p) => p.company === COMPANY);
  ok(!!mine, 'the approved producer appears by company name');
  ok(mine && mine.product_name === 'ข้าวหอมมะลิ' && Number(mine.price) === 120, 'useful product fields (name/price) are still returned');

  console.log('\n=== keyword query also returns product data without an email ===');
  r = await j('GET', `/api/producers/search?q=${encodeURIComponent('ข้าวหอม')}`);
  const kw = r.data?.producers || [];
  ok(kw.length >= 1 && kw.some((p) => p.company === COMPANY), 'keyword search finds the producer');
  ok(kw.every((p) => !hasEmailAnywhere(p)), 'keyword search results also carry no email');

  console.log('\n=== /api/catalog must NOT leak producer email either — returns an opaque ref ===');
  r = await j('GET', '/api/catalog');
  const cat = (r.data?.products || []).filter((p) => p.product_name === 'ข้าวหอมมะลิ');
  ok(cat.length >= 1, 'the approved product is listed in the public catalog (checkout path intact)');
  const row = cat[0] || {};
  ok(!hasEmailAnywhere(row), 'catalog row carries NO producer email or raw address (no bulk harvest)');
  ok(typeof row.ref === 'string' && row.ref.length > 0 && !row.ref.includes('@'), 'catalog row exposes an opaque ref instead of the email');

  console.log('\n=== an order placed with ONLY the catalog ref still reaches the right producer ===');
  r = await j('POST', '/api/orders', { producer_ref: row.ref, product_name: 'ข้าวหอมมะลิ', price: 1, customer_name: 'ผู้ซื้อ', contact: '0810000000', address: 'กทม', qty: 2 });
  ok(r.status === 200 && r.data?.success, `order via ref accepted (got ${r.status})`);
  // price authority: the producer's real price (120) wins over the tampered client price (1) → 120*2=240
  ok(Number(r.data?.amount) === 240, `order amount uses the producer's authoritative price via the resolved ref (got ${r.data?.amount})`);

  console.log('\n=== a bogus ref does not resolve to our producer (no authoritative price applied) ===');
  r = await j('POST', '/api/orders', { producer_ref: 'deadbeefdeadbeefdeadbeef', product_name: 'ข้าวหอมมะลิ', price: 5, customer_name: 'y', contact: '0810000000', address: 'z', qty: 1 });
  // unknown ref → no producer resolved → the real producer's authoritative price (120) is NOT applied;
  // the client price (5) stands, proving the bogus ref didn't attach to the real producer.
  ok(Number(r.data?.amount) !== 240 && Number(r.data?.amount) !== 120, `unknown ref gets no producer price authority (amount ${r.data?.amount}, not 120/240)`);

  exitCode = fail ? 1 : 0;
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
} finally {
  try { app.kill('SIGKILL'); } catch {}
  await sleep(150);
  try { rmSync(DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
}
process.exit(exitCode);
