// Deterministic unit test — sb-column-fallback.js (missing-column detection +
// column stripping used by the dual-mode persist() retries). No server, no DB.
import { missingColumnFrom, stripColumn } from '../sb-column-fallback.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

console.log('=== missingColumnFrom extracts the offending column (only for real missing-column errors) ===');
ok(missingColumnFrom("Could not find the 'consent' column of 'producers' in the schema cache") === 'consent',
  'PGRST204 phrasing → "consent"');
ok(missingColumnFrom("Could not find the 'counter_response' column of 'order_disputes' in the schema cache") === 'counter_response',
  'PGRST204 for counter_response → "counter_response"');
ok(missingColumnFrom('column "unsubscribed" does not exist') === 'unsubscribed', 'raw Postgres "does not exist" → "unsubscribed"');
ok(missingColumnFrom('column portal_leads.consent does not exist') === 'consent', 'qualified column.does-not-exist → "consent"');
ok(missingColumnFrom('duplicate key value violates unique constraint "producers_pkey"') === null, 'unique-violation → null (no strip)');
ok(missingColumnFrom('Supabase HTTP 500') === null, 'generic 500 → null');
ok(missingColumnFrom('') === null && missingColumnFrom(null) === null, 'empty / null → null');

console.log('\n=== stripColumn removes the column from an array body or a single row ===');
const arr = [{ id: 1, consent: true, name: 'a' }];
const strippedArr = stripColumn(arr, 'consent');
ok(strippedArr && !('consent' in strippedArr[0]) && strippedArr[0].id === 1 && strippedArr[0].name === 'a',
  'array body: consent removed, other keys kept');
ok(stripColumn({ id: 2, consent: false }, 'consent')?.consent === undefined, 'single object: consent removed');
ok(stripColumn([{ id: 1 }], 'consent') === null, 'column not present in body → null (avoids a pointless retry)');
ok(stripColumn([{ id: 1, x: 1 }], null) === null, 'null column → null');
// original not mutated
const orig = [{ id: 1, consent: true }];
stripColumn(orig, 'consent');
ok(orig[0].consent === true, 'stripColumn does not mutate the original row');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
