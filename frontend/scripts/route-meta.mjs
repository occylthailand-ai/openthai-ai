// Pure, side-effect-free per-route HTML meta transform used by prerender-meta.mjs.
//
// Kept separate from prerender-meta.mjs (which reads dist/index.html at import time,
// so it can't be imported from a unit test before a build exists) for the same
// reason seo-routes.mjs is separate: a test can import THIS and exercise the exact
// transform the build uses.
//
// Why the throw-on-no-op matters: prerender-meta rewrites the homepage's <title>/OG/
// canonical tags into per-route ones with a set of string `.replace(regex, …)` calls.
// `String.replace` silently returns the input unchanged when the pattern doesn't
// match — so if the base template's tag format ever drifts (a Vite upgrade reorders
// attributes, drops the space before `/>`, etc.), every funnel page would quietly
// fall back to serving the HOMEPAGE's meta to LINE/Facebook crawlers again. That is
// the exact bug this whole prerender step exists to prevent, and it would ship green.
// This module makes each replacement assert it actually matched, turning that silent
// SEO regression into a loud build failure — matching the fail-loud discipline the
// PROJECT_STATUS generator and seoInvariants test already use elsewhere.

// The /faq Q&A pairs — the SAME list FaqPage.jsx renders — so the prerendered FAQPage JSON-LD
// stays identical to the visible content. Pure ESM data (no JSX), safe to import from a build script.
import { FAQ_ITEMS } from '../src/data/faqContent.js';

export function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Replace the single expected occurrence of `pattern` (string or RegExp), throwing a
// descriptive error if it isn't present — the caller's meta would otherwise silently
// keep the base template's value.
function replaceOrThrow(html, pattern, replacement, label, path) {
  const found = typeof pattern === 'string' ? html.includes(pattern) : pattern.test(html);
  if (!found) {
    throw new Error(
      `[route-meta] ${path}: expected ${label} not found in base HTML — the template ` +
      `format changed, so this route's ${label} would silently fall back to the ` +
      `homepage's. Fix the pattern in scripts/route-meta.mjs (and check frontend/index.html).`,
    );
  }
  return html.replace(pattern, replacement);
}

// Per-route BreadcrumbList JSON-LD. Child portals (/portals/producer …) sit under
// /portals; everything else is one level below home. `portalsTitle` is the display
// name for the /portals crumb (passed in so this module needn't import the full
// ROUTES list). JSON.stringify handles value escaping; "<" is additionally escaped
// so the serialized JSON can never break out of the <script> element.

// FAQPage JSON-LD for /faq. The visible page (FaqPage.jsx) emits the same schema client-side, but a
// non-JS crawler (Bing, the LINE preview bot, Googlebot's first HTML pass) never runs that — so the
// rich-result eligibility hung on Google's slower, unreliable render pass. Injecting the schema into
// the prerendered HTML makes it present in the first byte. Built from the SAME FAQ_ITEMS the page
// renders (Thai, the language /faq defaults to on first load) so the structured data matches the
// visible content — Google drops the FAQ rich result when they disagree. "<" is escaped so the
// serialized JSON can't break out of the <script>.
export function faqPageJsonLd(items) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (items || []).map(([q, a]) => ({
      '@type': 'Question', name: String(q),
      acceptedAnswer: { '@type': 'Answer', text: String(a) },
    })),
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function breadcrumbJsonLd(path, title, DOMAIN, portalsTitle = 'Portals') {
  const crumbs = [{ name: 'หน้าแรก', url: DOMAIN + '/' }];
  if (path.startsWith('/portals/')) {
    crumbs.push({ name: portalsTitle, url: DOMAIN + '/portals' });
  }
  crumbs.push({ name: title, url: DOMAIN + path });
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, item: c.url,
    })),
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// Transform the base index.html into a route's prerendered HTML: swap title/description/
// canonical/OG/Twitter to the route's own copy and append its BreadcrumbList. Throws if
// any target tag is missing from `baseHtml` (see module header).
export function applyRouteMeta(baseHtml, { path, title, desc }, DOMAIN, opts = {}) {
  const url = DOMAIN + path;
  const fullTitle = `${title} — Openthai.ai`;
  let html = baseHtml;
  html = replaceOrThrow(html, /<title>.*?<\/title>/, `<title>${escapeAttr(fullTitle)}</title>`, '<title>', path);
  html = replaceOrThrow(html, /<meta name="description" content=".*?" \/>/, `<meta name="description" content="${escapeAttr(desc)}" />`, 'description meta', path);
  html = replaceOrThrow(html, /<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${url}" />`, 'canonical link', path);
  html = replaceOrThrow(html, /<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${url}" />`, 'og:url meta', path);
  html = replaceOrThrow(html, /<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${escapeAttr(fullTitle)}" />`, 'og:title meta', path);
  html = replaceOrThrow(html, /<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${escapeAttr(desc)}" />`, 'og:description meta', path);
  html = replaceOrThrow(html, /<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${escapeAttr(fullTitle)}" />`, 'twitter:title meta', path);
  html = replaceOrThrow(html, /<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${escapeAttr(desc)}" />`, 'twitter:description meta', path);
  html = replaceOrThrow(html, '</head>', `  <script type="application/ld+json">${breadcrumbJsonLd(path, title, DOMAIN, opts.portalsTitle)}</script>\n  </head>`, '</head>', path);
  // /faq additionally carries a static FAQPage schema so non-JS crawlers get FAQ rich-result
  // eligibility without waiting on the client-side render (see faqPageJsonLd).
  if (path === '/faq') {
    html = replaceOrThrow(html, '</head>', `  <script type="application/ld+json">${faqPageJsonLd(FAQ_ITEMS.th)}</script>\n  </head>`, '</head> (faq schema)', path);
  }
  return html;
}
