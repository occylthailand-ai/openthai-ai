// Unit test for the Openthai Store buyer-receipt logic (backend/shop-receipt.js).
// Deterministic, no server/SMTP. Pins: (1) a receipt is only emailable when the buyer's
// contact is an email (checkout also accepts phone/LINE); (2) the receipt body carries the
// real order id / product / qty / amount and HTML-escapes user-supplied fields.
import { isReceiptEmail, buildShopReceipt } from '../shop-receipt.js';

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

console.log(`\n${'='.repeat(48)}`);
console.log(`ผลทดสอบ: ✅ ${pass} ผ่าน · ❌ ${fail} ไม่ผ่าน`);
console.log('='.repeat(48));
process.exit(fail > 0 ? 1 : 0);
