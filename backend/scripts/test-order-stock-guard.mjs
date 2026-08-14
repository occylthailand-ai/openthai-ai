// Deterministic unit test (no server, file-store mode) — the server-side stock guard in place().
// Companion to the CatalogPage "สินค้าหมด" UI: a direct POST /api/orders (or a stale catalog tab)
// must not place an order the producer can't fulfil. getProducerStock returns the producer's stock,
// or null when untracked (= always orderable). A failing lookup must NOT block the order.
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createOrders } from '../orders.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const dir = mkdtempSync(join(tmpdir(), 'ordtest-'));
const base = { producer_email: 'p@x.com', product_name: 'ยาดม', customer_name: 'ลูกค้า', contact: 'c@x.com' };
// stock table the mock reads; null = untracked
const STOCK = { 'p@x.com': 10, 'sold@x.com': 0, 'low@x.com': 2, 'untracked@x.com': null };
const mkOrders = (getProducerStock) => createOrders(dir, { getProducerStock });

console.log('=== the guard blocks orders a producer cannot fulfil ===');
const o = mkOrders(async (email) => STOCK[email] ?? null);
ok((await o.place({ ...base, qty: 3 })).ok === true, 'stock 10, qty 3 → order accepted');
ok((await o.place({ ...base, producer_email: 'untracked@x.com', qty: 99 })).ok === true, 'untracked stock (null) → always orderable, even large qty');
const soldOut = await o.place({ ...base, producer_email: 'sold@x.com', qty: 1 });
ok(soldOut.ok === false && soldOut.out_of_stock === true && /สินค้าหมด/.test(soldOut.error), 'stock 0 → rejected with out_of_stock + "สินค้าหมด"');
const low = await o.place({ ...base, producer_email: 'low@x.com', qty: 5 });
ok(low.ok === false && /สต๊อกไม่พอ.*เหลือ 2/.test(low.error), 'stock 2 + qty 5 → rejected "สต๊อกไม่พอ (เหลือ 2 ชิ้น)"');
ok((await o.place({ ...base, producer_email: 'low@x.com', qty: 2 })).ok === true, 'stock 2 + qty 2 → accepted (exactly enough)');

console.log('\n=== graceful degradation + backward compatibility ===');
const throwing = mkOrders(async () => { throw new Error('lookup down'); });
ok((await throwing.place({ ...base, qty: 1 })).ok === true, 'if the stock lookup throws, the order is NOT blocked (degrade, never lose a sale)');
const noGuard = createOrders(dir, {}); // no getProducerStock at all
ok((await noGuard.place({ ...base, producer_email: 'sold@x.com', qty: 1 })).ok === true, 'no getProducerStock hook → prior always-accept behaviour (backward compatible)');

console.log('\n=== the stock guard does not weaken the existing field validation ===');
ok((await o.place({ producer_email: 'p@x.com', product_name: 'ยาดม', customer_name: '' })).ok === false, 'missing contact/name still rejected (validation runs before the guard)');
// the guard only runs for well-formed orders, so a bad order is a validation error, not a stock error
const bad = await o.place({ producer_email: 'sold@x.com', product_name: '', customer_name: 'x', contact: 'y' });
ok(bad.ok === false && !bad.out_of_stock, 'a malformed order fails validation, not the stock guard');

rmSync(dir, { recursive: true, force: true });
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
