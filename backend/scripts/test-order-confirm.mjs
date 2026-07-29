// Deterministic unit test (no server, no SMTP) — the buyer order-confirmation decision helper.
// Pins the two things that matter: WHEN a buyer is emailed (only if their contact is an email) and
// the Track link we build (correct order id + contact, URL-encoded) so a buyer never loses their order.
import { buyerConfirmation } from '../order-confirm.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const DOMAIN = 'https://www.openthai-ai.com';
const order = { id: 'ord_123_abc', product_name: 'สบู่สมุนไพร', qty: 2, amount: 240, customer_name: 'สมชาย', contact: 'buyer@example.com' };

console.log('=== emails the buyer only when the contact is an email ===');
const c = buyerConfirmation(order, DOMAIN);
ok(c && c.to === 'buyer@example.com', 'email contact → returns a confirmation to that address');
ok(buyerConfirmation({ ...order, contact: '0812345678' }, DOMAIN) === null, 'phone contact → null (no email channel, skip — no guessing)');
ok(buyerConfirmation({ ...order, contact: '' }, DOMAIN) === null, 'empty contact → null');
ok(buyerConfirmation({ ...order, contact: 'not-an-email' }, DOMAIN) === null, 'garbage contact → null');
ok(buyerConfirmation({}, DOMAIN) === null, 'a bare/empty order → null (never throws)');

console.log('\n=== the Track link carries the order id + contact, URL-encoded ===');
ok(c.trackUrl === `${DOMAIN}/track?id=ord_123_abc&contact=buyer%40example.com`, 'trackUrl = /track?id=<id>&contact=<encoded email>');
const weird = buyerConfirmation({ ...order, id: 'ord a/b', contact: 'a+b@x.com' }, DOMAIN);
ok(weird.trackUrl.includes('id=ord%20a%2Fb') && weird.trackUrl.includes('contact=a%2Bb%40x.com'), 'special chars in id/contact are encoded (no broken link)');
ok(buyerConfirmation(order, 'https://x.com/').trackUrl.startsWith('https://x.com/track'), 'a trailing slash on the domain does not double up');

console.log('\n=== subject names the product + quantity ===');
ok(/สบู่สมุนไพร/.test(c.subject) && /×2/.test(c.subject), 'subject includes the product name and ×qty');
ok(/ยืนยันคำสั่งซื้อ/.test(c.subject), 'subject reads as a confirmation (Thai)');
ok(buyerConfirmation({ ...order, qty: undefined }).subject.includes('×1'), 'missing qty defaults to ×1 in the subject');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
