// Deterministic unit test (no server) — the 24-solar-terms (节气) × climate-zone demand engine.
// Pins the behaviour that makes the tool "point the right way": correct term per date (incl. the
// Jan 1–5 wrap to 冬至), and — the core insight — the SAME term maps to OPPOSITE local seasons in
// the northern vs southern hemisphere, and to the tropical rainy/hot/cool cycle by month.
import { recommend, solarTermFor, nextSolarTerm, localSeasonFor, productAngles, zonesInfo, _terms, _zones, _trends, _langs } from '../seasonal-engine.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));

console.log('=== solar term by date (astronomical ±1 day, deterministic) ===');
ok(solarTermFor(D(2026, 7, 24)).cn === '大暑', '2026-07-24 → 大暑 (Major Heat)');
ok(solarTermFor(D(2026, 7, 22)).cn === '小暑', '2026-07-22 → 小暑 (day before 大暑 boundary)');
ok(solarTermFor(D(2026, 2, 4)).cn === '立春', '2026-02-04 → 立春 (Start of Spring)');
ok(solarTermFor(D(2026, 12, 22)).cn === '冬至', '2026-12-22 → 冬至 (Winter Solstice)');
ok(solarTermFor(D(2026, 1, 3)).cn === '冬至', '2026-01-03 → 冬至 (Jan 1–5 wraps to previous 冬至)');
ok(solarTermFor(D(2026, 1, 6)).cn === '小寒', '2026-01-06 → 小寒 (first term of the calendar year)');

console.log('\n=== the same term → OPPOSITE local season by hemisphere (the core insight) ===');
const dSummer = D(2026, 7, 24); // northern midsummer
ok(localSeasonFor(dSummer, 'north_temperate') === 'summer', '大暑 in the north = summer');
ok(localSeasonFor(dSummer, 'south_temperate') === 'winter', '大暑 in the south = winter (inverted)');
ok(localSeasonFor(dSummer, 'tropical') === 'rainy', '大暑 in the tropics = rainy season (Thai July)');
const dWinter = D(2026, 12, 22); // northern midwinter
ok(localSeasonFor(dWinter, 'north_temperate') === 'winter', '冬至 in the north = winter');
ok(localSeasonFor(dWinter, 'south_temperate') === 'summer', '冬至 in the south = summer (inverted)');
ok(localSeasonFor(dWinter, 'tropical') === 'cool_dry', '冬至 in the tropics = cool-dry season');

console.log('\n=== recommendations are non-empty, zone-appropriate, and honest ===');
const rN = recommend({ date: dSummer, zone: 'north_temperate' });
const rS = recommend({ date: dSummer, zone: 'south_temperate' });
const rT = recommend({ date: dSummer, zone: 'tropical' });
ok(rN.top_categories.includes('cooling'), 'north midsummer recommends cooling/fans');
ok(rS.top_categories.includes('heating'), 'south midwinter recommends heating (opposite of the north, same date)');
ok(rT.top_categories.includes('rain_gear'), 'tropical July recommends rain gear');
ok(rN.categories.every(c => c.key && c.th && c.en && c.why), 'every category carries key+th+en+why (guidance, not bare labels)');
ok(rN.solar_term.cn === '大暑' && rS.solar_term.cn === '大暑' && rT.solar_term.cn === '大暑', 'all three zones report the SAME solar term (the China-facing hook is shared)');
ok(Object.keys(rN.group_actions).length === 5 && rN.group_actions.producer && rN.group_actions.affiliate, 'group_actions covers all 5 groups');

console.log('\n=== next term + countdown (deterministic) ===');
const nx = nextSolarTerm(dSummer);
ok(nx.cn === '立秋' && nx.days_until === 15, `2026-07-24 → next 立秋 in 15 days (got ${nx.cn}/${nx.days_until})`);
const nxWrap = nextSolarTerm(D(2026, 12, 25)); // after 冬至 → wraps to 小寒 next year
ok(nxWrap.cn === '小寒' && nxWrap.days_until > 0, `after 冬至 → next 小寒 next year in ${nxWrap.days_until} days (year wrap)`);

console.log('\n=== invariants ===');
ok(_terms.length === 24, 'exactly 24 solar terms defined');
ok(_zones.length === 3, 'three climate zones');
ok(recommend({ date: dSummer, zone: 'bogus' }).zone === 'tropical', 'an unknown zone falls back to tropical (safe default)');
ok(recommend({ date: 'not-a-date', zone: 'tropical' }).solar_term.cn.length > 0, 'a bad date falls back to "now" (never throws)');

