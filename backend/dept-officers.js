// Openthai.ai — AI Department Officers (เจ้าหน้าที่ AI ประจำฝ่าย)
//
// Owner direction (2026-07-24): until the platform grows enough to hire real staff, give each
// corporate department an AI "officer" with scoped, domain-specific skill — a temporary team.
//
// SAFETY FIRST (verify-before-build + do-no-harm): an AI officer must NEVER pose as a licensed
// professional giving binding advice. For high-stakes departments (legal/compliance, finance,
// accounting/audit, risk, board/governance, IR, company secretary, HR) every answer carries a
// mandatory disclaimer and the prompt forbids professional rulings. And the officer is NOT
// LLM-dependent: if no AI provider is configured, it returns a deterministic scope-based fallback
// so the endpoint still answers usefully offline.
//
// This module is pure + deterministic (no network, no LLM) so it can be unit-tested fully.

import { DEPARTMENTS } from './corporate-system.js';

// Departments whose answers must be framed as general guidance, never binding professional advice.
const PROFESSIONAL = new Set(['compliance', 'finance', 'audit', 'risk', 'board', 'ir', 'secretary', 'hr']);

export const DISCLAIMER =
  'หมายเหตุ: นี่คือข้อมูล/แนวทางทั่วไปจากผู้ช่วย AI เท่านั้น ไม่ใช่คำปรึกษาทางกฎหมาย บัญชี ภาษี หรือ' +
  'การเงินที่ผูกพันตามวิชาชีพ — สำหรับการตัดสินใจจริง โปรดตรวจสอบกับผู้เชี่ยวชาญที่มีใบอนุญาต';

// One-line scope per department (Thai) — what this officer genuinely helps with, kept bounded.
const SCOPE = {
  board:        'สรุปหลักธรรมาภิบาล บทบาทคณะกรรมการ วาระประชุม และแนวปฏิบัติที่ดี (แนวทางทั่วไป)',
  audit:        'เช็กลิสต์การตรวจสอบภายใน การควบคุมภายใน และประเด็นที่ควรระวัง (แนวทางทั่วไป)',
  risk:         'ระบุ/จัดลำดับความเสี่ยงองค์กร และแนวทางลดความเสี่ยงเบื้องต้น (แนวทางทั่วไป)',
  secretary:    'งานเลขานุการบริษัท เอกสาร วาระ AGM/EGM และการเปิดเผยข้อมูล (แนวทางทั่วไป)',
  ir:           'สื่อสารกับนักลงทุน สรุปผลประกอบการ และคำถามที่พบบ่อย (แนวทางทั่วไป)',
  compliance:   'ภาพรวมข้อกำหนด PDPA/GDPR และ compliance checklist (แนวทางทั่วไป ไม่ใช่คำปรึกษากฎหมาย)',
  finance:      'อธิบายงบการเงิน กระแสเงินสด ต้นทุน และตัวชี้วัดพื้นฐาน (แนวทางทั่วไป ไม่ใช่คำปรึกษาการเงิน)',
  hr:           'นโยบายบุคคล การจ้างงาน สวัสดิการ และวัฒนธรรมองค์กร (แนวทางทั่วไป)',
  it:           'สถาปัตยกรรมระบบ AI ความปลอดภัยข้อมูล และแนวทางเทคนิค',
  marketing:    'กลยุทธ์การตลาด คอนเทนต์ แคมเปญ และการเข้าถึงลูกค้ากลุ่มเป้าหมาย',
  operations:   'ปฏิบัติการประจำวัน กระบวนการ และการประสานงานข้ามทีม',
  strategy:     'กลยุทธ์ธุรกิจ การเข้าตลาดใหม่ และการวางแผนเติบโต',
  esg:          'ความยั่งยืน ผลกระทบสังคม/สิ่งแวดล้อม และการรายงาน ESG',
  procurement:  'จัดซื้อจัดจ้าง คัดเลือกซัพพลายเออร์ และการเจรจา',
  globalexpand: 'ขยายธุรกิจสู่ตลาดต่างประเทศ การปรับให้เข้ากับท้องถิ่น และช่องทางเข้าตลาด',
};

// The public "profile" of a department's AI officer.
export function officerFor(deptId) {
  const d = DEPARTMENTS[deptId];
  if (!d) return null;
  return {
    id: d.id,
    department: d.nameT,
    department_en: d.name,
    icon: d.icon,
    role: `เจ้าหน้าที่ AI ฝ่าย${d.nameT}`,
    scope: SCOPE[deptId] || `ช่วยงานด้าน${d.nameT}`,
    professional: PROFESSIONAL.has(deptId),
  };
}

export function needsProfessionalDisclaimer(deptId) {
  return PROFESSIONAL.has(deptId);
}

// Build the AI prompt + a deterministic offline fallback for a question to a department officer.
export function buildPrompt(deptId, question) {
  const o = officerFor(deptId);
  if (!o) return null;
  const q = String(question || '').slice(0, 2000);
  const guard = o.professional
    ? 'ตอบเป็นแนวทางทั่วไปเท่านั้น ห้ามให้คำวินิจฉัยหรือคำปรึกษาที่ผูกพันตามวิชาชีพ และเตือนผู้ใช้ให้ตรวจสอบกับผู้เชี่ยวชาญที่มีใบอนุญาตก่อนตัดสินใจ'
    : 'ตอบให้ใช้งานได้จริง กระชับ และเป็นขั้นตอนที่ทำตามได้';
  const prompt =
    `คุณคือ${o.role} ของ Openthai.ai\n` +
    `ขอบเขตงานของฝ่ายนี้: ${o.scope}\n` +
    `กติกา: ตอบเป็นภาษาไทย ${guard} ` +
    `ถ้าคำถามอยู่นอกขอบเขตของฝ่ายนี้ ให้บอกตรง ๆ ว่าอยู่นอกขอบเขต และแนะนำฝ่ายที่เกี่ยวข้อง\n\n` +
    `คำถาม: ${q}`;
  const fallback =
    `${o.role} — ขอบเขตงาน: ${o.scope}\n` +
    `ตอนนี้ระบบยังไม่ได้เชื่อมผู้ให้บริการ AI (ยังไม่ได้ตั้ง API key) จึงยังตอบเชิงลึกอัตโนมัติไม่ได้ ` +
    `แต่ฝ่ายนี้ดูแลขอบเขตข้างต้น โปรดระบุรายละเอียดคำถามเพิ่มเพื่อให้ดำเนินการต่อ`;
  return { prompt, fallback, professional: o.professional };
}

export const DEPT_OFFICER_IDS = Object.keys(DEPARTMENTS);
export const PROFESSIONAL_DEPTS = [...PROFESSIONAL];
