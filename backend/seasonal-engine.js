// Openthai.ai — Seasonal demand engine (24 solar terms 节气 × climate zone → product categories)
//
// WHY (owner's vision, 2026-07-24): push the RIGHT product to the RIGHT region for people who
// actually need that category right now — anchored to the Chinese 24 solar terms (节气) and the
// LOCAL season of each climate zone, so all five groups (ผู้ผลิต / คนกลาง / affiliate / partner-agent /
// ผู้บริโภค) get a concrete "what to push, where, this period" signal.
//
// DESIGN — deliberately NOT dependent on any LLM and NOT scraping anything:
//   • The 24 solar terms are astronomically defined and land on well-known Gregorian dates (±1 day).
//     We use the standard approximate start dates — fully deterministic, works offline, never wrong
//     by more than a day.
//   • The SAME solar term maps to a DIFFERENT local season per climate zone. That's the core insight:
//       - north_temperate (จีนเหนือ/ญี่ปุ่น/เกาหลี/ยุโรป/อเมริกาเหนือ): the term's own season.
//       - south_temperate (ออสเตรเลีย/นิวซีแลนด์/ชิลี…): seasons INVERTED (北ร้อน = 南หนาว).
//       - tropical (ไทย/อาเซียน/เส้นศูนย์สูตร): no 4 seasons — mapped to hot-dry / rainy / cool-dry
//         by month, while the solar term is still returned as the China-facing export/marketing hook.
//   • Category lists are seasonal-demand knowledge (common, verifiable patterns), framed as guidance —
//     not fabricated statistics. A later layer can refine them with a real weather API (owner decision).

