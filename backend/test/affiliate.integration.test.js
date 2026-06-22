// Integration test — Affiliate attribution (DIR AFFILIATE-001)
// สมัคร affiliate → ขายผ่าน /api/shop/checkout พร้อม ?ref → ต้องบันทึก conversion จริง
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from './helpers/server.js';

const post = (base, p, body, headers = {}) =>
  fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

let srv, dataDir;
before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-aff-'));
  srv = await startServer({ port: 8915, env: { ADMIN_KEY: 'k', NODE_ENV: '', VERCEL: '', OPENTHAI_DATA_DIR: dataDir } });
});
after(async () => { if (srv) await srv.stop(); try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch {} });

async function makeProduct() {
  await post(srv.base, '/api/inventory/admin/upsert?key=k', { name: 'น้ำพริกเผา', price: 120, stock: 50, status: 'active' });
  const list = await (await fetch(`${srv.base}/api/shop/products`)).json();
  return list.products[0].id;
}

test('ขายผ่าน ref → บันทึก conversion จริง + first_ever + ค่าคอม 20%', async () => {
  await post(srv.base, '/api/affiliate/apply', { name: 'แม่ค้าเอ', email: 'a@test.com', ref_code: 'PRAE001' });
  const pid = await makeProduct();

  const co = await (await post(srv.base, '/api/shop/checkout', {
    product_id: pid, qty: 2, customer_name: 'ลูกค้าจริง', contact: '0812345678', method: 'card', ref: 'PRAE001',
  })).json();
  assert.equal(co.paid, true, 'mock mode ต้องจ่ายสำเร็จ');

  const conv = await (await fetch(`${srv.base}/api/affiliate/conversions?key=k`)).json();
  assert.equal(conv.count, 1);
  assert.equal(conv.total_revenue, 240);
  assert.equal(conv.total_commission, 48, 'ค่าคอม 20% ของ 240');
  assert.equal(conv.first_conversion.first_ever, true, 'ต้องเป็นลูกค้าคนแรกจาก affiliate');
  assert.equal(conv.first_conversion.customer_name, 'ลูกค้าจริง');
  assert.match(conv.first_conversion.customer_contact_masked, /\*\*\*/, 'contact ต้องถูก mask (PDPA)');
});

test('conversions admin endpoint ต้องใช้ ADMIN_KEY', async () => {
  const r = await fetch(`${srv.base}/api/affiliate/conversions`);
  assert.equal(r.status, 401);
});

test('ขายโดยไม่มี ref → ไม่เพิ่ม conversion', async () => {
  const pid = await makeProduct();
  const before = (await (await fetch(`${srv.base}/api/affiliate/conversions?key=k`)).json()).count;
  await post(srv.base, '/api/shop/checkout', { product_id: pid, qty: 1, customer_name: 'x', contact: '0800000000', method: 'card' });
  const after = (await (await fetch(`${srv.base}/api/affiliate/conversions?key=k`)).json()).count;
  assert.equal(after, before, 'ไม่มี ref → ไม่ attribute');
});

test('ขาย ref ที่ไม่มีในระบบ → ไม่ crash และไม่บันทึก', async () => {
  const pid = await makeProduct();
  const before = (await (await fetch(`${srv.base}/api/affiliate/conversions?key=k`)).json()).count;
  const co = await (await post(srv.base, '/api/shop/checkout', {
    product_id: pid, qty: 1, customer_name: 'y', contact: '0899999999', method: 'card', ref: 'NOPE999',
  })).json();
  assert.equal(co.paid, true, 'การขายยังสำเร็จแม้ ref ไม่รู้จัก');
  const after = (await (await fetch(`${srv.base}/api/affiliate/conversions?key=k`)).json()).count;
  assert.equal(after, before, 'ref ไม่รู้จัก → ไม่บันทึก conversion');
});
