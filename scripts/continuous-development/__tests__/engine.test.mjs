import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { appendAuditRecord, verifyAuditLedger } from '../audit-ledger.mjs';
import { runCommand, validateCommand } from '../command-safety.mjs';
import {
  assertTransition,
  scoreProposal,
  validateCanonicalBindings,
  validateProposal,
} from '../core.mjs';
import { ContinuousDevelopmentEngine } from '../engine.mjs';
import {
  acquireFileLock,
  fileSha256,
  LockError,
  ValidationError,
} from '../utils.mjs';

function proposal(overrides = {}) {
  return {
    schemaVersion: 1,
    title: 'Safe improvement',
    summary: 'Inspect a source file and record evidence without changing the workspace.',
    owner: 'platform-maintainer',
    riskTier: 'R1',
    metrics: {
      publicImpact: 4,
      risk: 1,
      effort: 1,
      opportunityCost: 1,
      evidenceQuality: 5,
    },
    evidence: [{ source: 'canonical.txt', claim: 'Verified source evidence.' }],
    acceptanceCriteria: ['The independent quality gate passes.'],
    dependencies: [],
    canonicalRefs: ['canon-1'],
    action: 'inspect',
    qualityGates: ['critic-gate'],
    metadata: {},
    ...overrides,
  };
}

function fixture({ mutating = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'openthai-cde-'));
  writeFileSync(join(root, 'canonical.txt'), 'canonical evidence\n', 'utf8');
  writeFileSync(join(root, 'valid.mjs'), 'export const valid = true;\n', 'utf8');
  writeFileSync(join(root, 'action.mjs'), "import { writeFileSync } from 'node:fs'; writeFileSync('effect.txt', 'changed\\n');\n", 'utf8');
  writeFileSync(join(root, 'compensate.mjs'), "import { rmSync } from 'node:fs'; rmSync('effect.txt', { force: true });\n", 'utf8');
  const ledger = {
    schemaVersion: 1,
    entries: [{
      id: 'canon-1',
      status: 'BOUND',
      sourcePath: 'canonical.txt',
      sourceVersion: '1.0.0',
      owner: 'test-owner',
      sha256: fileSha256(join(root, 'canonical.txt')),
      approval: {
        status: 'approved',
        actor: 'human:test-owner',
        approvedAt: '2026-09-08T00:00:00.000Z',
      },
    }],
  };
  writeFileSync(join(root, 'ledger.json'), JSON.stringify(ledger), 'utf8');
  const config = {
    schemaVersion: 1,
    runtimeDir: '.runtime',
    canonicalLedger: 'ledger.json',
    actors: { workerId: 'worker:test', criticId: 'critic:test' },
    execution: {
      enabled: mutating,
      defaultDryRun: true,
      allowWorkspaceMutation: mutating,
    },
    policy: {
      workspaceRoots: ['.'],
      allowedExecutables: ['node'],
      maximumTimeoutMs: 30_000,
      maximumOutputBytes: 64_000,
    },
    commands: {
      inspect: {
        executable: 'node',
        args: mutating ? ['action.mjs'] : ['--check', 'valid.mjs'],
        cwd: '.',
        timeoutMs: 10_000,
        expectedExitCodes: [0],
        readOnly: !mutating,
        ...(mutating ? { compensation: 'compensate' } : {}),
      },
      compensate: {
        executable: 'node',
        args: ['compensate.mjs'],
        cwd: '.',
        timeoutMs: 10_000,
        expectedExitCodes: [0],
        readOnly: false,
      },
      'critic-gate': {
        executable: 'node',
        args: ['--check', 'valid.mjs'],
        cwd: '.',
        timeoutMs: 10_000,
        expectedExitCodes: [0],
        readOnly: true,
      },
    },
    actions: ['inspect'],
    scheduler: { intervalMs: 100, maximumBackoffMs: 1000, lockStaleMs: 5000 },
  };
  writeFileSync(join(root, 'config.json'), JSON.stringify(config), 'utf8');
  return {
    root,
    ledger,
    engine: new ContinuousDevelopmentEngine({
      workspaceRoot: root,
      configPath: 'config.json',
      logger: { log() {}, error() {} },
    }),
  };
}

