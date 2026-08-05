// Verifies the RECOMMENDED Supabase set-up actually creates every table the backend upserts to.
//
// Background: the migrations/ dir accumulated several overlapping schema families, and
// FULL-MIGRATION.sql — the file we tell the owner to run — turned out NOT to define the three
// newest tables the code writes (ai_usage_log, broadcast_unsubscribes, pdpa_consents). Running
// FULL-MIGRATION alone would silently leave those tables uncreated, so the code keeps falling back
// to the ephemeral /tmp files (AI-usage logging off; unsubscribe + consent proofs wiped on every
// redeploy — a PDPA problem). This test pins the CORRECT, COMPLETE set-up so the guidance can't drift:
//   run FULL-MIGRATION.sql + 003_ai_usage_log.sql + 008_broadcast_unsubscribes.sql + 009_pdpa_consents.sql
// It scans the code for the tables it POSTs to (auto-updating), so adding a new upsert target with no
// migration coverage fails CI here.
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const backend = join(here, '..');

// The migration files a fresh Supabase project should run, per DECISIONS_LOG 2026-07-31.
const RECOMMENDED_MIGRATIONS = ['FULL-MIGRATION.sql', '003_ai_usage_log.sql', '008_broadcast_unsubscribes.sql', '009_pdpa_consents.sql', '010_waitlist.sql', '011_autopost_queue.sql'];

// Tables the code inserts/upserts to — parsed from every `[_]sbReq('POST', '/<table>'` call site.
function codeUpsertTables() {
  const files = readdirSync(backend).filter((f) => f.endsWith('.js'));
  const tables = new Set();
  for (const f of files) {
    const src = readFileSync(join(backend, f), 'utf8');
    for (const m of src.matchAll(/sbReq\('POST',\s*'\/([a-z_]+)'/g)) tables.add(m[1]);
  }
  return [...tables].sort();
}

function tablesInMigration(file) {
  const sql = readFileSync(join(backend, 'migrations', file), 'utf8');
  return [...sql.matchAll(/create table\s+(?:if not exists\s+)?(?:public\.)?([a-z_]+)/gi)].map((m) => m[1].toLowerCase());
}

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const codeTables = codeUpsertTables();
const covered = new Set(RECOMMENDED_MIGRATIONS.flatMap(tablesInMigration));
const fullOnly = new Set(tablesInMigration('FULL-MIGRATION.sql'));

console.log('=== every table the code upserts to is created by the recommended migration set ===');
ok(codeTables.length >= 10, `parsed ${codeTables.length} code upsert tables: ${codeTables.join(', ')}`);
for (const t of codeTables) {
  ok(covered.has(t), `"${t}" is created by [${RECOMMENDED_MIGRATIONS.join(' + ')}]`);
}

console.log('\n=== FULL-MIGRATION.sql alone is NOT sufficient — the supplements are required (documents WHY) ===');
for (const [t, file] of [['ai_usage_log', '003_ai_usage_log.sql'], ['broadcast_unsubscribes', '008_broadcast_unsubscribes.sql'], ['pdpa_consents', '009_pdpa_consents.sql'], ['waitlist', '010_waitlist.sql'], ['autopost_queue', '011_autopost_queue.sql']]) {
  ok(!fullOnly.has(t) && tablesInMigration(file).includes(t),
     `"${t}" is missing from FULL-MIGRATION.sql and supplied by ${file}`);
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
