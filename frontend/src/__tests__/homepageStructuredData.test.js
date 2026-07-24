import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Guard for the hand-maintained JSON-LD @graph in frontend/index.html — the brand
// entity block (Organization + WebSite + SoftwareApplication) that Google uses for
// the logo in results / the knowledge panel / the app offers. prerender-meta.mjs
// copies this exact block verbatim onto EVERY prerendered route page, so a single
// hand-edit that breaks the JSON, drops an entity, or dangles a publisher @id would
// silently kill rich results across the WHOLE site (the browser drops an invalid
// ld+json block without any visible error). Nothing tested this: pricingFaqSchema
// covers only the PricingPage FAQ, routeMeta covers only the per-route rewrite. This
// parses the real index.html block and asserts it stays valid + referentially sound,
// and that every image it points at actually exists on disk (a 404 logo = no logo in
// search results). Same source-structural approach as seoInvariants / routeMeta.
const here = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(here, '..', '..');
const html = readFileSync(join(FRONTEND, 'index.html'), 'utf8');

function baseGraph() {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(m, 'index.html has a JSON-LD <script> block').toBeTruthy();
  return JSON.parse(m[1]); // throws (fails the test) if the hand-edited JSON is malformed
}

// Map an absolute site URL (or root-relative path) to a file under public/.
function publicPath(url) {
  const p = String(url).replace(/^https?:\/\/[^/]+/, '');
  return join(FRONTEND, 'public', p.replace(/^\//, ''));
}

describe('homepage JSON-LD @graph (brand entity, copied to every prerendered page)', () => {
  it('is valid JSON and uses @graph', () => {
    const data = baseGraph();
    expect(data['@context']).toMatch(/schema\.org/);
    expect(Array.isArray(data['@graph'])).toBe(true);
  });

  it('contains the Organization, WebSite and SoftwareApplication entities', () => {
    const types = baseGraph()['@graph'].map((n) => n['@type']);
    for (const t of ['Organization', 'WebSite', 'SoftwareApplication']) {
      expect(types, `@graph has a ${t}`).toContain(t);
    }
  });

  it('every publisher @id resolves to the Organization @id (no dangling reference)', () => {
    const graph = baseGraph()['@graph'];
    const org = graph.find((n) => n['@type'] === 'Organization');
    expect(org['@id'], 'Organization has an @id').toBeTruthy();
    const ids = new Set(graph.map((n) => n['@id']).filter(Boolean));
    for (const node of graph) {
      if (node.publisher?.['@id']) {
        expect(ids.has(node.publisher['@id']), `${node['@type']}.publisher points at a real @id`).toBe(true);
        expect(node.publisher['@id']).toBe(org['@id']);
      }
    }
  });

  it('the Organization carries the fields Google needs (name, url, logo)', () => {
    const org = baseGraph()['@graph'].find((n) => n['@type'] === 'Organization');
    expect(org.name).toBeTruthy();
    expect(org.url).toMatch(/^https?:\/\//);
    expect(org.logo).toMatch(/^https?:\/\/.+\.(png|jpg|jpeg|webp|svg)$/i);
  });

  it('the logo and og:image files it references actually exist in public/', () => {
    const org = baseGraph()['@graph'].find((n) => n['@type'] === 'Organization');
    expect(existsSync(publicPath(org.logo)), `logo exists: ${org.logo}`).toBe(true);
    const og = html.match(/<meta property="og:image" content="([^"]+)"/);
    expect(og, 'og:image meta present').toBeTruthy();
    expect(existsSync(publicPath(og[1])), `og:image exists: ${og[1]}`).toBe(true);
  });
});
