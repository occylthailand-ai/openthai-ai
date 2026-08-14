// Guards that the PDPA consent path the app POSTs to Supabase stays in lockstep with the SQL that
// creates the tables. If they drift — a field added to the consent record with no matching column,
// or a renamed/dropped column — PostgREST rejects the upsert (400), the code silently falls back to
// the ephemeral /tmp file, and every consent proof is wiped on the next Vercel redeploy (the exact
// durability bug migrations 008/009 exist to fix). This test fails loudly BEFORE that ships.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { buildConsentRecord, CONSENT_COLUMNS } from '../pdpa-consent.js';

const here = dirname(fileURLToPath(import.meta.url));
const mig = (f) => readFileSync(join(here, '..', 'migrations', f), 'utf8');

// Pull the column names out of a `create table … ( … );` block (first identifier on each body line).
function migrationColumns(sql, table) {
  const m = sql.match(new RegExp(`create table[^(]*${table}[^(]*\\(([\\s\\S]*?)\\);`, 'i'));
  if (!m) return null;
  return m[1].split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^(primary|unique|foreign|constraint|check)\b/i.test(l))
    .map((l) => l.match(/^["']?([a-z_]+)["']?\s/i)?.[1])
    .filter(Boolean);
}

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

console.log('=== consent record shape == CONSENT_COLUMNS (the declared contract) ===');
const rec = buildConsentRecord({ email: '  A@B.COM ', ip: '1.2.3.4', purposes: 'marketing', version: '2.0', now: new Date('2026-07-31T00:00:00.000Z') });
ok(JSON.stringify(Object.keys(rec).sort()) === JSON.stringify([...CONSENT_COLUMNS].sort()),
   `buildConsentRecord keys == CONSENT_COLUMNS (${CONSENT_COLUMNS.join(',')})`);
ok(rec.email === 'a@b.com', 'email is lowercased + trimmed');
ok(Array.isArray(rec.purposes) && rec.purposes[0] === 'marketing', 'a scalar purpose is coerced to an array');
ok(rec.consented === true, 'consented is always true');
ok(rec.ts === '2026-07-31T00:00:00.000Z' && rec.id === String(Date.parse('2026-07-31T00:00:00.000Z')), 'ts/id derive from the injected clock');
ok(buildConsentRecord({ email: 'x'.repeat(300) + '@y.com' }).email.length === 254, 'email is capped at 254 chars');

console.log('\n=== migration 009 (pdpa_consents) defines every column the code writes ===');
const cols009 = migrationColumns(mig('009_pdpa_consents.sql'), 'pdpa_consents');
ok(Array.isArray(cols009) && cols009.length > 0, `parsed pdpa_consents columns: ${cols009?.join(', ')}`);
for (const col of CONSENT_COLUMNS) {
  ok(cols009?.includes(col), `column "${col}" exists in 009_pdpa_consents.sql`);
}
ok(migrationColumns(mig('009_pdpa_consents.sql'), 'pdpa_consents')?.includes('email'), 'pdpa_consents has the email key column');

console.log('\n=== migration 008 (broadcast_unsubscribes) has the email column the code hydrates/upserts ===');
const cols008 = migrationColumns(mig('008_broadcast_unsubscribes.sql'), 'broadcast_unsubscribes');
ok(cols008?.includes('email'), `broadcast_unsubscribes has an email column (${cols008?.join(', ')})`);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