// ── 24 solar terms, ordered by Gregorian (month, day) start, beginning with 小寒 (~Jan 6) ─────────
// season = the term's own (northern-hemisphere) meteorological season.
const TERMS = [
  { cn: '小寒', pinyin: 'Xiaohan',  en: 'Minor Cold',        th: 'เสี่ยวหาน (หนาวน้อย)',   m: 1,  d: 6,  season: 'winter' },
  { cn: '大寒', pinyin: 'Dahan',    en: 'Major Cold',        th: 'ต้าหาน (หนาวใหญ่)',      m: 1,  d: 20, season: 'winter' },
  { cn: '立春', pinyin: 'Lichun',   en: 'Start of Spring',   th: 'ลี่ชุน (เข้าฤดูใบไม้ผลิ)', m: 2,  d: 4,  season: 'spring' },
  { cn: '雨水', pinyin: 'Yushui',   en: 'Rain Water',        th: 'อวี่สุ่ย (น้ำฝน)',        m: 2,  d: 19, season: 'spring' },
  { cn: '惊蛰', pinyin: 'Jingzhe',  en: 'Awakening of Insects', th: 'จิงเจ๋อ (แมลงตื่น)',   m: 3,  d: 6,  season: 'spring' },
  { cn: '春分', pinyin: 'Chunfen',  en: 'Spring Equinox',    th: 'ชุนเฟิน (ศารทวิษุวัตใบไม้ผลิ)', m: 3, d: 21, season: 'spring' },
  { cn: '清明', pinyin: 'Qingming', en: 'Pure Brightness',   th: 'ชิงหมิง (เช็งเม้ง)',       m: 4,  d: 5,  season: 'spring' },
  { cn: '谷雨', pinyin: 'Guyu',     en: 'Grain Rain',        th: 'กู่อวี่ (ฝนบำรุงข้าว)',   m: 4,  d: 20, season: 'spring' },
  { cn: '立夏', pinyin: 'Lixia',    en: 'Start of Summer',   th: 'ลี่เซี่ย (เข้าฤดูร้อน)',   m: 5,  d: 6,  season: 'summer' },
  { cn: '小满', pinyin: 'Xiaoman',  en: 'Grain Buds',        th: 'เสี่ยวหมั่น (รวงข้าวเริ่มเต่ง)', m: 5, d: 21, season: 'summer' },
  { cn: '芒种', pinyin: 'Mangzhong',en: 'Grain in Ear',      th: 'หมางจ้ง (ข้าวออกรวง)',    m: 6,  d: 6,  season: 'summer' },
  { cn: '夏至', pinyin: 'Xiazhi',   en: 'Summer Solstice',   th: 'เซี่ยจื้อ (ครีษมายัน)',    m: 6,  d: 21, season: 'summer' },
  { cn: '小暑', pinyin: 'Xiaoshu',  en: 'Minor Heat',        th: 'เสี่ยวสู่ (ร้อนน้อย)',     m: 7,  d: 7,  season: 'summer' },
  { cn: '大暑', pinyin: 'Dashu',    en: 'Major Heat',        th: 'ต้าสู่ (ร้อนใหญ่)',        m: 7,  d: 23, season: 'summer' },
  { cn: '立秋', pinyin: 'Liqiu',    en: 'Start of Autumn',   th: 'ลี่ชิว (เข้าฤดูใบไม้ร่วง)', m: 8,  d: 8,  season: 'autumn' },
  { cn: '处暑', pinyin: 'Chushu',   en: 'End of Heat',       th: 'ชู่สู่ (สิ้นความร้อน)',    m: 8,  d: 23, season: 'autumn' },
  { cn: '白露', pinyin: 'Bailu',    en: 'White Dew',         th: 'ไป๋ลู่ (น้ำค้างขาว)',      m: 9,  d: 8,  season: 'autumn' },
  { cn: '秋分', pinyin: 'Qiufen',   en: 'Autumn Equinox',    th: 'ชิวเฟิน (ศารทวิษุวัตใบไม้ร่วง)', m: 9, d: 23, season: 'autumn' },
  { cn: '寒露', pinyin: 'Hanlu',    en: 'Cold Dew',          th: 'หานลู่ (น้ำค้างเย็น)',     m: 10, d: 8,  season: 'autumn' },
  { cn: '霜降', pinyin: 'Shuangjiang', en: "Frost's Descent",th: 'ซวงเจี้ยง (น้ำค้างแข็ง)',  m: 10, d: 23, season: 'autumn' },
  { cn: '立冬', pinyin: 'Lidong',   en: 'Start of Winter',   th: 'ลี่ตง (เข้าฤดูหนาว)',      m: 11, d: 7,  season: 'winter' },
  { cn: '小雪', pinyin: 'Xiaoxue',  en: 'Minor Snow',        th: 'เสี่ยวเสวี่ย (หิมะน้อย)',  m: 11, d: 22, season: 'winter' },
  { cn: '大雪', pinyin: 'Daxue',    en: 'Major Snow',        th: 'ต้าเสวี่ย (หิมะใหญ่)',     m: 12, d: 7,  season: 'winter' },
  { cn: '冬至', pinyin: 'Dongzhi',  en: 'Winter Solstice',   th: 'ตงจื้อ (เหมายัน)',         m: 12, d: 22, season: 'winter' },
];

const ZONES = ['north_temperate', 'south_temperate', 'tropical'];
const INVERT = { spring: 'autumn', autumn: 'spring', summer: 'winter', winter: 'summer' };

// (month,day) comparison helper: negative if a<b, 0 if equal, positive if a>b.
function cmpMD(am, ad, bm, bd) { return am !== bm ? am - bm : ad - bd; }

// Which solar term is active on `date`? The last term whose start ≤ date; Jan 1–5 (before 小寒)
// belong to the previous year's 冬至 (the last entry).
export function solarTermFor(date = new Date()) {
  const m = date.getUTCMonth() + 1, d = date.getUTCDate();
  let idx = -1;
  for (let i = 0; i < TERMS.length; i++) {
    if (cmpMD(TERMS[i].m, TERMS[i].d, m, d) <= 0) idx = i; else break;
  }
  if (idx === -1) idx = TERMS.length - 1; // Jan 1–5 → 冬至 of the previous year
  return { index: idx, ...TERMS[idx] };
}

// The next solar term and how many days until it begins (deterministic, calendar-based).
export function nextSolarTerm(date = new Date()) {
  const cur = solarTermFor(date);
  const next = TERMS[(cur.index + 1) % TERMS.length];
  const y = date.getUTCFullYear();
  // next term's date is this year, unless it already passed (wrap 冬至 → 小寒 next year)
  let ny = y;
  if (cmpMD(next.m, next.d, date.getUTCMonth() + 1, date.getUTCDate()) <= 0) ny = y + 1;
  const start = Date.UTC(ny, next.m - 1, next.d);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const days_until = Math.max(0, Math.round((start - today) / 86400000));
  return { cn: next.cn, pinyin: next.pinyin, en: next.en, th: next.th, approx_start: `${next.m}/${next.d}`, days_until };
}

