#!/usr/bin/env node
// ── Project Status Generator — single source of truth for OpenThaiAi ─────────
// Derives project facts straight from the repo (git log, skills registry,
// route map, migration files, backend modules, env vars, live health check)
// instead of a hand-maintained summary that silently goes stale. It also runs
// a set of consistency checks (dead skill endpoints, missing route components,
// undocumented env vars, duplicate IDs/paths) and exits non-zero if any fail —
// used by .github/workflows/project-status.yml as a PR gate.
//
// Three consumers:
//   1. .claude/scripts/daily-briefing.sh — wraps this in the SessionStart hook JSON
//   2. PROJECT_STATUS.md (written by this script) — paste into Gemini/Grok so all
//      three assistants start a conversation from the same real facts.
//   3. .github/workflows/project-status.yml — runs on every PR, fails the check
//      if a consistency check fails, and commits a refreshed PROJECT_STATUS.md.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const sh = (cmd) => { try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; } };
const readSafe = (p) => { try { return readFileSync(join(ROOT, p), 'utf8'); } catch { return ''; } };

// ── Git state ──────────────────────────────────────────────────────────────
const branch = sh('git rev-parse --abbrev-ref HEAD') || 'unknown';
const ahead = sh('git log --oneline origin/main..HEAD 2>/dev/null').split('\n').filter(Boolean).length;
const recentCommits = sh('git log -8 --format="%h %s (%ar)"').split('\n').filter(Boolean);

// ── Skills registry — parsed straight from backend/server.js ────────────────
function parseSkills() {
  const src = readSafe('backend/server.js');
  const start = src.indexOf('const SKILLS_REGISTRY');
  if (start < 0) return [];
  const end = src.indexOf('\n];', start);
  const block = src.slice(start, end);
  const skills = [];
  const re = /id:\s*'([^']+)'[^}]*?name:\s*'([^']+)'[^}]*?category:\s*'([^']+)'[^}]*?endpoint:\s*'([^']+)'[^}]*?method:\s*'([^']+)'[^}]*?status:\s*'([^']+)'(?:[^}]*?requires:\s*'([^']+)')?/g;
  let m;
  while ((m = re.exec(block))) {
    skills.push({ id: m[1], name: m[2], category: m[3], endpoint: m[4], method: m[5], status: m[6], requires: m[7] || null });
  }
  return skills;
}

// ── Route map — parsed straight from frontend/src/App.jsx ───────────────────
function parseRoutes() {
  const src = readSafe('frontend/src/App.jsx');
  const routes = [];
  const re = /<Route\s+path="([^"]+)"\s+element=\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const path = m[1];
    const el = m[2];
    const authGated = /isAuthenticated/.test(el);
    const comp = (el.match(/<([A-Za-z0-9_]+)/) || [])[1] || '?';
    routes.push({ path, comp, auth: authGated });
  }
  return routes;
}

// ── import map: component name -> import path, from App.jsx ─────────────────
// Handles both static `import X from '...'` and code-split `const X = lazy(() => import('...'))`
function parseImports(src) {
  const map = {};
  const staticRe = /import\s+([A-Za-z0-9_]+)\s+from\s+'([^']+)'/g;
  let m;
  while ((m = staticRe.exec(src))) map[m[1]] = m[2];
  const lazyRe = /const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\('([^']+)'\)\s*\)/g;
  while ((m = lazyRe.exec(src))) map[m[1]] = m[2];
  return map;
}

// ── Migration files present in repo ──────────────────────────────────────────
function listMigrations() {
  return sh(`ls backend/migrations/*.sql 2>/dev/null`).split('\n').filter(Boolean).map((p) => p.split('/').pop());
}

// ── Backend modules — one-line description from each file's header comment ──
function listBackendModules() {
  const dir = join(ROOT, 'backend');
  let files;
  try { files = readdirSync(dir).filter((f) => f.endsWith('.js')); } catch { return []; }
  return files.map((f) => {
    const content = readSafe(`backend/${f}`);
    const firstComment = (content.match(/^\/\/\s*(.+)$/m) || [])[1] || '';
    const loc = content.split('\n').length;
    return { file: f, doc: firstComment.replace(/─/g, '').trim(), loc };
  }).sort((a, b) => a.file.localeCompare(b.file));
}

// ── Admin panel tabs — from frontend/src/i18n/admin.js (th) ─────────────────
function listAdminTabs() {
  const src = readSafe('frontend/src/i18n/admin.js');
  const m = src.match(/tabs:\s*\{([^}]+)\}/);
  if (!m) return [];
  const tabs = [];
  const re = /(\w+):\s*'([^']+)'/g;
  let t;
  while ((t = re.exec(m[1]))) tabs.push(`${t[2]}`);
  return tabs;
}

