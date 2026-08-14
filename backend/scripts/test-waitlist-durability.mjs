import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';

// Regression test — the landing-page email waitlist must be DURABLE.
// POST /api/waitlist (the hero email capture — the very top of the marketing funnel) stored signups
// in waitlist.json only, which on Vercel is under /tmp and wiped on every redeploy (Vercel redeploys
// on every push). File-only, every captured email is silently lost each ship. The fix persists to
// Supabase: hydrate the list into memory on boot, upsert each new signup, and DELETE on PDPA erasure
// (so an erased email can't re-hydrate). Self-contained: starts a MOCK Supabase, spawns the real
// server pointed at it (KNOWN JWT_SECRET so the erasure HMAC matches), and asserts all three.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, 'data');
const SB_PORT = 8961, APP_PORT = 8962, ADMIN = 'ci-admin', SECRET = 'waitlist-test-secret';
const SEEDED = 'seeded@example.com';   // signed up in a prior deploy → only in Supabase
const FRESH  = 'fresh@example.com';    // signs up during this run
const erasureTok = (e) => createHmac('sha256', SECRET).update(`${e}:erasure`).digest('hex').slice(0, 16);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── mock Supabase: a waitlist table (GET lists rows, POST upserts, DELETE removes) ────────────
const store = new Map([[SEEDED, { email: SEEDED, source: 'landing', joined_at: '2026-01-01T00:00:00Z' }]]);
const posted = [], deleted = [];
const sb = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.url.includes('/waitlist')) {
      if (req.method === 'POST') { try { const b = JSON.parse(body); const r = Array.isArray(b) ? b[0] : b; if (r?.email) { store.set(r.email, r); posted.push(r.email); } } catch {} res.writeHead(201); return res.end('[]'); }
      if (req.method === 'GET')  { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify([...store.values()])); }
      if (req.method === 'DELETE') { const m = /email=eq\.([^&]+)/.exec(req.url); if (m) { const e = decodeURIComponent(m[1]); store.delete(e); deleted.push(e); } res.writeHead(200); return res.end('[]'); }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]');
  });
});

// ── hermetic file seeding: waitlist.json starts EMPTY so any recognition of SEEDED can only have
//    come from the Supabase hydrate (i.e. it survived the /tmp wipe) ──────────────────────────────
const bak = join('/tmp', 'waitlist-dura-bak.json');
const FILE = join(DATA, 'waitlist.json');
function snapshot() { if (existsSync(FILE)) copyFileSync(FILE, bak); else writeFileSync(bak, '\0MISSING'); }
function restore() { if (existsSync(bak)) { if (readFileSync(bak, 'utf8') === '\0MISSING') { if (existsSync(FILE)) rmSync(FILE); } else copyFileSync(bak, FILE); rmSync(bak, { force: true }); } }

async function req(method, path, body) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

snapshot();
writeFileSync(FILE, '[]'); // local file empty → SEEDED lives only in Supabase
const app = await new Promise((resolve) => sb.listen(SB_PORT, () => resolve(null))).then(() =>
  spawn('node', ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(APP_PORT), ADMIN_KEY: ADMIN, JWT_SECRET: SECRET, DISABLE_RATE_LIMIT: '1', SUPABASE_URL: `http://127.0.0.1:${SB_PORT}`, SUPABASE_SERVICE_KEY: 'svc' },
    stdio: 'ignore',
  }));

let exitCode = 1;
try {
  let up = false;
  for (let i = 0; i < 25; i++) { try { if ((await req('GET', '/api/health')).status === 200) { up = true; break; } } catch {} await sleep(400); }
  ok(up, 'server booted (/api/health 200)');
  await sleep(600); // let the fire-and-forget boot hydrate (GET /waitlist) complete

  console.log('\n=== 1. Boot hydrate — a prior-deploy signup (Supabase-only) survives the /tmp wipe ===');
  const dup = await req('POST', '/api/waitlist', { email: SEEDED, source: 'landing-hero' });
  ok(dup.status === 200 && /ลงทะเบียนไว้แล้ว/.test(dup.data?.message || ''),
     `re-signing the seeded email is recognized as ALREADY registered (hydrated from Supabase) — msg: ${dup.data?.message}`);
  ok(!posted.includes(SEEDED), 'the seeded dup did NOT re-upsert (early-returned as existing)');

  console.log('\n=== 2. A fresh signup is upserted to Supabase (will survive the next wipe) ===');
  const fresh = await req('POST', '/api/waitlist', { email: FRESH, source: 'landing-hero' });
  ok(fresh.status === 200 && /ลงทะเบียนสำเร็จ/.test(fresh.data?.message || ''), `fresh signup accepted — msg: ${fresh.data?.message}`);
  await sleep(300); // fire-and-forget upsert
  ok(posted.includes(FRESH), 'the fresh signup was POSTed to Supabase (durable, not file-only)');

  console.log('\n=== 3. PDPA erasure DELETEs from Supabase (so the email cannot re-hydrate) ===');
  const er = await req('POST', `/api/privacy/erasure/confirm?email=${encodeURIComponent(FRESH)}&token=${erasureTok(FRESH)}`);
  ok(er.status === 200 && er.data?.success, `erasure confirm succeeded (removed ${er.data?.removed})`);
  await sleep(200);
  ok(deleted.includes(FRESH), 'the erased email was DELETEd from Supabase (won’t come back on next boot)');
  // a forged erasure token must not delete anything
  const forged = await req('POST', `/api/privacy/erasure/confirm?email=${encodeURIComponent(SEEDED)}&token=deadbeefdeadbeef`);
  ok(forged.status === 403, 'a forged erasure token → 403 (can’t erase someone else’s data)');

  exitCode = fail ? 1 : 0;
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
} finally {
  try { app.kill('SIGKILL'); } catch {}
  try { sb.close(); } catch {}
  await sleep(150);
  restore();
}
process.exit(exitCode);
