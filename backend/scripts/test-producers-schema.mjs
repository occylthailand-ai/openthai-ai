// Deterministic drift-guard — the producers Supabase table MUST declare every
// column backend/producers.js writes. No server, no DB.
//
// Same bug class as test-portal-leads-schema / test-disputes-schema: register()
// builds a record that includes `consent: true` (PDPA — the producer consent
// funnel), but no migration declared a `consent` column on producers. PostgREST
// validates EVERY key in a write payload against its schema cache and rejects an
// unknown column (PGRST204 / HTTP 400) rather than dropping it — so on a
// Supabase-configured instance every producer registration failed the Supabase
// write and fell back to the ephemeral file store (/tmp on Vercel, lost on
// redeploy): producer signups silently lost in production. producers-schema.sql
// now adds `consent` (idempotent alter). Producer columns come from TWO migration
// files — the base table in producers-schema.sql plus `stock` added in
// 001-shipping-stock.sql — so this test reads the union, mirroring reality.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MIG = join(ROOT, 'migrations');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const declared = new Set();
function scan(file) {
  const sql = readFileSync(join(MIG, file), 'utf8');
  const body = sql.match(/create table[^(]*producers\s*\(([\s\S]*?)\);/i);
  if (body) {
    for (const raw of body[1].split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('--')) continue;
      const m = line.match(/^([a-z_][a-z0-9_]*)\s+/i);
      if (m && !/^(primary|constraint|unique|foreign|check)$/i.test(m[1])) declared.add(m[1].toLowerCase());
    }
  }
  // only alters that target the producers table (not orders in the same file)
  for (const m of sql.matchAll(/alter table\s+\S*producers\s+add column\s+(?:if not exists\s+)?([a-z_][a-z0-9_]*)/gi)) {
    declared.add(m[1].toLowerCase());
  }
}
scan('producers-schema.sql');
scan('001-shipping-stock.sql');

console.log('=== columns declared for producers (producers-schema.sql + 001-shipping-stock.sql) ===');
console.log('   ', [...declared].sort().join(', '));

// Every key producers.js register() persists.
const required = ['email', 'company', 'contact_name', 'phone', 'website', 'category', 'description', 'product_name', 'price', 'stock', 'status', 'consent', 'created_at'];

console.log('\n=== every column the backend writes must be declared ===');
for (const col of required) ok(declared.has(col), `migration declares "${col}"`);

ok(/add column if not exists consent\b/i.test(readFileSync(join(MIG, 'producers-schema.sql'), 'utf8')), 'consent added as an idempotent alter (safe to re-run)');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
