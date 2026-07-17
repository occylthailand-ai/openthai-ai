// Unit test for the Openthai Store buyer-receipt logic (backend/shop-receipt.js).
// Deterministic, no server/SMTP. Pins: (1) a receipt is only emailable when the buyer's
// contact is an email (checkout also accepts phone/LINE); (2) the receipt body carries the
// real order id / product / qty / amount and HTML-escapes user-supplied fields.
import { isReceiptEmail, buildShopReceipt, buildShippedNotice, buildDeliveredNotice } from '../shop-receipt.js';

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

console.log(`\n${'='.repeat(48)}`);
console.log(`ผลทดสอบ: ✅ ${pass} ผ่าน · ❌ ${fail} ไม่ผ่าน`);
console.log('='.repeat(48));
process.exit(fail > 0 ? 1 : 0);
