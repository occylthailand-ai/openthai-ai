// Deterministic drift-guard — the order_disputes Supabase migration MUST declare
// every column backend/disputes.js writes. No server, no DB.
//
// Same bug class as test-portal-leads-schema: disputes.js open() builds a record
// that includes `counter_response: null` (and respond() later sets it to an
// object), but migrations/006_order_disputes.sql created the table without a
// `counter_response` column. PostgREST validates EVERY key in a write payload
// against its schema cache — even a null value — and rejects an unknown column
// (PGRST204 / HTTP 400) rather than dropping it. So on a Supabase-configured
// instance every dispute insert AND every counter-response update failed the
// Supabase write and fell back to the ephemeral file store (/tmp on Vercel, lost
// on redeploy). Disputes are the escrow safety mechanism (money is held while one
// is open), so silently losing them is worse than ordinary data loss. The
// migration now adds `counter_response` (idempotent alter); this test pins the
// record's column usage to the migration so they can't drift again.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const sql = readFileSync(join(ROOT, 'migrations', '006_order_disputes.sql'), 'utf8');

// Columns the migration declares on order_disputes — create-table body + any
// `alter table public.order_disputes add column ...`.
const declared = new Set();
const body = sql.match(/create table[^(]*order_disputes\s*\(([\s\S]*?)\);/i);
if (body) {
  for (const raw of body[1].split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('--')) continue;
    const m = line.match(/^([a-z_][a-z0-9_]*)\s+/i);
    if (m && !/^(primary|constraint|unique|foreign|check)$/i.test(m[1])) declared.add(m[1].toLowerCase());
  }
}
for (const m of sql.matchAll(/alter table\s+\S*order_disputes\s+add column\s+(?:if not exists\s+)?([a-z_][a-z0-9_]*)/gi)) {
  declared.add(m[1].toLowerCase());
}

console.log('=== columns declared for order_disputes in 006_order_disputes.sql ===');
console.log('   ', [...declared].sort().join(', '));

// Every key disputes.js persists in the dispute record (open() + respond()).
const required = ['id', 'order_id', 'opened_by', 'opener_contact', 'reason', 'evidence', 'status', 'ai_suggestion', 'counter_response', 'resolution', 'history', 'created_at'];

console.log('\n=== every column the backend writes must be declared ===');
for (const col of required) ok(declared.has(col), `migration declares "${col}"`);

ok(/add column if not exists counter_response\b/i.test(sql), 'counter_response added as an idempotent alter (safe to re-run)');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
