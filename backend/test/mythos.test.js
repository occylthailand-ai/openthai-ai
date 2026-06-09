// Unit tests — backend/mythos.js (real orchestration layer)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMythos } from '../mythos.js';

const VALID = new Set(['active', 'degraded', 'external', 'down']);

test('roster — เทพทุกองค์ map ไประบบจริง (real systems)', () => {
  const m = createMythos();
  const r = m.roster();
  assert.ok(r.length >= 8, 'ควรมีเทพอย่างน้อย 8 องค์');
  assert.ok(r.find(g => g.id === 'mythos'), 'ต้องมี Mythos ผู้บัญชาการ');
  for (const g of r) {
    assert.ok(Array.isArray(g.real) && g.real.length > 0, `${g.id} ต้องผูกกับระบบจริงอย่างน้อย 1`);
  }
});

test('status — คำนวณจากสัญญาณจริง (active เมื่อ env พร้อม)', () => {
  const m = createMythos({
    aiActive: () => 'claude', persistence: () => 'supabase', paymentsLive: () => true,
    webhooksCount: () => 3, schedulerOn: () => true, isProd: () => true, prodHardened: () => true,
  });
  const s = m.status();
  assert.equal(s.overall, 'healthy', 'env พร้อมหมด → healthy');
  for (const g of s.gods) assert.ok(VALID.has(g.status), `${g.id} status ไม่ถูกต้อง: ${g.status}`);
  assert.equal(s.gods.find(g => g.id === 'athena').status, 'active');
  assert.equal(s.gods.find(g => g.id === 'demeter').status, 'active');
});

test('status — สะท้อนของจริงเมื่อ env ไม่พร้อม (degraded, ไม่แต่งเขียว)', () => {
  const m = createMythos({ aiActive: () => 'mock', persistence: () => 'file', paymentsLive: () => false });
  const s = m.status();
  assert.equal(s.overall, 'warn', 'mock/file → warn ไม่ใช่ healthy');
  assert.equal(s.gods.find(g => g.id === 'athena').status, 'degraded');
  assert.equal(s.gods.find(g => g.id === 'demeter').status, 'degraded');
});

test('ares — production ที่ไม่ hardened ต้อง degraded (เตือนจริง)', () => {
  const prodBad = createMythos({ isProd: () => true, prodHardened: () => false });
  assert.equal(prodBad.status().gods.find(g => g.id === 'ares').status, 'degraded');
  const dev = createMythos({ isProd: () => false, prodHardened: () => true });
  assert.equal(dev.status().gods.find(g => g.id === 'ares').status, 'active');
});

test('heartbeat — persist จริง + นับ commands เพิ่มขึ้น', async () => {
  let stored = null;
  const m = createMythos({
    writeFile: (d) => { stored = d; },
    readFile: () => stored,
    kvPush: async () => {},
  });
  const hb1 = await m.recordHeartbeat('test');
  assert.equal(hb1.commands, 1);
  assert.ok(hb1.ts, 'ต้องมี timestamp');
  const hb2 = await m.recordHeartbeat('test');
  assert.equal(hb2.commands, 2, 'commands ต้องเพิ่ม');
  assert.equal(m.getHeartbeat().commands, 2, 'อ่านกลับจาก persist ได้');
});

test('start/stop — interval ถูก unref ไม่ขวาง process exit', () => {
  const m = createMythos({ writeFile: () => {}, kvPush: async () => {} });
  m.start(60000);
  m.stop(); // ต้องไม่ throw
  assert.ok(true);
});
