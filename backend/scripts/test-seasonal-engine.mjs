// Deterministic unit test (no server) — the 24-solar-terms (节气) × climate-zone demand engine.
// Pins the behaviour that makes the tool "point the right way": correct term per date (incl. the
// Jan 1–5 wrap to 冬至), and — the core insight — the SAME term maps to OPPOSITE local seasons in
// the northern vs southern hemisphere, and to the tropical rainy/hot/cool cycle by month.
import { recommend, solarTermFor, nextSolarTerm, localSeasonFor, _terms, _zones } from '../seasonal-engine.js';

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

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
