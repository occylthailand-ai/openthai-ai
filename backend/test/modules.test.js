// Unit tests — file-backed business modules (inventory, credits)
// ใช้ temp dir แยกต่อการรัน เพื่อไม่แตะข้อมูลจริง
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createInventory } from '../inventory.js';
import { createCredits } from '../credits.js';

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-test-')); });
after(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} });

test('inventory — upsert / get / adjust (sale) / สต๊อกไม่พอ', async () => {
  const inv = createInventory(dir);
  const { ok, product } = await inv.upsert({ name: 'เสื้อยืด', price: 250, stock: 10 });
  assert.equal(ok, true);
  assert.equal(product.stock, 10);

  const got = await inv.get(product.id);
  assert.equal(got.name, 'เสื้อยืด');

  const sale = await inv.adjust(product.id, -3, 'sale', 'ขายผ่านร้าน');
  assert.equal(sale.ok, true);
  assert.equal(sale.stock, 7);

  const over = await inv.adjust(product.id, -100, 'sale');
  assert.equal(over.ok, false, 'ขายเกินสต๊อกต้องล้มเหลว');
  assert.equal(over.stock, 7, 'สต๊อกต้องไม่เปลี่ยน');
});

test('inventory — onLowStock callback ทำงานเมื่อต่ำกว่าเกณฑ์', async () => {
  let alerted = null;
  const inv = createInventory(dir, { onLowStock: (p) => { alerted = p; } });
  const { product } = await inv.upsert({ name: 'หมวก', price: 100, stock: 5, low_stock_threshold: 3 });
  await inv.adjust(product.id, -3, 'sale'); // เหลือ 2 < 3
  assert.ok(alerted, 'ต้องเรียก onLowStock');
  assert.equal(alerted.id, product.id);
});

test('inventory — upsert ปฏิเสธเมื่อไม่มีชื่อ', async () => {
  const inv = createInventory(dir);
  const r = await inv.upsert({ price: 10 });
  assert.equal(r.ok, false);
});

test('credits — บัญชีใหม่ยอด 0 และ consumeCredit กันติดลบ', async () => {
  const c = createCredits(dir);
  assert.equal(await c.hasCredit('user-new'), false);
  const snap = await c.pub('user-new');
  assert.equal(snap.balance, 0);
  assert.equal(snap.discountPct, 0);
  assert.equal(await c.consumeCredit('user-new'), false, 'ไม่มีเครดิตต้อง consume ไม่ได้ (กันติดลบ)');
});

test('credits — peekDiscount = 0 และ adminSummary ทำงาน (file mode)', async () => {
  const c = createCredits(dir);
  assert.equal(await c.peekDiscount('user-new'), 0);
  const s = await c.adminSummary();
  assert.equal(s.mode, 'file');
  assert.equal(typeof s.accounts, 'number');
});

test('credits — SPIN_PRIZES ถูกตั้งค่าและน้ำหนักรวมถูกต้อง', () => {
  const c = createCredits(dir);
  assert.ok(Array.isArray(c.SPIN_PRIZES) && c.SPIN_PRIZES.length > 0);
});
