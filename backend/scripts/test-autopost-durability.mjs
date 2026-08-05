import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import jwt from 'jsonwebtoken';
import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';

// Regression test — SCHEDULED auto-posts must actually fire on Vercel.
// POST /api/autopost/queue stored the queue in autopost_queue.json only. On Vercel that file is under
// /tmp: (1) wiped on every redeploy, and (2) PRIVATE to each lambda instance — so a post the POST
// invocation queued is invisible to the later /api/autopost/process cron invocation. The local cron
// (cron.schedule) is also gated `if (!IS_VERCEL)`. Net effect: scheduled posts silently never got sent
// in production. The fix persists the queue to Supabase (migration 011): hydrate on boot, upsert on
// queue/status-change, and /api/autopost/process pulls DUE items straight from Supabase so it sees
// posts queued by any instance and survives redeploys. Self-contained: starts a MOCK Supabase, spawns
// the real server pointed at it (KNOWN JWT_SECRET so the auth token verifies), and asserts the queue is
// durable end to end. Immediate/scheduled dispatch marks items 'failed' here (no LINE/FB tokens set) —
// that's fine; the point is that due items are FOUND and PROCESSED after a /tmp wipe, not the send.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, 'data');
const SB_PORT = 8971, APP_PORT = 8972, ADMIN = 'ci-admin', SECRET = 'autopost-test-secret';
const TOKEN = jwt.sign({ email: 'tester@example.com' }, SECRET);
const past   = new Date(Date.now() - 3600_000).toISOString();  // due now
const future = new Date(Date.now() + 3600_000).toISOString();  // not due for an hour

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── mock Supabase: autopost_queue (GET lists/filters, POST upserts by id) ─────────────────────────
// SEEDED = a post queued in a PRIOR deploy → lives only in Supabase (local file starts empty).
const SEEDED = 'seeded_prior_deploy';
const store = new Map([[SEEDED, { id: SEEDED, product: 'ทุเรียนหมอนทอง', content: { hook: 'สด!', caption: 'ลอง' }, platforms: ['line'], schedule_at: past, status: 'queued', created_at: past, updated_at: past }]]);
const posted = [];
const sb = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.url.includes('/autopost_queue')) {
      if (req.method === 'POST') {
        try { const b = JSON.parse(body); const r = Array.isArray(b) ? b[0] : b; if (r?.id) { store.set(String(r.id), r); posted.push(String(r.id)); } } catch {}
        res.writeHead(201); return res.end('[]');
      }
      if (req.method === 'GET') {
        let rows = [...store.values()];
        if (/status=eq\.queued/.test(req.url)) {
          const m = /schedule_at=lte\.([^&]+)/.exec(req.url);
          const cutoff = m ? new Date(decodeURIComponent(m[1])).getTime() : Date.now();
          rows = rows.filter((r) => r.status === 'queued' && new Date(r.schedule_at).getTime() <= cutoff);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(rows));
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]');
  });
});

// ── hermetic file seeding: autopost_queue.json starts EMPTY so any due item can only have come from
//    Supabase (i.e. it survived the /tmp wipe / another instance queued it) ─────────────────────────
const bak = join('/tmp', 'autopost-dura-bak.json');
const FILE = join(DATA, 'autopost_queue.json');
function snapshot() { if (existsSync(FILE)) copyFileSync(FILE, bak); else writeFileSync(bak, '\0MISSING'); }
function restore() { if (existsSync(bak)) { if (readFileSync(bak, 'utf8') === '\0MISSING') { if (existsSync(FILE)) rmSync(FILE); } else copyFileSync(bak, FILE); rmSync(bak, { force: true }); } }

async function req(method, path, { body, token, adminKey } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (adminKey) headers['x-admin-key'] = adminKey;
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
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
  await sleep(600); // let the fire-and-forget boot hydrate (GET /autopost_queue) complete

  console.log('\n=== 1. The cron process endpoint is not world-callable ===');
  const noauth = await req('GET', '/api/autopost/process');
  ok(noauth.status === 401, `GET /api/autopost/process with no key → 401 (was open before)`);

  console.log('\n=== 2. A post scheduled in a PRIOR deploy (Supabase-only) fires after the /tmp wipe ===');
  const proc1 = await req('GET', '/api/autopost/process', { adminKey: ADMIN });
  ok(proc1.status === 200 && proc1.data?.processed >= 1,
     `process dispatched the seeded prior-deploy post — processed=${proc1.data?.processed} (file was empty; found it in Supabase)`);
  await sleep(250); // fire-and-forget status upsert
  ok(store.get(SEEDED)?.status !== 'queued',
     `the seeded post's status was updated in Supabase (${store.get(SEEDED)?.status}) — won't be re-sent`);

  console.log('\n=== 3. A NEW scheduled post queued by another instance (post-boot, memory-invisible) is still found ===');
  // Simulate a different lambda instance queueing a due post directly into Supabase AFTER this
  // instance booted — it is NOT in this process's in-memory queue, so only the Supabase due-fetch
  // can surface it. This is the cross-invocation guarantee the file-only queue could never give.
  const CROSS = 'cross_instance_post';
  store.set(CROSS, { id: CROSS, product: 'สบู่สมุนไพร', content: { hook: 'ใหม่!', caption: 'x' }, platforms: ['facebook'], schedule_at: past, status: 'queued', created_at: past, updated_at: past });
  const proc2 = await req('GET', '/api/autopost/process', { adminKey: ADMIN });
  ok(proc2.status === 200 && proc2.data?.processed >= 1,
     `process found the cross-instance post via Supabase — processed=${proc2.data?.processed}`);
  await sleep(250); // fire-and-forget status upsert
  ok(store.get(CROSS)?.status !== 'queued', `the cross-instance post was dispatched (${store.get(CROSS)?.status})`);

  console.log('\n=== 4. Queueing a FUTURE post persists it to Supabase but does not send it yet ===');
  const q = await req('POST', '/api/autopost/queue', { token: TOKEN, body: { product: 'น้ำผึ้งป่า', content: { hook: 'หวานธรรมชาติ' }, platforms: ['line'], schedule_at: future } });
  ok(q.status === 200 && q.data?.item?.id, `future post accepted — id=${q.data?.item?.id}`);
  await sleep(300); // fire-and-forget upsert
  const futureId = q.data?.item?.id;
  ok(posted.includes(String(futureId)), 'the future post was upserted to Supabase (durable, survives the next redeploy)');
  ok(store.get(String(futureId))?.status === 'queued', 'the future post stays queued (schedule_at is an hour out)');
  const proc3 = await req('GET', '/api/autopost/process', { adminKey: ADMIN });
  ok(proc3.status === 200 && proc3.data?.processed === 0, `process does NOT fire the not-yet-due post — processed=${proc3.data?.processed}`);

  exitCode = fail ? 1 : 0;
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
} finally {
  try { app.kill('SIGKILL'); } catch {}
  try { sb.close(); } catch {}
  await sleep(150);
  restore();
}
process.exit(exitCode);
