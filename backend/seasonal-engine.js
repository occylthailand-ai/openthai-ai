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
//
// LOCALIZATION (2026-07-29): the platform serves th / en / zh, so this engine speaks all three. Every
// caller-facing string can be returned in the requested `lang`. To stay backward-compatible and honest,
// the language rule is:
//   • Fields with a `_th` / `.th` suffix are, by contract, ALWAYS Thai (unchanged). Localized copies are
//     offered next to them under a neutral `label` / `*_label` name.
//   • Un-suffixed prose fields (`angle`, `why`, `group_plays`, `group_actions`, `note`) are localized
//     in place to `lang`. `lang` defaults to `th`, so existing callers see exactly what they saw before.
//   • Still deterministic — the translations are a static knowledge table, no LLM and no scraping.

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
const LANGS = ['th', 'en', 'zh'];
const normLang = (l) => (LANGS.includes(l) ? l : 'th');

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

// Localized display label for a solar term (zh uses the characters, which are the native form).
function termLabel(term, lang) { return lang === 'en' ? term.en : lang === 'zh' ? term.cn : term.th; }

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
// Each entry carries the category name (th/en/zh) and the "why" (th/en/zh). `th`, `en`, `why` keep
// their historical names for backward compatibility; `zh`, `why_en`, `why_zh` are the added copies.
const CATEGORIES = {
  spring: [
    { key: 'gardening',   th: 'เมล็ดพันธุ์/อุปกรณ์ปลูกต้นไม้', en: 'Seeds & gardening', zh: '种子与园艺', why: 'ฤดูเพาะปลูก ดีมานด์ทำสวน/ปลูกผักขึ้น', why_en: 'Planting season lifts gardening demand', why_zh: '播种季，园艺需求上升' },
    { key: 'allergy',     th: 'สินค้าแก้ภูมิแพ้/หน้ากาก',     en: 'Allergy relief',    zh: '过敏缓解/口罩', why: 'ละอองเกสรสูงช่วงใบไม้ผลิ', why_en: 'High pollen in spring', why_zh: '春季花粉高' },
    { key: 'light_apparel', th: 'เสื้อผ้าบางเปลี่ยนฤดู',      en: 'Light apparel',     zh: '轻薄换季服装', why: 'เปลี่ยนตู้เสื้อผ้ารับอากาศอุ่นขึ้น', why_en: 'Wardrobe change for warmer weather', why_zh: '换季迎接暖天' },
    { key: 'cleaning',    th: 'อุปกรณ์ทำความสะอาดบ้าน',      en: 'Home cleaning',     zh: '家居清洁用品', why: 'ธรรมเนียมทำความสะอาดใหญ่รับปีใหม่/ฤดูใหม่', why_en: 'Spring/new-year big-clean custom', why_zh: '新春大扫除习惯' },
    { key: 'fitness',     th: 'อุปกรณ์ออกกำลังกาย',          en: 'Fitness gear',      zh: '健身器材', why: 'เริ่มต้นดูแลสุขภาพหลังหน้าหนาว', why_en: 'Health kick after winter', why_zh: '冬后开始健身' },
  ],
  summer: [
    { key: 'cooling',     th: 'พัดลม/แอร์/เครื่องทำความเย็น', en: 'Cooling & fans',    zh: '风扇/空调/制冷', why: 'อากาศร้อนจัด ดีมานด์คลายร้อนพุ่ง', why_en: 'Extreme heat drives cooling demand', why_zh: '酷热，制冷需求激增' },
    { key: 'hydration',   th: 'เครื่องดื่ม/น้ำ/กระติกเก็บเย็น', en: 'Drinks & hydration', zh: '饮品/水/保冷壶', why: 'ต้องการดื่มน้ำ/เครื่องดื่มเย็นมากขึ้น', why_en: 'Need more cold drinks/water', why_zh: '需要更多冷饮' },
    { key: 'sun_protection', th: 'ครีมกันแดด/หมวก/แว่นกันแดด', en: 'Sun protection',  zh: '防晒霜/帽子/太阳镜', why: 'แดดแรง ป้องกันผิว/ดวงตา', why_en: 'Strong sun; protect skin and eyes', why_zh: '强日晒，护肤护眼' },
    { key: 'swim',        th: 'ชุดว่ายน้ำ/อุปกรณ์ทะเล',       en: 'Swim & beach',      zh: '泳装/海滩用品', why: 'ฤดูท่องเที่ยวทะเล/สระว่ายน้ำ', why_en: 'Beach and pool travel season', why_zh: '海滨/泳池旅游季' },
    { key: 'insect',      th: 'กันยุง/แมลง',                  en: 'Insect repellent',  zh: '驱蚊/驱虫', why: 'แมลงชุกช่วงอากาศร้อน', why_en: 'Insects thrive in the heat', why_zh: '炎热多虫' },
  ],
  autumn: [
    { key: 'back_to_school', th: 'เครื่องเขียน/อุปกรณ์การเรียน', en: 'Back-to-school', zh: '文具/学习用品', why: 'เปิดเทอม/เริ่มปีการศึกษาหลายประเทศ', why_en: 'School year starts in many countries', why_zh: '多国开学季' },
    { key: 'skincare_dry', th: 'บำรุงผิวสูตรชุ่มชื้น',         en: 'Moisturizing skincare', zh: '保湿护肤', why: 'อากาศเริ่มแห้ง ผิวต้องการความชุ่มชื้น', why_en: 'Drier air; skin needs moisture', why_zh: '空气转干，需保湿' },
    { key: 'layering',    th: 'เสื้อคลุม/เลเยอร์',             en: 'Layering apparel',  zh: '叠穿外套', why: 'อุณหภูมิเริ่มลด แต่งตัวเป็นชั้น', why_en: 'Temperatures drop; dress in layers', why_zh: '气温下降，叠穿' },
    { key: 'harvest_food', th: 'อาหารถนอม/แปรรูป',            en: 'Harvest & preserved food', zh: '丰收/加工食品', why: 'ฤดูเก็บเกี่ยว วัตถุดิบล้นตลาด', why_en: 'Harvest season; abundant produce', why_zh: '丰收季，原料充裕' },
    { key: 'home_decor',  th: 'ของแต่งบ้านโทนอบอุ่น',         en: 'Home decor',        zh: '暖色家居装饰', why: 'อยู่บ้านมากขึ้น จัดบ้านรับฤดูหนาว', why_en: 'More time indoors before winter', why_zh: '入冬前多居家布置' },
  ],
  winter: [
    { key: 'heating',     th: 'เครื่องทำความอุ่น/ผ้าห่ม',     en: 'Heating & blankets', zh: '取暖/毛毯', why: 'อากาศหนาว ดีมานด์ความอบอุ่น', why_en: 'Cold weather; demand for warmth', why_zh: '寒冷，取暖需求' },
    { key: 'warm_apparel', th: 'เสื้อกันหนาว/ชุดวอร์ม',       en: 'Warm apparel',      zh: '保暖服装', why: 'ต้องการเสื้อผ้ากันหนาว', why_en: 'Need warm clothing', why_zh: '需要保暖衣物' },
    { key: 'hot_food',    th: 'อาหาร/เครื่องดื่มร้อน',         en: 'Hot food & drinks', zh: '热食/热饮', why: 'ดีมานด์ของร้อน ซุป ชา กาแฟ', why_en: 'Demand for hot soup, tea, coffee', why_zh: '热汤/茶/咖啡需求' },
    { key: 'gifts',       th: 'ของขวัญ/เทศกาลปลายปี',          en: 'Gifts & festive',   zh: '礼品/年节', why: 'เทศกาลปีใหม่/ตรุษจีน ให้ของขวัญ', why_en: 'New Year / Chinese New Year gifting', why_zh: '元旦/春节送礼' },
    { key: 'immunity',    th: 'สินค้าเสริมภูมิ/สุขภาพ',       en: 'Immunity & health', zh: '免疫/健康', why: 'ฤดูหวัด ต้องการดูแลสุขภาพ', why_en: 'Cold-and-flu season', why_zh: '感冒流行季' },
  ],
  // tropical-specific local seasons
  hot_dry: [
    { key: 'cooling',     th: 'พัดลม/แอร์/พัดลมพกพา',          en: 'Cooling & fans',    zh: '风扇/空调/便携风扇', why: 'ฤดูร้อนเขตร้อน อุณหภูมิสูงสุดของปี', why_en: "Tropical hot season; year's peak heat", why_zh: '热带旱热季，全年最热' },
    { key: 'hydration',   th: 'น้ำ/เครื่องดื่ม/น้ำแข็ง',       en: 'Drinks & ice',      zh: '水/饮品/冰', why: 'สูญเสียน้ำมาก ต้องการเครื่องดื่มเย็น', why_en: 'High fluid loss; want cold drinks', why_zh: '大量流汗，需冷饮' },
    { key: 'sun_protection', th: 'ครีมกันแดด/ร่ม/หมวก',        en: 'Sun protection',    zh: '防晒/雨伞/帽子', why: 'แดดแรงจัด ป้องกันผิว', why_en: 'Intense sun; protect skin', why_zh: '烈日，护肤' },
    { key: 'skincare_oil', th: 'สกินแคร์คุมมัน',               en: 'Oil-control skincare', zh: '控油护肤', why: 'เหงื่อ/ความมันสูงช่วงร้อนชื้น', why_en: 'Sweat and oiliness in hot-humid weather', why_zh: '湿热多汗多油' },
    { key: 'appliance_repair', th: 'อะไหล่/บริการแอร์-ตู้เย็น', en: 'Cooling appliance service', zh: '空调/冰箱维修保养', why: 'เครื่องทำความเย็นทำงานหนัก ต้องซ่อม/บำรุง', why_en: 'Cooling appliances work hard; need service', why_zh: '制冷设备高负荷，需维修' },
  ],
  rainy: [
    { key: 'rain_gear',   th: 'ร่ม/เสื้อกันฝน/รองเท้าบูท',     en: 'Rain gear',         zh: '雨伞/雨衣/雨靴', why: 'ฤดูฝน ป้องกันเปียก', why_en: 'Rainy season; stay dry', why_zh: '雨季，防湿' },
    { key: 'quick_dry',   th: 'เสื้อผ้าแห้งเร็ว/เครื่องอบผ้า', en: 'Quick-dry & dryers', zh: '速干衣/烘干机', why: 'ผ้าแห้งยาก ต้องการของแห้งเร็ว', why_en: 'Clothes dry slowly; want quick-dry', why_zh: '衣物难干，需速干' },
    { key: 'moisture_control', th: 'กันชื้น/กันรา/ซองดูดความชื้น', en: 'Moisture & mold control', zh: '防潮/防霉/干燥剂', why: 'ความชื้นสูง ของขึ้นรา', why_en: 'High humidity; things get moldy', why_zh: '高湿易发霉' },
    { key: 'health_rainy', th: 'ยากันยุง/แก้หวัด/สุขภาพ',      en: 'Flu & mosquito care', zh: '驱蚊/感冒/健康', why: 'ไข้หวัด/ไข้เลือดออกระบาดหน้าฝน', why_en: 'Flu and dengue spread in the rains', why_zh: '雨季流感/登革热' },
    { key: 'vehicle_care', th: 'ดูแลรถ/ยาง/ที่ปัดน้ำฝน',      en: 'Vehicle rain care', zh: '汽车养护/轮胎/雨刷', why: 'ถนนลื่น ทัศนวิสัยต่ำ ต้องดูแลรถ', why_en: 'Slippery roads, low visibility', why_zh: '路滑视线差，需养护' },
  ],
  cool_dry: [
    { key: 'skincare_moist', th: 'บำรุงผิวชุ่มชื้น/ลิปบาล์ม',  en: 'Moisturizing skincare', zh: '保湿护肤/润唇膏', why: 'อากาศเย็นแห้ง ผิวแห้ง', why_en: 'Cool dry air; dry skin', why_zh: '凉燥，皮肤干' },
    { key: 'light_warm',  th: 'เสื้อคลุมบาง/แจ็คเก็ต',        en: 'Light warm apparel', zh: '薄外套/夹克', why: 'กลางคืนเย็น โดยเฉพาะภาคเหนือ/อีสาน', why_en: 'Cool nights, especially the north/northeast', why_zh: '夜凉，尤其北部/东北' },
    { key: 'travel',      th: 'สินค้าท่องเที่ยว/แคมป์ปิ้ง',   en: 'Travel & camping',  zh: '旅游/露营用品', why: 'ไฮซีซั่นท่องเที่ยวอากาศดี', why_en: 'High season; pleasant weather', why_zh: '旺季，气候宜人' },
    { key: 'gifts',       th: 'ของขวัญ/กระเช้าปีใหม่',        en: 'Gifts & hampers',   zh: '礼品/新年礼篮', why: 'เทศกาลปีใหม่/ตรุษจีน ปลาย-ต้นปี', why_en: 'New Year / Chinese New Year, year-end and start', why_zh: '元旦/春节，年末年初' },
    { key: 'outdoor_event', th: 'อุปกรณ์งานกลางแจ้ง/อีเวนต์', en: 'Outdoor events',    zh: '户外活动/展会用品', why: 'ฤดูจัดงาน คอนเสิร์ต ตลาดนัด', why_en: 'Event season; concerts, markets', why_zh: '活动季，演唱会/市集' },
  ],
};

