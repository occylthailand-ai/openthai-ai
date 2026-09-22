#!/usr/bin/env node
/**
 * OpenThaiAi — Limits Fix Tool
 *
 * Usage:
 *   node scripts/limits-tool.mjs report           — show all current limits in a table
 *   node scripts/limits-tool.mjs audit             — scan source for hardcoded values that
 *                                                    differ from central config
 *   node scripts/limits-tool.mjs validate          — check internal consistency rules
 *   node scripts/limits-tool.mjs set <key> <value> — update a limit  (e.g. set RATE.generate.max 20)
 *   node scripts/limits-tool.mjs export [json|csv] — dump limits to stdout
 *
 * The "single source of truth" is backend/config/limits.js.
 * All other files should import from there; this tool detects drift.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const LIMITS_PATH = join(ROOT, 'backend', 'config', 'limits.js');

// ─── ANSI colours ─────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
};
const isTTY = process.stdout.isTTY;
const c = (color, str) => isTTY ? `${C[color]}${str}${C.reset}` : str;
const bold  = (s) => c('bold',  s);
const dim   = (s) => c('dim',   s);
const ok    = (s) => c('green', s);
const warn  = (s) => c('yellow', s);
const err   = (s) => c('red',   s);
const info  = (s) => c('cyan',  s);

// ─── Load central limits ─────────────────────────────────────────────────────
async function loadLimits() {
  try {
    const mod = await import(`file://${LIMITS_PATH.replace(/\\/g, '/')}`);
    return mod;
  } catch (e) {
    console.error(err(`❌  Cannot load ${LIMITS_PATH}: ${e.message}`));
    process.exit(1);
  }
}

// ─── Flatten nested object to dotted keys ────────────────────────────────────
function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

// ─── Walk source files ────────────────────────────────────────────────────────
function walkJS(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'config') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkJS(full, files);
    else if (/\.(js|mjs|ts)$/.test(entry)) files.push(full);
  }
  return files;
}

// ─── Patterns that hint at a hardcoded limit ─────────────────────────────────
// Each has: regex, group index for the value, friendly label, canonical config key
const HARDCODED_PATTERNS = [
  // rateLimit({ windowMs: ..., max: N })
  { re: /rateLimit\s*\(\s*\{[^}]*max\s*:\s*(\d+)/g,          vi: 1, label: 'rateLimit.max',   key: 'RATE.*.max' },
  { re: /windowMs\s*:\s*(\d+(?:\s*\*\s*\d+(?:\s*\*\s*\d+)?)?)/g, vi: 1, label: 'windowMs',  key: 'RATE.*.windowMs' },
  // max_tokens: N
  { re: /max_tokens\s*:\s*(\d+)/g,                             vi: 1, label: 'max_tokens',     key: 'AI.*' },
  // limit: 'N'  or  limit: N  (Supabase query)
  { re: /['"]limit['"]\s*:\s*['""]?(\d+)['""]?/g,             vi: 1, label: 'supabase.limit',  key: 'QUERY.*' },
  // timeout: N  (ms literal)
  { re: /timeout\s*[=:]\s*(\d{4,})/g,                         vi: 1, label: 'timeout',         key: 'TIMEOUT.*' },
  // MAX_BALANCE / maxBalance etc.
  { re: /MAX_BALANCE\s*=\s*(\d+)/g,                            vi: 1, label: 'MAX_BALANCE',     key: 'CREDITS.maxBalance' },
  { re: /MAX_CLAIM\s*=\s*(\d+)/g,                              vi: 1, label: 'MAX_CLAIM',       key: 'CREDITS.maxClaim' },
  { re: /STREAK_MAX_BONUS\s*=\s*(\d+)/g,                       vi: 1, label: 'STREAK_MAX_BONUS',key: 'CREDITS.streakMaxBonus' },
  { re: /affiliate_depth_max\s*\|\|\s*(\d+)/g,                 vi: 1, label: 'chainDepthMax',   key: 'AFFILIATE.chainDepthMax' },
  // express.json({ limit: '...' })
  { re: /express\.json\s*\(\s*\{[^}]*limit\s*:\s*'([^']+)'/g, vi: 1, label: 'body.json',       key: 'BODY.json' },
];

// Files we expect to import from config/limits.js after migration
const MIGRATED_FILES = [
  'backend/server.js',
  'backend/tenant-manager.js',
  'backend/credits.js',
  'backend/voice-commander.js',
  'backend/video-generator.js',
  'backend/matching.js',
  'backend/disputes.js',
  'backend/producers.js',
  'backend/webhook-system.js',
  'backend/preflight.js',
];

// ─── REPORT command ──────────────────────────────────────────────────────────
async function cmdReport(lim) {
  console.log(`\n${bold('OpenThaiAi — Limits Report')}  ${dim(new Date().toISOString())}\n`);

  const sections = [
    { label: 'Rate Limits',             data: lim.RATE,     unit: (k) => k.endsWith('.max') ? 'req' : 'ms' },
    { label: 'Plan Entitlements',       data: lim.PLANS,    unit: () => '' },
    { label: 'AI Token Limits',         data: { tokens: lim.AI }, unit: () => 'tokens' },
    { label: 'Credit Caps',             data: { credits: lim.CREDITS }, unit: () => 'credits' },
    { label: 'Supabase Query Ceilings', data: { query: lim.QUERY }, unit: () => 'rows' },
    { label: 'Body Size Limits',        data: { body: lim.BODY },   unit: () => '' },
    { label: 'Timeouts',                data: { timeout: lim.TIMEOUT }, unit: () => 'ms' },
    { label: 'Affiliate Rules',         data: { affiliate: lim.AFFILIATE }, unit: () => '' },
    { label: 'Matching Caps',           data: { matching: lim.MATCHING }, unit: () => 'rows' },
  ];

  for (const sec of sections) {
    console.log(`${bold(info('▸ ' + sec.label))}`);
    const flat = flatten(sec.data);
    for (const [key, val] of Object.entries(flat)) {
      const pad = 45;
      const k = key.padEnd(pad);
      console.log(`  ${dim(k)} ${ok(String(val))}`);
    }
    console.log();
  }
}

// ─── AUDIT command ────────────────────────────────────────────────────────────
async function cmdAudit(lim) {
  console.log(`\n${bold('OpenThaiAi — Limits Audit')}  ${dim('scanning source files…')}\n`);

  // Build a set of central values for quick lookup
  const flatLimits = {
    ...flatten(lim.RATE,      'RATE'),
    ...flatten(lim.PLANS,     'PLANS'),
    ...flatten({ AI: lim.AI }),
    ...flatten({ CREDITS: lim.CREDITS }),
    ...flatten({ QUERY: lim.QUERY }),
    ...flatten({ BODY: lim.BODY }),
    ...flatten({ TIMEOUT: lim.TIMEOUT }),
    ...flatten({ AFFILIATE: lim.AFFILIATE }),
    ...flatten({ MATCHING: lim.MATCHING }),
  };
  const centralValues = new Set(Object.values(flatLimits).map(String));

  const backendDir  = join(ROOT, 'backend');
  const scriptsDir  = join(ROOT, 'scripts');
  const frontendDir = join(ROOT, 'frontend', 'src');

  const files = [
    ...walkJS(backendDir),
    ...walkJS(scriptsDir),
    ...(existsSync(frontendDir) ? walkJS(frontendDir) : []),
  ];

  const findings = [];
  const configImportRe = /from ['"].*config\/limits(?:\.js)?['"]/;

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (rel.includes('config/limits')) continue; // skip the source itself
    if (rel.includes('limits-tool')) continue;    // skip this script

    let src;
    try { src = readFileSync(file, 'utf8'); } catch { continue; }

    const hasImport = configImportRe.test(src);

    for (const pat of HARDCODED_PATTERNS) {
      pat.re.lastIndex = 0;
      let m;
      while ((m = pat.re.exec(src)) !== null) {
        const val = m[pat.vi].replace(/\s/g, ''); // e.g. "60*1000" → "60*1000"
        // eval-safe numeric expression — only digits, *, whitespace
        let numeric = val;
        if (/^[\d\s\*]+$/.test(val)) {
          try { numeric = String(eval(val)); } catch { /* keep as-is */ }
        }
        const inCentral = centralValues.has(numeric) || centralValues.has(val);
        findings.push({ file: rel, line: lineOf(src, m.index), label: pat.label, value: val, numeric, inCentral, hasImport });
      }
    }
  }

  // Group by file
  const byFile = {};
  for (const f of findings) {
    (byFile[f.file] ??= []).push(f);
  }

  let driftCount = 0;
  let okCount = 0;

  for (const [file, items] of Object.entries(byFile).sort()) {
    const drifts = items.filter(i => !i.inCentral);
    const oks    = items.filter(i =>  i.inCentral);
    okCount    += oks.length;
    driftCount += drifts.length;

    if (drifts.length === 0) continue; // only show files with issues

    console.log(`${warn('⚠')}  ${bold(file)}`);
    for (const d of drifts) {
      console.log(`   ${dim('L' + d.line).padEnd(8)} ${err(d.label.padEnd(20))} value=${warn(d.value)}  ${dim('(not in central config)')}`);
    }
    console.log();
  }

  // Migration check
  console.log(bold(info('▸ Migration status (expected imports from config/limits.js)')));
  for (const mf of MIGRATED_FILES) {
    const full = join(ROOT, mf);
    if (!existsSync(full)) { console.log(`  ${dim('⊘')}  ${dim(mf)}  ${dim('(file not found)')}`); continue; }
    const src = readFileSync(full, 'utf8');
    const imported = configImportRe.test(src);
    console.log(`  ${imported ? ok('✔') : warn('✗')}  ${mf}`);
  }

  console.log();
  console.log(bold('Summary:'));
  console.log(`  ${ok(String(okCount))}  values match central config`);
  console.log(`  ${driftCount > 0 ? err(String(driftCount)) : ok('0')}  values differ (potential drift)`);
  if (driftCount > 0) {
    console.log(`\n  ${dim('Run')} ${info('node scripts/limits-tool.mjs report')} ${dim('to see current central values.')}`);
  }
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

