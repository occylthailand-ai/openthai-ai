import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { appendAuditRecord, verifyAuditLedger } from './audit-ledger.mjs';
import { runCommand, validateCommand } from './command-safety.mjs';
import {
  assertTransition,
  createExecutionPlan,
  scoreProposal,
  validateCanonicalBindings,
  validateProposal,
} from './core.mjs';
import {
  acquireFileLock,
  assertNoSensitiveKeys,
  atomicWriteJson,
  readJson,
  resolveInside,
  sha256,
  sleep,
  stableStringify,
  ValidationError,
} from './utils.mjs';

const TERMINAL_STATES = new Set(['completed', 'rejected', 'rolled_back']);
const HUMAN_APPROVAL_TIERS = new Set(['R2', 'R3']);

export function validateEngineConfig(input, workspaceRoot) {
  assertNoSensitiveKeys(input, 'config');
  const problems = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Engine config must be an object');
  }
  if (input.schemaVersion !== 1) problems.push('config.schemaVersion must be 1');
  if (!input.actors || typeof input.actors.workerId !== 'string' || typeof input.actors.criticId !== 'string') {
    problems.push('config.actors.workerId and criticId are required');
  } else if (input.actors.workerId === input.actors.criticId) {
    problems.push('workerId and criticId must be different');
  }
  if (!input.policy || !Array.isArray(input.policy.allowedExecutables)) {
    problems.push('config.policy.allowedExecutables must be an array');
  }
  if (!Number.isInteger(input.policy?.maximumTimeoutMs) || input.policy.maximumTimeoutMs < 100) {
    problems.push('config.policy.maximumTimeoutMs must be an integer >= 100');
  }
  if (!Number.isInteger(input.policy?.maximumOutputBytes) || input.policy.maximumOutputBytes < 1024) {
    problems.push('config.policy.maximumOutputBytes must be an integer >= 1024');
  }
  if (!Array.isArray(input.policy?.workspaceRoots) || input.policy.workspaceRoots.length === 0) {
    problems.push('config.policy.workspaceRoots must be a non-empty array');
  } else {
    for (const root of input.policy.workspaceRoots) {
      try {
        resolveInside(workspaceRoot, root, 'workspace root');
      } catch (error) {
        problems.push(error.message);
      }
    }
  }
  if (!input.execution || typeof input.execution.enabled !== 'boolean'
      || typeof input.execution.defaultDryRun !== 'boolean'
      || typeof input.execution.allowWorkspaceMutation !== 'boolean') {
    problems.push('config.execution enabled/defaultDryRun/allowWorkspaceMutation must be boolean');
  }
  if (!input.commands || typeof input.commands !== 'object' || Array.isArray(input.commands)) {
    problems.push('config.commands must be an object');
  }
  if (!Array.isArray(input.actions) || input.actions.length === 0) problems.push('config.actions must be a non-empty array');
  if (!input.scheduler || !Number.isInteger(input.scheduler.intervalMs) || input.scheduler.intervalMs < 100) {
    problems.push('config.scheduler.intervalMs must be an integer >= 100');
  }
  if (!Number.isInteger(input.scheduler?.maximumBackoffMs)
      || input.scheduler.maximumBackoffMs < input.scheduler.intervalMs) {
    problems.push('config.scheduler.maximumBackoffMs must be >= intervalMs');
  }
  if (!Number.isInteger(input.scheduler?.lockStaleMs) || input.scheduler.lockStaleMs < 1000) {
    problems.push('config.scheduler.lockStaleMs must be an integer >= 1000');
  }
  if (typeof input.runtimeDir !== 'string' || !input.runtimeDir.trim()) problems.push('config.runtimeDir is required');
  if (typeof input.canonicalLedger !== 'string' || !input.canonicalLedger.trim()) {
    problems.push('config.canonicalLedger is required');
  }
  if (problems.length) throw new ValidationError('Engine config validation failed', problems);

  const config = structuredClone(input);
  config.runtimeDir = resolveInside(workspaceRoot, config.runtimeDir, 'runtimeDir');
  config.canonicalLedger = resolveInside(workspaceRoot, config.canonicalLedger, 'canonicalLedger');
  for (const [id, command] of Object.entries(config.commands)) {
    command.id = id;
    validateCommand(command, config.policy, workspaceRoot);
  }
  for (const action of config.actions) {
    if (!config.commands[action]) problems.push(`action "${action}" does not reference a configured command`);
    const actionCommand = config.commands[action];
    if (actionCommand && !actionCommand.readOnly) {
      if (!actionCommand.compensation || !config.commands[actionCommand.compensation]) {
        problems.push(`mutating action "${action}" must reference a configured compensation command`);
      } else if (actionCommand.compensation === action) {
        problems.push(`mutating action "${action}" cannot compensate itself`);
      }
    }
  }
  if (problems.length) throw new ValidationError('Engine config validation failed', problems);
  return config;
}

