import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import jwt from 'jsonwebtoken';

// Regression test — the video routes must require a logged-in user.
// POST /api/video/generate submits a real job to a PAID video provider (Runway/Pika/Kling/Luma/Veo)
// using the platform's own API keys — expensive per clip. The route was public (rate-limited only);
// the /video React page is login-gated but the API was not, so anyone bypassing the SPA could drain
// the platform's video budget. It now requires the Bearer login token (requireAuth), which the page
// already sends. Self-boots the real server with a known JWT_SECRET; no external services.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8891, SECRET = 'video-test-secret';
const TOKEN = jwt.sign({ username: 'admin', role: 'admin' }, SECRET, { expiresIn: '1h' });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function j(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function waitHealth() { for (let i = 0; i < 25; i++) { try { if ((await j('GET', '/api/health')).status === 200) return true; } catch {} await sleep(400); } return false; }

const app = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), JWT_SECRET: SECRET, SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', RUNWAY_API_KEY: '', PIKA_API_KEY: '', KLING_API_KEY: '', LUMA_API_KEY: '' },
  stdio: 'ignore',
});
try {
  ok(await waitHealth(), 'server booted');

  console.log('\n=== video generation requires login (was public → platform-budget drain) ===');
  const noAuth = await j('POST', '/api/video/generate', { body: { product: 'น้ำพริกทดสอบ', provider: 'runway' } });
  ok(noAuth.status === 401, `generate without a token → 401 (got ${noAuth.status})`);
  const badAuth = await j('POST', '/api/video/generate', { token: 'not.a.valid.jwt', body: { product: 'x' } });
  ok(badAuth.status === 401, `generate with an invalid token → 401 (got ${badAuth.status})`);
  const good = await j('POST', '/api/video/generate', { token: TOKEN, body: { product: 'น้ำพริกแม่บ้าน' } });
  // provider defaults to mock (no keys in env) → an authorized call returns a script, not 401.
  ok(good.status === 200 && good.data?.script, `generate WITH a valid token → 200 + script (got ${good.status})`);

  console.log('\n=== the job list / status routes are login-gated too ===');
  ok((await j('GET', '/api/video/jobs')).status === 401, 'GET /api/video/jobs without a token → 401');
  ok((await j('GET', '/api/video/jobs', { token: TOKEN })).status === 200, 'GET /api/video/jobs with a token → 200');
} finally { app.kill('SIGKILL'); await sleep(150); }

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