// ─── VALIDATE command ─────────────────────────────────────────────────────────
async function cmdValidate(lim) {
  console.log(`\n${bold('OpenThaiAi — Limits Validation')}\n`);

  const issues = [];
  const pass   = [];

  function check(name, ok, msg) {
    if (ok) pass.push(name);
    else     issues.push({ name, msg });
  }

  // Plan ordering
  const planOrder = ['free', 'starter', 'pro', 'enterprise'];
  const fields    = ['agents', 'generates_per_day', 'memory_slots', 'webhooks'];
  for (const field of fields) {
    for (let i = 1; i < planOrder.length; i++) {
      const lo = planOrder[i - 1], hi = planOrder[i];
      check(
        `PLANS.${lo}.${field} < PLANS.${hi}.${field}`,
        lim.PLANS[lo][field] < lim.PLANS[hi][field],
        `${lo}.${field}=${lim.PLANS[lo][field]} should be < ${hi}.${field}=${lim.PLANS[hi][field]}`,
      );
    }
  }

  // Rate limits sanity
  check('RATE.auth.max >= 10',           lim.RATE.auth.max >= 10,          `auth.max=${lim.RATE.auth.max} seems too low`);
  check('RATE.generate.max >= 1',        lim.RATE.generate.max >= 1,       `generate.max too low`);
  check('RATE.admin.max >= RATE.auth.max',
    lim.RATE.admin.max >= lim.RATE.auth.max,
    `admin.max should be >= auth.max`);
  check('RATE.generate.windowMs > 0',    lim.RATE.generate.windowMs > 0,   'windowMs must be positive');

  // AI tokens
  check('AI.voice <= AI.generate',       lim.AI.voice <= lim.AI.generate,  `voice tokens (${lim.AI.voice}) should be <= generate (${lim.AI.generate})`);
  check('AI.mcp >= AI.video',            lim.AI.mcp >= lim.AI.video,       `mcp tokens (${lim.AI.mcp}) should be >= video (${lim.AI.video})`);

  // Credits
  check('CREDITS.maxBalance > CREDITS.maxClaim',
    lim.CREDITS.maxBalance > lim.CREDITS.maxClaim,
    `maxBalance (${lim.CREDITS.maxBalance}) must exceed maxClaim (${lim.CREDITS.maxClaim})`);
  check('CREDITS.streakMaxBonus < CREDITS.maxClaim',
    lim.CREDITS.streakMaxBonus < lim.CREDITS.maxClaim,
    `streakMaxBonus (${lim.CREDITS.streakMaxBonus}) should be < maxClaim (${lim.CREDITS.maxClaim})`);

  // Matching
  check('MATCHING.maxLimit >= MATCHING.defaultLimit',
    lim.MATCHING.maxLimit >= lim.MATCHING.defaultLimit,
    `maxLimit (${lim.MATCHING.maxLimit}) should be >= defaultLimit (${lim.MATCHING.defaultLimit})`);
  check('MATCHING.suggestMax >= MATCHING.suggestDefault',
    lim.MATCHING.suggestMax >= lim.MATCHING.suggestDefault,
    `suggestMax (${lim.MATCHING.suggestMax}) should be >= suggestDefault (${lim.MATCHING.suggestDefault})`);

  // Affiliate
  check('AFFILIATE.chainDepthMax >= 1',
    lim.AFFILIATE.chainDepthMax >= 1,
    `chainDepthMax must be at least 1`);
  check('AFFILIATE.chainDepthMax <= 5',
    lim.AFFILIATE.chainDepthMax <= 5,
    `chainDepthMax=${lim.AFFILIATE.chainDepthMax} > 5 may indicate MLM risk`);

  // Timeouts
  check('TIMEOUT.webhookDelivery <= 30000',
    lim.TIMEOUT.webhookDelivery <= 30_000,
    `webhookDelivery timeout=${lim.TIMEOUT.webhookDelivery}ms is very long`);

  for (const p of pass)   console.log(`  ${ok('✔')}  ${p}`);
  for (const i of issues) console.log(`  ${err('✖')}  ${i.name}  ${dim('—')}  ${warn(i.msg)}`);

  console.log();
  if (issues.length === 0) {
    console.log(ok(`All ${pass.length} checks passed.`));
  } else {
    console.log(`${pass.length} passed · ${err(String(issues.length))} failed`);
    console.log(dim(`Edit backend/config/limits.js to fix the issues above.`));
    process.exitCode = 1;
  }
}