const catName = (c, lang) => (lang === 'en' ? c.en : lang === 'zh' ? c.zh : c.th);
const catWhy  = (c, lang) => (lang === 'en' ? c.why_en : lang === 'zh' ? c.why_zh : c.why);

const SEASON_TH = {
  spring: 'ฤดูใบไม้ผลิ', summer: 'ฤดูร้อน', autumn: 'ฤดูใบไม้ร่วง', winter: 'ฤดูหนาว',
  hot_dry: 'ฤดูร้อน (เขตร้อน)', rainy: 'ฤดูฝน (เขตร้อน)', cool_dry: 'ฤดูหนาว/เย็นแล้ง (เขตร้อน)',
};
const SEASON_EN = {
  spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter',
  hot_dry: 'Hot season (tropical)', rainy: 'Rainy season (tropical)', cool_dry: 'Cool-dry season (tropical)',
};
const SEASON_ZH = {
  spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季',
  hot_dry: '热季（热带）', rainy: '雨季（热带）', cool_dry: '凉季（热带）',
};
const ZONE_TH = {
  north_temperate: 'เขตอบอุ่นซีกโลกเหนือ (จีนเหนือ/ญี่ปุ่น/เกาหลี/ยุโรป/อเมริกาเหนือ)',
  south_temperate: 'เขตอบอุ่นซีกโลกใต้ (ออสเตรเลีย/นิวซีแลนด์/อเมริกาใต้ตอนล่าง)',
  tropical: 'เขตร้อน (ไทย/อาเซียน/เส้นศูนย์สูตร)',
};
const ZONE_EN = {
  north_temperate: 'Northern temperate zone (N. China / Japan / Korea / Europe / N. America)',
  south_temperate: 'Southern temperate zone (Australia / New Zealand / southern S. America)',
  tropical: 'Tropical zone (Thailand / ASEAN / equatorial)',
};
const ZONE_ZH = {
  north_temperate: '北温带（华北/日韩/欧洲/北美）',
  south_temperate: '南温带（澳新/南美南部）',
  tropical: '热带（泰国/东盟/赤道地区）',
};
const seasonLabel = (key, lang) => (lang === 'en' ? SEASON_EN : lang === 'zh' ? SEASON_ZH : SEASON_TH)[key] || key;
const zoneLabelFor = (zone, lang) => (lang === 'en' ? ZONE_EN : lang === 'zh' ? ZONE_ZH : ZONE_TH)[zone] || zone;

