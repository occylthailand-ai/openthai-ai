import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createInventory } from '../inventory.js';

// Money-critical guard for the first-party stock ledger (inventory.js). The shop
// checkout (server.js /api/shop/checkout) charges the customer and THEN calls
// adjust(id,-qty,'sale'); its whole oversell-safety depends on adjust() refusing
// to go below zero and returning {ok:false} so the paid-but-no-stock branch fires
// (see DECISIONS_LOG 2026-07-15 shop-checkout fix). Sale attribution (platform/ref)
// also feeds affiliate commission reporting. Pin those here. File-store temp dir,
// no Supabase — fully deterministic. รัน: node scripts/test-inventory.mjs
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_KEY;

const dir = mkdtempSync(join(tmpdir(), 'inv-test-'));
const inv = createInventory(dir);

try {
  const up = await inv.upsert({ sku: 'T1', name: 'Test', price: 100, stock: 5, low_stock: 2 });
  ok(up.ok && up.product.stock === 5, 'upsert creates product with stock 5');
  const id = up.product.id;
  const stockOf = async () => (await inv.get(id)).stock;

  console.log('\n=== adjust sale: NEVER goes negative (the invariant shop checkout relies on) ===');
  const s1 = await inv.adjust(id, -3, 'sale', 'order A', 'oid1', 'ref:AFF1');
  ok(s1.ok && s1.stock === 2, 'sale of 3 from 5 → ok, stock 2');
  const over = await inv.adjust(id, -5, 'sale', 'order B');
  ok(over.ok === false && over.error === 'สต๊อกไม่พอ' && over.stock === 2, 'sale of 5 from 2 → {ok:false, "สต๊อกไม่พอ", stock:2}');
  ok(await stockOf() === 2, 'stock unchanged (2) after the refused oversell — no negative, no partial deduct');
  const exact = await inv.adjust(id, -2, 'sale', 'order C');
  ok(exact.ok && exact.stock === 0, 'sale of exactly the remaining 2 → ok, stock 0');
  const atZero = await inv.adjust(id, -1, 'sale', 'order D');
  ok(atZero.ok === false && await stockOf() === 0, 'sale of 1 at stock 0 → refused, stays 0');

  console.log('\n=== adjust guards ===');
  ok((await inv.adjust(id, 0, 'sale')).ok === false, 'zero delta → refused (จำนวนต้องไม่เป็นศูนย์)');
  ok((await inv.adjust('nope', -1, 'sale')).ok === false, 'unknown product id → refused (ไม่พบสินค้า)');
  ok((await inv.adjust(id, -2.9, 'sale')).ok === false && await stockOf() === 0, 'fractional -2.9 truncates to -2 but stock is 0 → refused, still 0');

  console.log('\n=== restock raises stock; low flag tracks the threshold ===');
  const r1 = await inv.adjust(id, 10, 'restock', 'เติมของ');
  ok(r1.ok && r1.stock === 10 && r1.low === false, 'restock +10 → stock 10, not low');
  const d1 = await inv.adjust(id, -9, 'sale', 'order E');
  ok(d1.ok && d1.stock === 1 && d1.low === true, 'sale down to 1 (≤ low_stock 2) → low:true');

  console.log('\n=== type "adjust" (not "sale") is NOT the oversell-guarded path — it clamps to 0 ===');
  const clamp = await inv.adjust(id, -100, 'adjust', 'ตัดทิ้ง');
  ok(clamp.ok === true && clamp.stock === 0, 'adjust -100 (type adjust) → clamps to 0 (only type:sale returns the error) ');

  console.log('\n=== sale attribution feeds affiliate/commission reporting ===');
  const ps = await inv.productSales(id);
  // sold = |−3| + |−2| + |−9| = 14 (the refused sales never recorded a movement)
  ok(ps.sold === 14, 'productSales.sold = 14 (only successful sales counted; refused ones recorded nothing)');
  ok(ps.byPlatform['ref:AFF1'] === 3, 'byPlatform attributes the 3 units sold via ref:AFF1 (affiliate credit source)');
  ok(ps.byPlatform['direct'] === 11, 'sales with no explicit platform fall under "direct" (2+9)');
  const rep = await inv.salesReport();
  ok(rep.totalSold === 14, 'salesReport.totalSold = 14');

  console.log('\n=== summary rolls up units + value ===');
  const sum = await inv.summary();
  ok(sum.products === 1 && sum.totalUnits === 0, 'summary: 1 product, 0 units left');
  ok(sum.unitsSold === 14, 'summary.unitsSold = 14');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