// Tropical local season by month (Thai/ASEAN pattern): hot-dry, rainy, cool-dry.
function tropicalSeason(m) {
  if (m >= 2 && m <= 4) return 'hot_dry';   // ก.พ.–เม.ย. ร้อนแล้ง
  if (m >= 5 && m <= 10) return 'rainy';     // พ.ค.–ต.ค. ฝน
  return 'cool_dry';                          // พ.ย.–ม.ค. เย็นแล้ง
}

// The effective LOCAL season for a zone on a given date.
export function localSeasonFor(date, zone) {
  const term = solarTermFor(date);
  if (zone === 'south_temperate') return INVERT[term.season];
  if (zone === 'tropical') return tropicalSeason(date.getUTCMonth() + 1);
  return term.season; // north_temperate (default)
}

// ── Seasonal product-category demand (guidance, not fabricated stats) ────────────────────────────
const CATEGORIES = {
  spring: [
    { key: 'gardening',   th: 'เมล็ดพันธุ์/อุปกรณ์ปลูกต้นไม้', en: 'Seeds & gardening',   why: 'ฤดูเพาะปลูก ดีมานด์ทำสวน/ปลูกผักขึ้น' },
    { key: 'allergy',     th: 'สินค้าแก้ภูมิแพ้/หน้ากาก',     en: 'Allergy relief',       why: 'ละอองเกสรสูงช่วงใบไม้ผลิ' },
    { key: 'light_apparel', th: 'เสื้อผ้าบางเปลี่ยนฤดู',      en: 'Light apparel',        why: 'เปลี่ยนตู้เสื้อผ้ารับอากาศอุ่นขึ้น' },
    { key: 'cleaning',    th: 'อุปกรณ์ทำความสะอาดบ้าน',      en: 'Home cleaning',        why: 'ธรรมเนียมทำความสะอาดใหญ่รับปีใหม่/ฤดูใหม่' },
    { key: 'fitness',     th: 'อุปกรณ์ออกกำลังกาย',          en: 'Fitness gear',         why: 'เริ่มต้นดูแลสุขภาพหลังหน้าหนาว' },
  ],
  summer: [
    { key: 'cooling',     th: 'พัดลม/แอร์/เครื่องทำความเย็น', en: 'Cooling & fans',       why: 'อากาศร้อนจัด ดีมานด์คลายร้อนพุ่ง' },
    { key: 'hydration',   th: 'เครื่องดื่ม/น้ำ/กระติกเก็บเย็น', en: 'Drinks & hydration', why: 'ต้องการดื่มน้ำ/เครื่องดื่มเย็นมากขึ้น' },
    { key: 'sun_protection', th: 'ครีมกันแดด/หมวก/แว่นกันแดด', en: 'Sun protection',     why: 'แดดแรง ป้องกันผิว/ดวงตา' },
    { key: 'swim',        th: 'ชุดว่ายน้ำ/อุปกรณ์ทะเล',       en: 'Swim & beach',         why: 'ฤดูท่องเที่ยวทะเล/สระว่ายน้ำ' },
    { key: 'insect',      th: 'กันยุง/แมลง',                  en: 'Insect repellent',     why: 'แมลงชุกช่วงอากาศร้อน' },
  ],
  autumn: [
    { key: 'back_to_school', th: 'เครื่องเขียน/อุปกรณ์การเรียน', en: 'Back-to-school',    why: 'เปิดเทอม/เริ่มปีการศึกษาหลายประเทศ' },
    { key: 'skincare_dry', th: 'บำรุงผิวสูตรชุ่มชื้น',         en: 'Moisturizing skincare',why: 'อากาศเริ่มแห้ง ผิวต้องการความชุ่มชื้น' },
    { key: 'layering',    th: 'เสื้อคลุม/เลเยอร์',             en: 'Layering apparel',     why: 'อุณหภูมิเริ่มลด แต่งตัวเป็นชั้น' },
    { key: 'harvest_food', th: 'อาหารถนอม/แปรรูป',            en: 'Harvest & preserved food', why: 'ฤดูเก็บเกี่ยว วัตถุดิบล้นตลาด' },
    { key: 'home_decor',  th: 'ของแต่งบ้านโทนอบอุ่น',         en: 'Home decor',           why: 'อยู่บ้านมากขึ้น จัดบ้านรับฤดูหนาว' },
  ],
  winter: [
    { key: 'heating',     th: 'เครื่องทำความอุ่น/ผ้าห่ม',     en: 'Heating & blankets',   why: 'อากาศหนาว ดีมานด์ความอบอุ่น' },
    { key: 'warm_apparel', th: 'เสื้อกันหนาว/ชุดวอร์ม',       en: 'Warm apparel',         why: 'ต้องการเสื้อผ้ากันหนาว' },
    { key: 'hot_food',    th: 'อาหาร/เครื่องดื่มร้อน',         en: 'Hot food & drinks',    why: 'ดีมานด์ของร้อน ซุป ชา กาแฟ' },
    { key: 'gifts',       th: 'ของขวัญ/เทศกาลปลายปี',          en: 'Gifts & festive',      why: 'เทศกาลปีใหม่/ตรุษจีน ให้ของขวัญ' },
    { key: 'immunity',    th: 'สินค้าเสริมภูมิ/สุขภาพ',       en: 'Immunity & health',    why: 'ฤดูหวัด ต้องการดูแลสุขภาพ' },
  ],
  // tropical-specific local seasons
  hot_dry: [
    { key: 'cooling',     th: 'พัดลม/แอร์/พัดลมพกพา',          en: 'Cooling & fans',       why: 'ฤดูร้อนเขตร้อน อุณหภูมิสูงสุดของปี' },
    { key: 'hydration',   th: 'น้ำ/เครื่องดื่ม/น้ำแข็ง',       en: 'Drinks & ice',         why: 'สูญเสียน้ำมาก ต้องการเครื่องดื่มเย็น' },
    { key: 'sun_protection', th: 'ครีมกันแดด/ร่ม/หมวก',        en: 'Sun protection',       why: 'แดดแรงจัด ป้องกันผิว' },
    { key: 'skincare_oil', th: 'สกินแคร์คุมมัน',               en: 'Oil-control skincare', why: 'เหงื่อ/ความมันสูงช่วงร้อนชื้น' },
    { key: 'appliance_repair', th: 'อะไหล่/บริการแอร์-ตู้เย็น', en: 'Cooling appliance service', why: 'เครื่องทำความเย็นทำงานหนัก ต้องซ่อม/บำรุง' },
  ],
  rainy: [
    { key: 'rain_gear',   th: 'ร่ม/เสื้อกันฝน/รองเท้าบูท',     en: 'Rain gear',            why: 'ฤดูฝน ป้องกันเปียก' },
    { key: 'quick_dry',   th: 'เสื้อผ้าแห้งเร็ว/เครื่องอบผ้า', en: 'Quick-dry & dryers',   why: 'ผ้าแห้งยาก ต้องการของแห้งเร็ว' },
    { key: 'moisture_control', th: 'กันชื้น/กันรา/ซองดูดความชื้น', en: 'Moisture & mold control', why: 'ความชื้นสูง ของขึ้นรา' },
    { key: 'health_rainy', th: 'ยากันยุง/แก้หวัด/สุขภาพ',      en: 'Flu & mosquito care',  why: 'ไข้หวัด/ไข้เลือดออกระบาดหน้าฝน' },
    { key: 'vehicle_care', th: 'ดูแลรถ/ยาง/ที่ปัดน้ำฝน',      en: 'Vehicle rain care',    why: 'ถนนลื่น ทัศนวิสัยต่ำ ต้องดูแลรถ' },
  ],
  cool_dry: [
    { key: 'skincare_moist', th: 'บำรุงผิวชุ่มชื้น/ลิปบาล์ม',  en: 'Moisturizing skincare',why: 'อากาศเย็นแห้ง ผิวแห้ง' },
    { key: 'light_warm',  th: 'เสื้อคลุมบาง/แจ็คเก็ต',        en: 'Light warm apparel',   why: 'กลางคืนเย็น โดยเฉพาะภาคเหนือ/อีสาน' },
    { key: 'travel',      th: 'สินค้าท่องเที่ยว/แคมป์ปิ้ง',   en: 'Travel & camping',     why: 'ไฮซีซั่นท่องเที่ยวอากาศดี' },
    { key: 'gifts',       th: 'ของขวัญ/กระเช้าปีใหม่',        en: 'Gifts & hampers',      why: 'เทศกาลปีใหม่/ตรุษจีน ปลาย-ต้นปี' },
    { key: 'outdoor_event', th: 'อุปกรณ์งานกลางแจ้ง/อีเวนต์', en: 'Outdoor events',       why: 'ฤดูจัดงาน คอนเสิร์ต ตลาดนัด' },
  ],
};

