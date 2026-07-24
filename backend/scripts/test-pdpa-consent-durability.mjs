import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';

// Regression test — the PDPA proof-of-consent record (GAP-001) must be DURABLE.
// POST /api/privacy/consent stores the record (email, ip, purposes, version, ts) that proves a
// user consented. It lived in pdpa_consents.json only, which on Vercel is under /tmp and is wiped
// on every redeploy (Vercel redeploys on every push) — so after any deploy EVERY recorded consent
// vanished and we could no longer prove anyone consented, the exact guarantee GAP-001 makes (and
// /api/privacy/access + erasure both read this store). The fix persists it to Supabase: hydrate on
// boot, upsert on each new consent, and delete on erasure.
//
// Self-contained: starts a MOCK Supabase, spawns the real server pointed at it with a known
// JWT_SECRET (so the test computes the same access/erasure HMAC tokens), and asserts:
//   1. Boot hydrate — a consent recorded in a PRIOR deploy (present only in Supabase, the local
//      file starts empty) is restored after boot → this IS the post-redeploy survival.
//   2. Upsert — a fresh POST /api/privacy/consent issues a POST to Supabase.
//   3. Erasure — confirming erasure DELETEs the consent row from Supabase too (not just the file).
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, 'data');
const SB_PORT = 8901, APP_PORT = 8900, SECRET = 'consent-test-secret';
const PRIOR = 'prior@example.com';   // consented in a prior deploy → only in Supabase
const FRESH = 'fresh@example.com';   // consents during this test run
const tok = (x, type) => createHmac('sha256', SECRET).update(`${x}:${type}`).digest('hex').slice(0, 16);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── mock Supabase: a pdpa_consents table (GET lists, POST upserts, DELETE by ?email=eq.X) ──────
const store = new Map([[PRIOR, { email: PRIOR, id: '1', ip: '1.2.3.4', purposes: ['service'], version: '1.0', consented: true, ts: new Date().toISOString() }]]);
const posted = [], deleted = [];
const sb = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const url = decodeURIComponent(req.url);
    if (url.includes('/pdpa_consents')) {
      if (req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify([...store.values()])); }
      if (req.method === 'POST') { try { const b = JSON.parse(body); const r = Array.isArray(b) ? b[0] : b; if (r?.email) { store.set(r.email, r); posted.push(r.email); } } catch {} res.writeHead(201); return res.end('[]'); }
      if (req.method === 'DELETE') { const m = url.match(/email=eq\.([^&]+)/); if (m) { store.delete(m[1]); deleted.push(m[1]); } res.writeHead(204); return res.end(); }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]');
  });
});

// ── hermetic: the local consent file starts EMPTY so any restored consent came from Supabase ───
const FILES = ['pdpa_consents.json'];
const bak = (f) => join('/tmp', `consent-bak-${f}`);
function snapshot() { for (const f of FILES) { const p = join(DATA, f); if (existsSync(p)) copyFileSync(p, bak(f)); else writeFileSync(bak(f), '\0MISSING'); } }
function restore() { for (const f of FILES) { const b = bak(f); const p = join(DATA, f); if (existsSync(b)) { if (readFileSync(b, 'utf8') === '\0MISSING') { if (existsSync(p)) rmSync(p); } else copyFileSync(b, p); rmSync(b, { force: true }); } } }

async function req(method, path, body) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function consentRows(email) {
  const r = await req('GET', `/api/privacy/access/confirm?email=${encodeURIComponent(email)}&token=${tok(email, 'access')}`);
  return r.data?.records?.consents || [];
}

snapshot();
writeFileSync(join(DATA, 'pdpa_consents.json'), '[]'); // local file empty → restored consent = from Supabase
const app = await new Promise((resolve) => sb.listen(SB_PORT, () => resolve(null))).then(() =>
  spawn('node', ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(APP_PORT), JWT_SECRET: SECRET, DISABLE_RATE_LIMIT: '1', SUPABASE_URL: `http://127.0.0.1:${SB_PORT}`, SUPABASE_SERVICE_KEY: 'svc' },
    stdio: 'ignore',
  }));

let exitCode = 1;
try {
  let up = false;
  for (let i = 0; i < 25; i++) { try { if ((await req('GET', '/api/health')).status === 200) { up = true; break; } } catch {} await sleep(400); }
  ok(up, 'server booted (/api/health 200)');
  await sleep(600); // let the fire-and-forget boot hydrate (GET /pdpa_consents) complete

  console.log('\n=== 1. Boot hydrate — a prior-deploy consent (Supabase-only) survives the /tmp wipe ===');
  const priorRows = await consentRows(PRIOR);
  ok(priorRows.length === 1 && priorRows[0].email === PRIOR, `the prior consent record is restored from Supabase (got ${priorRows.length})`);
  ok(posted.length === 0, 'no upserts yet (nothing consented this run)');

  console.log('\n=== 2. A fresh consent is upserted to Supabase (will survive the next wipe) ===');
  ok((await req('POST', '/api/privacy/consent', { email: FRESH, purposes: ['service', 'marketing'], version: '1.1' })).data?.success === true, 'POST /api/privacy/consent → success');
  await sleep(300); // fire-and-forget upsert
  ok(posted.includes(FRESH), 'the consent was POSTed to Supabase (durable, not file-only)');
  ok((await consentRows(FRESH)).length === 1, 'the fresh consent is now readable via access');

  console.log('\n=== 3. Erasure removes the durable consent copy too (not just the file) ===');
  const del = await req('POST', `/api/privacy/erasure/confirm?email=${encodeURIComponent(PRIOR)}&token=${tok(PRIOR, 'erasure')}`);
  ok(del.status === 200 && del.data?.success === true, 'erasure confirm → 200');
  await sleep(200);
  ok(deleted.includes(PRIOR), 'the consent row was DELETEd from Supabase');
  ok((await consentRows(PRIOR)).length === 0, 'the prior consent is gone after erasure');

  exitCode = fail ? 1 : 0;
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
} finally {
  try { app.kill('SIGKILL'); } catch {}
  try { sb.close(); } catch {}
  await sleep(150);
  restore();
}
process.exit(exitCode);
