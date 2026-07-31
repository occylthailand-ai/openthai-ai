/**
 * Health + Auth smoke test
 * ทดสอบ: health endpoint, auth endpoints, credit check
 * Run: node scripts/test-health-auth.mjs
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.SMOKE_PORT || '5620';
const BASE = `http://localhost:${PORT}`;

const server = spawn('node', ['server.js'], {
  cwd: join(__dirname, '..'),
  env: { ...process.env, PORT, DISABLE_RATE_LIMIT: '1' },
  stdio: ['ignore', 'ignore', 'inherit'],
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;

function ok(label) { console.log(`  ✅ ${label}`); pass++; }
function bad(label, detail) { console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`); fail++; }

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.ok) return true; } catch { /* not up */ }
    await sleep(250);
  }
  return false;
}

async function main() {
  console.log('\n🔎 Health + Auth smoke tests\n');

  const up = await waitForServer();
  if (!up) { bad('server_start', 'timeout after 10s'); finish(); return; }

  // ── 1. Health ──────────────────────────────────────────────────────────────
  try {
    const r = await fetch(`${BASE}/api/health`);
    const d = await r.json();
    r.ok && d.status ? ok('GET /api/health → 200 with status') : bad('GET /api/health', `HTTP ${r.status}`);
  } catch (e) { bad('GET /api/health', e.message); }

  // ── 2. OpenAPI spec ────────────────────────────────────────────────────────
  try {
    const r = await fetch(`${BASE}/api/openapi.json`);
    const d = await r.json();
    r.ok && d.openapi ? ok('GET /api/openapi.json → valid spec') : bad('GET /api/openapi.json', `HTTP ${r.status}`);
  } catch (e) { bad('GET /api/openapi.json', e.message); }

  // ── 3. Auth — register a test user ────────────────────────────────────────
  const email = `test_${Date.now()}@example.com`;
  let token = null;
  try {
    const r = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'TestPass123!' }),
    });
    const d = await r.json();
    if ((r.ok || r.status === 201) && d.token) {
      token = d.token;
      ok(`POST /api/auth/register → token issued`);
    } else {
      bad('POST /api/auth/register', `HTTP ${r.status} — ${d.message || JSON.stringify(d)}`);
    }
  } catch (e) { bad('POST /api/auth/register', e.message); }

  // ── 4. Auth — login ────────────────────────────────────────────────────────
  if (token) {
    try {
      const r = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'TestPass123!' }),
      });
      const d = await r.json();
      r.ok && d.token ? ok('POST /api/auth/login → token issued') : bad('POST /api/auth/login', `HTTP ${r.status}`);
    } catch (e) { bad('POST /api/auth/login', e.message); }
  }

  // ── 5. Credits — check balance (requires auth) ─────────────────────────────
  if (token) {
    try {
      const r = await fetch(`${BASE}/api/credits/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      r.ok && typeof d.balance !== 'undefined'
        ? ok(`GET /api/credits/balance → ${d.balance} credits`)
        : bad('GET /api/credits/balance', `HTTP ${r.status}`);
    } catch (e) { bad('GET /api/credits/balance', e.message); }
  }

  // ── 6. Unauthenticated access is rejected ────────────────────────────────
  try {
    const r = await fetch(`${BASE}/api/credits/balance`);
    r.status === 401 ? ok('GET /api/credits/balance without auth → 401') : bad('Unauth check', `Expected 401 got ${r.status}`);
  } catch (e) { bad('Unauth check', e.message); }

  finish();
}

function finish() {
  server.kill();
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`  Results: ${pass} passed, ${fail} failed`);
  if (fail > 0) { console.error('\n❌ Health/Auth tests FAILED\n'); process.exit(1); }
  else { console.log('\n✅ All health/auth tests passed\n'); process.exit(0); }
}

main().catch(e => { console.error(e); server.kill(); process.exit(1); });
