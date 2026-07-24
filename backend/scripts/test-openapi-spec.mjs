// Deterministic unit test (no server) — the hand-maintained OpenAPI spec served at
// /api/openapi.json (and rendered by /api-docs Swagger UI). Nothing guarded this before: a
// malformed hand-edit could ship a broken spec that breaks every SDK/agent that reads it. This
// asserts the spec stays structurally valid + serializable, and that the seasonal endpoints (the
// deterministic market-facing tools) are actually advertised.
import { openapiSpec as spec } from '../openapi.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

console.log('=== spec is structurally valid + serializable ===');
ok(typeof spec.openapi === 'string' && /^3\./.test(spec.openapi), `openapi version is 3.x (got ${spec.openapi})`);
ok(spec.info && typeof spec.info.title === 'string' && spec.info.title.length > 0, 'info.title present');
ok(spec.paths && typeof spec.paths === 'object', 'paths object present');
let serialized = false; try { JSON.parse(JSON.stringify(spec)); serialized = true; } catch {}
ok(serialized, 'the whole spec serializes to JSON without throwing (no circular / bad value)');

console.log('\n=== every path is well-formed ===');
const paths = Object.keys(spec.paths);
ok(paths.length > 0, `${paths.length} paths declared`);
ok(paths.every((p) => p.startsWith('/')), 'every path key is a rooted path');
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
let opCount = 0, badOp = null;
for (const p of paths) {
  for (const [m, op] of Object.entries(spec.paths[p])) {
    if (!METHODS.includes(m)) continue;
    opCount++;
    if (!op.responses || typeof op.responses !== 'object' || Object.keys(op.responses).length === 0) badOp = `${m.toUpperCase()} ${p} (no responses)`;
    else if (!op.summary) badOp = `${m.toUpperCase()} ${p} (no summary)`;
  }
}
ok(badOp === null, `all ${opCount} operations have a summary + at least one response${badOp ? ' — offender: ' + badOp : ''}`);

console.log('\n=== the seasonal endpoints are advertised ===');
for (const r of ['/api/seasonal/recommend', '/api/seasonal/angles', '/api/seasonal/zones']) {
  ok(spec.paths[r] && spec.paths[r].get, `${r} (GET) is in the spec`);
}
ok(spec.paths['/api/seasonal/recommend'].get.parameters?.some((p) => p.name === 'zone'), 'recommend documents the zone parameter');
ok(/deterministic/i.test(spec.paths['/api/seasonal/angles'].get.description || ''), 'angles description states it is deterministic (honest — no scraped/LLM claim)');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