// ─── SET command ─────────────────────────────────────────────────────────────
function cmdSet(keyPath, rawValue) {
  if (!keyPath || rawValue === undefined) {
    console.error(err('Usage: limits-tool.mjs set <KEY.PATH> <value>'));
    console.error(dim('  e.g.  set RATE.generate.max 20'));
    console.error(dim('  e.g.  set AI.voice 768'));
    process.exit(1);
  }

  // Parse value
  const value = /^\d+$/.test(rawValue) ? Number(rawValue)
    : rawValue === 'true'  ? true
    : rawValue === 'false' ? false
    : rawValue;

  // Read the source file as text
  let src = readFileSync(LIMITS_PATH, 'utf8');

  // We need to update the value at the dotted key path.
  // Strategy: find the last segment name and update its value in-place using regex.
  // This preserves comments and formatting.
  const parts = keyPath.split('.');
  const leaf  = parts[parts.length - 1];

  // Build a regex that matches `leaf: <old_value>` with optional surrounding context
  const numRe  = new RegExp(`(${leaf}\\s*:\\s*)([\\d_]+)`, 'g');
  const strRe  = new RegExp(`(${leaf}\\s*:\\s*)'([^']*)'`, 'g');

  let replaced = false;

  if (typeof value === 'number') {
    const newSrc = src.replace(numRe, (m, prefix, _old) => { replaced = true; return `${prefix}${value}`; });
    if (replaced) src = newSrc;
  } else if (typeof value === 'string') {
    const newSrc = src.replace(strRe, (m, prefix, _old) => { replaced = true; return `${prefix}'${value}'`; });
    if (replaced) src = newSrc;
  }

  if (!replaced) {
    console.error(warn(`⚠  Key '${leaf}' not found in limits config. Check the key path.`));
    process.exit(1);
  }

  writeFileSync(LIMITS_PATH, src, 'utf8');
  console.log(ok(`✔  ${keyPath} = ${value}`));
  console.log(dim(`   Written to backend/config/limits.js`));
}

