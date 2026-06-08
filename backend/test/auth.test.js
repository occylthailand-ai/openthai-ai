// Unit tests — backend/auth.js
// รันด้วย: node --test  (ไม่ต้องมี dependency เพิ่ม — ใช้ node:test built-in)
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ตั้งค่า env ก่อน import (getAdminUsers อ่าน env แบบ lazy + cache)
process.env.ADMIN_PASSWORD_PLAIN = 'super-secret-dev-pw';
process.env.ADMIN_OVERRIDE_KEY = 'OVERRIDE-123';

const {
  hashPassword, checkPassword, signToken, verifyToken,
  checkOverrideKey, generateRecoveryCodes, getAdminUsers,
} = await import('../auth.js');

test('password hash + verify roundtrip', async () => {
  const hash = await hashPassword('hunter2');
  assert.notEqual(hash, 'hunter2', 'ต้องไม่เก็บ plaintext');
  assert.ok(hash.startsWith('$2'), 'ต้องเป็น bcrypt hash');
  assert.equal(await checkPassword('hunter2', hash), true);
  assert.equal(await checkPassword('wrong', hash), false);
});

test('JWT sign + verify roundtrip', () => {
  const token = signToken({ username: 'alice', role: 'admin' });
  const payload = verifyToken(token);
  assert.equal(payload.username, 'alice');
  assert.equal(payload.role, 'admin');
});

test('verifyToken returns null on tampered/invalid token', () => {
  assert.equal(verifyToken('not.a.jwt'), null);
  const t = signToken({ a: 1 });
  assert.equal(verifyToken(t + 'x'), null, 'token ที่ถูกแก้ต้องไม่ผ่าน');
});

test('checkOverrideKey — timing-safe match', () => {
  assert.equal(checkOverrideKey('OVERRIDE-123'), true);
  assert.equal(checkOverrideKey('wrong'), false);
  assert.equal(checkOverrideKey(''), false);
  assert.equal(checkOverrideKey(null), false);
});

test('generateRecoveryCodes — รูปแบบถูกต้องและไม่ซ้ำ', () => {
  const codes = generateRecoveryCodes(8);
  assert.equal(codes.length, 8);
  for (const c of codes) assert.match(c, /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  assert.equal(new Set(codes).size, 8, 'codes ต้องไม่ซ้ำกัน');
});

test('getAdminUsers — ใช้ ADMIN_PASSWORD_PLAIN ที่ตั้งไว้ (ไม่ใช่ 1234)', async () => {
  const admins = await getAdminUsers();
  assert.equal(admins.length, 1);
  assert.equal(await checkPassword('super-secret-dev-pw', admins[0].password), true);
  assert.equal(await checkPassword('1234', admins[0].password), false, 'ต้องไม่ใช่รหัส default');
});
