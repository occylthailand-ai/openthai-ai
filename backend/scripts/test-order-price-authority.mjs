// Deterministic unit test (no server, file-store mode) — the server-side PRICE authority in place().
//
// A marketplace order (CatalogPage → POST /api/orders) used to record `amount` from the client-supplied
// `price`. A stale catalog tab (producer changed their price) or a tampered POST could therefore record —
// and email the buyer/producer a receipt showing — the wrong total. place() now prefers the producer's
// CURRENT server price (getProducerPrice, companion to the stock guard's getProducerStock), falling back
// to the client price only when no authoritative price exists (producer lists none / lookup throws / no
// hook — e.g. the first-party store path which passes its own verified price and has no producer record).
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createOrders } from '../orders.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const dir = mkdtempSync(join(tmpdir(), 'ordprice-'));
const base = { producer_email: 'p@x.com', product_name: 'ยาดม', customer_name: 'ลูกค้า', contact: 'c@x.com' };
// authoritative price table the mock reads; null / missing = producer lists no price
const PRICE = { 'p@x.com': 500, 'free@x.com': null };
const amountOf = async (o, r) => (await o.getOne(r.id))?.amount;

console.log('=== the server price overrides whatever the client posted ===');
const o = createOrders(dir, { getProducerPrice: async (email) => PRICE[email] ?? null });
let r = await o.place({ ...base, qty: 2, price: 1 }); // client tries to pay ฿1 for a ฿500 item
ok(r.ok === true, 'order accepted');
ok(await amountOf(o, r) === 1000, `amount uses the server price (฿500 × 2 = ฿1000), NOT the client's ฿1 (got ${await amountOf(o, r)})`);

r = await o.place({ ...base, qty: 1, price: 500 }); // honest client, matching price
ok(await amountOf(o, r) === 500, 'a matching client price records the same amount (฿500)');

r = await o.place({ ...base, qty: 3 }); // client omits price entirely
ok(await amountOf(o, r) === 1500, `a missing client price is filled from the server price (฿500 × 3 = ฿1500) (got ${await amountOf(o, r)})`);

console.log('\n=== graceful fallback to the client price when no authoritative price exists ===');
r = await o.place({ ...base, producer_email: 'free@x.com', qty: 2, price: 80 });
ok(await amountOf(o, r) === 160, `producer lists no price → client price kept (฿80 × 2 = ฿160) (got ${await amountOf(o, r)})`);

const throwing = createOrders(dir, { getProducerPrice: async () => { throw new Error('lookup down'); } });
r = await throwing.place({ ...base, qty: 1, price: 250 });
ok(r.ok === true && await amountOf(throwing, r) === 250, 'if the price lookup throws, the client price is used (order not lost)');

const noHook = createOrders(dir, {}); // e.g. the first-party store path (passes its own verified price)
r = await noHook.place({ ...base, qty: 2, price: 500 });
ok(await amountOf(noHook, r) === 1000, 'no getProducerPrice hook → the passed (server-verified) price is used unchanged (฿1000)');

console.log('\n=== a producer with no price and a client with no price → amount null (unchanged behaviour) ===');
r = await o.place({ ...base, producer_email: 'free@x.com', qty: 1 });
ok((await o.getOne(r.id))?.amount === null, 'no server price + no client price → amount null (not 0/NaN)');

rmSync(dir, { recursive: true, force: true });
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
