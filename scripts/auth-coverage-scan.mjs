#!/usr/bin/env node
// Governance script — scans every backend/*.js file for routes that look
// sensitive (path contains "admin", or the HTTP method is DELETE/PATCH/PUT)
// but don't have one of the centralized guards (requireAdmin / requireAuth /
// requireTenant) anywhere in their middleware chain.
//
// Covers both `app.<method>(...)` (server.js) and `router.<method>(...)`
// (extracted bounded-context modules like orders.js, inventory.js) so
// moving a route out of server.js into its own module doesn't silently
// drop it from this report.
//
// This is a heuristic, not a proof — it can't see auth performed deeper
// inside a helper function it doesn't recognize, or a genuinely different
// auth model (e.g. /api/agent/:id's device-id ownership check). Treat a
// clean report as "nothing obviously missing", not "definitely safe".
// Run: node scripts/auth-coverage-scan.mjs
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = join(__dirname, '..', 'backend');

const GUARDS = ['requireAdmin', 'requireAuth', 'requireTenant'];
const SENSITIVE_METHODS = new Set(['delete', 'patch', 'put']);

const files = readdirSync(BACKEND_DIR)
  .filter((f) => f.endsWith('.js'))
  .map((f) => join(BACKEND_DIR, f));

const routeStart = /(?:app|router)\.(get|post|put|patch|delete)\(\s*(['"])([^'"]+)\2/g;

function findMatchingClose(str, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const routes = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = 'backend/' + file.slice(BACKEND_DIR.length + 1);
  routeStart.lastIndex = 0;
  let m;
  while ((m = routeStart.exec(src))) {
    const method = m[1];
    const path = m[3];
    const openParenSearchFrom = m.index + m[0].indexOf('.') + 1; // right after "app." / "router."
    const callOpenParen = src.indexOf('(', openParenSearchFrom);
    const callCloseParen = findMatchingClose(src, callOpenParen);
    if (callCloseParen === -1) continue;
    const body = src.slice(callOpenParen, callCloseParen);
    const line = src.slice(0, m.index).split('\n').length;
    const hasGuard = GUARDS.some((g) => body.includes(g));
    routes.push({ file: rel, method, path, line, hasGuard });
  }
}

const looksSensitive = (r) =>
  r.path.includes('admin') || SENSITIVE_METHODS.has(r.method);

const flagged = routes.filter((r) => looksSensitive(r) && !r.hasGuard);

console.log(`Scanned ${routes.length} routes across ${files.length} files in backend/\n`);

if (flagged.length === 0) {
  console.log('✅ No sensitive-looking route (admin path, DELETE/PATCH/PUT) is missing requireAdmin/requireAuth/requireTenant.');
} else {
  console.log(`⚠️  ${flagged.length} sensitive-looking route(s) have no recognized guard:\n`);
  for (const r of flagged) {
    console.log(`  ${r.file}:${r.line}  ${r.method.toUpperCase()} ${r.path}`);
  }
  console.log('\nThis does not necessarily mean they are unprotected — check whether auth');
  console.log('happens inside the module the route delegates to. If genuinely open, decide');
  console.log('deliberately (see DECISIONS_LOG.md for prior examples of routes left open on purpose).');
}

process.exitCode = flagged.length > 0 ? 1 : 0;