export class ContinuousDevelopmentEngine {
  constructor({ workspaceRoot, configPath, logger = console }) {
    this.workspaceRoot = resolve(workspaceRoot);
    this.configPath = resolveInside(this.workspaceRoot, configPath, 'config path');
    const rawConfig = readJson(this.configPath, 'engine config');
    this.config = validateEngineConfig(rawConfig, this.workspaceRoot);
    this.canonicalLedger = readJson(this.config.canonicalLedger, 'canonical ledger');
    this.policyHash = sha256({
      config: rawConfig,
      canonicalLedger: this.canonicalLedger,
    });
    this.logger = logger;
    this.proposalDir = join(this.config.runtimeDir, 'proposals');
    this.auditPath = join(this.config.runtimeDir, 'audit.jsonl');
    this.lockDir = join(this.config.runtimeDir, 'locks');
    mkdirSync(this.proposalDir, { recursive: true });
    mkdirSync(this.lockDir, { recursive: true });
  }

  log(level, event, fields = {}) {
    const payload = { time: new Date().toISOString(), level, event, ...fields };
    const method = level === 'error' ? 'error' : 'log';
    this.logger[method](JSON.stringify(payload));
  }

  audit(actor, action, proposal, result) {
    return appendAuditRecord(this.auditPath, {
      actor,
      action,
      proposalId: proposal?.id,
      inputHash: sha256(proposal?.proposal ?? proposal ?? {}),
      policyHash: this.policyHash,
      result,
    }, { staleLockMs: this.config.scheduler.lockStaleMs });
  }

  proposalPath(id) {
    if (!/^cdp-[a-f0-9]{20}$/.test(id)) throw new ValidationError(`Invalid proposal ID: ${id}`);
    return join(this.proposalDir, `${id}.json`);
  }

  load(id) {
    const path = this.proposalPath(id);
    if (!existsSync(path)) throw new Error(`Proposal not found: ${id}`);
    return readJson(path, `proposal ${id}`);
  }

  save(record) {
    atomicWriteJson(this.proposalPath(record.id), record);
  }

  currentCanonicalBindings(record, { comparePersisted = true } = {}) {
    const currentLedger = readJson(this.config.canonicalLedger, 'canonical ledger');
    if (sha256(currentLedger) !== sha256(this.canonicalLedger)) {
      throw new ValidationError('Canonical ledger changed while the engine was running; restart before continuing');
    }
    const bindings = validateCanonicalBindings(
      currentLedger,
      record.proposal.canonicalRefs,
      this.workspaceRoot,
    );
    if (comparePersisted && record.canonicalBindings
        && stableStringify(bindings) !== stableStringify(record.canonicalBindings)) {
      throw new ValidationError('Canonical bindings changed after planning; create a new proposal');
    }
    return bindings;
  }

  list() {
    return readdirSync(this.proposalDir)
      .filter((name) => /^cdp-[a-f0-9]{20}\.json$/.test(name))
      .map((name) => readJson(join(this.proposalDir, name), name))
      .sort((left, right) => right.priority.score - left.priority.score || left.id.localeCompare(right.id));
  }

  intake(input, actor = 'human:operator') {
    assertNoSensitiveKeys(input, 'proposal');
    const proposal = validateProposal(input);
    if (!this.config.actions.includes(proposal.action)) {
      throw new ValidationError(`Proposal action is not allowlisted: ${proposal.action}`);
    }
    for (const gate of proposal.qualityGates) {
      if (!this.config.commands[gate]) throw new ValidationError(`Proposal quality gate is not configured: ${gate}`);
    }
    const path = this.proposalPath(proposal.id);
    if (existsSync(path)) {
      const existing = this.load(proposal.id);
      this.audit(actor, 'proposal_intake_idempotent', existing, { status: existing.status });
      return { record: existing, idempotent: true };
    }
    const now = new Date().toISOString();
    const record = {
      id: proposal.id,
      status: 'proposal',
      proposal,
      priority: scoreProposal(proposal),
      createdAt: now,
      updatedAt: now,
      history: [{ from: null, to: 'proposal', actor, at: now, reason: 'intake' }],
      plan: null,
      execution: null,
      review: null,
      approval: null,
      recoveryRequired: null,
    };
    const intakeAudit = this.audit(actor, 'proposal_intake', record, {
      phase: 'write_ahead',
      status: 'proposal',
      priority: record.priority,
    });
    record.intakeAuditHash = intakeAudit.hash;
    this.save(record);
    this.log('info', 'proposal_intake', { proposalId: record.id, priority: record.priority.score });
    return { record, idempotent: false };
  }

