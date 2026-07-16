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