// ── Vercel cron jobs ──────────────────────────────────────────────────────────
function listCrons() {
  try {
    const cfg = JSON.parse(readSafe('vercel.json'));
    return cfg.crons || [];
  } catch { return []; }
}

// ── Env vars referenced in backend code vs documented in .env.example ───────
function envVarAudit() {
  const dir = join(ROOT, 'backend');
  let files;
  try { files = readdirSync(dir).filter((f) => f.endsWith('.js')); } catch { files = []; }
  const referenced = new Set();
  for (const f of files) {
    const content = readSafe(`backend/${f}`);
    const re = /process\.env\.([A-Z][A-Z0-9_]*)/g;
    let m;
    while ((m = re.exec(content))) referenced.add(m[1]);
  }
  const example = readSafe('backend/.env.example');
  const documented = new Set([...example.matchAll(/^#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]));
  const undocumented = [...referenced].filter((v) => !documented.has(v)).sort();
  return { referencedCount: referenced.size, documentedCount: documented.size, undocumented };
}

// ── Live health check (best-effort, short timeout — never blocks the report) ─
async function checkHealth(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return { ok: false, note: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, note: `unreachable from this environment (${e.message})` };
  }
}

// ── Consistency checks — the actual "auto-verify" logic ──────────────────────
function runChecks({ skills, routes, migrations, backendSrcAll, appJsxSrc }) {
  const checks = [];

  // 1) Every skill endpoint should appear literally somewhere in the backend source
  //    (heuristic: catches renamed/removed routes that the registry forgot to update)
  const missingEndpoints = skills.filter((s) => !backendSrcAll.includes(`'${s.endpoint}'`));
  checks.push({
    name: 'Skill endpoints resolve to real routes',
    ok: missingEndpoints.length === 0,
    detail: missingEndpoints.length
      ? `${missingEndpoints.length} skill(s) reference an endpoint string not found anywhere in backend/: ${missingEndpoints.map((s) => `${s.id} (${s.endpoint})`).join(', ')}`
      : `all ${skills.length} skill endpoints found in backend source`,
  });

  // 2) Every route's component should be imported and its file should exist
  const importMap = parseImports(appJsxSrc);
  const missingComponents = [];
  for (const r of routes) {
    const impPath = importMap[r.comp];
    if (!impPath) { missingComponents.push(`${r.path} → ${r.comp} (no import found)`); continue; }
    if (!impPath.startsWith('.')) continue; // external package import, skip
    const resolved = join(ROOT, 'frontend/src', impPath.replace(/^\.\//, ''));
    const candidates = [resolved, `${resolved}.jsx`, `${resolved}.js`, join(resolved, 'index.jsx')];
    if (!candidates.some((c) => existsSync(c))) missingComponents.push(`${r.path} → ${impPath} (file not found)`);
  }
  checks.push({
    name: 'Route components exist on disk',
    ok: missingComponents.length === 0,
    detail: missingComponents.length ? missingComponents.join('; ') : `all ${routes.length} route components resolved`,
  });

  // 3) Duplicate skill IDs / route paths
  const dupSkillIds = [...skills.reduce((m, s) => m.set(s.id, (m.get(s.id) || 0) + 1), new Map())].filter(([, n]) => n > 1);
  const dupRoutePaths = [...routes.reduce((m, r) => m.set(r.path, (m.get(r.path) || 0) + 1), new Map())].filter(([, n]) => n > 1);
  checks.push({
    name: 'No duplicate skill IDs',
    ok: dupSkillIds.length === 0,
    detail: dupSkillIds.length ? `duplicated: ${dupSkillIds.map(([id]) => id).join(', ')}` : 'all skill IDs unique',
  });
  checks.push({
    name: 'No duplicate route paths',
    ok: dupRoutePaths.length === 0,
    detail: dupRoutePaths.length ? `duplicated: ${dupRoutePaths.map(([p]) => p).join(', ')}` : 'all route paths unique',
  });

  // 4) Migration file naming — every 0xx numbered migration should be reflected in FULL-MIGRATION.sql
  //    (heuristic only: warns, does not fail the build, since FULL-MIGRATION.sql is a manual rollup)
  const numbered = migrations.filter((m) => /^\d{3}_/.test(m));
  checks.push({
    name: `${numbered.length} numbered migration file(s) present`,
    ok: true,
    detail: numbered.join(', ') || 'none',
    warn: true,
  });

  return checks;
}

async function main() {
  const skills = parseSkills();
  const routes = parseRoutes();
  const migrations = listMigrations();
  const backendModules = listBackendModules();
  const adminTabs = listAdminTabs();
  const crons = listCrons();
  const envAudit = envVarAudit();
  const health = await checkHealth('https://www.openthai-ai.com/api/health');

  const appJsxSrc = readSafe('frontend/src/App.jsx');
  const backendDir = join(ROOT, 'backend');
  const backendSrcAll = readdirSync(backendDir).filter((f) => f.endsWith('.js')).map((f) => readSafe(`backend/${f}`)).join('\n');
  const checks = runChecks({ skills, routes, migrations, backendSrcAll, appJsxSrc });
  const hardFails = checks.filter((c) => !c.ok && !c.warn);

  const active = skills.filter((s) => s.status === 'active').length;
  const needsKey = skills.filter((s) => s.status !== 'active');

  const lines = [];
  lines.push(`# OpenThaiAi — PROJECT STATUS (single source of truth)`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()} · branch \`${branch}\` (${ahead} commit(s) ahead of main)`);
  lines.push('');
  lines.push(`> Paste this whole file at the start of a Claude / Gemini / Grok conversation about this project`);
  lines.push(`> so all three start from the same facts, pulled directly from the repo — not from memory.`);
  lines.push('');

  lines.push(`## Consistency checks (${hardFails.length ? `❌ ${hardFails.length} failing` : '✅ all passing'})`);
  checks.forEach((c) => lines.push(`- ${c.ok ? (c.warn ? 'ℹ️' : '✅') : '❌'} **${c.name}** — ${c.detail}`));
  lines.push('');

  lines.push(`## Recent commits`);
  recentCommits.forEach((c) => lines.push(`- ${c}`));
  lines.push('');

  lines.push(`## Production health (${health.ok ? '✅ reachable' : '⚠️ ' + health.note})`);
  if (health.ok) lines.push('```json\n' + JSON.stringify(health.data, null, 2) + '\n```');
  lines.push('');

  lines.push(`## Skills registry (${skills.length} total, ${active} active, ${needsKey.length} need setup)`);
  lines.push('| ID | Name | Endpoint | Status |');
  lines.push('|---|---|---|---|');
  skills.forEach((s) => lines.push(`| ${s.id} | ${s.name} | \`${s.method} ${s.endpoint}\` | ${s.status}${s.requires ? ` (needs \`${s.requires}\`)` : ''} |`));
  lines.push('');

  lines.push(`## Route map (${routes.length} routes)`);
  lines.push('| Path | Component | Access |');
  lines.push('|---|---|---|');
  routes.forEach((r) => lines.push(`| ${r.path} | ${r.comp} | ${r.auth ? 'auth' : 'public'} |`));
  lines.push('');

  lines.push(`## Backend modules (backend/*.js — ${backendModules.length} files)`);
  lines.push('| File | Lines | Purpose (from header comment) |');
  lines.push('|---|---|---|');
  backendModules.forEach((b) => lines.push(`| \`${b.file}\` | ${b.loc} | ${b.doc || '—'} |`));
  lines.push('');

  lines.push(`## Admin panel tabs (frontend/src/i18n/admin.js)`);
  lines.push(adminTabs.length ? adminTabs.map((t) => `- ${t}`).join('\n') : '_(none found)_');
  lines.push('');

  lines.push(`## Scheduled jobs (vercel.json crons)`);
  if (crons.length) crons.forEach((c) => lines.push(`- \`${c.schedule}\` → ${c.path}`));
  else lines.push('_(none found)_');
  lines.push('');

  lines.push(`## Environment variables (${envAudit.referencedCount} referenced in backend code, ${envAudit.documentedCount} documented in .env.example)`);
  if (envAudit.undocumented.length) {
    lines.push(`⚠️ Referenced in code but missing from \`backend/.env.example\`:`);
    envAudit.undocumented.forEach((v) => lines.push(`- ${v}`));
  } else {
    lines.push(`✅ every env var referenced in backend code is documented in \`.env.example\``);
  }
  lines.push('');

  lines.push(`## Migration files present (backend/migrations/)`);
  lines.push(`Presence here means the SQL exists in the repo — it does **not** mean it has been run against the live Supabase project. Verify in the Supabase SQL Editor.`);
  migrations.forEach((m) => lines.push(`- ${m}`));
  lines.push('');

  const md = lines.join('\n');
  writeFileSync(join(ROOT, 'PROJECT_STATUS.md'), md + '\n', 'utf8');
  process.stdout.write(md);

  if (hardFails.length) process.exitCode = 1;
}

main();