  transition(record, to, actor, reason, details = {}) {
    assertTransition(record.status, to);
    const from = record.status;
    const at = new Date().toISOString();
    const transitionAudit = this.audit(actor, 'state_transition', record, {
      phase: 'write_ahead',
      from,
      to,
      reason,
      ...details,
    });
    record.status = to;
    record.updatedAt = at;
    record.history.push({ from, to, actor, at, reason, auditHash: transitionAudit.hash });
    this.save(record);
    this.log('info', 'state_transition', { proposalId: record.id, from, to, actor });
  }

  command(id) {
    const command = this.config.commands[id];
    if (!command) throw new ValidationError(`Unknown configured command: ${id}`);
    return { id, ...command };
  }

  async executeCommand(id, record, { dryRun, forceFailure = false, suffix = '' } = {}) {
    const command = this.command(id);
    const policyCheck = suffix.startsWith('gate:');
    if (!dryRun && !this.config.execution.enabled && !policyCheck) {
      throw new ValidationError('Live execution is disabled by config.execution.enabled');
    }
    if (policyCheck && !command.readOnly) {
      throw new ValidationError(`Quality gate "${id}" must be read-only`);
    }
    if (!dryRun && !command.readOnly && !this.config.execution.allowWorkspaceMutation) {
      throw new ValidationError(`Workspace mutation is disabled; command "${id}" is not read-only`);
    }
    const idempotencyKey = sha256(`${record.id}:${id}:${this.policyHash}:${suffix || 'primary'}`);
    const result = await runCommand(command, this.config.policy, this.workspaceRoot, {
      dryRun,
      forceFailure,
      idempotencyKey,
      proposalId: record.id,
    });
    return { ...result, idempotencyKey, expected: command.expectedExitCodes.includes(result.exitCode) && !result.timedOut };
  }

  async compensateOrHold(record, failure, { dryRun }) {
    const action = this.command(record.proposal.action);
    if (dryRun || action.readOnly) {
      record.rollback = { verified: true, simulated: dryRun, reason: failure };
      this.transition(record, 'rolled_back', this.config.actors.workerId, failure, { rollbackVerified: true });
      return;
    }
    if (action.compensation) {
      const result = await this.executeCommand(action.compensation, record, { dryRun: false, suffix: 'compensation' });
      record.rollback = { verified: result.expected, simulated: false, reason: failure, command: result };
      if (result.expected) {
        this.transition(record, 'rolled_back', this.config.actors.workerId, failure, { rollbackVerified: true });
        return;
      }
    }
    record.recoveryRequired = {
      reason: failure,
      guidance: 'Human must choose retry, accept-result, or rollback after checking external effects.',
    };
    this.transition(record, 'awaiting_approval', 'policy-engine', failure, { recoveryRequired: true });
  }

