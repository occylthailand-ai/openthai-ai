// Localized heading for the "Benefits" section (the ✓ list of perks) shown on the six
// consumer-facing /portals/* pages: producer, consumer, creator, affiliate, middleman, foundation.
// Each page localizes the benefit ITEMS (t.benefits) but hardcoded the Thai heading above them
// ("สิทธิประโยชน์"), so an English/Chinese visitor saw localized bullet items under a Thai heading.
// Centralizing it (same pattern as backLabel.js / consentLabel.jsx) makes the heading follow the
// page's language toggle. Falls back to Thai for an unknown language so the heading is never blank.
//
// The two government/international portals use DISTINCT service headings ("Government Services",
// "Services", "Partnership Areas") that are page-specific, not this shared "Benefits" label — those
// are localized in their own pages, not here.
const BENEFITS = { th: 'สิทธิประโยชน์', en: 'Benefits', zh: '权益' };

export function benefitsTitle(lang) {
  return BENEFITS[lang] || BENEFITS.th;
}

// Languages this helper is guaranteed to cover — exported for the drift-guard test.
export const SECTION_LANGS = ['th', 'en', 'zh'];
