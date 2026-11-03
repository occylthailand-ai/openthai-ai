import test from 'node:test';
import assert from 'node:assert/strict';
import { logAiUsage } from '../../ai-usage-log.js';

const base = { provider: 'grok', model: 'Grok', endpoint: 'router/x', costUsd: 0.001, latencyMs: 120, tried: ['gemini:unavailable'] };
const cfg = (fetchImpl, extra = {}) => ({ url: 'https://sb.test', key: 'k', fetchImpl, ...extra });

test('เขียนแถวถูกต้อง: provider ที่ตอบจริง + tried + tokens_est', async () => {
  let call;
  const ok = await logAiUsage(base, cfg(async (u, o) => { call = { u, body: JSON.parse(o.body) }; return { ok: true }; }, { thbRate: 36 }));
  assert.equal(ok, true);
  assert.equal(call.u, 'https://sb.test/rest/v1/ai_usage_log');
  assert.equal(call.body.ai_source, 'grok');
  assert.deepEqual(call.body.tried, ['gemini:unavailable']);
  assert.equal(call.body.tokens_est, true);
  assert.equal(call.body.cost_thb, 0.04);
});

test('ไม่ตั้ง thbRate → cost_thb เป็น null (ไม่แต่งเรต)', async () => {
  delete process.env.USD_THB_RATE;
  let body;
  await logAiUsage(base, cfg(async (_u, o) => { body = JSON.parse(o.body); return { ok: true }; }));
  assert.equal(body.cost_thb, null);
});

test('ไม่มี Supabase env → ไม่เรียก fetch และไม่ throw', async () => {
  let called = false;
  const ok = await logAiUsage(base, { url: '', key: '', fetchImpl: async () => { called = true; return { ok: true }; } });
  assert.equal(ok, false); assert.equal(called, false);
});

test('provider ที่ constraint ไม่รองรับ → ไม่เขียน', async () => {
  let called = false;
  const ok = await logAiUsage({ ...base, provider: 'qwen' }, cfg(async () => { called = true; return { ok: true }; }));
  assert.equal(ok, false); assert.equal(called, false);
});

test('fetch ล้ม → คืน false ไม่ throw', async () => {
  const ok = await logAiUsage(base, cfg(async () => { throw new Error('network'); }));
  assert.equal(ok, false);
});
