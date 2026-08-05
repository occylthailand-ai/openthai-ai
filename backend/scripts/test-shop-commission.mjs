// Regression test — affiliate commission on a STORE purchase made via a ref link (#9).
// /api/shop/checkout used to capture the affiliate `ref` (for channel attribution) but
// never credit a commission, unlike subscription/quickpay. This guards that a paid shop
// checkout with a ref credits the affiliate at their tier rate — and that a checkout
// WITHOUT a ref credits nobody.
// รัน (hermetic): boot server ด้วย mock mode (no OMISE_SECRET_KEY) + OPENTHAI_DATA_DIR=/tmp/xxx
//      (ชี้ file store ทั้งหมดไปโฟลเดอร์ทิ้ง ไม่แตะ backend/data/ ที่ track ไว้) + ADMIN_KEY ที่ตั้งเอง
//      เช่น: OPENTHAI_DATA_DIR=/tmp/shopcomm ADMIN_KEY=ci-admin PORT=8898 node server.js
//      แล้ว TEST_BASE=http://127.0.0.1:8898 ADMIN_KEY=ci-admin node scripts/test-shop-commission.mjs
const BASE = process.env.TEST_BASE || 'http://localhost:8000';
const ADMIN = process.env.ADMIN_KEY || 'testadmin';
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };

async function j(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
}
const stats = async (ref) => (await j('GET', `/api/affiliate/stats/${ref}`)).data?.data || {};

console.log('\n=== STEP 1: register affiliate (rate 0.20) ===');
const EMAIL = `shopaff_${Date.now()}@test.com`;
let r = await j('POST', '/api/affiliate/apply', { name: 'Shop Aff', email: EMAIL, platform: 'TikTok', consent: true });
const REF = r.data?.data?.ref_code;
ok(r.status === 200 && REF, `registered, ref_code=${REF}`);
ok(Math.abs((r.data?.data?.commission_rate ?? 0) - 0.20) < 1e-9, 'commission_rate 0.20');

console.log('\n=== STEP 2: create a ฿500 product (admin) ===');
r = await j('POST', '/api/inventory/admin/upsert', { sku: `SKU${Date.now()}`, name: 'ครีมทดสอบ', price: 500, stock: 10, status: 'active' }, { 'x-admin-key': ADMIN });
const PID = r.data?.id || r.data?.product?.id;
ok(r.status === 200 && PID, `product created, id=${PID}`);

console.log('\n=== STEP 3: checkout qty 2 WITH ref (card → mock paid) → commission 200 ===');
r = await j('POST', '/api/shop/checkout', { product_id: PID, qty: 2, customer_name: 'ลูกค้า', contact: 'c@x.com', method: 'card', ref: REF });
ok(r.status === 200 && r.data?.paid === true, `checkout paid, amount=${r.data?.amount}`);
const s1 = await stats(REF);
ok(s1.total_sales === 1, `affiliate total_sales = 1 (got ${s1.total_sales})`);
ok(Math.abs((s1.total_earned ?? 0) - 200) < 1e-9, `affiliate total_earned = 200 (฿1000 × 0.20) (got ${s1.total_earned})`);

console.log('\n=== STEP 4: checkout again WITHOUT ref → affiliate unchanged ===');
r = await j('POST', '/api/shop/checkout', { product_id: PID, qty: 1, customer_name: 'ลูกค้า2', contact: 'c2@x.com', method: 'card' });
ok(r.status === 200 && r.data?.paid === true, 'no-ref checkout paid');
const s2 = await stats(REF);
ok(s2.total_sales === 1 && Math.abs((s2.total_earned ?? 0) - 200) < 1e-9, `affiliate still 1 sale / ฿200 (no spurious credit) (got ${s2.total_sales}/${s2.total_earned})`);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
