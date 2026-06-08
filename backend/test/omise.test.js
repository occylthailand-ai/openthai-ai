// Unit tests — backend/omise-payment.js (webhook signature verification)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const { verifyOmiseWebhook } = await import('../omise-payment.js');

const sign = (body, secret) => createHmac('sha256', secret).update(body).digest('hex');

test('no secret + dev mode → ข้ามการตรวจ (true)', () => {
  delete process.env.OMISE_WEBHOOK_SECRET;
  delete process.env.NODE_ENV;
  delete process.env.VERCEL;
  assert.equal(verifyOmiseWebhook(Buffer.from('{}'), ''), true);
});

test('no secret + production → ปฏิเสธ (fail-closed)', () => {
  delete process.env.OMISE_WEBHOOK_SECRET;
  process.env.NODE_ENV = 'production';
  assert.equal(verifyOmiseWebhook(Buffer.from('{}'), ''), false);
  delete process.env.NODE_ENV;
});

test('มี secret + ลายเซ็นถูกต้อง → true', () => {
  process.env.OMISE_WEBHOOK_SECRET = 'whsec_test';
  const body = JSON.stringify({ key: 'charge.complete', data: { id: 'chrg_1' } });
  assert.equal(verifyOmiseWebhook(Buffer.from(body), sign(body, 'whsec_test')), true);
});

test('มี secret + ลายเซ็นผิด → false', () => {
  process.env.OMISE_WEBHOOK_SECRET = 'whsec_test';
  const body = JSON.stringify({ key: 'charge.complete' });
  assert.equal(verifyOmiseWebhook(Buffer.from(body), 'deadbeef'), false);
  assert.equal(verifyOmiseWebhook(Buffer.from(body), ''), false);
});