test('proposal validation creates a stable content ID and explainable score', () => {
  const first = validateProposal(proposal());
  const second = validateProposal(proposal());
  assert.match(first.id, /^cdp-[a-f0-9]{20}$/);
  assert.equal(first.id, second.id);
  assert.deepEqual(scoreProposal(first), {
    score: 84,
    maximum: 100,
    formula: 'impact*7 + evidence*4 + (5-risk)*4 + (5-opportunityCost)*3 + (5-effort)*2',
    components: {
      publicImpact: 28,
      evidenceQuality: 20,
      riskSafety: 16,
      opportunityCost: 12,
      effort: 8,
    },
  });
  assert.throws(() => validateProposal({ ...proposal(), title: '' }), ValidationError);
  assert.throws(() => validateProposal({ ...proposal(), apiKey: 'not-allowed' }), ValidationError);
});

test('state machine permits defined transitions and rejects skipping review', () => {
  assert.doesNotThrow(() => assertTransition('proposal', 'validated'));
  assert.doesNotThrow(() => assertTransition('reviewing', 'approved'));
  assert.throws(() => assertTransition('planned', 'completed'), ValidationError);
  assert.throws(() => assertTransition('completed', 'executing'), ValidationError);
});

test('canonical binding requires BOUND status, approval, and matching SHA-256', () => {
  const { root, ledger } = fixture();
  assert.equal(validateCanonicalBindings(ledger, ['canon-1'], root).length, 1);
  const unbound = structuredClone(ledger);
  unbound.entries[0].status = 'READY_FOR_SOURCE_BINDING';
  assert.throws(
    () => validateCanonicalBindings(unbound, ['canon-1'], root),
    /Canonical binding validation failed/,
  );
  const changed = structuredClone(ledger);
  changed.entries[0].sha256 = '0'.repeat(64);
  assert.throws(
    () => validateCanonicalBindings(changed, ['canon-1'], root),
    /Canonical binding validation failed/,
  );
});

test('canonical source is reverified immediately before resumed execution', async () => {
  const { root, engine } = fixture();
  const record = engine.intake(proposal(), 'human:tester').record;
  record.status = 'planned';
  record.canonicalBindings = engine.currentCanonicalBindings(record, { comparePersisted: false });
  record.plan = { version: 1 };
  record.history.push({
    from: 'validated',
    to: 'planned',
    actor: 'planner',
    at: new Date().toISOString(),
    reason: 'test prepared plan',
  });
  engine.save(record);
  writeFileSync(join(root, 'canonical.txt'), 'changed after approval\n', 'utf8');
  await assert.rejects(
    () => engine.run(record.id, { dryRun: true }),
    (error) => error instanceof ValidationError
      && error.details.some((detail) => detail.includes('SHA-256 mismatch')),
  );
  assert.equal(engine.load(record.id).status, 'planned');
});

test('audit ledger is append-only hash chained and detects tampering', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'openthai-audit-')), 'audit.jsonl');
  appendAuditRecord(path, {
    actor: 'human:a',
    action: 'intake',
    proposalId: 'cdp-test',
    inputHash: 'input',
    policyHash: 'policy',
    result: { ok: true },
    time: '2026-09-08T00:00:00.000Z',
  });
  appendAuditRecord(path, {
    actor: 'critic:a',
    action: 'review',
    proposalId: 'cdp-test',
    inputHash: 'input',
    policyHash: 'policy',
    result: { ok: true },
    time: '2026-09-08T00:00:01.000Z',
  });
  assert.equal(verifyAuditLedger(path).records, 2);
  const tampered = readFileSync(path, 'utf8').replace('"action":"intake"', '"action":"approve"');
  writeFileSync(path, tampered, 'utf8');
  assert.throws(() => verifyAuditLedger(path), /hash mismatch/);
});

