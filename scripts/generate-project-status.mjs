#!/usr/bin/env node
// ── Project Status Generator — single source of truth for OpenThaiAi ─────────
// Derives project facts straight from the repo (git log, skills registry,
// route map, migration files, live health check) instead of a hand-maintained
// summary that silently goes stale. Two consumers:
//   1. .claude/scripts/daily-briefing.sh — wraps this in the SessionStart hook JSON
//   2. PROJECT_STATUS.md (written by this script) — paste into Gemini/Grok so all
//      three assistants start a conversation from the same real facts.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const sh = (cmd) => { try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; } };

// ── Git state ──────────────────────────────────────────────────────────────
const branch = sh('git rev-parse --abbrev-ref HEAD') || 'unknown';
const ahead = sh('git log --oneline origin/main..HEAD 2>/dev/null').split('\n').filter(Boolean).length;
const recentCommits = sh('git log -8 --format="%h %s (%ar)"').split('\n').filter(Boolean);

// ── Skills registry — parsed straight from backend/server.js ────────────────
function parseSkills() {
  let src;
  try { src = readFileSync(join(ROOT, 'backend/server.js'), 'utf8'); } catch { return []; }
  const start = src.indexOf('const SKILLS_REGISTRY');
  if (start < 0) return [];
  const end = src.indexOf('\n];', start);
  const block = src.slice(start, end);
  const skills = [];
  const re = /id:\s*'([^']+)'[^}]*?name:\s*'([^']+)'[^}]*?category:\s*'([^']+)'[^}]*?endpoint:\s*'([^']+)'[^}]*?status:\s*'([^']+)'(?:[^}]*?requires:\s*'([^']+)')?/g;
  let m;
  while ((m = re.exec(block))) {
    skills.push({ id: m[1], name: m[2], category: m[3], endpoint: m[4], status: m[5], requires: m[6] || null });
  }
  return skills;
}

// ── Route map — parsed straight from frontend/src/App.jsx ───────────────────
function parseRoutes() {
  let src;
  try { src = readFileSync(join(ROOT, 'frontend/src/App.jsx'), 'utf8'); } catch { return []; }
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

// ── Migration files present in repo ──────────────────────────────────────────
function listMigrations() {
  return sh(`ls backend/migrations/*.sql 2>/dev/null`).split('\n').filter(Boolean).map((p) => p.split('/').pop());
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

async function main() {
  const skills = parseSkills();
  const routes = parseRoutes();
  const migrations = listMigrations();
  const health = await checkHealth('https://www.openthai-ai.com/api/health');

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
  lines.push(`## Recent commits`);
  recentCommits.forEach((c) => lines.push(`- ${c}`));
  lines.push('');
  lines.push(`## Production health (${health.ok ? '✅ reachable' : '⚠️ ' + health.note})`);
  if (health.ok) lines.push('```json\n' + JSON.stringify(health.data, null, 2) + '\n```');
  lines.push('');
  lines.push(`## Skills registry (${skills.length} total, ${active} active, ${needsKey.length} need setup)`);
  lines.push('| ID | Name | Endpoint | Status |');
  lines.push('|---|---|---|---|');
  skills.forEach((s) => lines.push(`| ${s.id} | ${s.name} | \`${s.endpoint}\` | ${s.status}${s.requires ? ` (needs \`${s.requires}\`)` : ''} |`));
  lines.push('');
  lines.push(`## Route map (${routes.length} routes)`);
  lines.push('| Path | Component | Access |');
  lines.push('|---|---|---|');
  routes.forEach((r) => lines.push(`| ${r.path} | ${r.comp} | ${r.auth ? 'auth' : 'public'} |`));
  lines.push('');
  lines.push(`## Migration files present (backend/migrations/)`);
  lines.push(`Presence here means the SQL exists in the repo — it does **not** mean it has been run against the live Supabase project. Verify in the Supabase SQL Editor.`);
  migrations.forEach((m) => lines.push(`- ${m}`));
  lines.push('');

  const md = lines.join('\n');
  writeFileSync(join(ROOT, 'PROJECT_STATUS.md'), md + '\n', 'utf8');
  process.stdout.write(md);
}

main();
