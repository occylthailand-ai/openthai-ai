import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  loadDepartmentToolBuilder,
  validateDepartmentToolBuilder,
  departmentToolBuilderStats,
  findDepartment,
  searchDepartmentToolBuilder,
  computeDepartmentCoverage,
} from '../department-tool-builder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.DEPARTMENT_TOOL_TEST_PORT || '5642';
const BASE = `http://localhost:${PORT}`;

let pass = 0;
let fail = 0;
const ok = (label) => { console.log(`  ✅ ${label}`); pass++; };
const bad = (label, detail) => { console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`); fail++; };
const check = (cond, label, detail) => (cond ? ok(label) : bad(label, detail));

function pureTests() {
  console.log('\n📐 Department tool builder pure tests');
  const data = loadDepartmentToolBuilder({ force: true });
  const stats = departmentToolBuilderStats(data);
  check(stats.requested_headings === 33, 'registry keeps all 33 requested headings', `got ${stats.requested_headings}`);
  check(stats.canonical_departments === 29, 'registry deduplicates to 29 canonical departments', `got ${stats.canonical_departments}`);
  check(validateDepartmentToolBuilder(data).length === 0, 'validateDepartmentToolBuilder passes on real data');
  check(findDepartment(data, { departmentId: 'executive' })?.name_th === 'ฝ่ายบริหาร', 'findDepartment resolves executive');
  check(findDepartment(data, { requestIndex: 24 })?.id === 'finance', 'findDepartment resolves duplicate request to finance');
  check(searchDepartmentToolBuilder(data, 'ยั่งยืน').some((d) => d.id === 'sustainability'), 'search finds sustainability in Thai');
  const coverage = computeDepartmentCoverage(data, [{ id: 'S9', name: 'Learning Layer', status: 'active' }, { id: 'S16', name: 'Prompt Builder', status: 'active' }, { id: 'S26', name: 'Omni-Solver', status: 'active' }]);
  const learning = coverage.departments.find((d) => d.id === 'learning');
  check(learning?.status === 'covered', 'coverage marks learning as covered with 3 active skills');
}

async function serverTests() {
  console.log('\n🌐 Department tool builder endpoint tests');
  const server = spawn('node', ['server.js'], {
    cwd: join(__dirname, '..'),
    env: { ...process.env, PORT, DISABLE_RATE_LIMIT: '1' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let up = false;
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.ok) { up = true; break; } } catch {}
    await sleep(250);
  }
  if (!up) { bad('server_start', 'timeout after 10s'); server.kill(); return; }

  try {
    const r = await fetch(`${BASE}/api/department-tools`);
    const d = await r.json();
    check(r.ok && d.success && d.stats.requested_headings === 33, 'GET /api/department-tools → overview with 33 headings');
    check((d.departments || []).some((x) => x.id === 'marketing'), 'overview includes marketing department');
  } catch (e) { bad('GET /api/department-tools', e.message); }

  try {
    const r = await fetch(`${BASE}/api/department-tools/search?q=${encodeURIComponent('นักลงทุน')}`);
    const d = await r.json();
    check(r.ok && d.success && d.results.some((x) => x.id === 'investor-relations'), 'GET /api/department-tools/search → investor relations');
  } catch (e) { bad('GET /api/department-tools/search', e.message); }

  try {
    const r = await fetch(`${BASE}/api/department-tools/develop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department_id: 'pr', goal: 'ทดสอบ' }),
    });
    const d = await r.json();
    check(r.ok && d.success && Array.isArray(d.suggested_tools) && d.first_action, 'POST /api/department-tools/develop → brief');
    const r2 = await fetch(`${BASE}/api/department-tools/develop`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    check(r2.status === 400, 'POST /api/department-tools/develop without id → 400');
  } catch (e) { bad('POST /api/department-tools/develop', e.message); }

  try {
    const r = await fetch(`${BASE}/api/department-tools/develop-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: 'ทดสอบ' }),
    });
    const d = await r.json();
    check(r.ok && d.success && d.briefs.length === 29, 'POST /api/department-tools/develop-all → 29 canonical briefs', `got ${d.briefs?.length}`);
  } catch (e) { bad('POST /api/department-tools/develop-all', e.message); }

  try {
    const r = await fetch(`${BASE}/api/skills?category=department`);
    const d = await r.json();
    const ids = (d.skills || []).map((s) => s.id).sort().join(',');
    check(ids === 'S39,S40,S41', 'GET /api/skills?category=department → S39,S40,S41', ids);
  } catch (e) { bad('GET /api/skills?category=department', e.message); }

  server.kill();
}

function finish() {
  console.log(`\n📊 Department tool builder tests: ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

pureTests();
await serverTests();
finish();