  async run(id, { dryRun = this.config.execution.defaultDryRun, faultScenario = 'S0' } = {}) {
    if (!['S0', 'S1', 'S2', 'S3'].includes(faultScenario)) {
      throw new ValidationError('faultScenario must be S0, S1, S2, or S3');
    }
    if (faultScenario !== 'S0' && !dryRun) {
      throw new ValidationError('Fault injection is allowed only in dry-run mode');
    }
    const release = acquireFileLock(join(this.lockDir, `${id}.lock`), {
      staleMs: this.config.scheduler.lockStaleMs,
    });
    try {
      const record = this.load(id);
      if (TERMINAL_STATES.has(record.status) || record.status === 'awaiting_approval') return record;

      while (!TERMINAL_STATES.has(record.status) && record.status !== 'awaiting_approval') {
        if (record.status === 'proposal') {
          record.proposal = validateProposal(record.proposal);
          const canonicalBindings = this.currentCanonicalBindings(record, { comparePersisted: false });
          record.canonicalBindings = canonicalBindings;
          this.transition(record, 'validated', 'policy-engine', 'schema and canonical bindings valid');
          continue;
        }
        if (record.status === 'validated') {
          record.plan = createExecutionPlan(record.proposal, record.canonicalBindings);
          this.transition(record, 'planned', 'planner', 'deterministic execution plan created');
          continue;
        }
        if (record.status === 'planned') {
          record.canonicalBindings = this.currentCanonicalBindings(record);
          record.execution = {
            status: 'not_started',
            dryRun,
            action: record.proposal.action,
            idempotencyKey: sha256(`${record.id}:${record.proposal.action}:${this.policyHash}:primary`),
          };
          this.transition(record, 'executing', this.config.actors.workerId, dryRun ? 'dry-run execution' : 'live execution');
          continue;
        }
        if (record.status === 'executing') {
          record.canonicalBindings = this.currentCanonicalBindings(record);
          if (record.execution?.status === 'started') {
            record.recoveryRequired = {
              reason: 'Execution was interrupted after start; outcome is unknown.',
              guidance: 'Human must inspect effects and choose a recovery decision.',
            };
            this.transition(record, 'awaiting_approval', 'policy-engine', 'uncertain execution outcome', {
              recoveryRequired: true,
            });
            continue;
          }
          if (record.execution?.status === 'succeeded') {
            this.transition(record, 'reviewing', this.config.actors.criticId, 'resumed from persisted successful action');
            continue;
          }
          if (record.execution?.status === 'failed') {
            await this.compensateOrHold(record, 'resumed from persisted failed action', { dryRun: record.execution.dryRun });
            continue;
          }
          if (record.execution?.status !== 'not_started') {
            throw new ValidationError(`Unsupported execution status: ${record.execution?.status ?? 'missing'}`);
          }
          const startAudit = this.audit(this.config.actors.workerId, 'action_started', record, {
            phase: 'write_ahead',
            commandId: record.proposal.action,
            dryRun,
            idempotencyKey: record.execution.idempotencyKey,
          });
          record.execution.status = 'started';
          record.execution.startedAt = new Date().toISOString();
          record.execution.startAuditHash = startAudit.hash;
          this.save(record);
          const result = await this.executeCommand(record.proposal.action, record, {
            dryRun,
            forceFailure: faultScenario === 'S1',
          });
          const finishAudit = this.audit(this.config.actors.workerId, 'action_finished', record, {
            phase: 'write_ahead',
            commandId: record.proposal.action,
            exitCode: result.exitCode,
            timedOut: result.timedOut,
            expected: result.expected,
            idempotencyKey: result.idempotencyKey,
            stdoutHash: sha256(result.stdout),
            stderrHash: sha256(result.stderr),
          });
          record.execution = {
            ...record.execution,
            status: result.expected ? 'succeeded' : 'failed',
            finishedAt: new Date().toISOString(),
            result,
            finishAuditHash: finishAudit.hash,
          };
          this.save(record);
          if (!result.expected) {
            await this.compensateOrHold(record, 'worker action failed', { dryRun });
            continue;
          }
          this.transition(record, 'reviewing', this.config.actors.criticId, 'worker output ready for independent review');
          continue;
        }
        if (record.status === 'reviewing') {
          const gateResults = [];
          for (let index = 0; index < record.proposal.qualityGates.length; index += 1) {
            const gate = record.proposal.qualityGates[index];
            const result = await this.executeCommand(gate, record, {
              dryRun: false,
              forceFailure: faultScenario === 'S2' && index === 0,
              suffix: `gate:${gate}`,
            });
            gateResults.push(result);
            this.audit(this.config.actors.criticId, 'quality_gate', record, {
              gate,
              exitCode: result.exitCode,
              timedOut: result.timedOut,
              expected: result.expected,
              stdoutHash: sha256(result.stdout),
              stderrHash: sha256(result.stderr),
            });
            if (!result.expected) break;
          }
          record.review = {
            critic: this.config.actors.criticId,
            reviewedAt: new Date().toISOString(),
            gates: gateResults,
            passed: gateResults.length === record.proposal.qualityGates.length
              && gateResults.every((result) => result.expected),
          };
          this.save(record);
          if (!record.review.passed) {
            await this.compensateOrHold(record, 'quality gate failed', { dryRun });
            continue;
          }
          if (faultScenario === 'S3') {
            record.recoveryRequired = {
              reason: 'Injected approval-channel outage.',
              guidance: 'Resume without fault injection after restoring the approval channel.',
              resumeState: 'reviewing',
            };
            this.transition(record, 'awaiting_approval', 'policy-engine', 'approval channel unavailable', {
              recoveryRequired: true,
            });
            continue;
          }
          this.transition(
            record,
            'awaiting_approval',
            this.config.actors.criticId,
            HUMAN_APPROVAL_TIERS.has(record.proposal.riskTier)
              ? 'explicit human approval required'
              : 'policy approval checkpoint',
          );
          if (HUMAN_APPROVAL_TIERS.has(record.proposal.riskTier)) {
            continue;
          }
          record.approval = {
            actor: 'policy-engine',
            reason: `${record.proposal.riskTier} permits policy approval after independent review`,
            at: new Date().toISOString(),
          };
          this.transition(record, 'approved', 'policy-engine', record.approval.reason);
          continue;
        }
        if (record.status === 'approved') {
          this.transition(record, 'completed', 'policy-engine', 'approved workflow finalized');
          continue;
        }
        throw new ValidationError(`Cannot resume unsupported state: ${record.status}`);
      }
      return record;
    } finally {
      release();
    }
  }

