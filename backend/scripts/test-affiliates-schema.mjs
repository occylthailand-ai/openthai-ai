// Deterministic drift-guard — the affiliates Supabase table MUST declare every
// column affiliate-row.js `affToRow()` writes, including `consent`. No server/DB.
//
// The affiliates table is declared in two migration files (the incremental
// 004_affiliate_tracking.sql and the all-in-one FULL-MIGRATION.sql); the backend
// upserts on ref_code via affToRow(). `consent` is added to both as an idempotent
// alter (PDPA — it was collected + enforced but never persisted in Supabase).
// This test reads the union of both files so the mapper and the schema can't drift.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { affToRow } from '../affiliate-row.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MIG = join(ROOT, 'migrations');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const declared = new Set();
function scan(file) {
  const sql = readFileSync(join(MIG, file), 'utf8');
  const body = sql.match(/create table[^;(]*affiliates\s*\(([\s\S]*?)\n\s*\);/i);
  if (body) {
    for (const raw of body[1].split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('--')) continue;
      const m = line.match(/^([a-z_][a-z0-9_]*)\s+/i);
      if (m && !/^(primary|constraint|unique|foreign|check)$/i.test(m[1])) declared.add(m[1].toLowerCase());
    }
  }
  for (const m of sql.matchAll(/alter table\s+\S*affiliates\s+add column\s+(?:if not exists\s+)?([a-z_][a-z0-9_]*)/gi)) {
    declared.add(m[1].toLowerCase());
  }
}
scan('004_affiliate_tracking.sql');
scan('FULL-MIGRATION.sql');

console.log('=== columns declared for affiliates (004 + FULL-MIGRATION union) ===');
console.log('   ', [...declared].sort().join(', '));

// Every column affToRow() emits must exist in the schema (else the whole insert 400s).
const required = Object.keys(affToRow({ ref_code: 'x', name: 'n', email: 'e' }));
console.log('\n=== every column affToRow() writes must be declared ===');
for (const col of required) ok(declared.has(col), `migration declares "${col}"`);

ok(/add column if not exists consent\b/i.test(readFileSync(join(MIG, '004_affiliate_tracking.sql'), 'utf8')),
  'consent added as an idempotent alter in 004 (safe to re-run)');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