// Localized "what each of the five groups should do" for the base seasonal recommendation.
function groupActions(topCats, localSeasonKey, zone, lang) {
  const names = topCats.map((c) => catName(c, lang)).join(' · ');
  const s = seasonLabel(localSeasonKey, lang);
  const z = zoneLabelFor(zone, lang);
  if (lang === 'en') {
    return {
      producer:      `Prepare production/stock for: ${names} — ahead of the ${s} demand peak`,
      middleman:     `Distribute these categories into ${z} now — match producers with end retailers`,
      affiliate:     `Make content/reviews for: ${names}, riding the ${s} wave — post before the peak to capture early sales`,
      partner_agent: `Offer these categories to B2B/B2G/B2P buyers in the area — plan delivery before peak demand`,
      consumer:      `Worthwhile essentials for this period: ${names}`,
    };
  }
  if (lang === 'zh') {
    return {
      producer:      `提前备产/备货：${names} — 赶在${s}需求高峰前`,
      middleman:     `现在将这些品类分销至${z} — 撮合生产商与终端零售`,
      affiliate:     `围绕：${names} 做内容/测评，乘${s}热度 — 高峰前发布抢先收单`,
      partner_agent: `向本地 B2B/B2G/B2P 买家推介这些品类 — 在需求高峰前规划交付`,
      consumer:      `本季实惠又必需的选择：${names}`,
    };
  }
  return {
    producer:      `เตรียมผลิต/สต๊อกหมวด: ${names} ล่วงหน้าก่อนพีคดีมานด์ของ${s}`,
    middleman:     `กระจายสินค้าหมวดนี้เข้า${z} ช่วงนี้ — จับคู่ผู้ผลิตกับร้านค้าปลายทาง`,
    affiliate:     `ทำคอนเทนต์/รีวิวหมวด: ${names} จับกระแส${s} — โพสต์ก่อนพีคเพื่อกินยอดช่วงต้น`,
    partner_agent: `เสนอดีลหมวดนี้ให้ผู้ซื้อ B2B/B2G/B2P ในพื้นที่ — วางแผนจัดส่งก่อนดีมานด์สูงสุด`,
    consumer:      `ของที่คุ้มและจำเป็นช่วงนี้: ${names}`,
  };
}

