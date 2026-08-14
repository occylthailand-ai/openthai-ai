import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { FAQ_ITEMS } from '../data/faqContent.js';

// Drift guard: every in-app path an FAQ ANSWER tells a user to visit (e.g. "สมัครที่หน้าผู้บริโภค
// (/portals/consumer)", "ซื้อสินค้าได้ที่ตลาด (/catalog)", "ติดตามคำสั่งซื้อได้ที่ /track") must be a
// route that actually exists in App.jsx. The FAQ is public, indexable help content in 3 languages — if a
// route is renamed, the FAQ keeps pointing users (and crawlers, via the prerendered FAQPage schema) at a
// dead /path with nothing to catch it: spaNavTargets.test.js only checks navigate()/<Link> targets, NOT
// route paths embedded as plain text inside FAQ answer strings, so those paths are otherwise unguarded.
// Same route-table parsing + resolve logic as spaNavTargets — kept in sync deliberately.

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..'); // frontend/src
const app = readFileSync(join(SRC, 'App.jsx'), 'utf8');

const routes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
const staticRoutes = new Set(routes.filter((r) => !r.includes(':') && r !== '*' && !r.endsWith('/*')));
const dynRoots = routes.filter((r) => r.includes('/:')).map((r) => r.split('/:')[0]);
const wildPrefixes = routes.filter((r) => r.endsWith('/*')).map((r) => r.slice(0, -2));

function resolves(t) {
  if (staticRoutes.has(t)) return true;
  if (dynRoots.includes(t)) return true;
  const parent = t.split('/').slice(0, -1).join('/') || '/';
  if (dynRoots.includes(parent)) return true;
  if (wildPrefixes.some((w) => t === w || t.startsWith(w + '/'))) return true;
  return false;
}

// Pull in-app paths ("/x" or "/x/y") out of the Q&A text. The lookbehind excludes matches that sit inside
// a URL or email (preceded by a word char, ":", "/", or ".") so an absolute https link or user@host can't
// be mistaken for an internal route path.
function pathsIn(text) {
  const out = new Set();
  for (const m of text.matchAll(/(?<![\w:/.])\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*/g)) out.add(m[0]);
  return out;
}

// rawPath -> Set("lang: question")
const targets = new Map();
for (const lang of Object.keys(FAQ_ITEMS)) {
  for (const [q, a] of FAQ_ITEMS[lang]) {
    for (const p of pathsIn(`${q} ${a}`)) {
      if (!targets.has(p)) targets.set(p, new Set());
      targets.get(p).add(`${lang}: ${q}`);
    }
  }
}

describe('every in-app path mentioned in FAQ answers points at a real route', () => {
  it('parsed the route table and found some FAQ paths (sanity)', () => {
    expect(staticRoutes.size).toBeGreaterThan(10);
    expect(targets.size).toBeGreaterThan(3);
  });

  for (const [path, where] of [...targets.entries()].sort()) {
    it(`"${path}" resolves to a route`, () => {
      expect(
        resolves(path),
        `${path} has no matching <Route> in App.jsx — referenced in FAQ [${[...where].join(' | ')}]; the FAQ sends users to a dead page`,
      ).toBe(true);
    });
  }
});
