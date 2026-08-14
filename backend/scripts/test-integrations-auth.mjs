import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression test — the state-changing integration routes must require the admin key.
// POST /api/integrations/:id/publish acts with the platform's OWN LINE/Facebook tokens (a LINE
// broadcast reaches every follower). The router used to be mounted with no auth, so anyone could
// POST /api/integrations/line/publish and spam all followers — the React page was login-gated but
// the API was public. Now `test` / `publish` / `canva/export` require x-admin-key (checkAdminKey).
// Self-boots the real server with a known ADMIN_KEY; no external services needed.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8892, ADMIN = 'itest-admin-key';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function j(method, path, { admin, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin) headers['x-admin-key'] = admin;
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function waitHealth() { for (let i = 0; i < 25; i++) { try { if ((await j('GET', '/api/health')).status === 200) return true; } catch {} await sleep(400); } return false; }

const app = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), ADMIN_KEY: ADMIN, SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '' },
  stdio: 'ignore',
});
try {
  ok(await waitHealth(), 'server booted');

  console.log('\n=== publish requires the admin key (was unauthenticated → follower-spam vector) ===');
  const noKey = await j('POST', '/api/integrations/line/publish', { body: { content: 'สแปมทดสอบ' } });
  ok(noKey.status === 401, `publish without x-admin-key → 401 (got ${noKey.status})`);
  const wrongKey = await j('POST', '/api/integrations/line/publish', { admin: 'wrong', body: { content: 'x' } });
  ok(wrongKey.status === 401, `publish with a wrong key → 401 (got ${wrongKey.status})`);
  const good = await j('POST', '/api/integrations/line/publish', { admin: ADMIN, body: { content: 'ข้อความจริง' } });
  // LINE has no token in this env, so an authorized publish is accepted and queued (not 401).
  ok(good.status === 200 && good.data?.status === 'queued', `publish WITH the admin key → 200 queued (got ${good.status}/${good.data?.status})`);

  console.log('\n=== test also requires the admin key ===');
  ok((await j('POST', '/api/integrations/line/test')).status === 401, 'test without key → 401');
  ok((await j('POST', '/api/integrations/line/test', { admin: ADMIN })).status === 200, 'test with key → 200');

  console.log('\n=== the read-only status list stays public (used on page load) ===');
  const list = await j('GET', '/api/integrations');
  ok(list.status === 200 && list.data?.ok === true, 'GET /api/integrations → 200 (unchanged, no key needed)');
} finally { app.kill('SIGKILL'); await sleep(150); }

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
