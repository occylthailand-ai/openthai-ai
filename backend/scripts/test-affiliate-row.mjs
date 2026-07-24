// Deterministic unit test — affiliate-row.js (Supabase row mapping + consent
// fallback). No server, no DB.
import { affToRow, rowWithoutConsent, isMissingConsentColumnError } from '../affiliate-row.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

console.log('=== affToRow persists consent as a real boolean ===');
const withConsent = affToRow({ ref_code: 'AFF1', name: 'A', email: 'a@x.com', consent: true, total_earned: 100, paid_out: 40 });
ok(withConsent.consent === true, 'consent:true → row.consent === true');
ok(withConsent.pending_payout === 60, 'pending_payout = total_earned - paid_out (100-40)');
ok(affToRow({ consent: false }).consent === false, 'consent:false → row.consent === false');
ok(affToRow({}).consent === false, 'missing consent → row.consent === false (never null/undefined)');
ok(affToRow({ consent: 'yes' }).consent === false, 'non-true consent is not accepted as consent');

console.log('\n=== rowWithoutConsent strips only consent ===');
const stripped = rowWithoutConsent(withConsent);
ok(!('consent' in stripped), 'consent key removed');
ok(stripped.ref_code === 'AFF1' && stripped.email === 'a@x.com', 'every other column preserved');

console.log('\n=== isMissingConsentColumnError is narrow (only the missing-consent-column case) ===');
ok(isMissingConsentColumnError("Could not find the 'consent' column of 'affiliates' in the schema cache"),
  'matches PostgREST PGRST204 for the consent column');
ok(isMissingConsentColumnError('column affiliates.consent does not exist'), 'matches a "does not exist" phrasing');
ok(!isMissingConsentColumnError('duplicate key value violates unique constraint'), 'does NOT match an unrelated unique-violation error');
ok(!isMissingConsentColumnError('Could not find the "email" column'), 'does NOT match a different missing column');
ok(!isMissingConsentColumnError(''), 'empty message → false');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
