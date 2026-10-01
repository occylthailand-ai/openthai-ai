import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSessions, limitInfo, limited, heavy, buildResumePlan, fmtReset } from './claude-limit-resume.mjs';

const NOW = Date.UTC(2026, 9, 1, 14, 0, 0);
const mk = (over = {}) => ({
  id: 's1', title: 'T1', session_status: 'SESSION_STATUS_IDLE',
  session_context: { effort_level: 'max', model: 'm' },
  external_metadata: {
    current_branches: { '': 'claude/x' },
    rate_limit_info: { status: 'rejected', rateLimitType: 'seven_day', resetsAt: NOW / 1000 + 3600 },
    post_turn_summary: { status_detail: "You've hit your weekly limit · resets Sep 30, 6am (UTC)" },
    usage: { cost_usd: 10 },
  },
  ...over,
});

test('loadSessions รองรับทั้ง array และ ccr.data', () => {
  assert.equal(loadSessions([mk()]).length, 1);
  assert.equal(loadSessions({ ccr: { data: [mk()] } }).length, 1);
  assert.throws(() => loadSessions({}));
});

test('limitInfo ตรวจจับเซสชันติดลิมิต และข้ามตัวปกติ', () => {
  assert.equal(limitInfo(mk()).type, 'seven_day');
  assert.equal(limitInfo({ id: 'x', external_metadata: { rate_limit_info: { status: 'allowed' } } }), null);
});

test('limited ข้ามเซสชันที่ archived', () => {
  const a = mk({ session_status: 'SESSION_STATUS_ARCHIVED' });
  assert.equal(limited([a, mk({ id: 's2' })]).length, 1);
});

test('fmtReset แสดงเวลาไทย = UTC+7 และเวลาที่เหลือ', () => {
  const t = fmtReset(NOW / 1000 + 3600, NOW);
  assert.match(t, /15:00 UTC/);
  assert.match(t, /22:00 \(เวลาไทย\)/);
  assert.match(t, /อีก 1 ชม\. 0 นาที/);
  assert.match(fmtReset(NOW / 1000 - 10, NOW), /รีเซ็ตแล้ว/);
  assert.match(fmtReset(null), /ไม่ทราบ/);
});

test('buildResumePlan: ยังไม่รีเซ็ต → มี sendLater, รีเซ็ตแล้ว → ready', () => {
  const [p] = buildResumePlan([mk()], NOW);
  assert.equal(p.ready, false);
  assert.equal(p.sendLater.at, new Date(NOW + 3600000 + 120000).toISOString());
  assert.match(p.prompt, /claude\/x/);
  const past = mk(); past.external_metadata.rate_limit_info.resetsAt = NOW / 1000 - 5;
  const [q] = buildResumePlan([past], NOW);
  assert.equal(q.ready, true);
  assert.equal(q.sendLater, null);
});

test('heavy เรียงตามค่าใช้จ่าย และไม่แต่งตัวเลขเมื่อไม่มีข้อมูล', () => {
  const b = mk({ id: 'b', title: 'B' }); b.external_metadata.usage.cost_usd = 99;
  const none = { id: 'n', title: 'N', external_metadata: {} };
  const r = heavy([mk(), b, none]);
  assert.deepEqual(r.map((x) => x.id), ['b', 's1']);
});
