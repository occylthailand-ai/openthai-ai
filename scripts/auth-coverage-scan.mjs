#!/usr/bin/env node
// Governance script — scans backend/server.js for routes that look sensitive
// (path contains "admin", or the HTTP method is DELETE/PATCH/PUT) but don't
// have one of the centralized guards (requireAdmin / requireAuth /
// requireTenant) anywhere in their middleware chain.
//
// This is a heuristic, not a proof — it can't see auth performed inside a
// module file (e.g. backend/orders.js) or auth added via a route-level
// wrapper it doesn't recognize. Treat a clean report as "nothing obviously
// missing", not "definitely safe". Run: node scripts/auth-coverage-scan.mjs
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_JS = join(__dirname, '..', 'backend', 'server.js');

const GUARDS = ['requireAdmin', 'requireAuth', 'requireTenant'];
const SENSITIVE_METHODS = new Set(['delete', 'patch', 'put']);

const src = readFileSync(SERVER_JS, 'utf8');

// Matches `app.<method>('<path>', <...middleware/handler...>` up to the
// matching closing `);` of the whole app.<method>(...) call. We don't fully
// parse JS — we just balance parens from the opening `(` to find where this
// particular route registration ends, which is good enough for this file's
// consistent style.
const routeStart = /app\.(get|post|put|patch|delete)\(\s*(['"])([^'"]+)\2/g;

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
let m;
while ((m = routeStart.exec(src))) {
  const method = m[1];
  const path = m[3];
  const callOpenParen = src.indexOf('(', m.index + `app.${method}`.length);
  const callCloseParen = findMatchingClose(src, callOpenParen);
  if (callCloseParen === -1) continue;
  const body = src.slice(callOpenParen, callCloseParen);
  const line = src.slice(0, m.index).split('\n').length;
  const hasGuard = GUARDS.some((g) => body.includes(g));
  routes.push({ method, path, line, hasGuard });
}

const looksSensitive = (r) =>
  r.path.includes('admin') || SENSITIVE_METHODS.has(r.method);

const flagged = routes.filter((r) => looksSensitive(r) && !r.hasGuard);

console.log(`Scanned ${routes.length} routes in backend/server.js\n`);

if (flagged.length === 0) {
  console.log('✅ No sensitive-looking route (admin path, DELETE/PATCH/PUT) is missing requireAdmin/requireAuth/requireTenant.');
} else {
  console.log(`⚠️  ${flagged.length} sensitive-looking route(s) have no recognized guard:\n`);
  for (const r of flagged) {
    console.log(`  backend/server.js:${r.line}  ${r.method.toUpperCase()} ${r.path}`);
  }
  console.log('\nThis does not necessarily mean they are unprotected — check whether auth');
  console.log('happens inside the module the route delegates to. If genuinely open, decide');
  console.log('deliberately (see DECISIONS_LOG.md for prior examples of routes left open on purpose).');
}

process.exitCode = flagged.length > 0 ? 1 : 0;
