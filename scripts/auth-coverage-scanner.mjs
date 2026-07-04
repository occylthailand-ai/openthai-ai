#!/usr/bin/env node
// Scans backend/server.js for DELETE routes and /admin/ routes that have no
// detectable access-control check, so the manual grep audits done repeatedly
// this session (see DECISIONS_LOG.md, e.g. "autonomous hourly scan" and
// "checked every app.delete(...) route") run automatically on every PR instead
// of relying on someone remembering to repeat them by hand.
//
// A route is a real gap only if NONE of the recognized auth signals appear in
// its handler block, AND it isn't explicitly allowlisted via a
// `// scanner-allow: <reason>` comment on the line directly above the route.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_FILE = path.join(__dirname, '..', 'backend', 'server.js');

const ROUTE_RE = /^app\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/;
const AUTH_SIGNALS = /checkAdminKey\(|requireAuth\b|req\.tenant\b|owner_device_id|ownerId\b|verifyToken\(|req\.user\b/;
const HELPER_DEFINE_RE = /^(?:const|let)\s+(\w+)\s*=\s*\(req,\s*res\)\s*=>\s*\{/;
const FUNCTION_DEFINE_RE = /^function\s+(\w+)\s*\(req,\s*res\)\s*\{/;
const HELPER_SCAN_WINDOW = 15;

function loadLines() {
  if (!fs.existsSync(SERVER_FILE)) {
    console.error(`[auth-coverage-scanner] server.js not found at ${SERVER_FILE}`);
    process.exit(1);
  }
  return fs.readFileSync(SERVER_FILE, 'utf8').split('\n');
}

function findAuthedHelperNames(lines) {
  const helperNames = new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const oneLinerMatch = line.match(HELPER_DEFINE_RE) || line.match(FUNCTION_DEFINE_RE);
    if (!oneLinerMatch) continue;
    const name = oneLinerMatch[1];
    const window = lines.slice(i, i + HELPER_SCAN_WINDOW).join('\n');
    if (AUTH_SIGNALS.test(window)) helperNames.add(name);
  }
  return helperNames;
}

function findRouteBlocks(lines) {
  const routeStarts = [];
  lines.forEach((line, i) => {
    if (ROUTE_RE.test(line)) routeStarts.push(i);
  });

  return routeStarts.map((startIdx, i) => {
    const endIdx = i + 1 < routeStarts.length ? routeStarts[i + 1] : lines.length;
    const [, method, routePath] = lines[startIdx].match(ROUTE_RE);
    const blockText = lines.slice(startIdx, endIdx).join('\n');
    const precedingComment = startIdx > 0 ? lines[startIdx - 1].trim() : '';
    return { method: method.toUpperCase(), routePath, line: startIdx + 1, blockText, precedingComment };
  });
}

function isAllowlisted(block) {
  const m = block.precedingComment.match(/scanner-allow:\s*(.+)/);
  return m ? m[1].trim() : null;
}

function main() {
  const lines = loadLines();
  const authedHelpers = findAuthedHelperNames(lines);
  const helperCallRe = authedHelpers.size
    ? new RegExp(`\\b(${[...authedHelpers].join('|')})\\(`)
    : null;

  const blocks = findRouteBlocks(lines);
  const sensitive = blocks.filter(
    (b) => b.method === 'DELETE' || b.routePath.includes('/admin/')
  );

  const gaps = [];
  const allowlisted = [];

  for (const block of sensitive) {
    const hasAuthSignal = AUTH_SIGNALS.test(block.blockText);
    const hasHelperCall = helperCallRe ? helperCallRe.test(block.blockText) : false;
    if (hasAuthSignal || hasHelperCall) continue;

    const reason = isAllowlisted(block);
    if (reason) {
      allowlisted.push({ ...block, reason });
    } else {
      gaps.push(block);
    }
  }

  console.log(`[auth-coverage-scanner] ${blocks.length} routes scanned, ${sensitive.length} DELETE/admin routes checked, ${authedHelpers.size} auth-wrapper helper(s) detected (${[...authedHelpers].join(', ') || 'none'})`);

  if (allowlisted.length) {
    console.log(`\n[auth-coverage-scanner] ${allowlisted.length} allowlisted route(s):`);
    for (const b of allowlisted) {
      console.log(`  - ${b.method} ${b.routePath} (server.js:${b.line}) — ${b.reason}`);
    }
  }

  if (gaps.length) {
    console.error(`\n[auth-coverage-scanner] ❌ ${gaps.length} DELETE/admin route(s) with no detectable auth check:`);
    for (const b of gaps) {
      console.error(`  - ${b.method} ${b.routePath} (server.js:${b.line})`);
    }
    console.error('\nEither add a real auth check (checkAdminKey / requireAuth / tenant or owner scoping),');
    console.error('or add "// scanner-allow: <reason>" on the line directly above the route if it is intentionally public.');
    process.exit(1);
  }

  console.log('\n[auth-coverage-scanner] ✅ no unauthenticated DELETE/admin routes found');
}

main();