  assertHumanActor(actor) {
    if (typeof actor !== 'string' || !actor.startsWith('human:') || actor.length < 7) {
      throw new ValidationError('Approval actor must use the explicit form human:<identity>');
    }
    if ([this.config.actors.workerId, this.config.actors.criticId].includes(actor)) {
      throw new ValidationError('Worker and critic actors cannot approve their own workflow');
    }
  }

  approve(id, { actor, reason }) {
    this.assertHumanActor(actor);
    if (typeof reason !== 'string' || !reason.trim()) throw new ValidationError('Approval reason is required');
    const release = acquireFileLock(join(this.lockDir, `${id}.lock`), {
      staleMs: this.config.scheduler.lockStaleMs,
    });
    try {
      const record = this.load(id);
      if (record.status !== 'awaiting_approval') {
        throw new ValidationError(`Proposal ${id} is not awaiting approval`);
      }
      if (record.recoveryRequired) {
        throw new ValidationError('Recovery decision is required; ordinary approval is blocked');
      }
      record.approval = { actor, reason: reason.trim(), at: new Date().toISOString() };
      this.transition(record, 'approved', actor, reason.trim());
      this.transition(record, 'completed', 'policy-engine', 'human-approved workflow finalized');
      return record;
    } finally {
      release();
    }
  }

  async reject(id, { actor, reason }) {
    this.assertHumanActor(actor);
    if (typeof reason !== 'string' || !reason.trim()) throw new ValidationError('Rejection reason is required');
    const release = acquireFileLock(join(this.lockDir, `${id}.lock`), {
      staleMs: this.config.scheduler.lockStaleMs,
    });
    try {
      const record = this.load(id);
      if (record.status !== 'awaiting_approval') {
        throw new ValidationError(`Proposal ${id} is not awaiting approval`);
      }
      record.approval = { actor, reason: reason.trim(), at: new Date().toISOString(), rejected: true };
      const action = this.command(record.proposal.action);
      if (record.execution?.dryRun || action.readOnly) {
        this.transition(record, 'rejected', actor, reason.trim());
        return record;
      }
      const compensation = await this.executeCommand(action.compensation, record, {
        dryRun: false,
        suffix: 'rejection-compensation',
      });
      record.rollback = {
        verified: compensation.expected,
        simulated: false,
        reason: reason.trim(),
        command: compensation,
      };
      this.audit(actor, 'rejection_compensation', record, {
        commandId: action.compensation,
        expected: compensation.expected,
        exitCode: compensation.exitCode,
      });
      if (compensation.expected) {
        record.recoveryRequired = null;
        this.transition(record, 'rolled_back', actor, reason.trim(), { rejected: true });
      } else {
        record.recoveryRequired = {
          reason: 'Rejection compensation failed.',
          guidance: 'Human must repair or retry compensation before finalizing rejection.',
          resumeState: 'awaiting_approval',
        };
        this.save(record);
      }
      return record;
    } finally {
      release();
    }
  }

