// Self-boot test — the AI department-officer HTTP endpoints. Boots the real server with a known
// JWT_SECRET and NO AI keys (so it exercises the deterministic offline fallback), mints a Bearer
// token, and pins: auth is required; the officer list covers every department; a professional
// officer's answer always carries the disclaimer while an operational one does not; and the input
// guards (unknown department, missing question) return 400.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import jwt from 'jsonwebtoken';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8904, SECRET = 'officer-test-secret';
const TOKEN = jwt.sign({ sub: 'tester', role: 'admin' }, SECRET, { expiresIn: '1h' });

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function waitHealth() { for (let i = 0; i < 25; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/health`); if (r.status === 200) return true; } catch {} await sleep(400); } return false; }

const app = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), JWT_SECRET: SECRET, DISABLE_RATE_LIMIT: '1',
    SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', ANTHROPIC_API_KEY: '', GEMINI_API_KEY: '', XAI_API_KEY: '' },
  stdio: 'ignore',
});
try {
  ok(await waitHealth(), 'server booted');

  console.log('\n=== auth gate ===');
  ok((await req('POST', '/api/corporate/officer/marketing', { question: 'hi' }, false)).status === 401, 'no token → 401');
  ok((await req('GET', '/api/corporate/officers', null, false)).status === 401, 'officers list without token → 401');

  console.log('\n=== officer roster covers every department ===');
  const list = await req('GET', '/api/corporate/officers');
  ok(list.status === 200 && Array.isArray(list.data?.officers) && list.data.officers.length === 15, `15 officers listed (got ${list.data?.officers?.length})`);
  ok(list.data.officers.every((o) => o.role && o.scope), 'each listed officer has role + scope');

  console.log('\n=== a professional officer always carries the disclaimer (offline fallback path) ===');
  const comp = await req('POST', '/api/corporate/officer/compliance', { question: 'PDPA ต้องทำอะไรบ้าง' });
  ok(comp.status === 200 && comp.data?.answer && comp.data.answer.length > 10, 'compliance officer → 200 with a non-empty answer even with no AI key');
  ok(typeof comp.data?.disclaimer === 'string' && /ผู้เชี่ยวชาญ/.test(comp.data.disclaimer), 'compliance answer carries the professional disclaimer');
  ok(comp.data?.ai_used === 'none', 'ai_used is "none" on the offline fallback (honest about no live AI)');

  console.log('\n=== an operational officer has no forced disclaimer ===');
  const mkt = await req('POST', '/api/corporate/officer/marketing', { question: 'ทำแคมเปญหน้าฝนยังไง' });
  ok(mkt.status === 200 && mkt.data?.disclaimer === null, 'marketing officer → 200, disclaimer null');

  console.log('\n=== input guards ===');
  ok((await req('POST', '/api/corporate/officer/bogus', { question: 'x' })).status === 400, 'unknown department → 400');
  ok((await req('POST', '/api/corporate/officer/compliance', {})).status === 400, 'missing question → 400');
} finally {
  app.kill('SIGKILL');
  await sleep(150);
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
