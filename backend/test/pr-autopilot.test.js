// Unit tests — backend/pr-autopilot.js (auto PR content, every-other-day)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPRAutopilot } from '../pr-autopilot.js';

const fakeGenerate = async (form) => ({
  hook: `HOOK ${form.product}`, script: ['s1', 's2'],
  caption: `CAP ${form.product}`, hashtags: ['#a', '#b'], criticScore: '8.0', source: 'mock',
});
const products = [
  { id: 'p1', name: 'น้ำพริกเผา', category: 'อาหาร', price: 89, status: 'active', updated_at: '2026-06-01' },
  { id: 'p2', name: 'ผ้าขาวม้า',  category: 'ผ้า',   price: 250, status: 'active', updated_at: '2026-06-08' },
];

function makeStore() {
  let stored = null;
  return { writeFile: (d) => { stored = d; }, readFile: () => stored };
}

test('planTopics — หมุน pillar และดันสินค้าใหม่เป็น feature', () => {
  const ap = createPRAutopilot({ listProducts: async () => products });
  const topics = ap.planTopics({ newest_products: products, trending: ['#เทรนด์'], month: 'มิ.ย.' }, 0);
  assert.equal(topics.length, 3);
  assert.deepEqual(topics.map(t => t.pillar), ['thai_first', 'learning', 'all_in_one']);
  assert.ok(topics.every(t => t.is_feature), 'ทุกหัวข้อควร feature สินค้าจริง');
});

test('produce — ผลิตครบ posts_per_cycle ผ่าน engine + ลงปฏิทิน + แนบ era tags', async () => {
  const store = makeStore();
  const ap = createPRAutopilot({
    generate: fakeGenerate, listProducts: async () => products,
    getTrending: async () => ['#มิถุนายน', '#ของดีบ้านเรา'],
    ...store,
  });
  const r = await ap.produce('test');
  assert.equal(r.produced, 3);
  for (const it of r.items) {
    assert.ok(it.hook && it.caption, 'ต้องมี hook + caption จาก engine');
    assert.ok(it.hashtags.includes('#มิถุนายน'), 'ต้องแนบ era/trending tags');
    assert.equal(it.status, 'planned');
  }
  // ลงปฏิทินจริง (อ่านกลับได้)
  const s = ap.status();
  assert.equal(s.runs, 1);
  assert.equal(s.total_in_calendar, 3);
});

test('produce — สะสมปฏิทินข้ามรอบ (ไม่ทับของเก่า)', async () => {
  const store = makeStore();
  const ap = createPRAutopilot({ generate: fakeGenerate, listProducts: async () => products, ...store });
  await ap.produce('r1');
  await ap.produce('r2');
  assert.equal(ap.status().runs, 2);
  assert.equal(ap.status().total_in_calendar, 6, 'ต้องสะสม 3+3');
});

test('shouldRunToday — วันเว้นวัน (parity ของ epoch day)', () => {
  const ap = createPRAutopilot({});
  const day = 86_400_000;
  const even = ap.shouldRunToday(0);              // epochDay 0 → คู่
  const next = ap.shouldRunToday(day);            // epochDay 1 → คี่
  assert.notEqual(even, next, 'วันติดกันต้องสลับ run/ไม่ run');
  assert.equal(ap.shouldRunToday(0), ap.shouldRunToday(2 * day), 'เว้นวันต้องเหมือนกัน');
});

test('produce — ทำงานได้แม้ generate ล้ม (ไม่ throw)', async () => {
  const store = makeStore();
  const ap = createPRAutopilot({
    generate: async () => { throw new Error('engine down'); },
    listProducts: async () => products, ...store,
  });
  const r = await ap.produce('fail-test');
  assert.equal(r.produced, 3, 'ยังลงปฏิทินแม้ engine ล้ม (hook ว่างได้)');
});
