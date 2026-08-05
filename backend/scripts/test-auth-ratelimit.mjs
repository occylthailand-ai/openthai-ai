import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Guards that the admin-credential auth endpoints and the paid TTS endpoint are rate-limited.
//
// /api/auth/override and /api/auth/recovery mint an ADMIN token on a correct override key / recovery
// code; /api/auth/recovery-codes/generate issues fresh recovery codes on the override key. All three were
// registered with NO limiter, so the override key / recovery codes were brute-forceable with no throttle
// (the login route already had authLimiter — these three were missed). /api/tts calls the PAID ElevenLabs
// API on the platform key and was public with no throttle, so it could be looped to drain the budget (the
// AI/voice/competitor endpoints are all capped). This test boots the real server and asserts each endpoint
// starts returning 429 once its limiter trips — so a future refactor can't silently drop the throttle.
// NB: DISABLE_RATE_LIMIT only disables generateLimiter, so authLimiter/ttsLimiter are active here.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const APP_PORT = 8994;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.status;
}
// Fire n requests, return the list of status codes.
async function hammer(path, body, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(await post(path, body));
  return out;
}

const app = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(APP_PORT) }, stdio: 'ignore' });

let exitCode = 1;
try {
  let up = false;
  for (let i = 0; i < 25; i++) { try { const r = await fetch(`http://127.0.0.1:${APP_PORT}/api/health`); if (r.status === 200) { up = true; break; } } catch {} await sleep(400); }
  ok(up, 'server booted (/api/health 200)');

  console.log('\n=== /api/auth/override — admin-token endpoint is brute-force throttled ===');
  const ov = await hammer('/api/auth/override', { key: 'definitely-wrong' }, 25);
  ok(ov.slice(0, 5).every((s) => s === 401), `the first attempts are rejected 401 (wrong key), not 429 yet — got ${ov.slice(0, 5).join(',')}`);
  ok(ov.includes(429), `a 429 appears within 25 wrong-key attempts (authLimiter engaged) — last 5: ${ov.slice(-5).join(',')}`);

  console.log('\n=== /api/auth/recovery — recovery-code endpoint is brute-force throttled ===');
  const rc = await hammer('/api/auth/recovery', { code: 'definitely-wrong' }, 25);
  ok(rc.includes(429), `a 429 appears within 25 wrong-code attempts (authLimiter engaged) — last 5: ${rc.slice(-5).join(',')}`);

  console.log('\n=== /api/tts — paid ElevenLabs endpoint is throttled (no budget drain) ===');
  const tts = await hammer('/api/tts', { text: 'hi' }, 25);
  ok(tts.includes(429), `a 429 appears within 25 requests (ttsLimiter engaged) — last 5: ${tts.slice(-5).join(',')}`);

  exitCode = fail ? 1 : 0;
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
} finally {
  try { app.kill('SIGKILL'); } catch {}
  await sleep(150);
}
process.exit(exitCode);