const NOTE_RECOMMEND = {
  th: 'เชิงกำหนดได้จากปฏิทินสุริยคติ + รูปแบบฤดูกาลของเขตภูมิอากาศ (ไม่ใช้ LLM, ไม่ scrape). ' +
      'ต่อยอดความแม่นยำรายพื้นที่ได้ด้วย weather API ภายหลัง (รอการตัดสินใจของเจ้าของ).',
  en: 'Deterministic from the solar calendar + each climate zone\'s seasonal pattern (no LLM, no scraping). ' +
      'A real per-region weather API can refine it later (owner\'s decision).',
  zh: '基于太阳历 + 各气候带季节规律的确定性推算（不用 LLM，不 scrape 采集数据）。' +
      '日后可用真实分区天气 API 细化（由项目方决定）。',
};

// Main entry: given a date + climate zone (+ lang), return the full "what to push, where, now" signal.
export function recommend({ date = new Date(), zone = 'tropical', lang = 'th' } = {}) {
  if (!ZONES.includes(zone)) zone = 'tropical';
  lang = normLang(lang);
  const d = date instanceof Date ? date : new Date(date);
  const when = isNaN(d.getTime()) ? new Date() : d;
  const term = solarTermFor(when);
  const localSeason = localSeasonFor(when, zone);
  const cats = CATEGORIES[localSeason] || [];
  const top = cats.slice(0, 3);
  return {
    date: when.toISOString().slice(0, 10),
    zone, lang,
    zone_th: ZONE_TH[zone],
    zone_label: zoneLabelFor(zone, lang),
    solar_term: {
      index: term.index + 1, cn: term.cn, pinyin: term.pinyin, en: term.en, th: term.th,
      label: termLabel(term, lang),
      approx_start: `${term.m}/${term.d}`, season_north: term.season,
    },
    local_season: { key: localSeason, th: SEASON_TH[localSeason] || localSeason, label: seasonLabel(localSeason, lang) },
    categories: cats,
    top_categories: top.map((c) => c.key),
    group_actions: groupActions(top, localSeason, zone, lang),
    next_term: nextSolarTerm(when),
    note: NOTE_RECOMMEND[lang] || NOTE_RECOMMEND.th,
  };
}