test('command policy blocks shells, interpolation, dynamic eval, and mutating git operations', () => {
  const root = mkdtempSync(join(tmpdir(), 'openthai-command-'));
  const policy = {
    workspaceRoots: ['.'],
    allowedExecutables: ['node', 'git', 'bash'],
    maximumTimeoutMs: 30_000,
    maximumOutputBytes: 64_000,
  };
  const base = {
    id: 'safe',
    executable: 'node',
    args: ['--check', 'file.mjs'],
    cwd: '.',
    timeoutMs: 1000,
    expectedExitCodes: [0],
    readOnly: true,
  };
  assert.doesNotThrow(() => validateCommand(base, policy, root));
  assert.throws(() => validateCommand({ ...base, executable: 'bash' }, policy, root), ValidationError);
  assert.throws(() => validateCommand({ ...base, args: ['-e', 'console.log(1)'] }, policy, root), ValidationError);
  assert.doesNotThrow(() => validateCommand({
    ...base,
    args: ['tool.mjs', '-p', 'tool-config.json'],
  }, policy, root));
  assert.throws(() => validateCommand({ ...base, args: ['--check', 'x;rm'] }, policy, root), ValidationError);
  assert.throws(() => validateCommand({
    ...base,
    executable: 'git',
    args: ['push'],
  }, policy, root), ValidationError);
  assert.throws(() => validateCommand({
    ...base,
    executable: 'git',
    args: ['-c', 'alias.status=push', 'status'],
  }, policy, root), ValidationError);
});

test('command runner enforces timeout and captures the failure result', async () => {
  const root = mkdtempSync(join(tmpdir(), 'openthai-timeout-'));
  writeFileSync(join(root, 'slow.mjs'), 'setTimeout(() => {}, 10_000);\n', 'utf8');
  const policy = {
    workspaceRoots: ['.'],
    allowedExecutables: ['node'],
    maximumTimeoutMs: 30_000,
    maximumOutputBytes: 64_000,
  };
  const result = await runCommand({
    id: 'timeout',
    executable: 'node',
    args: ['slow.mjs'],
    cwd: '.',
    timeoutMs: 100,
    expectedExitCodes: [0],
    readOnly: true,
  }, policy, root);
  assert.equal(result.timedOut, true);
  assert.notEqual(result.exitCode, 0);
});

test('command runner does not forward arbitrary or secret environment variables', async () => {
  const root = mkdtempSync(join(tmpdir(), 'openthai-env-'));
  writeFileSync(
    join(root, 'env.mjs'),
    "console.log(process.env.CDE_TEST_SECRET ?? 'not-forwarded');\n",
    'utf8',
  );
  const policy = {
    workspaceRoots: ['.'],
    allowedExecutables: ['node'],
    maximumTimeoutMs: 30_000,
    maximumOutputBytes: 64_000,
  };
  process.env.CDE_TEST_SECRET = 'must-not-leak';
  try {
    const result = await runCommand({
      id: 'environment',
      executable: 'node',
      args: ['env.mjs'],
      cwd: '.',
      timeoutMs: 1000,
      expectedExitCodes: [0],
      readOnly: true,
    }, policy, root);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), 'not-forwarded');
  } finally {
    delete process.env.CDE_TEST_SECRET;
  }
});

test('intake is idempotent and R1 dry-run completes with separate worker and critic', async () => {
  const { engine } = fixture();
  const first = engine.intake(proposal(), 'human:tester');
  const second = engine.intake(proposal(), 'human:tester');
  assert.equal(first.idempotent, false);
  assert.equal(second.idempotent, true);
  assert.equal(first.record.id, second.record.id);

  const completed = await engine.run(first.record.id, { dryRun: true });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.execution.result.simulated, true);
  assert.equal(completed.review.critic, 'critic:test');
  assert.equal(completed.review.gates[0].simulated, false);
  assert.ok(completed.history.some((event) => event.to === 'awaiting_approval'));
  assert.equal(engine.verifyAudit().valid, true);
});

