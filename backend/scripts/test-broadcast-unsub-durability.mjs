import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';

// Regression test — the broadcast-newsletter opt-out list must be DURABLE.
// The suppression list lives in broadcast_unsubscribed.json, which on Vercel is under /tmp and is
// wiped on every redeploy (Vercel redeploys on every push). File-only, that silently re-subscribes
// everyone who unsubscribed each time we ship — a legally-required opt-out (PDPA ม.19 / anti-spam)
// we must not drop. The fix persists the list to Supabase: hydrate it back into memory on boot,
// and upsert on each new unsubscribe.
//
// Self-contained: starts a MOCK Supabase, spawns the real server pointed at it (with a KNOWN
// JWT_SECRET so the test computes the same unsubscribe HMAC), and asserts:
//   1. Boot hydrate — an email that unsubscribed in a PRIOR deploy (present only in Supabase, the
//      local file starts empty) is suppressed after boot → this IS the post-redeploy survival.
//   2. Upsert — a fresh unsubscribe issues a POST to Supabase (so it will survive the next wipe).
//   3. End-to-end — after both, the broadcast audience is fully suppressed.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, 'data');
const SB_PORT = 8895, APP_PORT = 8892, ADMIN = 'ci-admin', SECRET = 'bcast-test-secret';
const SEEDED = 'seeded@example.com';   // unsubscribed in a prior deploy → only in Supabase
const ACTIVE = 'active@example.com';   // still subscribed → unsubscribes during this test
const btok = (e) => createHmac('sha256', SECRET).update(`${e}:broadcast`).digest('hex').slice(0, 16);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── mock Supabase: a broadcast_unsubscribes table (GET lists rows, POST upserts) ──────────────
const store = new Set([SEEDED]);           // pre-seeded: SEEDED unsubscribed in a prior deploy
const posted = [];                         // capture POSTed upserts for assertion
const sb = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.url.includes('/broadcast_unsubscribes')) {
      if (req.method === 'POST') { try { const b = JSON.parse(body); const e = (Array.isArray(b) ? b[0] : b)?.email; if (e) { store.add(e); posted.push(e); } } catch {} res.writeHead(201); return res.end('[]'); }
      if (req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify([...store].map((email) => ({ email })))); }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]');
  });
});

// ── hermetic file seeding (snapshot/restore waitlist + the local opt-out file) ────────────────
const FILES = ['waitlist.json', 'broadcast_unsubscribed.json'];
const bak = (f) => join('/tmp', `bcast-bak-${f}`);
function snapshot() { for (const f of FILES) { const p = join(DATA, f); if (existsSync(p)) copyFileSync(p, bak(f)); else writeFileSync(bak(f), '\0MISSING'); } }
function restore() { for (const f of FILES) { const b = bak(f); const p = join(DATA, f); if (existsSync(b)) { if (readFileSync(b, 'utf8') === '\0MISSING') { if (existsSync(p)) rmSync(p); } else copyFileSync(b, p); rmSync(b, { force: true }); } } }
function seed() {
  // Both emails are in the audience; the local opt-out file starts EMPTY so any suppression of
  // SEEDED can only have come from the Supabase hydrate (i.e. it survived the /tmp wipe).
  writeFileSync(join(DATA, 'waitlist.json'), JSON.stringify([{ email: SEEDED }, { email: ACTIVE }], null, 2));
  writeFileSync(join(DATA, 'broadcast_unsubscribed.json'), '[]');
}

async function req(method, path, body, headers = {}) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function broadcastRecipients() {
  const r = await req('POST', '/api/leads/admin/broadcast', { subject: 'ข่าวสาร', message: 'สวัสดี', audience: 'waitlist' }, { 'x-admin-key': ADMIN });
  return r.data?.recipients; // no SMTP configured → route returns the recipient COUNT without sending
}

snapshot();
seed();
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
  await sleep(600); // let the fire-and-forget boot hydrate (GET /broadcast_unsubscribes) complete

  console.log('\n=== 1. Boot hydrate — a prior-deploy opt-out (Supabase-only) survives the /tmp wipe ===');
  ok(posted.length === 0, 'no upserts yet (nothing unsubscribed this run)');
  ok(await broadcastRecipients() === 1, `only ACTIVE receives — SEEDED stays suppressed from Supabase (got ${await broadcastRecipients()})`);

  console.log('\n=== 2. A fresh unsubscribe is upserted to Supabase (will survive the next wipe) ===');
  ok((await req('GET', `/api/broadcast/unsubscribe?email=${encodeURIComponent(ACTIVE)}&token=deadbeefdeadbeef`)).status === 403, 'a forged token → 403 (opt-out can’t be spoofed)');
  ok((await req('GET', `/api/broadcast/unsubscribe?email=${encodeURIComponent(ACTIVE)}&token=${btok(ACTIVE)}`)).status === 200, 'valid unsubscribe → 200');
  await sleep(300); // fire-and-forget upsert
  ok(posted.includes(ACTIVE), 'the unsubscribe was POSTed to Supabase (durable, not file-only)');

  console.log('\n=== 3. End-to-end — the whole audience is now suppressed ===');
  ok(await broadcastRecipients() === 0, 'no recipients left — both opt-outs honored');

  exitCode = fail ? 1 : 0;
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
} finally {
  try { app.kill('SIGKILL'); } catch {}
  try { sb.close(); } catch {}
  await sleep(150);
  restore();
}
process.exit(exitCode);
