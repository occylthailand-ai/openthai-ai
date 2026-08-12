// Single source of truth for the product-category buckets used by the
// /portals/* consent funnel (consumer picks an interest, producer picks a
// listing category). These MUST stay identical to the backend whitelist in
// backend/producers.js (`CATEGORIES`), because the consumer digest in
// server.js (sendConsumerDigest) matches a consumer's chosen category against
// a producer's catalog category with a strict `p.category === category`. If the
// two lists drift, the match silently returns nothing and every consumer is
// counted as skipped_no_match — they get told "we'll email you matched
// products" and then never receive one. frontend/src/__tests__/portalCategories.test.js
// pins these two lists together so that drift fails CI instead of shipping.
export const PORTAL_CATEGORIES = ['OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'เฟอร์นิเจอร์', 'เกษตร', 'อาหารสัตว์เลี้ยง', 'สินค้าดิจิทัล', 'อื่นๆ'];

// Display labels for the category values above. The VALUE stored/submitted/matched stays the Thai
// string (it is the identifier the backend whitelist clamps to and sendConsumerDigest matches on —
// see the note above), but the producer-signup form (/join) and producer directory (/find-producers)
// showed that raw Thai value to every visitor, so an English/Chinese producer or shopper saw a
// Thai-only category picker and Thai category tags — a market-entry wall on the producer funnel.
// producerCategoryLabel(value, lang) returns the localized label for display while the value is
// unchanged. Every PORTAL_CATEGORIES entry MUST have a label in every language here — pinned by
// frontend/src/__tests__/portalCategories.test.js so a new category can't ship label-less and
// re-leak Thai. 'OTOP' is a proper noun kept as-is in all languages.
export const CATEGORY_LABELS = {
  'OTOP':            { th: 'OTOP',            en: 'OTOP',          zh: 'OTOP' },
  'อาหาร':           { th: 'อาหาร',           en: 'Food',          zh: '食品' },
  'ความงาม':          { th: 'ความงาม',          en: 'Beauty',        zh: '美容' },
  'สิ่งทอ':           { th: 'สิ่งทอ',           en: 'Textiles',      zh: '纺织品' },
  'เครื่องดื่ม':       { th: 'เครื่องดื่ม',       en: 'Beverages',     zh: '饮料' },
  'สมุนไพร':          { th: 'สมุนไพร',          en: 'Herbs',         zh: '草药' },
  'เครื่องประดับ':     { th: 'เครื่องประดับ',     en: 'Jewelry',       zh: '珠宝' },
  'เฟอร์นิเจอร์':      { th: 'เฟอร์นิเจอร์',      en: 'Furniture',     zh: '家具' },
  'เกษตร':           { th: 'เกษตร',           en: 'Agriculture',   zh: '农业' },
  'อาหารสัตว์เลี้ยง':  { th: 'อาหารสัตว์เลี้ยง',  en: 'Pet food',      zh: '宠物食品' },
  'สินค้าดิจิทัล':     { th: 'สินค้าดิจิทัล',     en: 'Digital goods', zh: '数字商品' },
  'อื่นๆ':            { th: 'อื่นๆ',            en: 'Other',         zh: '其他' },
};

// Languages every category label is guaranteed to cover — exported so the drift-guard test can
// assert completeness without re-parsing this object.
export const CATEGORY_LABEL_LANGS = ['th', 'en', 'zh'];

// Localized display label for a category value. Falls back to the raw value for an unknown category
// (degraded, but never blank) — in practice every real category is in CATEGORY_LABELS because the
// backend whitelist == PORTAL_CATEGORIES (guarded) and every PORTAL_CATEGORIES entry is labelled.
export function producerCategoryLabel(value, lang) {
  const m = CATEGORY_LABELS[value];
  if (m) return m[lang] || m.th || value;
  return value || '';
}
