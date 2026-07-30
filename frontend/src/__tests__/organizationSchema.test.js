import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// The Organization node in index.html's JSON-LD is what Google reads to build the site's
// entity in its Knowledge Graph (Knowledge Panel, contact surfacing). It previously carried
// only name/url/logo, so it advertised no way to reach us and no description. It now includes
// a description + a ContactPoint. This ContactPoint email is hand-maintained in index.html
// while the SAME support address is published on the public /contact page (ContactPage.jsx);
// if the two drift, Google surfaces a support email that the site itself no longer lists.
// These assertions pin the shape and keep the two copies in agreement.

const here = dirname(fileURLToPath(import.meta.url));
const readRoot = (rel) => readFileSync(join(here, '..', '..', rel), 'utf8');

function orgNode() {
  const html = readRoot('index.html');
  const m = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  expect(m, 'index.html has a ld+json block').toBeTruthy();
  const graph = JSON.parse(m[1])['@graph'];
  return graph.find((n) => n['@type'] === 'Organization');
}

// The support address the public Contact page publishes (the mailto: it renders).
function contactPageSupportEmail() {
  const src = readRoot('src/pages/ContactPage.jsx');
  const m = src.match(/label:\s*'Email',\s*value:\s*'([^']+)'/);
  expect(m, 'ContactPage lists a support Email channel').toBeTruthy();
  return m[1];
}

describe('Organization JSON-LD (index.html)', () => {
  it('exposes a description and a customer-support ContactPoint', () => {
    const org = orgNode();
    expect(org, 'Organization node present').toBeTruthy();
    expect(typeof org.description).toBe('string');
    expect(org.description.length).toBeGreaterThan(0);
    const cp = org.contactPoint;
    expect(cp, 'Organization has a contactPoint').toBeTruthy();
    expect(cp['@type']).toBe('ContactPoint');
    expect(cp.contactType).toBe('customer support');
    expect(cp.email).toMatch(/@/);
    // trilingual platform (i18n LANGS = th/en/zh) — advertised so Google knows support languages
    expect(cp.availableLanguage).toEqual(['Thai', 'English', 'Chinese']);
  });

  it('ContactPoint email matches the support address published on /contact (no drift)', () => {
    const org = orgNode();
    expect(org.email).toBe(org.contactPoint.email);
    expect(org.contactPoint.email).toBe(contactPageSupportEmail());
  });
});
