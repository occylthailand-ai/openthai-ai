import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { hostname } from 'node:os';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class LockError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LockError';
  }
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

export function sha256(value) {
  const input = typeof value === 'string' || Buffer.isBuffer(value)
    ? value
    : stableStringify(value);
  return createHash('sha256').update(input).digest('hex');
}

export function readJson(path, label = path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read ${label}: ${error.message}`, { cause: error });
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new ValidationError(`Invalid JSON in ${label}: ${error.message}`);
  }
}

export function atomicWriteJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const descriptor = openSync(temporary, 'wx');
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      renameSync(temporary, path);
      return;
    } catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 9) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25 * (attempt + 1));
    }
  }
}

export function resolveInside(root, candidate, label = 'path') {
  const rootPath = resolve(root);
  const resolved = resolve(rootPath, candidate);
  const rel = relative(rootPath, resolved);
  if (rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel)) {
    throw new ValidationError(`${label} must stay inside ${rootPath}`);
  }
  return resolved;
}

export function assertNoSensitiveKeys(value, path = 'input') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSensitiveKeys(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.replace(/[-_]/g, '').toLowerCase();
    if (/(?:clientsecret|apisecret|apikey|password|credentials?|privatekey|secretkey|accesstoken|refreshtoken)$/.test(normalizedKey)) {
      throw new ValidationError(`${path}.${key} is not allowed; secrets must not enter engine state`);
    }
    assertNoSensitiveKeys(child, `${path}.${key}`);
  }
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'EPERM') return true;
    if (error.code === 'ESRCH') return false;
    throw error;
  }
}

export function acquireFileLock(path, { staleMs = 300_000, now = Date.now } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  const token = randomUUID();
  const lock = {
    token,
    pid: process.pid,
    host: hostname(),
    createdAt: new Date(now()).toISOString(),
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let descriptor;
    try {
      descriptor = openSync(path, 'wx');
      writeFileSync(descriptor, JSON.stringify(lock), 'utf8');
      closeSync(descriptor);
      let released = false;
      return () => {
        if (released || !existsSync(path)) return;
        const current = readJson(path, 'lock file');
        if (current.token !== token) {
          throw new LockError(`Refusing to release lock not owned by this process: ${path}`);
        }
        rmSync(path);
        released = true;
      };
    } catch (error) {
      if (descriptor !== undefined) closeSync(descriptor);
      if (error.code !== 'EEXIST') throw error;
      const existing = readJson(path, 'lock file');
      const age = now() - new Date(existing.createdAt).getTime();
      const sameHostAndAlive = existing.host === hostname() && processIsAlive(existing.pid);
      if (attempt === 0 && age > staleMs && !sameHostAndAlive) {
        rmSync(path);
        continue;
      }
      throw new LockError(`Lock is already held: ${path}`);
    }
  }
  throw new LockError(`Could not acquire lock: ${path}`);
}

export function assertObject(value, label, problems) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    problems.push(`${label} must be an object`);
    return false;
  }
  return true;
}

export function assertString(value, label, problems, { pattern, min = 1 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min) {
    problems.push(`${label} must be a non-empty string`);
    return;
  }
  if (pattern && !pattern.test(value)) problems.push(`${label} has an invalid format`);
}

export function fileSha256(path) {
  return sha256(readFileSync(path));
}

export function fileExists(path) {
  return existsSync(path) && statSync(path).isFile();
}

export function sleep(ms, signal) {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolvePromise) => {
    const timer = setTimeout(resolvePromise, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolvePromise();
    }, { once: true });
  });
}
