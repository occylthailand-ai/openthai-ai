// Regression test for the webhook auto-disable counter (webhook-system.js). The
// dispatch loop auto-disables a webhook after "20 consecutive failures", but failCount
// was only ever incremented on failure and never reset on success — so it actually
// counted CUMULATIVE lifetime failures, and a webhook that merely fails occasionally
// (a transient network blip now and then) would eventually cross 20 and get wrongly
// disabled despite mostly working. Fix: reset failCount to 0 on a successful delivery.
//
// Retry delays are set to 0 via WEBHOOK_RETRY_DELAYS *before* importing the module
// (they're read once at load), so each dispatch resolves instantly. dispatch() now
// returns a promise of its deliveries so the test can await them deterministically.
process.env.WEBHOOK_RETRY_DELAYS = '[0,0,0]';
process.env.SUPABASE_URL = '';
const { mkdtempSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const { createWebhookSystem } = await import('../webhook-system.js');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

// controllable fetch stub: flip `nextOk` to decide the next delivery's outcome
let nextOk = true;
global.fetch = async () => ({ ok: nextOk, status: nextOk ? 200 : 500 });

const wh = createWebhookSystem(mkdtempSync(join(tmpdir(), 'wh-test-')));
const reg = wh.register({ url: 'https://example.com/hook', events: ['*'] });
const hookId = reg.id;
const hook = () => wh.list()[0];
const dispatchN = async (n, okFlag) => { nextOk = okFlag; for (let i = 0; i < n; i++) await wh.dispatch('test.event', { i }); };

console.log('\n=== a success resets the consecutive-failure counter ===');
await dispatchN(15, false);
ok(hook().failCount === 15 && hook().active === true, `15 failures → failCount 15, still active (got ${hook().failCount}/${hook().active})`);
await dispatchN(1, true);
ok(hook().failCount === 0, `then 1 success → failCount reset to 0 (got ${hook().failCount})`);
ok(hook().deliveryCount === 16, 'deliveryCount counts every attempt (16)');

console.log('\n=== occasional failures over a long life do NOT auto-disable (the bug) ===');
// 15 more failures: cumulative lifetime failures are now 30 (>20), but consecutive is 15
await dispatchN(15, false);
ok(hook().active === true, `active stays true — 30 lifetime failures but only 15 consecutive (got active=${hook().active}, failCount=${hook().failCount})`);

console.log('\n=== 21 CONSECUTIVE failures still auto-disables (the feature is intact) ===');
nextOk = true; await wh.dispatch('test.event', {}); // reset streak to 0
ok(hook().active === true && hook().failCount === 0, 'streak reset before the run');
await dispatchN(21, false);
ok(hook().active === false, `21 consecutive failures → auto-disabled (got active=${hook().active}, failCount=${hook().failCount})`);

console.log('\n=== dispatch returns a promise and is awaitable; no targets → resolves ===');
const r = wh.dispatch('nobody.listening', {});
ok(typeof r?.then === 'function', 'dispatch() returns a thenable');
ok(Array.isArray(await r), 'dispatch with no matching active hook resolves to an array (no throw)');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
