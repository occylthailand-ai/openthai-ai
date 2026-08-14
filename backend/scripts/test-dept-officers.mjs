// Deterministic unit test (no server, no LLM) — the AI department-officer layer.
// Pins the safety-critical behaviour: every corporate department has a scoped officer; high-stakes
// (legal/finance/audit/...) officers are flagged professional and their prompt forbids binding
// advice; and every officer has an offline fallback so the endpoint answers even with no AI key.
import { officerFor, buildPrompt, needsProfessionalDisclaimer, DISCLAIMER, DEPT_OFFICER_IDS, PROFESSIONAL_DEPTS } from '../dept-officers.js';
import { DEPARTMENTS } from '../corporate-system.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

console.log('=== every department has a scoped officer ===');
const ids = Object.keys(DEPARTMENTS);
ok(DEPT_OFFICER_IDS.length === ids.length && ids.length > 0, `officer for all ${ids.length} departments`);
ok(ids.every((id) => { const o = officerFor(id); return o && o.role && o.scope && o.department; }), 'each officer carries role + scope + department');
ok(officerFor('bogus') === null, 'an unknown department → null (no fabricated officer)');
ok(buildPrompt('bogus', 'x') === null, 'buildPrompt for an unknown department → null');

console.log('\n=== high-stakes officers are flagged professional + carry the disclaimer ===');
const expectedProfessional = ['compliance', 'finance', 'audit', 'risk', 'board', 'ir', 'secretary', 'hr'];
ok(expectedProfessional.every((id) => needsProfessionalDisclaimer(id)), 'legal/finance/audit/risk/board/ir/secretary/hr all need the disclaimer');
ok(['marketing', 'it', 'operations', 'strategy', 'esg', 'procurement', 'globalexpand'].every((id) => !needsProfessionalDisclaimer(id)), 'operational depts do not force the professional disclaimer');
ok(PROFESSIONAL_DEPTS.slice().sort().join(',') === expectedProfessional.slice().sort().join(','), 'the professional set is exactly the high-stakes departments');
ok(/ผู้เชี่ยวชาญ/.test(DISCLAIMER) && /ใบอนุญาต/.test(DISCLAIMER), 'the disclaimer tells users to verify with a licensed professional');

console.log('\n=== the prompt encodes the guardrail + scope; every officer has an offline fallback ===');
const bc = buildPrompt('compliance', 'ต้องยื่นอะไรกับ ก.ล.ต. บ้าง');
ok(bc.professional === true, 'compliance prompt is marked professional');
ok(/ห้ามให้คำวินิจฉัย/.test(bc.prompt) && /ตรวจสอบกับผู้เชี่ยวชาญ/.test(bc.prompt), 'a professional prompt forbids binding advice + tells the model to defer to experts');
ok(bc.prompt.includes('ก.ล.ต.'), 'the user question is included in the prompt');
const bm = buildPrompt('marketing', 'ทำแคมเปญหน้าฝนยังไงดี');
ok(bm.professional === false && !/ห้ามให้คำวินิจฉัย/.test(bm.prompt), 'an operational prompt is not forced into the professional guard');
ok(ids.every((id) => { const b = buildPrompt(id, 'ทดสอบ'); return b && b.fallback && b.fallback.length > 20; }), 'every officer has a non-empty offline fallback (answers even with no AI key)');

console.log('\n=== a long question is capped (no unbounded prompt) ===');
const big = buildPrompt('finance', 'ก'.repeat(5000));
ok(big.prompt.length < 3000, `a 5000-char question is capped in the prompt (len ${big.prompt.length})`);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
