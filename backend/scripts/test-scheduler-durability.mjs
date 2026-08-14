import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';

// Regression test — SCHEDULED posts in /api/scheduler/* must actually get processed on Vercel.
// /api/scheduler/create stored the queue in scheduler.json only. On Vercel that file is under /tmp:
// wiped on every redeploy AND private to each lambda instance — so a post the create invocation stored
// is invisible to the daily Vercel Cron invocation (GET /api/scheduler/process) meant to broadcast it.
// Net effect: scheduled posts (incl. auto LINE OA broadcast when due) silently never processed in prod.
// The fix persists the queue to Supabase (migration 012): hydrate on boot, upsert on create/status-
// change, DELETE on delete, and /api/scheduler/process (+ /due) pull DUE posts straight from Supabase so
// they're seen across invocations and survive redeploys. Self-contained: starts a MOCK Supabase, spawns
// the real server pointed at it, and asserts the queue is durable end to end. (No LINE token here, so a
// due LINE post resolves to status 'ready' — that's fine; the point is it's FOUND and processed after a
// /tmp wipe, not the broadcast itself.)
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, 'data');
const SB_PORT = 8981, APP_PORT = 8982, ADMIN = 'ci-admin';
const past   = new Date(Date.now() - 3600_000).toISOString();  // due now
const future = new Date(Date.now() + 3600_000).toISOString();  // not due for an hour

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── mock Supabase: scheduler_posts (GET lists/filters, POST upserts by id, DELETE removes) ─────────
const SEEDED = 'sch_prior_deploy';
const store = new Map([[SEEDED, { id: SEEDED, platform: 'facebook', content: 'โปรโมชันเปิดร้าน', audience: 'general', language: 'thai', scheduled_at: past, status: 'pending', created_at: past, updated_at: past }]]);
const posted = [], deleted = [];
const sb = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.url.includes('/scheduler_posts')) {
      if (req.method === 'POST') {
        try { const b = JSON.parse(body); const r = Array.isArray(b) ? b[0] : b; if (r?.id) { store.set(String(r.id), r); posted.push(String(r.id)); } } catch {}
        res.writeHead(201); return res.end('[]');
      }
      if (req.method === 'DELETE') {
        const m = /id=eq\.([^&]+)/.exec(req.url); if (m) { const id = decodeURIComponent(m[1]); store.delete(id); deleted.push(id); }
        res.writeHead(200); return res.end('[]');
      }
      if (req.method === 'GET') {
        let rows = [...store.values()];
        if (/status=eq\.pending/.test(req.url)) {
          const m = /scheduled_at=lte\.([^&]+)/.exec(req.url);
          const cutoff = m ? new Date(decodeURIComponent(m[1])).getTime() : Date.now();
          rows = rows.filter((r) => r.status === 'pending' && new Date(r.scheduled_at).getTime() <= cutoff);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(rows));
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]');
  });
});

// ── hermetic file seeding: scheduler.json starts EMPTY so any due post can only have come from Supabase
const bak = join('/tmp', 'scheduler-dura-bak.json');
const FILE = join(DATA, 'scheduler.json');
function snapshot() { if (existsSync(FILE)) copyFileSync(FILE, bak); else writeFileSync(bak, '\0MISSING'); }
function restore() { if (existsSync(bak)) { if (readFileSync(bak, 'utf8') === '\0MISSING') { if (existsSync(FILE)) rmSync(FILE); } else copyFileSync(bak, FILE); rmSync(bak, { force: true }); } }

async function req(method, path, { body, adminKey } = {}) {
  const headers = { 'Content-Type': 'application/json' };
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
    env: { ...process.env, PORT: String(APP_PORT), ADMIN_KEY: ADMIN, JWT_SECRET: 'sched-test', DISABLE_RATE_LIMIT: '1', SUPABASE_URL: `http://127.0.0.1:${SB_PORT}`, SUPABASE_SERVICE_KEY: 'svc' },
    stdio: 'ignore',
  }));

let exitCode = 1;
try {
  let up = false;
  for (let i = 0; i < 25; i++) { try { if ((await req('GET', '/api/health')).status === 200) { up = true; break; } } catch {} await sleep(400); }
  ok(up, 'server booted (/api/health 200)');
  await sleep(600); // let the fire-and-forget boot hydrate (GET /scheduler_posts) complete

  console.log('\n=== 1. A post scheduled in a PRIOR deploy (Supabase-only) is processed after the /tmp wipe ===');
  const proc1 = await req('GET', '/api/scheduler/process');
  ok(proc1.status === 200 && proc1.data?.processed >= 1,
     `process handled the seeded prior-deploy post — processed=${proc1.data?.processed} (file was empty; found it in Supabase)`);
  await sleep(250); // fire-and-forget status upsert
  ok(store.get(SEEDED)?.status !== 'pending',
     `the seeded post's status was updated in Supabase (${store.get(SEEDED)?.status}) — won't be re-processed`);

  console.log('\n=== 2. A post created by ANOTHER instance (post-boot, memory-invisible) is still found ===');
  const CROSS = 'sch_cross_instance';
  store.set(CROSS, { id: CROSS, platform: 'facebook', content: 'ลดราคาสิ้นเดือน', audience: 'general', language: 'thai', scheduled_at: past, status: 'pending', created_at: past, updated_at: past });
  const proc2 = await req('GET', '/api/scheduler/process');
  ok(proc2.status === 200 && proc2.data?.processed >= 1,
     `process found the cross-instance post via Supabase — processed=${proc2.data?.processed}`);
  await sleep(250);
  ok(store.get(CROSS)?.status !== 'pending', `the cross-instance post was processed (${store.get(CROSS)?.status})`);

  console.log('\n=== 3. Creating a FUTURE post persists it to Supabase but does not process it yet ===');
  const c = await req('POST', '/api/scheduler/create', { body: { platform: 'facebook', content: 'อีเวนต์เดือนหน้า', scheduled_at: future } });
  ok(c.status === 200 && c.data?.post?.id, `future post created — id=${c.data?.post?.id}`);
  await sleep(300); // fire-and-forget upsert
  const futureId = c.data?.post?.id;
  ok(posted.includes(String(futureId)), 'the future post was upserted to Supabase (durable, survives the next redeploy)');
  const dueList = await req('GET', '/api/scheduler/due');
  ok(dueList.status === 200 && !dueList.data?.due?.some((p) => p.id === futureId), `/due does NOT list the not-yet-due post (count=${dueList.data?.count})`);
  const proc3 = await req('GET', '/api/scheduler/process');
  ok(proc3.status === 200 && proc3.data?.processed === 0, `process does NOT fire the not-yet-due post — processed=${proc3.data?.processed}`);

  console.log('\n=== 4. Deleting a post removes it from Supabase (won’t re-hydrate) ===');
  const del = await req('DELETE', `/api/scheduler/${futureId}`, { adminKey: ADMIN });
  ok(del.status === 200 && del.data?.ok, 'admin delete succeeded');
  await sleep(200);
  ok(deleted.includes(String(futureId)), 'the deleted post was DELETEd from Supabase');
  const delNoAuth = await req('DELETE', `/api/scheduler/${SEEDED}`);
  ok(delNoAuth.status === 401, 'delete without admin key → 401 (still admin-gated)');

  exitCode = fail ? 1 : 0;
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
} finally {
  try { app.kill('SIGKILL'); } catch {}
  try { sb.close(); } catch {}
  await sleep(150);
  restore();
}
process.exit(exitCode);
