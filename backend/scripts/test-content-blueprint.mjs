/**
 * Content Blueprint test suite
 * ทดสอบ: pure functions ของ content-blueprint.js + endpoints ทั้ง 6 ผ่าน server จริง
 * Run: node scripts/test-content-blueprint.mjs   (หรือ npm run test:blueprint)
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  loadBlueprint, validateBlueprint, blueprintStats, findNode, searchBlueprint, computeCoverage,
} from '../content-blueprint.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.BLUEPRINT_TEST_PORT || '5641';
const BASE = `http://localhost:${PORT}`;

let pass = 0, fail = 0;
function ok(label) { console.log(`  ✅ ${label}`); pass++; }
function bad(label, detail) { console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`); fail++; }
function check(cond, label, detail) { cond ? ok(label) : bad(label, detail); }

// ── ส่วนที่ 1: pure functions (ไม่ต้องมี server) ───────────────────────────────
function pureTests() {
  console.log('\n📐 Pure function tests');
  const bp = loadBlueprint({ force: true });
  const st = blueprintStats(bp);
  check(st.maslow_levels === 6, 'blueprint has 6 maslow levels', `got ${st.maslow_levels}`);
  check(st.domains === 7, 'blueprint has 7 domains (D2-D8)', `got ${st.domains}`);
  check(st.sections >= 19 && st.items >= 70, `sections/items present (${st.sections}/${st.items})`);

  check(validateBlueprint(bp).length === 0, 'validateBlueprint passes on real data');
  const broken = JSON.parse(JSON.stringify(bp));
  broken.domains[0].maslow = ['L9'];
  broken.domains[1].sections[0].items = [];
  const problems = validateBlueprint(broken);
  check(problems.some((p) => p.includes('unknown maslow level')), 'validateBlueprint catches bad maslow ref', problems.join('; '));
  check(problems.some((p) => p.includes('no items')), 'validateBlueprint catches empty section');

  check(findNode(bp, 'D2').type === 'domain', 'findNode resolves domain D2');
  const sec = findNode(bp, 'D6.2');
  check(sec?.type === 'section' && sec.breadcrumb.length === 2, 'findNode resolves section D6.2 with breadcrumb');
  check(findNode(bp, 'L4')?.node.name_en === 'Esteem', 'findNode resolves maslow level L4');
  check(findNode(bp, 'ZZZ') === null, 'findNode returns null for unknown id');

  check(searchBlueprint(bp, 'Aeroponics').some((r) => r.id === 'D2.6'), 'search finds English term (Aeroponics → D2.6)');
  check(searchBlueprint(bp, 'promptpay').some((r) => r.id === 'D7.2'), 'search is case-insensitive (promptpay → D7.2)');
  check(searchBlueprint(bp, 'ไฟป่า').some((r) => r.id === 'D3.3'), 'search finds Thai term (ไฟป่า → D3.3)');
  check(searchBlueprint(bp, '').length === 0, 'search with empty query returns []');

  const cov = computeCoverage(bp, [{ id: 'S19', name: 'Supply Chain AI', status: 'active' }]);
  const d4 = cov.domains.find((d) => d.id === 'D4');
  check(d4.status === 'partial' && d4.active_skills === 1, 'coverage: D4 partial with only S19 active');
  const d3 = cov.domains.find((d) => d.id === 'D3');
  check(d3.status === 'gap', 'coverage: D3 is a gap with empty registry');
  check(cov.summary.covered + cov.summary.partial + cov.summary.gap === 7, 'coverage summary adds up to 7');
}

// ── ส่วนที่ 2: endpoint round-trip ผ่าน server จริง (mock AI — ไม่มี key) ────────
async function serverTests() {
  console.log('\n🌐 Endpoint tests');
  const server = spawn('node', ['server.js'], {
    cwd: join(__dirname, '..'),
    env: { ...process.env, PORT, DISABLE_RATE_LIMIT: '1' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let up = false;
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.ok) { up = true; break; } } catch { /* not up */ }
    await sleep(250);
  }
  if (!up) { bad('server_start', 'timeout after 10s'); server.kill(); return; }

  try {
    const r = await fetch(`${BASE}/api/blueprint`);
    const d = await r.json();
    check(r.ok && d.success && d.stats.domains === 7 && d.coverage_summary, 'GET /api/blueprint → overview with stats + coverage summary');
  } catch (e) { bad('GET /api/blueprint', e.message); }

  try {
    const r = await fetch(`${BASE}/api/blueprint/tree?domain=D2`);
    const d = await r.json();
    check(r.ok && d.domain?.id === 'D2' && d.domain.sections.length === 6, 'GET /api/blueprint/tree?domain=D2 → full D2 with 6 sections');
    const r2 = await fetch(`${BASE}/api/blueprint/tree?domain=D99`);
    check(r2.status === 404, 'GET /api/blueprint/tree?domain=D99 → 404');
  } catch (e) { bad('GET /api/blueprint/tree', e.message); }

  try {
    const r = await fetch(`${BASE}/api/blueprint/node/D6.2`);
    const d = await r.json();
    check(r.ok && d.type === 'section' && d.breadcrumb?.length === 2, 'GET /api/blueprint/node/D6.2 → section + breadcrumb');
    const r2 = await fetch(`${BASE}/api/blueprint/node/NOPE`);
    check(r2.status === 404, 'GET /api/blueprint/node/NOPE → 404');
  } catch (e) { bad('GET /api/blueprint/node', e.message); }

  try {
    const r = await fetch(`${BASE}/api/blueprint/search?q=${encodeURIComponent('ไฮโดร')}`);
    const d = await r.json();
    check(r.ok && d.success, 'GET /api/blueprint/search?q=ไฮโดร → 200');
    const r2 = await fetch(`${BASE}/api/blueprint/search`);
    check(r2.status === 400, 'GET /api/blueprint/search (no q) → 400');
  } catch (e) { bad('GET /api/blueprint/search', e.message); }

  try {
    const r = await fetch(`${BASE}/api/blueprint/coverage`);
    const d = await r.json();
    const unresolved = (d.domains || []).flatMap((x) => x.skills.filter((s) => !s.found).map((s) => `${x.id}:${s.id}`));
    check(r.ok && d.success && d.domains.length === 7, 'GET /api/blueprint/coverage → 7 domains');
    check(unresolved.length === 0, 'coverage: every related skill resolves in live SKILLS_REGISTRY', unresolved.join(', '));
  } catch (e) { bad('GET /api/blueprint/coverage', e.message); }

  try {
    const r = await fetch(`${BASE}/api/blueprint/develop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: 'D3.1', goal: 'ทดสอบ' }),
    });
    const d = await r.json();
    check(r.ok && d.success && Array.isArray(d.content_ideas) && d.first_action, 'POST /api/blueprint/develop → brief (ai or mock)');
    const r2 = await fetch(`${BASE}/api/blueprint/develop`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    check(r2.status === 400, 'POST /api/blueprint/develop (no node_id) → 400');
  } catch (e) { bad('POST /api/blueprint/develop', e.message); }

  try {
    const r = await fetch(`${BASE}/api/skills?category=blueprint`);
    const d = await r.json();
    const ids = (d.skills || []).map((s) => s.id).sort();
    check(r.ok && ids.join(',') === 'S36,S37,S38', 'GET /api/skills?category=blueprint → S36,S37,S38 registered', ids.join(','));
  } catch (e) { bad('GET /api/skills?category=blueprint', e.message); }

  server.kill();
}

function finish() {
  console.log(`\n📊 Blueprint tests: ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

pureTests();
await serverTests();
finish();
