#!/usr/bin/env node
/**
 * OpenThaiAi — Claude usage-limit resume tool
 *
 * ผู้ใช้: ทีมพัฒนา/ผู้ดูแล (กลุ่ม 5 ชุมชน/นักพัฒนา) ที่รันหลายเซสชัน Claude Code แล้วติด
 * "weekly limit" — เครื่องมือนี้ "ไม่ได้ปลดล็อกลิมิต" (ทำไม่ได้) แต่ช่วย:
 *   1) หาว่าเซสชันไหนหยุดเพราะลิมิต และลิมิตรีเซ็ตเมื่อไหร่ (ไทย + UTC)
 *   2) จัดอันดับว่าเซสชันไหนกินโควตาหนักสุด (ใช้เฉพาะตัวเลขจากข้อมูลที่ป้อน)
 *   3) สร้างพรอมต์ "ทำต่อ" + คำสั่งตั้งเวลา ให้รันต่อหลังรีเซ็ต
 *   4) แนะนำการตั้งค่าที่ลดโอกาสติดซ้ำ
 *
 * อินพุต: ไฟล์ JSON เป็นอาร์เรย์เซสชัน หรือ {"ccr":{"data":[...]}} (ผลจาก list_sessions)
 *
 * Usage:
 *   node scripts/claude-limit-resume.mjs status  <sessions.json>
 *   node scripts/claude-limit-resume.mjs heavy   <sessions.json> [--top N]
 *   node scripts/claude-limit-resume.mjs resume  <sessions.json> [--format text|json]
 *   node scripts/claude-limit-resume.mjs tips
 *   node scripts/claude-limit-resume.mjs --help
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const LIMIT_RE = /hit your (weekly|5[- ]?hour|five[- ]?hour|usage|session) limit|usage limit|rate limit/i;
const TH_OFFSET_MS = 7 * 3600 * 1000; // Asia/Bangkok = UTC+7 (ไม่มี DST)

// ─── parsing ────────────────────────────────────────────────────────────────
export function loadSessions(raw) {
  const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const list = Array.isArray(json) ? json : json?.ccr?.data ?? json?.data;
  if (!Array.isArray(list)) throw new Error('ไม่พบอาร์เรย์เซสชัน (คาดว่า [] หรือ {"ccr":{"data":[]}})');
  return list;
}

const meta = (s) => s.external_metadata ?? {};
const summary = (s) => meta(s).post_turn_summary ?? s.post_turn_summary ?? {};

export function limitInfo(s) {
  const rl = meta(s).rate_limit_info ?? {};
  const detail = summary(s).status_detail ?? '';
  const textHit = LIMIT_RE.test(detail);
  const rejected = rl.status === 'rejected';
  if (!textHit && !rejected) return null;
  return {
    type: rl.rateLimitType ?? (/weekly/i.test(detail) ? 'seven_day' : 'unknown'),
    resetsAt: typeof rl.resetsAt === 'number' ? rl.resetsAt : null, // epoch seconds
    detail,
    overage: !!rl.isUsingOverage,
  };
}

export function fmtReset(epochSec, now = Date.now()) {
  if (epochSec == null) return 'ไม่ทราบเวลารีเซ็ต';
  const ms = epochSec * 1000;
  const utc = new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const th = new Date(ms + TH_OFFSET_MS).toISOString().replace('T', ' ').slice(0, 16) + ' (เวลาไทย)';
  const diff = ms - now;
  const rel = diff <= 0
    ? 'รีเซ็ตแล้ว — ส่งข้อความใหม่เพื่อรันต่อได้'
    : `อีก ${Math.floor(diff / 3600000)} ชม. ${Math.floor((diff % 3600000) / 60000)} นาที`;
  return `${utc} / ${th} → ${rel}`;
}

export function limited(sessions) {
  return sessions
    .map((s) => ({ s, info: limitInfo(s) }))
    .filter((x) => x.info && x.s.session_status !== 'SESSION_STATUS_ARCHIVED');
}

// ─── heavy ranking (ตัวเลขจากข้อมูลจริงเท่านั้น) ─────────────────────────────
export function heavy(sessions, top = 5) {
  return sessions
    .map((s) => {
      const u = meta(s).usage ?? {};
      return {
        id: s.id,
        title: s.title,
        cost: typeof u.cost_usd === 'number' ? u.cost_usd : null,
        output: u.output_tokens ?? null,
        runs: meta(s).worker_epoch ?? meta(s).turn_handoff?.worker_epoch ?? null,
        effort: s.session_context?.effort_level ?? meta(s).effort_level ?? null,
        model: s.session_context?.model ?? null,
      };
    })
    .filter((x) => x.cost != null)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, top);
}

// ─── resume prompt ──────────────────────────────────────────────────────────
export function resumePrompt(s) {
  const branch = Object.values(meta(s).current_branches ?? {}).find(Boolean) ?? '(ไม่ทราบสาขา)';
  return [
    `ทำงานต่อจากที่ค้างไว้ในเซสชัน "${s.title}" (ถูกตัดเพราะติดลิมิตการใช้งาน)`,
    `1) รัน git status / git log -5 บนสาขา ${branch} เพื่อดูว่างานค้างอะไรบ้าง`,
    `2) สรุปสิ่งที่ทำเสร็จแล้ว vs ยังไม่เสร็จ — ห้ามรายงานว่าเสร็จถ้ายังไม่ได้ตรวจ`,
    `3) ทำเฉพาะส่วนที่ค้างให้จบ ทีละก้อนเล็ก แล้วรัน test/lint ที่เกี่ยวข้อง`,
    `4) ใช้ effort ระดับ medium เว้นแต่งานซับซ้อนจริง เพื่อประหยัดโควตา`,
  ].join('\n');
}

export function buildResumePlan(sessions, now = Date.now()) {
  return limited(sessions).map(({ s, info }) => {
    const resetMs = info.resetsAt != null ? info.resetsAt * 1000 : null;
    const ready = resetMs == null || resetMs <= now;
    return {
      id: s.id,
      title: s.title,
      limitType: info.type,
      resetsAtEpoch: info.resetsAt,
      resetsAtText: fmtReset(info.resetsAt, now),
      ready,
      // พารามิเตอร์สำหรับ send_later (ตั้งเวลา +2 นาทีหลังรีเซ็ต)
      sendLater: ready || resetMs == null ? null : { at: new Date(resetMs + 120000).toISOString(), session_id: s.id },
      prompt: resumePrompt(s),
    };
  });
}

// ─── CLI ────────────────────────────────────────────────────────────────────
const TIPS = [
  'ลิมิตรายสัปดาห์ปลดด้วยโค้ดไม่ได้ — ทำได้แค่รอรีเซ็ต หรือเปิดใช้ overage/อัปเกรดแพลนในหน้า Settings ของ Claude',
  'ลด effort จาก max เป็น medium/high ในงานทั่วไป (ตั้งใน /config หรือ settings.json)',
  'อย่ารันหลายเซสชัน effort สูงพร้อมกัน — โควตารวมทุกเซสชันในบัญชีเดียวกัน',
  'เซสชันที่รันวนหลายร้อยรอบ (loop/auto-continue) ให้กำหนดเพดานรอบ หรือสั่งหยุดเมื่อได้ผลที่ต้องการ',
  'แยกงานเป็นก้อนเล็ก + ใช้ CLAUDE.md/PROJECT_STATUS.md แทนการให้ AI อ่านรีโปทั้งก้อนซ้ำ ๆ',
  'ใช้ send_later ตั้งให้ทำงานต่อหลังเวลารีเซ็ต แทนการรอเฝ้าเอง',
];

function arg(args, flag, def) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
}

function main(argv) {
  const [cmd, file, ...rest] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*\n?/m, ''));
    return 0;
  }
  if (cmd === 'tips') {
    TIPS.forEach((t, i) => console.log(`${i + 1}. ${t}`));
    return 0;
  }
  if (!file) { console.error('ต้องระบุไฟล์ sessions.json'); return 2; }
  let sessions;
  try { sessions = loadSessions(readFileSync(file, 'utf8')); }
  catch (e) { console.error('อ่านอินพุตไม่ได้:', e.message); return 2; }

  if (cmd === 'status') {
    const L = limited(sessions);
    if (!L.length) { console.log('ไม่พบเซสชันที่ติดลิมิต'); return 0; }
    for (const { s, info } of L) {
      console.log(`• ${s.title}  [${info.type}]\n    ${fmtReset(info.resetsAt)}`);
    }
    return 0;
  }
  if (cmd === 'heavy') {
    const rows = heavy(sessions, Number(arg(rest, '--top', 5)));
    if (!rows.length) { console.log('ไม่มีข้อมูล usage.cost_usd ในอินพุต'); return 0; }
    for (const r of rows) {
      console.log(`${r.cost.toFixed(2).padStart(10)} USD  ${r.title}  (effort=${r.effort ?? '?'}, runs=${r.runs ?? '?'})`);
    }
    return 0;
  }
  if (cmd === 'resume') {
    const plan = buildResumePlan(sessions);
    if (arg(rest, '--format', 'text') === 'json') { console.log(JSON.stringify(plan, null, 2)); return 0; }
    if (!plan.length) { console.log('ไม่มีเซสชันที่ต้องทำต่อ'); return 0; }
    for (const p of plan) {
      console.log(`\n=== ${p.title} (${p.id}) ===\n${p.resetsAtText}`);
      if (p.sendLater) console.log(`send_later: at=${p.sendLater.at}`);
      console.log(`--- พรอมต์ ---\n${p.prompt}`);
    }
    return 0;
  }
  console.error(`คำสั่งไม่รู้จัก: ${cmd}`);
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
