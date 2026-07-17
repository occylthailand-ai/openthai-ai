// Unit test for the Openthai Store buyer-receipt logic (backend/shop-receipt.js).
// Deterministic, no server/SMTP. Pins: (1) a receipt is only emailable when the buyer's
// contact is an email (checkout also accepts phone/LINE); (2) the receipt body carries the
// real order id / product / qty / amount and HTML-escapes user-supplied fields.
import { isReceiptEmail, buildShopReceipt, buildShippedNotice, buildDeliveredNotice, buildCancelledNotice, buildQuickpayReceipt } from '../shop-receipt.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };

console.log('\n=== isReceiptEmail (only real emails get a receipt) ===');
ok(isReceiptEmail('buyer@test.com') === true, 'email contact → true');
ok(isReceiptEmail('0812345678') === false, 'phone contact → false');
ok(isReceiptEmail('someone-line-id') === false, 'LINE id → false');
ok(isReceiptEmail('') === false, 'empty → false');
ok(isReceiptEmail(undefined) === false, 'undefined → false (no crash)');

console.log('\n=== buildShopReceipt content ===');
const r = buildShopReceipt({ customer_name: 'สมชาย', product_name: 'ครีมทดสอบ', qty: 2, amount: 1000, order_id: 'ord_123' });
ok(r.subject.includes('ord_123'), `subject carries the order id (${r.subject})`);
ok(r.html.includes('ord_123'), 'body shows the order id');
ok(r.html.includes('ครีมทดสอบ') && r.html.includes('× 2'), 'body shows product name × qty');
ok(r.html.includes('฿1,000'), 'body shows the THB total, grouped');
ok(r.html.includes('สมชาย'), 'body greets the customer by name');

console.log('\n=== HTML-escapes user-supplied fields (no injection into the email) ===');
const x = buildShopReceipt({ customer_name: '<script>x</script>', product_name: 'A & B "C"', qty: 1, amount: 50, order_id: 'ord_x' });
ok(!x.html.includes('<script>'), 'a <script> in the name is escaped, not raw');
ok(x.html.includes('&lt;script&gt;'), 'name rendered as escaped entities');
ok(x.html.includes('A &amp; B &quot;C&quot;'), 'product name & and quotes escaped');

console.log('\n=== defensive: missing/odd fields do not throw ===');
ok(!!buildShopReceipt({}).subject, 'empty order still builds a subject (no crash)');
ok(buildShopReceipt({ qty: 0, amount: -5 }).html.includes('× 1'), 'qty<1 clamps to 1');

console.log('\n=== buildShippedNotice content ===');
const s = buildShippedNotice({ customer_name: 'สมชาย', product_name: 'ครีมทดสอบ', tracking_no: 'TH12345', carrier: 'Flash', order_id: 'ord_9' });
ok(s.subject.includes('ord_9') && s.subject.includes('จัดส่ง'), `shipped subject carries order id + จัดส่ง (${s.subject})`);
ok(s.html.includes('TH12345'), 'shipped body shows the tracking number');
ok(s.html.includes('Flash'), 'shipped body shows the carrier');
ok(s.html.includes('ครีมทดสอบ') && s.html.includes('ord_9'), 'shipped body shows product + order id');
const s2 = buildShippedNotice({ product_name: 'X', order_id: 'ord_10' });
ok(!!s2.subject && !s2.html.includes('undefined'), 'no tracking/carrier → still builds, no "undefined" leaks');
const sx = buildShippedNotice({ tracking_no: '<b>x</b>', carrier: 'A&B', order_id: 'o' });
ok(!sx.html.includes('<b>x</b>') && sx.html.includes('&lt;b&gt;'), 'tracking number is HTML-escaped');
ok(sx.html.includes('A&amp;B'), 'carrier is HTML-escaped');

