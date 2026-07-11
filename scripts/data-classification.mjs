#!/usr/bin/env node
// ── Data Classification Framework — OpenThaiAi ───────────────────────────────
// Classifies the REAL data fields flowing through the platform (income/progress
// KPIs, the LLM Router, and AI content generation) by their statistical data
// type, so the team can pick the right analysis + decision method per field:
//   • Scale : Quantitative (numeric, computable) vs Qualitative (text/label)
//   • Level : Nominal · Ordinal · Discrete · Continuous
//
// Why a generator and not a hand-written table: every entry is anchored to a
// real source file + a token that MUST appear in it. This script reads the
// actual files and exits non-zero if any anchor is missing — so the framework
// can never silently describe a field the code no longer has (same "fail loudly
// on drift" contract as generate-project-status.mjs). It also guards a list of
// FABRICATED fields that were proposed but do NOT exist in the repo, and warns
// if one ever appears, so a hallucinated field can't quietly slip in.
//
// Run:  node scripts/data-classification.mjs        (writes docs/DATA_CLASSIFICATION.md)
//       node scripts/data-classification.mjs --check (verify only, no write)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => { try { return readFileSync(join(ROOT, p), 'utf8'); } catch { return ''; } };

// ── Verified-real fields (each `token` is checked to exist in `file`) ────────
// scale: 'quant' | 'qual'   level: 'nominal' | 'ordinal' | 'discrete' | 'continuous'
const FIELDS = [
  // Quantitative · Continuous — measured/derived numbers with decimals
  { field: 'revenue_thb', scale: 'quant', level: 'continuous', file: 'backend/progress-tracker.js', token: 'revenue_thb',
    example: 'Σ orders.amount (฿), target ฿100,000', role: 'รายได้จริงเทียบเป้า MVP ใน Progress Dashboard' },
  { field: 'latency_ms', scale: 'quant', level: 'continuous', file: 'backend/progress-tracker.js', token: 'latency_ms',
    example: '≤ 500 ms (target)', role: 'KPI ประสิทธิภาพระบบ — ใช้ตั้ง alert เมื่อช้าเกินเกณฑ์' },
  { field: 'model_accuracy', scale: 'quant', level: 'continuous', file: 'backend/progress-tracker.js', token: 'model_accuracy',
    example: '95 (target %)', role: 'KPI คุณภาพโมเดล' },
  { field: 'criticScore', scale: 'quant', level: 'continuous', file: 'backend/server.js', token: 'criticScore',
    example: '0.0–10.0', role: 'คะแนนคุณภาพคอนเทนต์ที่ AI ให้ตัวเอง — คัด A/B และปรับ prompt' },
  { field: 'costPer1k', scale: 'quant', level: 'continuous', file: 'backend/server.js', token: 'costPer1k',
    example: 'gemini 0.0004 · grok 0.0005 · claude 0.0008 (USD/1k tok)', role: 'ต้นทุนต่อโมเดล — LLM Router เรียงถูก→แพง' },
  { field: 'AI_DAILY_BUDGET_USD', scale: 'quant', level: 'continuous', file: 'backend/server.js', token: 'AI_DAILY_BUDGET_USD',
    example: '1.0 (USD/วัน)', role: 'เพดานงบ/วัน — เกินแล้ว Router เด้งเข้า Eco Mode' },

  // Quantitative · Discrete — integer counts
  { field: 'ai_calls_today', scale: 'quant', level: 'discrete', file: 'backend/progress-tracker.js', token: 'ai_calls_today',
    example: '50 (target)', role: 'จำนวนครั้งเรียก AI/วัน — วัด engagement + คุมต้นทุน' },
  { field: 'orders_total', scale: 'quant', level: 'discrete', file: 'backend/progress-tracker.js', token: 'orders_total',
    example: 'นับจาก orders.list()', role: 'จำนวนคำสั่งซื้อ — ตัวหารของ revenue' },

  // Qualitative — text / creative output, ไม่วัดเป็นตัวเลขตรงๆ
  { field: 'caption', scale: 'qual', level: 'nominal', file: 'backend/server.js', token: 'caption:',
    example: '"✨ สินค้าไทยแท้…"', role: 'ข้อความโฆษณาที่สร้าง — ประเมิน Content Quality เชิงคุณภาพ' },
  { field: 'hashtags', scale: 'qual', level: 'nominal', file: 'backend/server.js', token: 'hashtags:',
    example: "['#OTOP','#สินค้าไทย',…]", role: 'ชุดแท็ก — จัดกลุ่ม/วิเคราะห์ธีมคอนเทนต์ (ไม่มีลำดับ)' },

  // Nominal — กลุ่มที่ไม่มีลำดับสูง/ต่ำ
  { field: 'platform', scale: 'qual', level: 'nominal', file: 'backend/server.js', token: 'platform:',
    example: "'TikTok' (default), Shopee, Lazada", role: 'แพลตฟอร์มปลายทาง — User Segmentation' },
  { field: 'ROUTER_PROVIDERS', scale: 'qual', level: 'nominal', file: 'backend/server.js', token: 'ROUTER_PROVIDERS',
    example: "claude · gemini · grok", role: 'ค่าย AI (ของจริงมี 3 ค่าย) — กระจาย workload' },
  { field: 'privacy_level', scale: 'qual', level: 'nominal', file: 'backend/server.js', token: 'privacy_level',
    example: "'PUBLIC_TO_EVERYONE'", role: 'ค่าคงที่ TikTok publish visibility (ไม่ใช่ตัวถ่วงน้ำหนัก Router)' },

  // Ordinal — กลุ่มที่มีลำดับชัดเจน
  { field: 'ROUTER_TIERS', scale: 'qual', level: 'ordinal', file: 'backend/server.js', token: 'ROUTER_TIERS',
    example: 'heavy › bulk › eco', role: 'ระดับคุณภาพ→ประหยัดของ Router (มีลำดับ) — เลือก tier ตามงบ/งาน' },
];

