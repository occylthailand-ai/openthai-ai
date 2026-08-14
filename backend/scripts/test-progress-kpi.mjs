// Deterministic unit test — progress-tracker updateManualKpi() must reject an
// unknown KPI key CLEANLY instead of throwing.
//
// The guard was `if (!snapshot.guilds[guildId].kpis[kpiKey] === undefined)`, an
// operator-precedence bug: `!x` is evaluated first (a boolean), and a boolean is
// never `=== undefined`, so the guard was dead code. An admin PATCH /api/progress/kpi
// with a valid guild but a typo'd kpi_key then hit `undefined.value = ...` → TypeError.
// Because the Express route handler is async with no try/catch, Express 4 does not
// forward the throw → the request hangs and an unhandledRejection is logged.
// Now the guard reads `if (snapshot.guilds[guildId].kpis[kpiKey] === undefined)` and
// returns { ok:false, error:'ไม่พบ KPI' } like the guild guard right above it.
//
// No server, no network — createProgressTracker with empty deps uses built-in
// defaults. Writes only into a throwaway temp dir.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgressTracker } from '../progress-tracker.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const dir = mkdtempSync(join(tmpdir(), 'progress-kpi-'));
try {
  const progress = await createProgressTracker(dir, {});
  // Materialise latest.json so updateManualKpi reads a real snapshot.
  await progress.buildSnapshot();
  // buildSnapshot() returns but does not persist; force a snapshot on disk via the
  // same path the tracker uses — updateManualKpi falls back to buildSnapshot() if no
  // snapshot is saved, which is fine, but persist one so both branches are exercised.
  await progress.updateManualKpi('backend', 'api_routes', 42); // valid → saves snapshot

  console.log('\n=== valid guild + valid kpi ===');
  const good = await progress.updateManualKpi('backend', 'api_routes', 99);
  ok(good.ok === true, 'valid guild + valid kpi → { ok: true }');

  console.log('\n=== valid guild + UNKNOWN kpi (used to throw TypeError) ===');
  let threw = false, res;
  try { res = await progress.updateManualKpi('backend', 'no_such_kpi', 1); }
  catch (e) { threw = true; console.log(`     threw: ${e.message}`); }
  ok(!threw, 'unknown kpi does not throw');
  ok(res && res.ok === false && res.error === 'ไม่พบ KPI', 'unknown kpi → { ok:false, error:"ไม่พบ KPI" }');

  console.log('\n=== unknown guild still rejected cleanly ===');
  const badGuild = await progress.updateManualKpi('no_such_guild', 'api_routes', 1);
  ok(badGuild.ok === false && badGuild.error === 'ไม่พบ guild', 'unknown guild → { ok:false, error:"ไม่พบ guild" }');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
