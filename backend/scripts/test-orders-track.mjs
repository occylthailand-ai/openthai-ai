// Unit test for the buyer-facing order projection (orders.js → publicOrderView).
// Pins the privacy invariant: the public /api/orders/track response must NOT leak the
// internal free-text history notes — the oversold "race" refund note (which embeds the
// Omise charge id), escrow:* state strings, or whatever an admin typed when cancelling.
// The buyer-facing details (carrier / tracking no / delivery proof) still come through
// as dedicated fields; the timeline keeps only { status, at }.
import { publicOrderView } from '../orders.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };

const internalOrder = {
  id: 'ord_1', product_name: 'ครีมทดสอบ', qty: 2, amount: 1000, status: 'cancelled',
  contact: 'buyer@test.com', address: '123 ถนนทดสอบ', producer_email: 'store@x.com',
  tracking_no: 'TH999', carrier: 'Flash', delivered_at: null, received_by: null, drop_off: null,
  created_at: '2026-07-17T00:00:00Z',
  history: [
    { status: 'new', at: '2026-07-17T00:00:00Z', note: '' },
    { status: 'cancelled', at: '2026-07-17T00:05:00Z', note: 'ชำระเงินสำเร็จแต่สต๊อกหมดพอดี (race) — ต้องคืนเงินลูกค้า · charge ch_test_5xyz' },
    { status: 'cancelled', at: '2026-07-17T00:06:00Z', note: 'สงสัยว่าลูกค้าฉ้อโกง — internal' },
  ],
};

console.log('\n=== publicOrderView strips internal history notes (privacy) ===');
const v = publicOrderView(internalOrder);
const asText = JSON.stringify(v);
ok(!asText.includes('charge ch_test_5xyz'), 'the Omise charge id from the race note is NOT in the public view');
ok(!asText.includes('(race)'), 'the internal "race" wording is NOT leaked');
ok(!asText.includes('ฉ้อโกง'), 'an admin internal remark is NOT leaked');
ok(v.history.every((h) => !('note' in h)), 'no history entry carries a note field at all');

console.log('\n=== but the buyer-facing data is fully preserved ===');
ok(v.history.length === 3, 'every timeline step is still present (status + when)');
ok(v.history[1].status === 'cancelled' && v.history[1].at === '2026-07-17T00:05:00Z', 'status + timestamp of each step preserved');
ok(v.tracking_no === 'TH999' && v.carrier === 'Flash', 'carrier + tracking number preserved (dedicated fields)');
ok(v.id === 'ord_1' && v.product_name === 'ครีมทดสอบ' && v.qty === 2 && v.amount === 1000, 'id/product/qty/amount preserved');
ok(v.status === 'cancelled', 'order status preserved');

console.log('\n=== internal-only fields never appear in the public view ===');
ok(!('contact' in v), 'buyer contact is not echoed back');
ok(!('address' in v), 'shipping address is not echoed back');
ok(!('producer_email' in v), 'producer_email is not exposed');

console.log('\n=== delivery proof (buyer-facing) passes through when present ===');
const delivered = publicOrderView({ id: 'o', status: 'delivered', delivered_at: '2026-07-17T01:00:00Z', received_by: 'คุณแม่บ้าน', drop_off: 'หน้าบ้าน', history: [] });
ok(delivered.received_by === 'คุณแม่บ้าน' && delivered.drop_off === 'หน้าบ้าน' && delivered.delivered_at === '2026-07-17T01:00:00Z', 'received_by / drop_off / delivered_at preserved');

console.log('\n=== defensive: odd inputs do not throw ===');
ok(publicOrderView(null) === null, 'null order → null (no crash)');
ok(Array.isArray(publicOrderView({ id: 'o' }).history) && publicOrderView({ id: 'o' }).history.length === 0, 'missing history → [] (no crash)');

console.log(`\n${'='.repeat(48)}`);
console.log(`ผลทดสอบ: ✅ ${pass} ผ่าน · ❌ ${fail} ไม่ผ่าน`);
console.log('='.repeat(48));
process.exit(fail > 0 ? 1 : 0);