// ── Fabricated fields proposed in a spec but NOT in the repo ──────────────────
// Kept here so the record is explicit and a hallucinated field can't slip in
// unnoticed. Each is expected to have ZERO hits across backend + frontend src.
const FABRICATED = [
  { token: 'est_margin_pct', note: 'อ้างเป็น Continuous margin — ไม่มีในโค้ด (ต้นทุน/มาร์จินสินค้าไม่ได้ถูกเก็บแบบนี้)' },
  { token: 'cost_thb', note: 'อ้างเป็นต้นทุนสินค้า — ไม่มี (ฟิลด์ต้นทุนจริงคือ costPer1k ของโมเดล AI)' },
  { token: 'fairnessScore', note: 'ไม่มีเมตริกนี้ในระบบ' },
  { token: 'journey_progress', note: 'ไม่มี field นี้' },
  { token: 'local-llama', note: 'ไม่ใช่ provider จริง — Router มีแค่ claude/gemini/grok' },
  { token: 'mistral', note: 'ไม่ใช่ provider จริง' },
  { token: 'competition_level', note: 'ไม่มี field นี้ — มีแค่ข้อความ insight คำว่า "competition" แบบอิสระ' },
];

const SEARCH_FILES = ['backend/server.js', 'backend/progress-tracker.js'];

// ── Verify: present anchors (hard) + absent fabricated tokens (soft warn) ─────
const missing = [];
for (const f of FIELDS) {
  if (!read(f.file).includes(f.token)) missing.push(`${f.field} → token "${f.token}" not found in ${f.file}`);
}
const leaked = [];
for (const f of FABRICATED) {
  const hit = SEARCH_FILES.some((p) => read(p).includes(f.token));
  if (hit) leaked.push(f.token);
}

if (missing.length) {
  console.error('✗ Data-classification drift — anchored field(s) no longer in the code:');
  for (const m of missing) console.error('  - ' + m);
  console.error('\nFix: update FIELDS in scripts/data-classification.mjs to match the real code.');
  process.exit(1);
}
console.log(`✓ ${FIELDS.length} classified fields verified against source.`);
if (leaked.length) console.warn(`⚠ fabricated token(s) now present in code (review): ${leaked.join(', ')}`);
else console.log(`✓ ${FABRICATED.length} fabricated field(s) confirmed absent.`);

if (process.argv.includes('--check')) process.exit(0);

// ── Emit derived Markdown ────────────────────────────────────────────────────
const LEVELS = { continuous: 'Continuous (ต่อเนื่อง)', discrete: 'Discrete (นับ/จำนวนเต็ม)', nominal: 'Nominal (กลุ่ม ไม่มีลำดับ)', ordinal: 'Ordinal (กลุ่ม มีลำดับ)' };
const row = (f) => `| \`${f.field}\` | ${f.scale === 'quant' ? 'Quantitative' : 'Qualitative'} | ${LEVELS[f.level]} | \`${f.file}\` | ${f.example} | ${f.role} |`;
const section = (title, pred) => {
  const rows = FIELDS.filter(pred);
  if (!rows.length) return '';
  return `\n### ${title}\n\n| Field | Scale | Level | Source | ตัวอย่าง | บทบาทต่อการวิเคราะห์/ตัดสินใจ |\n| :-- | :-- | :-- | :-- | :-- | :-- |\n${rows.map(row).join('\n')}\n`;
};

const md = `# OpenThaiAi — Data Classification Framework

> สร้างโดย \`scripts/data-classification.mjs\` — **อย่าแก้ไฟล์นี้ด้วยมือ** ทุกฟิลด์ถูก verify
> ว่ามีอยู่จริงในซอร์สโค้ด (สคริปต์ exit non-zero ถ้า field ไหนหลุดหาย) เพื่อไม่ให้เอกสาร
> จำแนกข้อมูลนี้ drift จากของจริง — แนวทางเดียวกับ \`PROJECT_STATUS.md\`.
>
> Generated: ${new Date().toISOString()}

จำแนกฟิลด์ข้อมูลจริงในระบบตามประเภทข้อมูล 2 แกน: **Scale** (Quantitative/Qualitative) ×
**Level** (Nominal/Ordinal/Discrete/Continuous) พร้อมบทบาทต่อการตัดสินใจ (Decision-Making).
${section('Quantitative · Continuous', (f) => f.scale === 'quant' && f.level === 'continuous')}${section('Quantitative · Discrete', (f) => f.scale === 'quant' && f.level === 'discrete')}${section('Qualitative', (f) => f.scale === 'qual' && (f.level === 'nominal') && ['caption', 'hashtags'].includes(f.field))}${section('Nominal (กลุ่ม ไม่มีลำดับ)', (f) => f.level === 'nominal' && !['caption', 'hashtags'].includes(f.field))}${section('Ordinal (กลุ่ม มีลำดับ)', (f) => f.level === 'ordinal')}
### ⚠️ ฟิลด์ที่ถูกเสนอมาแต่ **ไม่มีจริงในโค้ด** (verified absent)

บันทึกไว้ตามหลัก DECISIONS_LOG — เพื่อไม่ให้ถูกนำไปสร้างงานต่อโดยเข้าใจผิดว่ามีอยู่:

| Token | เหตุผล |
| :-- | :-- |
${FABRICATED.map((f) => `| \`${f.token}\` | ${f.note} |`).join('\n')}
`;

mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs/DATA_CLASSIFICATION.md'), md);
console.log('✓ wrote docs/DATA_CLASSIFICATION.md');