// ── Brick 2: structural trend-direction overlay ──────────────────────────────────────────────────
// These are DURABLE macro consumer trends (common knowledge), NOT scraped live data and NOT invented
// statistics. Each carries a short "angle" modifier — how to position a seasonal product to ride that
// trend. Fusing (seasonal category) × (rising trend) yields a concrete product ANGLE, deterministically,
// with no LLM and no scraping. A future round can add a real, owner-authorized trend API on top; the
// shape here stays the same. Every string comes in th/en/zh (`th`/`modifier`/`why` are the historical
// Thai fields; the `_en`/`_zh` copies were added for localization).
const TREND_DIRECTIONS = {
  value:   { th: 'ความคุ้มค่า/ประหยัด', en: 'Value / savings', zh: '性价比/省钱',
             modifier: 'จัดเป็นเซ็ต/ทนทาน/ใช้ได้หลายแบบ คุ้มราคา', modifier_en: 'Bundle it, make it durable and multi-use — worth the price', modifier_zh: '组合套装/耐用/多用途，超值',
             why: 'กำลังซื้อรัดกุม คนมองความคุ้มเป็นหลัก', why_en: 'Tighter budgets; buyers prioritise value', why_zh: '预算收紧，看重性价比' },
  digital: { th: 'ดิจิทัล/ไลฟ์สตรีมช้อป', en: 'Digital / live-stream shopping', zh: '数字/直播带货',
             modifier: 'ขายผ่านไลฟ์/คลิปสั้น + รีวิวจากครีเอเตอร์', modifier_en: 'Sell via live-streams / short clips + creator reviews', modifier_zh: '直播/短视频销售 + 达人测评',
             why: 'พฤติกรรมซื้อผ่านโซเชียล/ไลฟ์โตต่อเนื่อง', why_en: 'Social / live-commerce keeps growing', why_zh: '社交/直播电商持续增长' },
  health:  { th: 'สุขภาพ/เวลเนส', en: 'Health / wellness', zh: '健康/养生',
             modifier: 'ชูจุดขายเพื่อสุขภาพ/ธรรมชาติ/น้ำตาลน้อย', modifier_en: 'Lead with health / natural / low-sugar benefits', modifier_zh: '主打健康/天然/低糖卖点',
             why: 'ผู้บริโภคใส่ใจสุขภาพมากขึ้นทุกปี', why_en: 'Consumers grow more health-conscious every year', why_zh: '消费者日益注重健康' },
  eco:     { th: 'ความยั่งยืน/รักษ์โลก', en: 'Sustainability / eco', zh: '可持续/环保',
             modifier: 'ใช้ซ้ำได้/รีไซเคิล/เติมได้ ลดขยะ', modifier_en: 'Reusable / recyclable / refillable — less waste', modifier_zh: '可重复使用/可回收/可补充，减废',
             why: 'กระแสรักษ์โลกดันการเลือกซื้อ โดยเฉพาะคนรุ่นใหม่', why_en: 'Eco-consciousness drives choices, especially younger buyers', why_zh: '环保意识影响选择，尤其年轻人' },
  local:   { th: 'ของแท้ท้องถิ่น/ชุมชน', en: 'Local / community authenticity', zh: '本地/社区正品',
             modifier: 'เล่าเรื่องต้นทาง/ชุมชน/OTOP ของแท้', modifier_en: 'Tell the origin / community / OTOP story', modifier_zh: '讲述产地/社区/OTOP 故事',
             why: 'ผู้บริโภคให้คุณค่ากับที่มาและเรื่องราวของสินค้า', why_en: 'Buyers value provenance and product stories', why_zh: '消费者重视来源与故事' },
};
const trendLabel = (t, lang) => (lang === 'en' ? t.en : lang === 'zh' ? t.zh : t.th);
const trendMod   = (t, lang) => (lang === 'en' ? t.modifier_en : lang === 'zh' ? t.modifier_zh : t.modifier);
const trendWhy   = (t, lang) => (lang === 'en' ? t.why_en : lang === 'zh' ? t.why_zh : t.why);

