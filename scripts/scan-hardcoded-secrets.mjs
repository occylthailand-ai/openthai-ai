#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOTS = ['frontend/src', 'backend'];
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const SKIP_DIRECTORIES = new Set(['node_modules', 'dist', 'coverage', '.git']);
const SECRET_PATTERN = /(api_key|apikey|secret_key|password)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/i;
const SAFE_REFERENCE_PATTERN = /process\.env|import\.meta\.env|example|placeholder|YOUR_|xxx/i;

function filesUnder(path) {
  const entries = readdirSync(path, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (entry.isDirectory()) {
      return SKIP_DIRECTORIES.has(entry.name) ? [] : filesUnder(join(path, entry.name));
    }
    return entry.isFile() && EXTENSIONS.has(extname(entry.name)) ? [join(path, entry.name)] : [];
  });
}

const findings = [];
for (const root of ROOTS) {
  const path = join(ROOT, root);
  if (!statSync(path).isDirectory()) throw new Error(`Secret scan root is not a directory: ${root}`);
  for (const file of filesUnder(path)) {
    readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      if (SECRET_PATTERN.test(line) && !SAFE_REFERENCE_PATTERN.test(line)) {
        findings.push(`${relative(ROOT, file)}:${index + 1}`);
      }
    });
  }
}

if (findings.length) {
  console.error(`Hardcoded secret scan failed (${findings.length} potential finding(s)):`);
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log('Hardcoded secret scan passed.');
}
