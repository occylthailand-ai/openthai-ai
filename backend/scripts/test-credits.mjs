import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createCredits } from '../credits.js';

// Money-critical guard for the credit ledger (credits.js). Bonus credits from
// spin/streak/claim let a FREE user generate PAST the daily quota, so a broken
// invariant here = free unlimited generations or negative balances. This runs
// against the file-store fallback in a throw-away temp dir (no Supabase, fully
// deterministic — spin's random prize never affects the asserted properties).
// รัน: node scripts/test-credits.mjs
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

// force file mode even if the CI env happens to carry Supabase vars
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_KEY;

const dir = mkdtempSync(join(tmpdir(), 'credits-test-'));
const C = createCredits(dir);
const bal = async (id) => (await C.pub(id)).balance;

try {
  console.log('\n=== addCredits: source-dedup (คนละ claim ห้ามซ้ำ — กันฟาร์มเครดิต) ===');
  const r1 = await C.addCredits('e:a@x.com', 3, 'welcome');
  ok(r1.added === 3 && r1.balance === 3 && r1.duplicate === false, 'first claim of a source → added 3, balance 3');
  const r2 = await C.addCredits('e:a@x.com', 3, 'welcome');
  ok(r2.added === 0 && r2.duplicate === true, 'second claim of SAME source → added 0, duplicate:true');
  ok(await bal('e:a@x.com') === 3, 'balance unchanged after duplicate claim (still 3, not 6)');
  const r3 = await C.addCredits('e:a@x.com', 3, 'welcome');
  ok(r3.added === 0 && r3.duplicate === true, 'a source can never be re-claimed (idempotent forever)');

  console.log('\n=== addCredits: clamps ===');
  ok((await C.addCredits('e:b@x.com', 999, 's1')).added === 50, 'single claim clamped to MAX_CLAIM (50), not 999');
  // pile on distinct sources to exceed MAX_BALANCE (200)
  for (let i = 0; i < 6; i++) await C.addCredits('e:c@x.com', 50, `src${i}`);
  ok(await bal('e:c@x.com') === 200, 'balance clamped to MAX_BALANCE (200) even after 6×50 = 300 claimed');

  console.log('\n=== addCredits: no source → not deduped, always applies ===');
  await C.addCredits('e:d@x.com', 5);
  await C.addCredits('e:d@x.com', 5);
  ok(await bal('e:d@x.com') === 10, 'sourceless adds stack (5+5=10) — dedup only applies when a source is given');

  console.log('\n=== hasCredit / consumeCredit: never goes negative ===');
  await C.addCredits('e:e@x.com', 2, 'seed');
  ok(await C.hasCredit('e:e@x.com') === true, 'hasCredit true when balance > 0');
  ok(await C.consumeCredit('e:e@x.com') === true && await bal('e:e@x.com') === 1, 'consume #1 → true, balance 1');
  ok(await C.consumeCredit('e:e@x.com') === true && await bal('e:e@x.com') === 0, 'consume #2 → true, balance 0');
  ok(await C.hasCredit('e:e@x.com') === false, 'hasCredit false at balance 0');
  ok(await C.consumeCredit('e:e@x.com') === false && await bal('e:e@x.com') === 0, 'consume at 0 → false, balance stays 0 (never negative)');

  console.log('\n=== checkin: idempotent per day ===');
  const ci1 = await C.checkin('e:f@x.com');
  ok(ci1.streakDays === 1 && ci1.awarded === 1 && ci1.alreadyToday === false, 'first checkin → streak 1, awarded 1');
  const ci2 = await C.checkin('e:f@x.com');
  ok(ci2.alreadyToday === true && ci2.awarded === 0, 'second checkin same day → alreadyToday, awarded 0 (no double-dip)');
  ok(await bal('e:f@x.com') === 1, 'balance reflects a single award only (1, not 2)');

  console.log('\n=== spin: once per identity ===');
  const s1 = await C.spin('e:g@x.com');
  ok(s1.already === false, 'first spin → not already');
  const balAfter = await bal('e:g@x.com');
  const s2 = await C.spin('e:g@x.com');
  ok(s2.already === true && s2.prize === s1.prize, 'second spin → already:true, same prize (locked in)');
  ok(await bal('e:g@x.com') === balAfter, 'second spin awards nothing further (balance unchanged)');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
