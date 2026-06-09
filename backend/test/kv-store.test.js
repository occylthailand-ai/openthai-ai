// Unit tests — backend/kv-store.js (Supabase KV durable store + fallback)
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('ไม่มี Supabase env → useSB=false และ no-op (ไม่ throw)', async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
  const { createKVStore } = await import('../kv-store.js');
  const kv = createKVStore();
  assert.equal(kv.useSB, false);
  assert.equal(await kv.pull('payments'), null, 'pull ต้องคืน null เมื่อไม่ได้ใช้ SB');
  assert.equal(await kv.push('payments', [{ a: 1 }]), false, 'push ต้องคืน false เมื่อไม่ได้ใช้ SB');
});

test('มี Supabase env → useSB=true', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  const { createKVStore } = await import('../kv-store.js?2'); // bust module cache
  const kv = createKVStore();
  assert.equal(kv.useSB, true);
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
});