// Pick 3 relevant trend directions for a category: value + digital are near-universal for any product;
// the third is chosen by the category's nature (health-ish / local-ish / else eco).
function pickTrends(catKey) {
  const k = catKey.toLowerCase();
  const healthish = /skincare|hydration|immunity|health|allergy|insect|sun_protection|harvest_food|hot_food/.test(k);
  const localish  = /gifts|harvest|travel|outdoor|food/.test(k);
  const third = healthish ? 'health' : (localish ? 'local' : 'eco');
  return ['value', 'digital', third];
}

// Localized "play" for each of the five groups in the angle view.
function groupPlays(top, localSeasonKey, zone, lang) {
  const names = top.map((c) => catName(c, lang)).join(' · ');
  const s = seasonLabel(localSeasonKey, lang);
  const z = zoneLabelFor(zone, lang);
  if (lang === 'en') {
    return {
      producer:      `Make/adapt ${s} products to fit the trends: ${names} — add value/health/eco angles as suitable`,
      middleman:     `Source supply with a clear trend angle (value / easy live-selling) and distribute into ${z} during ${s}`,
      affiliate:     `Create content around the "angles" below — live / short clips pairing season × trend, posted before the peak`,
      partner_agent: `Pitch B2B/B2G deals that combine the trend selling point + seasonal timing, so buyers can plan stock ahead`,
      consumer:      `Good-value, on-trend picks for this season: ${names}`,
    };
  }
  if (lang === 'zh') {
    return {
      producer:      `按趋势生产/调整${s}商品：${names} — 视情况加入性价比/健康/环保卖点`,
      middleman:     `选择趋势卖点清晰（性价比/易直播）的货源，于${s}分销至${z}`,
      affiliate:     `围绕下方"angle"做内容 — 直播/短视频结合季节×趋势，赶在高峰前发布`,
      partner_agent: `推动结合趋势卖点 + 季节时机的 B2B/B2G 交易，助买家提前备货`,
      consumer:      `本季高性价比又贴合趋势的选择：${names}`,
    };
  }
  return {
    producer:      `ผลิต/ปรับสินค้า${s}ให้เข้าเทรนด์: ${names} — เพิ่มมุมคุ้มค่า/สุขภาพ/รักษ์โลกตามความเหมาะ`,
    middleman:     `เลือกซัพพลายที่มีมุมเทรนด์ชัด (คุ้มค่า/ไลฟ์ขายง่าย) กระจายเข้า${z}ช่วง${s}`,
    affiliate:     `ทำคอนเทนต์ตาม "angle" ด้านล่าง — ไลฟ์/คลิปสั้นจับคู่ฤดูกาล×เทรนด์ โพสต์ก่อนพีค`,
    partner_agent: `เสนอดีล B2B/B2G ที่มัดจุดขายเทรนด์ + จังหวะฤดูกาล ให้ผู้ซื้อวางแผนสต๊อกล่วงหน้า`,
    consumer:      `ตัวเลือกที่คุ้มและตรงเทรนด์ช่วงนี้: ${names}`,
  };
}

