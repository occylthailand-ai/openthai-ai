import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DOMAIN, ROUTES } from '../../scripts/seo-routes.mjs';

// These invariants were previously maintained by hand every time a public page was
// added (runs 76, 84, 87). Breaking any of them is a real SEO defect, not a style
// nit, so they're pinned here:
//   • sitemap URL set (from ROUTES) must exactly equal robots.txt `Allow:` list —
//     otherwise a page is either crawlable-but-not-in-sitemap or vice versa.
//   • no advertised path may appear in robots.txt `Disallow:`.
//   • every advertised path must be a real PUBLIC route in App.jsx — advertising an
//     auth-gated route makes the crawler index a `/login` redirect (a soft-404).
const here = dirname(fileURLToPath(import.meta.url));
const robots = readFileSync(join(here, '..', '..', 'public', 'robots.txt'), 'utf8');
const appJsx = readFileSync(join(here, '..', 'App.jsx'), 'utf8');

const allowPaths = robots
  .split('\n')
  .map((l) => l.match(/^Allow:\s+(\/\S*)\s*$/))
  .filter(Boolean)
  .map((m) => m[1]);
const disallowPaths = robots
  .split('\n')
  .map((l) => l.match(/^Disallow:\s+(\/\S*)\s*$/))
  .filter(Boolean)
  .map((m) => m[1]);

const routePaths = ROUTES.map((r) => r.path);

describe('SEO route invariants', () => {
  it('sitemap URL set (ROUTES + "/") equals robots.txt Allow list', () => {
    // robots also Allows the bare "/" homepage, which ROUTES omits (it has no
    // per-route prerender — the base index.html already targets it).
    const expectedAllow = ['/', ...routePaths].sort();
    expect([...allowPaths].sort()).toEqual(expectedAllow);
  });

  it('no advertised route is also Disallowed', () => {
    const conflicts = routePaths.filter((p) => disallowPaths.includes(p));
    expect(conflicts).toEqual([]);
  });

  it('every advertised route is a public (non-auth-gated) route in App.jsx', () => {
    const problems = [];
    for (const p of routePaths) {
      // Match the route element line for this exact path.
      const re = new RegExp(`<Route\\s+path="${p.replace(/[/-]/g, '\\$&')}"\\s+element=\\{([^}]*)\\}`);
      const m = appJsx.match(re);
      if (!m) { problems.push(`${p} — no <Route> in App.jsx`); continue; }
      if (/Navigate to="\/login"/.test(m[1])) problems.push(`${p} — auth-gated (redirects to /login)`);
    }
    expect(problems).toEqual([]);
  });

  it('sensitive/private routes are Disallowed so crawlers never index a console or transactional page', () => {
    // The other invariants keep the *advertised* set correct, but nothing stopped a
    // sensitive PUBLIC route (no /login gate — gated server-side by ADMIN_KEY instead)
    // from being crawlable simply because it was never added to Disallow. /admin drifted
    // in exactly this way: a real <Route path="/admin"> with no robots entry, so Google
    // could index the admin console's entry point. Pin the ones that must stay excluded.
    const mustDisallow = ['/admin', '/dashboard', '/affiliate/dashboard', '/track', '/dispute', '/producers/manage', '/login'];
    const missing = mustDisallow.filter((p) => !disallowPaths.includes(p));
    expect(missing).toEqual([]);
    // and none of them may accidentally be advertised in the sitemap/Allow list
    const leaked = mustDisallow.filter((p) => allowPaths.includes(p) || routePaths.includes(p));
    expect(leaked).toEqual([]);
  });

  it('every route has a non-empty title and description for meta/OG tags', () => {
    const bad = ROUTES.filter((r) => !r.title?.trim() || !r.desc?.trim()).map((r) => r.path);
    expect(bad).toEqual([]);
  });

  it('DOMAIN is the canonical https origin used by robots Sitemap directive', () => {
    expect(DOMAIN).toMatch(/^https:\/\//);
    expect(robots).toContain(`Sitemap: ${DOMAIN}/sitemap.xml`);
  });
});