const SEASON_TH = {
  spring: 'ฤดูใบไม้ผลิ', summer: 'ฤดูร้อน', autumn: 'ฤดูใบไม้ร่วง', winter: 'ฤดูหนาว',
  hot_dry: 'ฤดูร้อน (เขตร้อน)', rainy: 'ฤดูฝน (เขตร้อน)', cool_dry: 'ฤดูหนาว/เย็นแล้ง (เขตร้อน)',
};
const ZONE_TH = {
  north_temperate: 'เขตอบอุ่นซีกโลกเหนือ (จีนเหนือ/ญี่ปุ่น/เกาหลี/ยุโรป/อเมริกาเหนือ)',
  south_temperate: 'เขตอบอุ่นซีกโลกใต้ (ออสเตรเลีย/นิวซีแลนด์/อเมริกาใต้ตอนล่าง)',
  tropical: 'เขตร้อน (ไทย/อาเซียน/เส้นศูนย์สูตร)',
};

function groupActions(topCats, seasonTh, zoneTh) {
  const names = topCats.map(c => c.th).join(' · ');
  return {
    producer:      `เตรียมผลิต/สต๊อกหมวด: ${names} ล่วงหน้าก่อนพีคดีมานด์ของ${seasonTh}`,
    middleman:     `กระจายสินค้าหมวดนี้เข้า${zoneTh} ช่วงนี้ — จับคู่ผู้ผลิตกับร้านค้าปลายทาง`,
    affiliate:     `ทำคอนเทนต์/รีวิวหมวด: ${names} จับกระแส${seasonTh} — โพสต์ก่อนพีคเพื่อกินยอดช่วงต้น`,
    partner_agent: `เสนอดีลหมวดนี้ให้ผู้ซื้อ B2B/B2G/B2P ในพื้นที่ — วางแผนจัดส่งก่อนดีมานด์สูงสุด`,
    consumer:      `ของที่คุ้มและจำเป็นช่วงนี้: ${names}`,
  };
}