// ─── EXPORT command ───────────────────────────────────────────────────────────
async function cmdExport(lim, format = 'json') {
  const all = {
    RATE:      lim.RATE,
    PLANS:     lim.PLANS,
    AI:        lim.AI,
    CREDITS:   lim.CREDITS,
    QUERY:     lim.QUERY,
    BODY:      lim.BODY,
    TIMEOUT:   lim.TIMEOUT,
    AFFILIATE: lim.AFFILIATE,
    MATCHING:  lim.MATCHING,
  };

  if (format === 'csv') {
    const flat = flatten(all);
    console.log('key,value');
    for (const [k, v] of Object.entries(flat)) {
      console.log(`${k},${v}`);
    }
  } else {
    console.log(JSON.stringify(all, null, 2));
  }
}

// ─── HELP ─────────────────────────────────────────────────────────────────────
function cmdHelp() {
  console.log(`
${bold('limits-tool')} — OpenThaiAi Central Limits Manager

${bold('COMMANDS')}
  ${info('report')}              Show all current limits in a formatted table
  ${info('audit')}               Scan source files for hardcoded values that drift from central config
  ${info('validate')}            Check internal consistency (plan ordering, token caps, etc.)
  ${info('set')} ${dim('<KEY> <VALUE>')}   Update a single limit value
                       e.g.  set RATE.generate.max 20
                             set AI.voice 768
                             set CREDITS.maxBalance 500
  ${info('export [json|csv]')}   Dump all limits to stdout

${bold('EXAMPLES')}
  node scripts/limits-tool.mjs report
  node scripts/limits-tool.mjs audit
  node scripts/limits-tool.mjs validate
  node scripts/limits-tool.mjs set PLANS.free.generates_per_day 20
  node scripts/limits-tool.mjs export csv > limits.csv

${bold('CONFIG FILE')}
  backend/config/limits.js — single source of truth, edit directly or via ${info('set')}
`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────
const [,, cmd, ...args] = process.argv;

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  cmdHelp();
  process.exit(0);
}

const lim = await loadLimits();

switch (cmd) {
  case 'report':               await cmdReport(lim);                   break;
  case 'audit':                await cmdAudit(lim);                    break;
  case 'validate':             await cmdValidate(lim);                 break;
  case 'set':                  cmdSet(args[0], args[1]);               break;
  case 'export':               await cmdExport(lim, args[0] || 'json'); break;
  default:
    console.error(err(`Unknown command: ${cmd}`));
    cmdHelp();
    process.exit(1);
}
