import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

// Drift guard: every in-app navigation (navigate('/x') / <Link to="/x"> / <NavLink to="/x">) must point
// at a route that actually exists in App.jsx. The app is a client-rendered SPA — an internal link to a
// path with no <Route> silently dumps the user on NotFoundPage (a dead CTA). Routes and nav targets live
// in different files across dozens of pages, so a typo or a renamed route is easy to miss. This reads
// App.jsx for the real route table and every page/component for its nav targets, and fails CI if any
// target resolves to nothing. Same source-parsing discipline as faqContent / statusLabelCoverage.

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..'); // frontend/src
const app = readFileSync(join(SRC, 'App.jsx'), 'utf8');

// The real route table from <Route path="…">.
const routes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
const staticRoutes = new Set(routes.filter((r) => !r.includes(':') && r !== '*' && !r.endsWith('/*')));
const dynRoots = routes.filter((r) => r.includes('/:')).map((r) => r.split('/:')[0]);   // '/x' from '/x/:id'
const wildPrefixes = routes.filter((r) => r.endsWith('/*')).map((r) => r.slice(0, -2));  // '/skills' from '/skills/*'

function walk(dir) {
  let out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== '__tests__') out = out.concat(walk(p)); }
    else if (/\.jsx?$/.test(f)) out.push(p);
  }
  return out;
}

// Reduce a raw nav target to its route path: drop the first `${…}` interpolation, query and hash, and a
// trailing slash. e.g. `/pay?amount=${a}` → `/pay`, `/affiliate-programs${q}` → `/affiliate-programs`.
function toPath(raw) {
  let t = raw.split('${')[0].split('?')[0].split('#')[0];
  if (t.length > 1 && t.endsWith('/')) t = t.slice(0, -1);
  return t;
}
function resolves(t) {
  if (staticRoutes.has(t)) return true;
  if (dynRoots.includes(t)) return true;                                   // navigating to the bare dyn root
  const parent = t.split('/').slice(0, -1).join('/') || '/';
  if (dynRoots.includes(parent)) return true;                             // '/track/<id>' → dyn root '/track'
  if (wildPrefixes.some((w) => t === w || t.startsWith(w + '/'))) return true;
  return false;
}

// Collect internal nav targets (leading-'/' only; external http(s) links are out of scope) across all pages.
const targets = new Map(); // rawTarget -> Set(files)
for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8');
  const re = /(?:navigate\(|<(?:Link|NavLink)[^>]*\bto=)\s*[`"']([^`"']+)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1].startsWith('/')) {
      if (!targets.has(m[1])) targets.set(m[1], new Set());
      targets.get(m[1]).add(relative(SRC, file));
    }
  }
}

describe('every in-app navigation target points at a real route', () => {
  it('parsed the route table and some nav targets (sanity)', () => {
    expect(staticRoutes.size).toBeGreaterThan(10);
    expect(targets.size).toBeGreaterThan(10);
  });

  for (const [raw, files] of [...targets.entries()].sort()) {
    it(`"${raw}" resolves to a route`, () => {
      expect(
        resolves(toPath(raw)),
        `${raw} (→ ${toPath(raw)}) has no matching <Route> in App.jsx — used in ${[...files].join(', ')}; a click lands on NotFoundPage`,
      ).toBe(true);
    });
  }
});