// Main entry: given a date + climate zone, return the full "what to push, where, now" signal.
export function recommend({ date = new Date(), zone = 'tropical' } = {}) {
  if (!ZONES.includes(zone)) zone = 'tropical';
  const d = date instanceof Date ? date : new Date(date);
  const when = isNaN(d.getTime()) ? new Date() : d;
  const term = solarTermFor(when);
  const localSeason = localSeasonFor(when, zone);
  const cats = CATEGORIES[localSeason] || [];
  const top = cats.slice(0, 3);
  return {
    date: when.toISOString().slice(0, 10),
    zone,
    zone_th: ZONE_TH[zone],
    solar_term: {
      index: term.index + 1, cn: term.cn, pinyin: term.pinyin, en: term.en, th: term.th,
      approx_start: `${term.m}/${term.d}`, season_north: term.season,
    },
    local_season: { key: localSeason, th: SEASON_TH[localSeason] || localSeason },
    categories: cats,
    top_categories: top.map(c => c.key),
    group_actions: groupActions(top, SEASON_TH[localSeason] || localSeason, ZONE_TH[zone]),
    next_term: nextSolarTerm(when),
    note: 'เชิงกำหนดได้จากปฏิทินสุริยคติ + รูปแบบฤดูกาลของเขตภูมิอากาศ (ไม่ใช้ LLM, ไม่ scrape). ' +
          'ต่อยอดความแม่นยำรายพื้นที่ได้ด้วย weather API ภายหลัง (รอการตัดสินใจของเจ้าของ).',
  };
}

export const _zones = ZONES;
export const _terms = TERMS;