  async recover(id, { actor, reason, decision }) {
    this.assertHumanActor(actor);
    if (typeof reason !== 'string' || !reason.trim()) throw new ValidationError('Recovery reason is required');
    if (!['retry', 'accept-result', 'rollback'].includes(decision)) {
      throw new ValidationError('Recovery decision must be retry, accept-result, or rollback');
    }
    const release = acquireFileLock(join(this.lockDir, `${id}.lock`), {
      staleMs: this.config.scheduler.lockStaleMs,
    });
    try {
      const record = this.load(id);
      if (record.status !== 'awaiting_approval' || !record.recoveryRequired) {
        throw new ValidationError(`Proposal ${id} does not require recovery`);
      }
      if (decision === 'rollback') {
        const action = this.command(record.proposal.action);
        let compensation = null;
        if (!record.execution?.dryRun && !action.readOnly) {
          compensation = await this.executeCommand(action.compensation, record, {
            dryRun: false,
            suffix: 'recovery-compensation',
          });
          this.audit(actor, 'recovery_compensation', record, {
            commandId: action.compensation,
            expected: compensation.expected,
            exitCode: compensation.exitCode,
          });
          if (!compensation.expected) {
            record.recoveryRequired = {
              reason: 'Recovery compensation failed.',
              guidance: 'Human must repair or retry compensation.',
              resumeState: 'awaiting_approval',
            };
            this.save(record);
            return record;
          }
        }
        record.rollback = {
          verified: true,
          simulated: !!record.execution?.dryRun,
          reason: reason.trim(),
          command: compensation,
        };
        record.recoveryRequired = null;
        this.transition(record, 'rolled_back', actor, reason.trim(), { recoveryDecision: decision });
      } else {
        const resumeState = record.recoveryRequired.resumeState;
        record.recoveryRequired = null;
        if (decision === 'retry') {
          if (resumeState === 'reviewing') {
            this.transition(record, 'reviewing', actor, reason.trim(), { recoveryDecision: decision });
          } else {
            record.execution = null;
            this.transition(record, 'planned', actor, reason.trim(), { recoveryDecision: decision });
          }
        } else {
          record.execution.status = 'succeeded';
          record.execution.recoveredBy = actor;
          this.transition(record, 'reviewing', actor, reason.trim(), { recoveryDecision: decision });
        }
      }
      return record;
    } finally {
      release();
    }
  }

  verifyAudit() {
    return verifyAuditLedger(this.auditPath);
  }

  async runContinuous({ once = false, signal } = {}) {
    const release = acquireFileLock(join(this.lockDir, 'scheduler.lock'), {
      staleMs: this.config.scheduler.lockStaleMs,
    });
    let failures = 0;
    try {
      do {
        const actionable = this.list().filter((record) => !TERMINAL_STATES.has(record.status)
          && record.status !== 'awaiting_approval');
        for (const record of actionable) {
          if (signal?.aborted) break;
          try {
            await this.run(record.id);
            failures = 0;
          } catch (error) {
            failures += 1;
            this.log('error', 'proposal_run_failed', {
              proposalId: record.id,
              error: error.message,
              failures,
            });
          }
        }
        if (once || signal?.aborted) break;
        const backoff = Math.min(
          this.config.scheduler.maximumBackoffMs,
          this.config.scheduler.intervalMs * (2 ** failures),
        );
        await sleep(backoff, signal);
      } while (!signal?.aborted);
    } finally {
      release();
      this.log('info', 'scheduler_stopped', { graceful: true });
    }
  }

  report(id) {
    const record = this.load(id);
    const lines = [
      `# Continuous Development Report: ${record.id}`,
      '',
      `- Status: **${record.status}**`,
      `- Risk tier: **${record.proposal.riskTier}**`,
      `- Priority: **${record.priority.score}/${record.priority.maximum}**`,
      `- Owner: ${record.proposal.owner}`,
      `- Policy hash: \`${this.policyHash}\``,
      '',
      '## Score explanation',
      '',
      `Formula: \`${record.priority.formula}\``,
      ...Object.entries(record.priority.components).map(([name, value]) => `- ${name}: ${value}`),
      '',
      '## Acceptance criteria',
      '',
      ...record.proposal.acceptanceCriteria.map((criterion) => `- ${criterion}`),
      '',
      '## Canonical references',
      '',
      ...(record.canonicalBindings ?? []).map((binding) => `- ${binding.id}: \`${binding.sourcePath}\` @ ${binding.sourceVersion} (${binding.sha256})`),
      '',
      '## State history',
      '',
      ...record.history.map((event) => `- ${event.at}: ${event.from ?? '(intake)'} -> ${event.to} by ${event.actor} — ${event.reason}`),
      '',
    ];
    return lines.join('\n');
  }
}

export function configFingerprint(config) {
  return sha256(stableStringify(config));
}
