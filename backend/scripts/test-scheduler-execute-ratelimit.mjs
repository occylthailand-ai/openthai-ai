import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync } from 'node:fs';

// Rate-limit regression guard (self-boot) for POST /api/scheduler/execute/:id.
//
// execute is the manual "publish now" the login-gated SchedulerPage calls. It is unauthenticated and
// mutates the shared scheduler store (flips a post to 'published'). It was the ONLY mutating scheduler
// route with no rate limiter, so a script could mass-execute post ids — including pre-empting a DUE LINE
// post so the cron (processScheduler) no longer broadcasts it. A limiter now caps that abuse. This test
// proves the limiter is wired: a burst of execute calls eventually gets a 429, while a normal single
// call still works. NB: DISABLE_RATE_LIMIT is intentionally NOT set here so the limiter is active.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8973;
const DATA_DIR = join('/tmp', `sched-rl-${Date.now()}`);
const base = `http://127.0.0.1:${PORT}`;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function j(method, path, body) {
  const res = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
}

// no DISABLE_RATE_LIMIT — the limiter under test must be active
const env = { ...process.env, PORT: String(PORT), ADMIN_KEY: 'ci-admin', OPENTHAI_DATA_DIR: DATA_DIR };
delete env.OMISE_SECRET_KEY; delete env.SUPABASE_URL; delete env.SUPABASE_SERVICE_KEY; delete env.DISABLE_RATE_LIMIT;
const app = spawn('node', ['server.js'], { cwd: ROOT, env, stdio: 'ignore' });

let exitCode = 1;
try {
  let up = false;
  for (let i = 0; i < 30; i++) { try { const r = await fetch(`${base}/api/health`); if (r.status === 200) { up = true; break; } } catch {} await sleep(400); }
  ok(up, 'server booted (/api/health 200)');

  console.log('\n=== create a scheduled post, then a single manual execute works ===');
  let r = await j('POST', '/api/scheduler/create', { platform: 'facebook', content: 'ทดสอบโพสต์', scheduled_at: new Date(Date.now() + 3600e3).toISOString() });
  ok(r.status === 200 && r.data?.ok && r.data?.post?.id, `create returned a post id (got ${r.status})`);
  const id = r.data?.post?.id;
  r = await j('POST', `/api/scheduler/execute/${id}`);
  ok(r.status === 200 && r.data?.ok && r.data?.post?.status === 'published', `single execute publishes the post (got ${r.status})`);

  console.log('\n=== a burst of execute calls is rate-limited (429 before it can mass-mutate) ===');
  let got429 = false, calls = 0;
  for (let i = 0; i < 40; i++) {
    calls++;
    const b = await j('POST', `/api/scheduler/execute/${id}`);
    if (b.status === 429) { got429 = true; break; }
  }
  ok(got429, `execute is throttled with 429 within a burst (stopped after ${calls} calls)`);
  // the limiter (max 30 / 15min) must trip well before an unbounded script could churn the whole store
  ok(calls <= 35, `429 arrives near the configured cap, not far beyond it (at call ${calls})`);

  exitCode = fail ? 1 : 0;
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
} finally {
  try { app.kill('SIGKILL'); } catch {}
  await sleep(150);
  try { rmSync(DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
}
process.exit(exitCode);
