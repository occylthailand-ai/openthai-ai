import { createHmac } from 'crypto';

// Regression test — affiliate → QuickPay → webhook → commission crediting (E2E)
// รัน: เปิด server (mock mode + OMISE_WEBHOOK_SECRET=testsecret) แล้ว node scripts/test-affiliate-flow.mjs
const BASE = process.env.TEST_BASE || 'http://localhost:8000';
const SECRET = process.env.OMISE_WEBHOOK_SECRET || 'testsecret';
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };

async function j(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  let data = null; try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
}

const REF = 'TESTAFF' + Date.now().toString().slice(-5);
const EMAIL = `aff_${Date.now()}@test.com`;

console.log('\n=== STEP 1: สมัคร affiliate ===');
let r = await j('POST', '/api/affiliate/apply', { name: 'Test Affiliate', email: EMAIL, platform: 'TikTok', ref_code: REF });
ok(r.status === 200 && r.data?.success, `สมัคร affiliate (${REF})`);
ok(r.data?.data?.ref_code === REF, `ได้ ref_code ตรง: ${r.data?.data?.ref_code}`);
ok(Math.abs((r.data?.data?.commission_rate ?? 0) - 0.20) < 1e-9, `ค่าคอม 20%`);

console.log('\n=== STEP 2: นับคลิกลิงก์ ref ===');
r = await j('POST', '/api/affiliate/click', { ref: REF });
ok(r.status === 200 && r.data?.success, 'นับคลิกสำเร็จ');
r = await j('POST', '/api/affiliate/click', { ref: REF });
ok(r.data?.success, 'นับคลิกครั้งที่ 2');
r = await j('POST', '/api/affiliate/click', { ref: 'NOSUCHCODE' });
ok(r.data?.success === false, 'ref ที่ไม่มีจริง → ไม่นับ');

console.log('\n=== STEP 3: สร้าง QuickPay ผ่าน ref (mock mode) ===');
r = await j('POST', '/api/quickpay/create', { amount_thb: 1000, label: 'แพ็กเกจทดสอบ', ref: REF });
ok(r.status === 200 && r.data?.success, 'สร้าง QuickPay สำเร็จ');
ok(r.data?.mock === true, 'อยู่ใน mock mode (ยังไม่ตั้ง Omise)');
ok(r.data?.ref_code === REF, `QuickPay ผูก ref_code: ${r.data?.ref_code}`);
ok(r.data?.amount_thb === 1000, `ยอด ฿${r.data?.amount_thb}`);
const chargeId = r.data?.charge_id;
ok(!!chargeId, `ได้ charge_id: ${chargeId}`);

console.log('\n=== STEP 4: ทดสอบ ref ปลอม (ไม่มีในระบบ) → ต้องไม่ผูก ===');
r = await j('POST', '/api/quickpay/create', { amount_thb: 500, ref: 'FAKEREF999' });
ok(r.data?.ref_code === null, 'ref ปลอม → ref_code = null (ไม่เครดิตมั่ว)');

console.log('\n=== STEP 5: ยิง webhook charge.complete (เซ็น HMAC จริง) ===');
const event = { key: 'charge.complete', data: { id: chargeId, paid: true, amount: 100000, paid_at: new Date().toISOString(), metadata: {} } };
const raw = JSON.stringify(event);
const sig = createHmac('sha256', SECRET).update(raw).digest('hex');
r = await j('POST', '/api/payment/webhook', raw, { 'x-omise-signature': sig });
ok(r.status === 200 && r.data?.received, 'webhook รับ event (ลายเซ็นถูกต้อง)');

console.log('\n=== STEP 6: webhook ลายเซ็นผิด → ต้องถูกปฏิเสธ ===');
r = await j('POST', '/api/payment/webhook', raw, { 'x-omise-signature': 'deadbeef' });
ok(r.status === 401 || r.data?.received !== true, 'ลายเซ็นผิด → ปฏิเสธ (กันปลอมการจ่าย)');

console.log('\n=== STEP 7: ตรวจค่าคอมเข้า affiliate จริง ===');
r = await j('GET', `/api/affiliate/stats/${REF}`);
const d = r.data?.data || {};
ok(d.total_sales === 1, `total_sales = ${d.total_sales} (คาดหวัง 1)`);
ok(Math.abs((d.total_earned ?? 0) - 200) < 1e-9, `total_earned = ฿${d.total_earned} (คาดหวัง ฿200 = 20% ของ ฿1,000)`);
ok(d.pending_payout === 200, `pending_payout = ฿${d.pending_payout}`);
ok(d.clicks >= 2, `clicks = ${d.clicks} (คาดหวัง >=2)`);
ok(d.conversion_rate > 0, `conversion_rate = ${d.conversion_rate}%`);

console.log('\n=== STEP 8: ยิง webhook ซ้ำ charge เดิม → ต้องไม่เครดิตซ้ำ ===');
r = await j('POST', '/api/payment/webhook', raw, { 'x-omise-signature': sig });
ok(r.status === 200, 'webhook ซ้ำรับได้');
r = await j('GET', `/api/affiliate/stats/${REF}`);
ok(r.data?.data?.total_sales === 1, `total_sales ยังเป็น 1 (กันเครดิตซ้ำ) = ${r.data?.data?.total_sales}`);
ok(Math.abs((r.data?.data?.total_earned ?? 0) - 200) < 1e-9, `total_earned ยังเป็น ฿200 = ${r.data?.data?.total_earned}`);

console.log(`\n${'='.repeat(48)}`);
console.log(`ผลทดสอบ: ✅ ${pass} ผ่าน · ❌ ${fail} ไม่ผ่าน`);
console.log('='.repeat(48));
process.exit(fail > 0 ? 1 : 0);
