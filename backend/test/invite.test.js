// Unit tests — backend/invite.js (โปรแกรมเชิญชวนลูกค้าอัตโนมัติ)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInvite } from '../invite.js';

function make(grantImpl) {
  let stored = null;
  const granted = [];
  const ap = createInvite({
    grantCredits: async (id, amount, source) => { granted.push({ id, amount, source }); return (grantImpl ? grantImpl(id, amount, source) : { balance: amount }); },
    rewardCredits: 10,
    writeFile: (d) => { stored = d; }, readFile: () => stored,
  });
  return { ap, granted };
}

test('getOrCreate — ออกโค้ดได้ และ idempotent (อีเมลเดิม=โค้ดเดิม)', () => {
  const { ap } = make();
  const a = ap.getOrCreate('user@test.com');
  assert.equal(a.ok, true);
  assert.match(a.code, /^[0-9A-Z]{6}$/);
  assert.match(a.link, /\?invite=/);
  const b = ap.getOrCreate('user@test.com');
  assert.equal(b.code, a.code, 'อีเมลเดิมต้องได้โค้ดเดิม');
});

test('getOrCreate — ปฏิเสธอีเมลไม่ถูกต้อง', () => {
  const { ap } = make();
  assert.equal(ap.getOrCreate('not-an-email').ok, false);
  assert.equal(ap.getOrCreate('').ok, false);
});

test('reward — เพื่อนซื้อ → ผู้ชวนได้เครดิตจริง + first_ever', async () => {
  const { ap, granted } = make();
  const { code } = ap.getOrCreate('inviter@test.com');
  const r = await ap.reward(code, { order_id: 'ord1', amount: 200, customer_name: 'เพื่อน' });
  assert.equal(r.first_ever, true);
  assert.equal(r.reward, 10);
  assert.equal(granted.length, 1);
  assert.deepEqual({ id: granted[0].id, amount: granted[0].amount }, { id: 'inviter@test.com', amount: 10 });
  assert.equal(granted[0].source, 'invite:ord1', 'source ต้องผูก order เพื่อกันให้ซ้ำ');
});

test('reward — กันให้รางวัลซ้ำต่อ 1 ออเดอร์', async () => {
  const { ap, granted } = make();
  const { code } = ap.getOrCreate('inviter@test.com');
  await ap.reward(code, { order_id: 'ordX', amount: 100 });
  const dup = await ap.reward(code, { order_id: 'ordX', amount: 100 });
  assert.equal(dup, null, 'ออเดอร์เดิมต้องไม่ให้รางวัลซ้ำ');
  assert.equal(granted.length, 1);
});

test('reward — โค้ดไม่รู้จัก → ไม่ crash, ไม่ให้รางวัล', async () => {
  const { ap, granted } = make();
  const r = await ap.reward('NOPE99', { order_id: 'o', amount: 50 });
  assert.equal(r, null);
  assert.equal(granted.length, 0);
});

test('statusOf + leaderboard + summary', async () => {
  const { ap } = make();
  const { code } = ap.getOrCreate('boss@test.com');
  await ap.reward(code, { order_id: 'o1', amount: 100 });
  await ap.reward(code, { order_id: 'o2', amount: 100 });
  const s = ap.statusOf(code);
  assert.equal(s.invited_converted, 2);
  assert.equal(s.credits_earned, 20);
  assert.match(s.owner_masked, /\*\*\*/, 'อีเมลผู้ชวนต้องถูก mask');
  assert.equal(ap.leaderboard()[0].invites, 2);
  assert.equal(ap.summary().total_conversions, 2);
});
