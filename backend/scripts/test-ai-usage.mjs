import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression test — AI usage logging + shared-budget spend tracking (#11).
// Self-contained: starts a mock Supabase, spawns the real server pointed at it,
// drives /api/generate, and asserts (1) rows land in ai_usage_log and the admin
// summary aggregates per endpoint, and (2) generate traffic feeds the shared
// spend counter (router/status.calls) — which previously ignored /api/generate.
// รัน: node scripts/test-ai-usage.mjs   (no external services needed)
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SB_PORT = 8894, APP_PORT = 8893, ADMIN = 'ci-admin';
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── mock Supabase: capture ai_usage_log POSTs, serve them back on GET ──────────
const rows = [];
const sb = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.url.includes('/ai_usage_log')) {
      if (req.method === 'POST') { try { rows.push(JSON.parse(body)); } catch {} res.writeHead(201); return res.end('[]'); }
      if (req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(rows)); }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]');
  });
});

async function j(method, path, body, headers = {}) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

const app = await new Promise((resolve) => { sb.listen(SB_PORT, () => resolve(null)); }).then(() =>
  spawn('node', ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(APP_PORT), ADMIN_KEY: ADMIN, SUPABASE_URL: `http://127.0.0.1:${SB_PORT}`, SUPABASE_SERVICE_KEY: 'svc' },
    stdio: 'ignore',
  }));

let exitCode = 1;
try {
  // wait for health
  let up = false;
  for (let i = 0; i < 25; i++) {
    try { if ((await j('GET', '/api/health')).status === 200) { up = true; break; } } catch {}
    await sleep(400);
  }
  ok(up, 'server booted (/api/health 200)');

  console.log('\n=== 3× /api/generate → rows logged to ai_usage_log ===');
  for (let i = 0; i < 3; i++) {
    await j('POST', '/api/generate', { product: `ทดสอบ ${i}`, platform: 'TikTok', category: 'OTOP', style: 'sales' });
  }
  await sleep(600); // fire-and-forget insert flush

  const sum = await j('GET', '/api/ai-usage/admin/summary', null, { 'x-admin-key': ADMIN });
  ok(sum.status === 200 && sum.data?.enabled === true, `summary enabled (rows=${sum.data?.sample_rows})`);
  ok(sum.data?.by_endpoint?.['/api/generate']?.requests === 3, `by_endpoint['/api/generate'].requests === 3 (got ${sum.data?.by_endpoint?.['/api/generate']?.requests})`);
  ok(rows.length === 3, `mock Supabase received 3 inserts (got ${rows.length})`);
  ok(rows.every((r) => r.endpoint === '/api/generate' && ['claude', 'gemini', 'mock', 'mock-fallback'].includes(r.ai_source)), 'each row has endpoint + valid ai_source');

  console.log('\n=== generate traffic feeds the shared spend counter ===');
  const rs = await j('GET', '/api/router/status');
  ok((rs.data?.calls ?? 0) >= 3, `router/status.calls ≥ 3 (got ${rs.data?.calls}) — /api/generate now counts toward the budget`);

  exitCode = fail ? 1 : 0;
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
} finally {
  try { app.kill('SIGKILL'); } catch {}
  try { sb.close(); } catch {}
}
process.exit(exitCode);