const NOTE_ANGLES = {
  th: 'เทรนด์ที่ใช้เป็น "เทรนด์เชิงโครงสร้าง" (ความรู้สาธารณะ) ไม่ใช่ข้อมูลเรียลไทม์ที่ scrape มา และไม่ต้องใช้ LLM. ' +
      'ต่อยอดด้วย trend API จริงที่เจ้าของอนุญาต (สัญญาณเปิดถูกกฎหมาย) ได้ภายหลัง โดยรูปแบบผลลัพธ์คงเดิม.',
  en: 'The trends used are DURABLE structural directions (common knowledge), not scraped real-time data and no LLM. ' +
      'A real, owner-authorized trend API (legally-open signals) can layer on later; the output shape stays the same.',
  zh: '所用趋势为"结构性趋势"（公共常识），非实时 scrape 抓取数据，也不用 LLM。' +
      '日后可叠加项目方授权的真实趋势 API（合法公开信号），输出结构不变。',
};

// Fuse the seasonal recommendation with the trend overlay → concrete product angles + a play per group.
export function productAngles({ date = new Date(), zone = 'tropical', lang = 'th' } = {}) {
  lang = normLang(lang);
  const base = recommend({ date, zone, lang });
  const localSeasonKey = base.local_season.key;
  const top = (CATEGORIES[localSeasonKey] || []).slice(0, 3);
  const angles = [];
  for (const cat of top) {
    for (const tKey of pickTrends(cat.key)) {
      const t = TREND_DIRECTIONS[tKey];
      const name = catName(cat, lang);
      const mod = trendMod(t, lang);
      angles.push({
        category: cat.key, category_th: cat.th, category_label: name,
        trend: tKey, trend_th: t.th, trend_label: trendLabel(t, lang),
        angle: `${name} — ${mod}`,
        why: `${catWhy(cat, lang)} + ${trendWhy(t, lang)}`,
      });
    }
  }
  return {
    date: base.date, zone: base.zone, lang,
    zone_th: base.zone_th, zone_label: base.zone_label,
    solar_term: base.solar_term, local_season: base.local_season,
    trends_used: Object.entries(TREND_DIRECTIONS).map(([k, v]) => ({ key: k, th: v.th, label: trendLabel(v, lang) })),
    angles,
    group_plays: groupPlays(top, localSeasonKey, base.zone, lang),
    note: NOTE_ANGLES[lang] || NOTE_ANGLES.th,
  };
}

// Supported climate zones with localized labels (so a frontend/skill can render a picker in any language).
export function zonesInfo(lang = 'th') {
  lang = normLang(lang);
  return ZONES.map((z) => ({ key: z, th: ZONE_TH[z], label: zoneLabelFor(z, lang) }));
}

export const _zones = ZONES;
export const _terms = TERMS;
export const _trends = TREND_DIRECTIONS;
export const _langs = LANGS;