test('R2 stops for explicit human approval and cannot self-approve', async () => {
  const { engine } = fixture();
  const { record } = engine.intake(proposal({ riskTier: 'R2' }), 'human:tester');
  const waiting = await engine.run(record.id, { dryRun: true });
  assert.equal(waiting.status, 'awaiting_approval');
  assert.throws(
    () => engine.approve(record.id, { actor: 'critic:test', reason: 'self approval' }),
    ValidationError,
  );
  const completed = await engine.approve(record.id, {
    actor: 'human:release-manager',
    reason: 'Reviewed evidence and quality gate output.',
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.approval.actor, 'human:release-manager');
});

test('rejecting a live mutation runs compensation before rolled_back', async () => {
  const { root, engine } = fixture({ mutating: true });
  const { record } = engine.intake(proposal({ riskTier: 'R2' }), 'human:tester');
  const waiting = await engine.run(record.id, { dryRun: false });
  assert.equal(waiting.status, 'awaiting_approval');
  assert.equal(existsSync(join(root, 'effect.txt')), true);
  const rejected = await engine.reject(record.id, {
    actor: 'human:release-manager',
    reason: 'The live effect is not acceptable.',
  });
  assert.equal(rejected.status, 'rolled_back');
  assert.equal(rejected.rollback.verified, true);
  assert.equal(existsSync(join(root, 'effect.txt')), false);
});

test('failure injection rolls back safely and interrupted execution requires recovery', async () => {
  const firstFixture = fixture();
  const first = firstFixture.engine.intake(proposal(), 'human:tester').record;
  const rolledBack = await firstFixture.engine.run(first.id, { dryRun: true, faultScenario: 'S1' });
  assert.equal(rolledBack.status, 'rolled_back');
  assert.equal(rolledBack.rollback.verified, true);

  const secondFixture = fixture();
  const second = secondFixture.engine.intake(proposal(), 'human:tester').record;
  second.status = 'executing';
  second.execution = { status: 'started', dryRun: true, action: 'inspect', idempotencyKey: 'known' };
  second.history.push({
    from: 'planned',
    to: 'executing',
    actor: 'worker:test',
    at: new Date().toISOString(),
    reason: 'test interrupted state',
  });
  secondFixture.engine.save(second);
  const waiting = await secondFixture.engine.run(second.id, { dryRun: true });
  assert.equal(waiting.status, 'awaiting_approval');
  assert.match(waiting.recoveryRequired.reason, /interrupted/);
  const recovered = await secondFixture.engine.recover(second.id, {
    actor: 'human:operator',
    reason: 'Verified that the dry-run had no side effects.',
    decision: 'retry',
  });
  assert.equal(recovered.status, 'planned');
  assert.equal(recovered.recoveryRequired, null);
  assert.equal((await secondFixture.engine.run(second.id, { dryRun: true })).status, 'completed');
});

test('resume from persisted successful action does not execute it twice', async () => {
  const { engine } = fixture();
  const record = engine.intake(proposal(), 'human:tester').record;
  record.status = 'executing';
  record.canonicalBindings = engine.currentCanonicalBindings(record, { comparePersisted: false });
  record.execution = {
    status: 'succeeded',
    dryRun: true,
    action: 'inspect',
    idempotencyKey: 'persisted-key',
    result: {
      commandId: 'inspect',
      simulated: true,
      timedOut: false,
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 0,
      idempotencyKey: 'persisted-key',
      expected: true,
    },
  };
  record.history.push({
    from: 'planned',
    to: 'executing',
    actor: 'worker:test',
    at: new Date().toISOString(),
    reason: 'persisted successful test state',
  });
  engine.save(record);
  const completed = await engine.run(record.id, { dryRun: true });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.execution.idempotencyKey, 'persisted-key');
  assert.ok(completed.history.some((event) => event.reason === 'resumed from persisted successful action'));
});

test('critic and approval-channel fault scenarios stop safely', async () => {
  const criticFixture = fixture();
  const criticRecord = criticFixture.engine.intake(proposal(), 'human:tester').record;
  const criticFailure = await criticFixture.engine.run(criticRecord.id, {
    dryRun: true,
    faultScenario: 'S2',
  });
  assert.equal(criticFailure.status, 'rolled_back');
  assert.equal(criticFailure.review.passed, false);

  const approvalFixture = fixture();
  const approvalRecord = approvalFixture.engine.intake(proposal(), 'human:tester').record;
  const approvalFailure = await approvalFixture.engine.run(approvalRecord.id, {
    dryRun: true,
    faultScenario: 'S3',
  });
  assert.equal(approvalFailure.status, 'awaiting_approval');
  assert.match(approvalFailure.recoveryRequired.reason, /approval-channel/);
  const resumed = await approvalFixture.engine.recover(approvalRecord.id, {
    actor: 'human:operator',
    reason: 'Approval channel restored; do not rerun the completed action.',
    decision: 'retry',
  });
  assert.equal(resumed.status, 'reviewing');
});

test('file lock blocks overlapping runs and releases only owned lock', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'openthai-lock-')), 'engine.lock');
  const release = acquireFileLock(path, { staleMs: 5000 });
  assert.throws(() => acquireFileLock(path, { staleMs: 5000 }), LockError);
  release();
  const releaseAgain = acquireFileLock(path, { staleMs: 5000 });
  releaseAgain();
});
