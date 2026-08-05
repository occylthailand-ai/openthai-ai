// Guards the AI-skills product against a "phantom endpoint" regression.
//
// The AI-skills catalog (frontend/src/pages/AISkillsPage.jsx) advertises a grid of skill buttons, each
// with an `endpoint: '/api/skills/...'` the button POSTs/GETs. If a skill is added to that catalog (or an
// existing endpoint is renamed on the backend) WITHOUT a matching backend route, the button 404s the
// moment a user clicks it — a broken core-product feature that no unit test would otherwise catch. This
// is the exact class of bug the repo has already been bitten by (7 /portals/* pages POSTed to
// /api/leads/submit, which didn't exist — every form silently failed; see DECISIONS_LOG). This test pins
// the invariant: every endpoint the catalog advertises must be a real app.get/app.post route in
// server.js. It parses both files (no server boot) so it can't drift and runs in CI.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const backend = join(here, '..');
const repoRoot = join(backend, '..');
const catalogFile = join(repoRoot, 'frontend', 'src', 'pages', 'AISkillsPage.jsx');
const serverFile = join(backend, 'server.js');

// Endpoints the frontend catalog advertises (the `endpoint: '/api/skills/...'` field on each skill).
function advertisedEndpoints() {
  const src = readFileSync(catalogFile, 'utf8');
  const set = new Set();
  for (const m of src.matchAll(/endpoint:\s*'(\/api\/skills\/[a-z0-9/-]+)'/g)) set.add(m[1]);
  return [...set].sort();
}

// Skill routes actually registered as HTTP handlers in server.js (app.get / app.post only — app.use
// mounts and string literals in comments/arrays don't count as a reachable route here).
function registeredRoutes() {
  const src = readFileSync(serverFile, 'utf8');
  const set = new Set();
  for (const m of src.matchAll(/app\.(?:get|post)\('(\/api\/skills\/[a-z0-9/-]+)'/g)) set.add(m[1]);
  return set;
}

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const advertised = advertisedEndpoints();
const routes = registeredRoutes();

console.log('=== every skill the catalog advertises is backed by a real /api/skills route ===');
ok(advertised.length >= 20, `catalog advertises ${advertised.length} skill endpoints`);
ok(routes.size >= advertised.length, `server.js registers ${routes.size} /api/skills routes`);
for (const ep of advertised) {
  ok(routes.has(ep), `"${ep}" is a real app.get/app.post handler (not a 404 when the button is clicked)`);
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