console.log('\n=== brick 2: trend-direction overlay → product angles (deterministic fusion) ===');
const ang = productAngles({ date: dSummer, zone: 'tropical' }); // 大暑 tropical → rainy
ok(ang.angles.length === 9, `3 top categories × 3 trends = 9 angles (got ${ang.angles.length})`);
ok(ang.angles.every(a => a.category && a.trend && a.angle && a.why), 'every angle carries category+trend+angle+why');
ok(ang.angles.every(a => _trends[a.trend]), 'every angle references a defined trend direction');
ok(ang.angles.some(a => a.category === 'rain_gear' && a.trend === 'eco' && /ใช้ซ้ำ|รีไซเคิล/.test(a.angle)),
  'rain-gear × eco → a reusable/recyclable angle (fusion is meaningful, tropical July)');
ok(ang.angles.every(a => a.trend === 'value' || a.trend === 'digital' || a.trend === 'health' || a.trend === 'eco' || a.trend === 'local'),
  'trends are drawn only from the structural set');
ok(ang.angles.filter(a => a.trend === 'value').length === 3 && ang.angles.filter(a => a.trend === 'digital').length === 3,
  'value + digital apply to every top category (near-universal trends)');
const angHealth = productAngles({ date: D(2026, 12, 22), zone: 'north_temperate' }); // winter → hot_food/immunity present
ok(angHealth.angles.some(a => a.trend === 'health'), 'a health-ish winter category picks up the health trend as its third');
ok(Object.keys(ang.group_plays).length === 5, 'group_plays covers all 5 groups');
ok(/scrape/.test(ang.note) && /LLM/.test(ang.note), 'note is honest: structural trends, not scraped/LLM');

console.log('\n=== localization: the platform serves th/en/zh, so the engine does too (deterministic, no LLM) ===');
ok(_langs.length === 3 && _langs.includes('en') && _langs.includes('zh'), 'three languages supported (th/en/zh)');
// default is th, and it must be byte-identical prose to before the localization change (backward compat)
const angTh = productAngles({ date: dSummer, zone: 'tropical' });
ok(angTh.lang === 'th', 'default lang is th');
ok(/ร่ม|เสื้อกันฝน/.test(angTh.angles.find(a => a.category === 'rain_gear').angle), 'th angle text stays Thai (rain gear)');
const angEn = productAngles({ date: dSummer, zone: 'tropical', lang: 'en' });
const angZh = productAngles({ date: dSummer, zone: 'tropical', lang: 'zh' });
ok(angEn.lang === 'en' && angZh.lang === 'zh', 'lang is echoed back');
ok(angEn.angles.length === 9 && angZh.angles.length === 9, 'localization does not change the number of angles');
const rgEn = angEn.angles.find(a => a.category === 'rain_gear' && a.trend === 'eco');
ok(/Rain gear/.test(rgEn.category_label) && /Reusable|recyclable/i.test(rgEn.angle), 'en: rain-gear × eco angle is in English');
ok(/[A-Za-z]/.test(rgEn.why) && !/[฀-๿]/.test(rgEn.why), 'en: the "why" has no Thai characters');
const rgZh = angZh.angles.find(a => a.category === 'rain_gear' && a.trend === 'eco');
ok(/雨伞|雨衣/.test(rgZh.category_label) && /[一-鿿]/.test(rgZh.angle), 'zh: rain-gear angle is in Chinese');
// the always-Thai contract fields stay Thai even when lang=en
ok(/[฀-๿]/.test(rgEn.category_th) && /[฀-๿]/.test(rgEn.trend_th), 'en: the _th fields remain Thai (backward-compat contract)');
ok(/[฀-๿]/.test(angEn.local_season.th) && /Rainy/.test(angEn.local_season.label), 'en: local_season keeps .th (Thai) and adds .label (English)');
ok(/[A-Za-z]/.test(angEn.solar_term.label) && angEn.solar_term.th === angTh.solar_term.th, 'en: solar_term.label is localized, .th unchanged');
ok(/[A-Za-z]/.test(angEn.group_plays.affiliate) && /[一-鿿]/.test(angZh.group_plays.affiliate), 'group_plays localize (en Latin, zh CJK)');
ok(/scrape|LLM/.test(angEn.note) && /LLM/.test(angZh.note), 'localized notes stay honest (no scraping / no LLM claim in every language)');
// recommend() localizes too
const recEn = recommend({ date: dSummer, zone: 'tropical', lang: 'en' });
ok(/[A-Za-z]/.test(recEn.group_actions.producer) && recEn.zone_label && /Tropical/.test(recEn.zone_label), 'recommend(): group_actions + zone_label localize to en');
ok(recEn.categories.every(c => c.key && c.th && c.en && c.zh && c.why && c.why_en && c.why_zh), 'every category now carries th/en/zh names + th/en/zh why');
// zonesInfo localizes and always keeps the Thai reference
const zi = zonesInfo('en');
ok(zi.length === 3 && zi.every(z => z.key && /[฀-๿]/.test(z.th) && /[A-Za-z]/.test(z.label)), 'zonesInfo(en): key + Thai .th + English .label for all 3 zones');
// unknown language is a safe no-throw fallback to th
ok(productAngles({ date: dSummer, zone: 'tropical', lang: 'fr' }).lang === 'th', 'an unknown language falls back to th (never throws)');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