console.log('\n=== buildDeliveredNotice content ===');
const d = buildDeliveredNotice({ customer_name: 'สมชาย', product_name: 'ครีมทดสอบ', order_id: 'ord_d', received_by: 'คุณแม่บ้าน' });
ok(d.subject.includes('ord_d') && d.subject.includes('ถึงแล้ว'), `delivered subject carries order id + ถึงแล้ว (${d.subject})`);
ok(d.html.includes('เซ็นรับโดย คุณแม่บ้าน'), 'delivered body shows received_by proof');
ok(d.html.includes('ครีมทดสอบ') && d.html.includes('ord_d'), 'delivered body shows product + order id');
const d2 = buildDeliveredNotice({ order_id: 'o', drop_off: 'หน้าบ้าน' });
ok(d2.html.includes('ฝากไว้ที่ หน้าบ้าน'), 'drop_off proof used when no received_by');
const d3 = buildDeliveredNotice({ order_id: 'o' });
ok(d3.html.includes('จัดส่งสำเร็จ') && !d3.html.includes('undefined'), 'no proof → "จัดส่งสำเร็จ", no undefined leak');
const dx = buildDeliveredNotice({ order_id: 'o', received_by: '<img src=x>' });
ok(!dx.html.includes('<img src=x>') && dx.html.includes('&lt;img'), 'received_by is HTML-escaped');

console.log('\n=== buildCancelledNotice content ===');
const c = buildCancelledNotice({ customer_name: 'สมชาย', product_name: 'ครีมทดสอบ', order_id: 'ord_c', amount: 1000, reason: 'สินค้าหมดสต๊อก', refund_pending: true });
ok(c.subject.includes('ord_c') && c.subject.includes('ยกเลิก'), `cancelled subject carries order id + ยกเลิก (${c.subject})`);
ok(c.html.includes('ครีมทดสอบ') && c.html.includes('ord_c'), 'cancelled body shows product + order id');
ok(c.html.includes('สินค้าหมดสต๊อก'), 'cancelled body shows the reason when given');
ok(c.html.includes('การคืนเงิน') && c.html.includes('฿1,000'), 'paid order → refund block with the THB amount');
const c2 = buildCancelledNotice({ order_id: 'ord_free', product_name: 'X' });
ok(!c2.html.includes('การคืนเงิน'), 'unpaid order (no amount) → no refund block');
ok(!c2.html.includes('เหตุผล'), 'no reason given → no reason row (no empty label)');
const c3 = buildCancelledNotice({ order_id: 'o', amount: 500 });
ok(c3.html.includes('การคืนเงิน') && c3.html.includes('฿500'), 'amount>0 alone triggers refund block (refund_pending implied)');
const cx = buildCancelledNotice({ order_id: 'o', reason: '<script>x</script>', customer_name: 'A&B' });
ok(!cx.html.includes('<script>x</script>') && cx.html.includes('&lt;script&gt;'), 'reason is HTML-escaped');
ok(cx.html.includes('A&amp;B'), 'customer name is HTML-escaped');

console.log('\n=== buildQuickpayReceipt content (one-time purchase, NOT subscription) ===');
const qp = buildQuickpayReceipt({ buyer: 'สมชาย', label: 'แพ็กเกจโปรโมชัน', amount: 1500, charge_id: 'chrg_qp_1', paid_at: '2026-07-17T10:00:00Z' });
ok(qp.subject.includes('แพ็กเกจโปรโมชัน'), `quickpay subject carries the label (${qp.subject})`);
ok(qp.html.includes('แพ็กเกจโปรโมชัน') && qp.html.includes('chrg_qp_1'), 'body shows label + charge reference');
ok(qp.html.includes('฿1,500'), 'body shows the THB total, grouped');
ok(qp.html.includes('สมชาย'), 'body greets the buyer by name');
ok(!/แผน|subscription|รายเดือน|อัพเกรด/i.test(qp.html), 'no subscription/plan/upgrade wording (it is a one-time buy)');
const qp2 = buildQuickpayReceipt({ label: 'X', amount: 0 });
ok(!!qp2.subject && !qp2.html.includes('undefined'), 'missing buyer/charge/amount → still builds, no "undefined" leak');
const qpx = buildQuickpayReceipt({ buyer: '<b>x</b>', label: 'A & B', amount: 50, charge_id: '<i>c</i>' });
ok(!qpx.html.includes('<b>x</b>') && qpx.html.includes('&lt;b&gt;'), 'buyer name is HTML-escaped');
ok(qpx.html.includes('A &amp; B'), 'label is HTML-escaped');
ok(!qpx.html.includes('<i>c</i>') && qpx.html.includes('&lt;i&gt;'), 'charge reference is HTML-escaped');

console.log(`\n${'='.repeat(48)}`);
console.log(`ผลทดสอบ: ✅ ${pass} ผ่าน · ❌ ${fail} ไม่ผ่าน`);
console.log('='.repeat(48));
process.exit(fail > 0 ? 1 : 0);
