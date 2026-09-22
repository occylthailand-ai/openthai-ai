import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { acquireFileLock, sha256, stableStringify, ValidationError } from './utils.mjs';

function parseLines(path) {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, 'utf8');
  if (!raw.trim()) return [];
  return raw.trimEnd().split('\n').map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new ValidationError(`Audit ledger line ${index + 1} is invalid JSON: ${error.message}`);
    }
  });
}

export function verifyAuditLedger(path) {
  const records = parseLines(path);
  let previousHash = 'GENESIS';
  records.forEach((record, index) => {
    if (record.previousHash !== previousHash) {
      throw new ValidationError(`Audit ledger chain break at line ${index + 1}`);
    }
    const { hash, ...unsigned } = record;
    const expected = sha256(stableStringify(unsigned));
    if (hash !== expected) {
      throw new ValidationError(`Audit ledger hash mismatch at line ${index + 1}`);
    }
    previousHash = hash;
  });
  return { valid: true, records: records.length, headHash: previousHash };
}

export function appendAuditRecord(path, event, { staleLockMs = 300_000 } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  const release = acquireFileLock(join(dirname(path), 'audit.lock'), { staleMs: staleLockMs });
  try {
    const verification = verifyAuditLedger(path);
    const unsigned = {
      sequence: verification.records + 1,
      time: event.time ?? new Date().toISOString(),
      actor: event.actor,
      action: event.action,
      proposalId: event.proposalId ?? null,
      inputHash: event.inputHash,
      policyHash: event.policyHash,
      result: event.result,
      previousHash: verification.headHash,
    };
    const record = { ...unsigned, hash: sha256(stableStringify(unsigned)) };
    appendFileSync(path, `${JSON.stringify(record)}\n`, { encoding: 'utf8', flag: 'a' });
    return record;
  } finally {
    release();
  }
}
