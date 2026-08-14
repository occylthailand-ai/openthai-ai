import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import jwt from 'jsonwebtoken';
import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';

// Regression test — a submitted video job must stay pollable on Vercel.
// POST /api/video/generate submits a job to a paid video provider (real per-clip spend) and stored the
// job record in video_jobs.json only. On Vercel that file is under /tmp: wiped on every redeploy AND
// private to each lambda instance, so GET /api/video/jobs/:id/status returned 404 "job not found" after
// a redeploy or on another instance — the user couldn't retrieve the video they paid for. The fix
// persists jobs to Supabase (migration 013): hydrate on boot, upsert on create/status-update, and a new
// findVideoJob() looks the job up in Supabase when it isn't in this lambda's memory. Self-contained:
// starts a MOCK Supabase, spawns the real server pointed at it, and asserts the job survives a /tmp wipe
// and cross-instance. Uses provider:'mock' jobs so the status poll returns without any external call.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, 'data');
const SB_PORT = 8991, APP_PORT = 8992, SECRET = 'video-test-secret';
const TOKEN = jwt.sign({ email: 'tester@example.com' }, SECRET);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const mkJob = (id) => ({ id, form: { product: 'ทุเรียนกวน', provider: 'mock' }, script: { hook: 'x' }, job: { provider: 'mock', job_id: `${id}_j`, status: 'done' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

// ── mock Supabase: video_jobs (GET lists/filters by id, POST upserts by id) ────────────────────────
const SEEDED = 'vj_prior_deploy';
const store = new Map([[SEEDED, mkJob(SEEDED)]]);
const posted = [];
const sb = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.url.includes('/video_jobs')) {
      if (req.method === 'POST') {
        try { const b = JSON.parse(body); const r = Array.isArray(b) ? b[0] : b; if (r?.id) { store.set(String(r.id), r); posted.push(String(r.id)); } } catch {}
        res.writeHead(201); return res.end('[]');
      }
      if (req.method === 'GET') {
        let rows = [...store.values()];
        const m = /id=eq\.([^&]+)/.exec(req.url);
        if (m) { const id = decodeURIComponent(m[1]); rows = rows.filter((r) => String(r.id) === id); }
        res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(rows));
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]');
  });
});

// ── hermetic file seeding: video_jobs.json starts EMPTY so any found job can only have come from Supabase
const bak = join('/tmp', 'video-dura-bak.json');
const FILE = join(DATA, 'video_jobs.json');
function snapshot() { if (existsSync(FILE)) copyFileSync(FILE, bak); else writeFileSync(bak, '\0MISSING'); }
function restore() { if (existsSync(bak)) { if (readFileSync(bak, 'utf8') === '\0MISSING') { if (existsSync(FILE)) rmSync(FILE); } else copyFileSync(bak, FILE); rmSync(bak, { force: true }); } }

async function req(method, path, { token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, { method, headers });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

snapshot();
writeFileSync(FILE, '[]'); // local file empty → SEEDED lives only in Supabase
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
  await sleep(600); // let the fire-and-forget boot hydrate (GET /video_jobs) complete

  console.log('\n=== 1. Auth + not-found guards ===');
  const noauth = await req('GET', `/api/video/jobs/${SEEDED}/status`);
  ok(noauth.status === 401, 'GET /status with no token → 401 (job data is auth-gated)');
  const missing = await req('GET', '/api/video/jobs/vj_does_not_exist/status', { token: TOKEN });
  ok(missing.status === 404, 'GET /status for a genuinely unknown id → 404');

  console.log('\n=== 2. A job from a PRIOR deploy (Supabase-only) is still pollable after the /tmp wipe ===');
  const seeded = await req('GET', `/api/video/jobs/${SEEDED}/status`, { token: TOKEN });
  ok(seeded.status === 200 && /Script-only/.test(seeded.data?.message || ''),
     `the seeded prior-deploy job was FOUND via Supabase (status ${seeded.status}) — not the old 404 after a wipe`);

  console.log('\n=== 3. Boot hydrate exposes the job in the list ===');
  const list = await req('GET', '/api/video/jobs', { token: TOKEN });
  ok(list.status === 200 && (list.data?.data || []).some((j) => j.id === SEEDED), 'GET /api/video/jobs lists the hydrated seeded job');

  console.log('\n=== 4. A job created by ANOTHER instance (post-boot, memory-invisible) is found via Supabase ===');
  const CROSS = 'vj_cross_instance';
  store.set(CROSS, mkJob(CROSS)); // inserted directly into Supabase AFTER this server booted → not in memory
  const cross = await req('GET', `/api/video/jobs/${CROSS}/status`, { token: TOKEN });
  ok(cross.status === 200, `the cross-instance job was found via Supabase (status ${cross.status})`);
  const list2 = await req('GET', '/api/video/jobs', { token: TOKEN });
  ok((list2.data?.data || []).some((j) => j.id === CROSS), 'findVideoJob merged the cross-instance job into memory (now in the list)');

  exitCode = fail ? 1 : 0;
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
} finally {
  try { app.kill('SIGKILL'); } catch {}
  try { sb.close(); } catch {}
  await sleep(150);
  restore();
}
process.exit(exitCode);
