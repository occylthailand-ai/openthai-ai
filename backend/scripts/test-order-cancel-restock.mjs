// Deterministic integration test (no server, file-store) — cancelling an order restores producer stock.
// decrementStock fires on order placement (onNewOrder); without a matching restore on cancel, a
// producer's stock leaks away for orders that never happened, eventually tripping the catalog
// "สินค้าหมด" badge + the order stock guard on a producer who actually sold nothing. This wires the
// SAME onNewOrder→decrement / onCancel→increment hooks server.js uses and pins the round-trip.
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createOrders } from '../orders.js';
import { createProducers } from '../producers.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const dir = mkdtempSync(join(tmpdir(), 'restock-'));
// seed producers.json: one tracks stock (5), one is untracked (null)
writeFileSync(join(dir, 'producers.json'), JSON.stringify({
  'p@x.com': { email: 'p@x.com', company: 'ร้าน', product_name: 'ของ', price: 100, stock: 5, status: 'approved', consent: true, created_at: '2026-01-01' },
  'free@x.com': { email: 'free@x.com', company: 'ไม่จำกัด', product_name: 'ของไม่ track', price: 50, stock: null, status: 'approved', consent: true, created_at: '2026-01-01' },
}));
const producers = createProducers(dir);
// wire the exact hooks server.js uses
const orders = createOrders(dir, {
  onNewOrder: async (o) => { try { await producers.decrementStock(o.producer_email, o.qty); } catch {} },
  onCancel:   async (o) => { try { await producers.incrementStock(o.producer_email, o.qty); } catch {} },
});
const base = { product_name: 'ของ', customer_name: 'ลูกค้า', contact: 'c@x.com' };

console.log('=== placing then cancelling restores the exact quantity ===');
ok(await producers.getStock('p@x.com') === 5, 'producer starts at stock 5');
const r1 = await orders.place({ ...base, producer_email: 'p@x.com', qty: 2 });
ok(r1.ok && await producers.getStock('p@x.com') === 3, 'placing qty 2 decremented 5 → 3 (onNewOrder)');
await orders.setStatus(r1.id, 'cancelled', 'ลูกค้ายกเลิก');
ok(await producers.getStock('p@x.com') === 5, 'cancelling restored 3 → 5 (onCancel)');

console.log('\n=== restore fires exactly once (idempotent) ===');
await orders.setStatus(r1.id, 'cancelled', 'ยกเลิกซ้ำ');
ok(await producers.getStock('p@x.com') === 5, 're-cancelling an already-cancelled order does NOT over-restore (still 5)');
const r2 = await orders.place({ ...base, producer_email: 'p@x.com', qty: 1 });
await orders.setStatus(r2.id, 'confirmed', 'ยืนยัน');
ok(await producers.getStock('p@x.com') === 4, 'a non-cancel status change (→confirmed) does not restore (5→4 stays 4)');
await orders.setStatus(r2.id, 'cancelled', 'ยกเลิกทีหลัง');
ok(await producers.getStock('p@x.com') === 5, 'cancelling a previously-confirmed order still restores once (4 → 5)');

console.log('\n=== untracked stock + unknown producers are untouched (no throw) ===');
const rf = await orders.place({ ...base, producer_email: 'free@x.com', product_name: 'ของไม่ track', qty: 9 });
ok(await producers.getStock('free@x.com') === null, 'untracked (null) producer: placing does not start tracking');
await orders.setStatus(rf.id, 'cancelled', 'ยกเลิก');
ok(await producers.getStock('free@x.com') === null, 'untracked producer: cancelling leaves stock null (always available)');
const ru = await orders.place({ ...base, producer_email: 'store@openthai.ai', product_name: 'ของร้าน', qty: 3 });
await orders.setStatus(ru.id, 'cancelled', 'ยกเลิก');
ok(ru.ok === true, 'an order whose email matches no producer (e.g. the platform store) cancels cleanly — no throw, nothing to restore');

console.log('\n=== the increment helper itself ===');
ok(await producers.getStock('p@x.com') === 5, 'sanity: producer back at 5');
await producers.incrementStock('p@x.com', 3);
ok(await producers.getStock('p@x.com') === 8, 'incrementStock adds to tracked stock (5 → 8)');
await producers.incrementStock('nobody@x.com', 5);
ok(true, 'incrementStock on an unknown producer is a safe no-op');

rmSync(dir, { recursive: true, force: true });
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
