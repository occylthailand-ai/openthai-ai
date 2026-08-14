// Deterministic drift-guard — the portal_leads Supabase migration MUST declare
// every column backend/portal-leads.js writes to or filters on. No server, no DB.
//
// Why this exists: submit() writes a record that includes `consent: true`, and
// unsubscribe() PATCHes `unsubscribed: true`; sendConsumerDigest() filters on
// `!unsubscribed`. But 007_portal_leads.sql originally created the table with only
// id/type/lang/name/email/form_data/created_at. On a Supabase-configured instance,
// PostgREST rejects any write naming a column that isn't in the schema cache
// (PGRST204 / HTTP 400) — it does NOT silently drop the extra key. So every portal
// lead POST failed the Supabase write and fell back to the ephemeral file store
// (/tmp on Vercel, lost on redeploy), and every unsubscribe became a no-op while
// telling the user it worked (a PDPA problem: the consumer digest kept emailing
// people who opted out). The migration now adds `consent` and `unsubscribed`
// (idempotent alters). This test pins the code's column usage to the migration so
// the two can't drift again — same source-structural approach as
// frontend seoInvariants / portalCategories / portalConsent guards.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const sql = readFileSync(join(ROOT, 'migrations', '007_portal_leads.sql'), 'utf8');

// Columns the migration declares — from the create-table body AND any
// `alter table ... add column [if not exists] <name>` statements.
const declared = new Set();
const body = sql.match(/create table[^(]*\(([\s\S]*?)\);/i);
if (body) {
  for (const raw of body[1].split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('--')) continue;
    const m = line.match(/^([a-z_][a-z0-9_]*)\s+/i);
    if (m && !/^(primary|constraint|unique|foreign|check)$/i.test(m[1])) declared.add(m[1].toLowerCase());
  }
}
for (const m of sql.matchAll(/alter table\s+\S+\s+add column\s+(?:if not exists\s+)?([a-z_][a-z0-9_]*)/gi)) {
  declared.add(m[1].toLowerCase());
}

console.log('=== columns declared in 007_portal_leads.sql ===');
console.log('   ', [...declared].sort().join(', '));

// Columns backend/portal-leads.js actually depends on when talking to Supabase:
// the record persisted by submit() + the fields unsubscribe()/digest read/write.
const required = ['id', 'type', 'lang', 'name', 'email', 'form_data', 'created_at', 'consent', 'unsubscribed'];

console.log('\n=== every column the backend uses must be declared ===');
for (const col of required) ok(declared.has(col), `migration declares "${col}"`);

// Guard the two that were missing and caused the silent Supabase-write failure,
// so a regression is unambiguous in the output.
ok(/add column if not exists consent\b/i.test(sql), 'consent added as an idempotent alter (safe to re-run)');
ok(/add column if not exists unsubscribed\b/i.test(sql), 'unsubscribed added as an idempotent alter (safe to re-run)');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
