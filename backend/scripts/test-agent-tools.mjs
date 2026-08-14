// Deterministic unit test (no server) — the Thai function-calling tool registry (agent-tools.js).
// Focus: the new `seasonal_recommend` tool that lets the platform's conversational AI answer
// "what should I push/buy this season?" from the deterministic seasonal engine, in th/en/zh —
// wired through the exact executeTool(context) path server.js uses. No LLM and no network here:
// we inject the REAL seasonal engine as context and assert the tool's compact, localized output.
import { TOOL_DEFINITIONS, toGeminiTools, executeTool } from '../agent-tools.js';
import { productAngles, recommend } from '../seasonal-engine.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const seasonalCtx = { seasonal: { productAngles, recommend } };
const D = '2026-07-24'; // 大暑 · tropical → rainy

console.log('=== the tool is registered with a well-formed schema ===');
const tool = TOOL_DEFINITIONS.find((t) => t.name === 'seasonal_recommend');
ok(!!tool, 'seasonal_recommend is in TOOL_DEFINITIONS');
ok(tool && /24 ฤดูกาล|节气/.test(tool.description), 'description names the 24 solar terms (honest about what it is)');
ok(tool && tool.input_schema.type === 'object', 'input_schema is an object schema');
ok(tool && tool.input_schema.properties.group.enum.length === 5, 'group enum covers all 5 groups');
ok(tool && tool.input_schema.properties.zone.enum.includes('tropical'), 'zone enum includes tropical');
ok(tool && tool.input_schema.properties.lang.enum.join() === 'th,en,zh', 'lang enum is th,en,zh');
ok(tool && (!tool.input_schema.required || tool.input_schema.required.length === 0), 'no field is required (all sensible defaults)');

console.log('\n=== executeTool runs the real engine and returns a compact, localized slice ===');
const rTh = await executeTool('seasonal_recommend', { zone: 'tropical', date: D, group: 'affiliate', lang: 'th' }, seasonalCtx);
ok(rTh.date === D && rTh.zone === 'tropical', 'echoes date + zone');
ok(rTh.recommendation_for === 'affiliate', 'reports which group the play is for');
ok(typeof rTh.play === 'string' && rTh.play.length > 0, 'includes a group-specific play string');
ok(Array.isArray(rTh.angles) && rTh.angles.length > 0 && rTh.angles.length <= 6, '1–6 angles (compact, not the whole payload)');
ok(rTh.angles.every((a) => a.trend && a.category && a.angle), 'every angle has trend + category + angle');
ok(/[฀-๿]/.test(rTh.angles[0].angle), 'th: angle text is Thai');
ok(/scrape|LLM/.test(rTh.note || ''), 'carries the honest note (not scraped, no LLM)');

console.log('\n=== the same tool call localizes to en / zh ===');
const rEn = await executeTool('seasonal_recommend', { zone: 'tropical', date: D, group: 'producer', lang: 'en' }, seasonalCtx);
ok(/[A-Za-z]/.test(rEn.angles[0].angle) && !/[฀-๿]/.test(rEn.angles[0].angle), 'en: angle text is English (no Thai chars)');
ok(/Rainy|Major Heat|Tropical/.test(`${rEn.season} ${rEn.solar_term} ${rEn.zone_label}`), 'en: season/term/zone labels are localized');
const rZh = await executeTool('seasonal_recommend', { zone: 'tropical', date: D, group: 'consumer', lang: 'zh' }, seasonalCtx);
ok(/[一-鿿]/.test(rZh.angles[0].angle), 'zh: angle text is Chinese');
ok(rZh.recommendation_for === 'consumer' && /[一-鿿]/.test(rZh.play), 'zh: consumer play is Chinese');

console.log('\n=== safe defaults + graceful degradation ===');
const rDefault = await executeTool('seasonal_recommend', { date: D }, seasonalCtx);
ok(rDefault.recommendation_for === 'producer' && rDefault.zone === 'tropical', 'no group/zone → producer + tropical defaults');
const rBadGroup = await executeTool('seasonal_recommend', { group: 'nobody', date: D }, seasonalCtx);
ok(rBadGroup.recommendation_for === 'producer', 'an unknown group falls back to producer');
const rNoCtx = await executeTool('seasonal_recommend', { date: D }, {});
ok(rNoCtx.error && /not available/.test(rNoCtx.error), 'without the seasonal engine in context → a clean error, no throw');
const rBadDate = await executeTool('seasonal_recommend', { date: 'not-a-date' }, seasonalCtx);
ok(rBadDate.solar_term && rBadDate.angles.length > 0, 'a bad date falls back to "now" (never throws)');

console.log('\n=== the tool is exposed to Gemini too + existing tools untouched ===');
const gem = toGeminiTools();
ok(gem[0].functionDeclarations.some((f) => f.name === 'seasonal_recommend' && f.parameters), 'toGeminiTools() advertises seasonal_recommend with parameters');
ok(TOOL_DEFINITIONS.map((t) => t.name).filter((n, i, a) => a.indexOf(n) === i).length === TOOL_DEFINITIONS.length, 'no duplicate tool names');
ok((await executeTool('unknown_tool', {}, seasonalCtx)).error === 'unknown tool: unknown_tool', 'an unknown tool name → error (unchanged)');
ok((await executeTool('track_order', { order_id: 'x', contact: 'y' }, {})).error === 'orders module not available', 'existing tools still degrade cleanly when their module is absent');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
