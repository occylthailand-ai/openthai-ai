import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';

// Regression + math test for the content "learning" / feedback loop, which had NO test at all:
//   POST /api/skills/learning/rate      — a real user rates a generated piece 1–5
//   GET  /api/skills/learning/patterns  — the aggregated per-(content_type|platform) averages
//                                         that the /enhance route feeds back into the prompt
// The one thing that MUST hold: a non-numeric rating ("abc") is rejected BEFORE it can reach the
// aggregation. The route coerces `Number(rating)` and checks `Number.isFinite` first, precisely
// because the earlier version validated `rating < 1 || rating > 5` on the raw string — "abc"
// slipped through (NaN comparisons are false), `Number("abc")` = NaN was summed into p.sum, and
// that pattern's avg_rating became NaN *permanently*, corrupting /patterns and the enhance context.
// This asserts the guard holds AND the running average / sort / recent-feed are correct.
//
// Self-contained: boots the real server with the generate limiter disabled (so we can post several
// ratings) and no Supabase/AI keys. learning-patterns.json is snapshotted + cleared before boot and
// restored after, so the run leaves no state behind.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const APP_PORT = 8863;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function j(method, path, body) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function waitHealth() { for (let i = 0; i < 25; i++) { try { if ((await j('GET', '/api/health')).status === 200) return true; } catch {} await sleep(400); } return false; }

// Hermetic file state — learning-patterns.json accumulates across boots.
const DATA = join(ROOT, 'data');
const LP = join(DATA, 'learning-patterns.json');
const had = existsSync(LP) ? readFileSync(LP, 'utf8') : null;
try { writeFileSync(LP, JSON.stringify({ ratings: [], patterns: {}, total: 0 })); } catch {}
const restoreData = () => { if (had === null) { try { rmSync(LP, { force: true }); } catch {} } else { try { writeFileSync(LP, had); } catch {} } };

let exitCode = 1;
const app = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(APP_PORT), DISABLE_RATE_LIMIT: '1', SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '' },
  stdio: 'ignore',
});

try {
  ok(await waitHealth(), 'server booted (rate limiter disabled)');

  console.log('\n=== rating aggregation (running average, per content_type|platform) ===');
  const r1 = await j('POST', '/api/skills/learning/rate', { content_type: 'caption', platform: 'tiktok', tone: 'สนุก', rating: 5, output_snippet: 'x' });
  ok(r1.status === 200 && r1.data?.pattern_avg === 5, `first rating 5 → pattern_avg 5 (got ${r1.data?.pattern_avg})`);
  const r2 = await j('POST', '/api/skills/learning/rate', { content_type: 'caption', platform: 'tiktok', tone: 'สนุก', rating: 3 });
  ok(r2.status === 200 && r2.data?.pattern_avg === 4, `second rating 3 → running avg 4.0 (got ${r2.data?.pattern_avg})`);
  ok(r2.data?.total_ratings === 2, `total_ratings accumulates (got ${r2.data?.total_ratings})`);

  console.log('\n=== numeric-string rating is coerced and accepted ===');
  const rs = await j('POST', '/api/skills/learning/rate', { content_type: 'caption', platform: 'tiktok', tone: 'ทางการ', rating: '4' });
  ok(rs.status === 200 && rs.data?.pattern_avg === 4, `rating "4" coerced → avg (5+3+4)/3 = 4 (got ${rs.data?.pattern_avg})`);

  console.log('\n=== the NaN guard: garbage / out-of-range ratings are rejected and never poison the average ===');
  const bad1 = await j('POST', '/api/skills/learning/rate', { content_type: 'caption', platform: 'tiktok', rating: 'abc' });
  ok(bad1.status === 400, `non-numeric rating "abc" → 400 (got ${bad1.status})`);
  const bad2 = await j('POST', '/api/skills/learning/rate', { content_type: 'caption', platform: 'tiktok', rating: 6 });
  ok(bad2.status === 400, `rating 6 (out of 1–5) → 400 (got ${bad2.status})`);
  const bad3 = await j('POST', '/api/skills/learning/rate', { content_type: 'caption', platform: 'tiktok', rating: 0 });
  ok(bad3.status === 400, `rating 0 (out of 1–5) → 400 (got ${bad3.status})`);
  const bad4 = await j('POST', '/api/skills/learning/rate', { platform: 'tiktok', rating: 4 });
  ok(bad4.status === 400, `missing content_type → 400 (got ${bad4.status})`);

  console.log('\n=== patterns summary reflects only the valid ratings (avg is a finite number, not NaN) ===');
  // add a second, lower-rated pattern so we can assert the sort order too
  await j('POST', '/api/skills/learning/rate', { content_type: 'blog', platform: 'facebook', tone: 'ทางการ', rating: 2 });
  const pats = await j('GET', '/api/skills/learning/patterns');
  ok(pats.status === 200 && Array.isArray(pats.data?.patterns), 'patterns endpoint returns a list');
  const caption = (pats.data.patterns || []).find((p) => p.content_type === 'caption' && p.platform === 'tiktok');
  ok(caption && caption.count === 3, `caption|tiktok counted exactly the 3 valid ratings, not the 4 rejected ones (got ${caption?.count})`);
  ok(caption && caption.avg_rating === 4 && Number.isFinite(caption.avg_rating), `avg_rating is a finite 4 — the garbage rating did NOT poison it to NaN (got ${caption?.avg_rating})`);
  ok(caption && caption.top_tone === 'สนุก', `top_tone is the most frequent valid tone (got ${caption?.top_tone})`);
  // highest avg first
  ok(pats.data.patterns[0]?.content_type === 'caption', `patterns sorted by avg_rating desc — caption(4) before blog(2) (got ${pats.data.patterns[0]?.content_type})`);
  ok((pats.data.recent_feedback || []).length > 0 && pats.data.recent_feedback[0]?.rating >= 1, 'recent_feedback lists the newest valid ratings');
  ok(pats.data.total_ratings === 4, `total_ratings counts only accepted ratings (5,3,4,2 → 4) (got ${pats.data.total_ratings})`);
} finally { app.kill('SIGKILL'); await sleep(200); restoreData(); }

exitCode = fail ? 1 : 0;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(exitCode);
