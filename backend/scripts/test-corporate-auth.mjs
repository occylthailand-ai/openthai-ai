import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import jwt from 'jsonwebtoken';

// Regression test — the corporate GET routes must require login.
// The corporate mutations (PATCH /api/corporate/*) were already requireAuth-gated, but the GET
// reads were public — so anyone could read internal governance data: board members, finance, HR,
// ESG, investor relations, and PR media contacts (journalist personal data → PDPA). Now every
// GET /api/corporate/* is requireAuth-gated too, matching its PATCH. Self-boots the real server
// with a known JWT_SECRET; no external services.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8890, SECRET = 'corp-test-secret';
const TOKEN = jwt.sign({ username: 'admin', role: 'admin' }, SECRET, { expiresIn: '1h' });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function status(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`, { headers });
  return res.status;
}
async function waitHealth() { for (let i = 0; i < 25; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/health`); if (r.status === 200) return true; } catch {} await sleep(400); } return false; }

const app = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), JWT_SECRET: SECRET, SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '' },
  stdio: 'ignore',
});
try {
  ok(await waitHealth(), 'server booted');

  console.log('\n=== internal corporate reads require login (were public) ===');
  // The sensitive ones: finance, HR, board, investor relations, PR media contacts.
  for (const path of ['/api/corporate/finance', '/api/corporate/hr', '/api/corporate/board', '/api/corporate/ir', '/api/corporate/pr/contacts', '/api/corporate/overview']) {
    ok(await status(path) === 401, `${path} without a token → 401`);
  }

  console.log('\n=== a logged-in admin can still read them ===');
  ok(await status('/api/corporate/finance', TOKEN) === 200, 'GET /api/corporate/finance with a valid token → 200');
  ok(await status('/api/corporate/pr/contacts', TOKEN) === 200, 'GET /api/corporate/pr/contacts with a valid token → 200');
} finally { app.kill('SIGKILL'); await sleep(150); }

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
