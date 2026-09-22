#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ContinuousDevelopmentEngine } from './continuous-development/engine.mjs';
import { ValidationError } from './continuous-development/utils.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function usage() {
  return `OpenThaiAi Continuous Development Engine

Usage:
  node scripts/continuous-development-cli.mjs intake <proposal.json> [--actor human:<id>]
  node scripts/continuous-development-cli.mjs run <proposal-id> [--dry-run|--live] [--fault S0|S1|S2|S3]
  node scripts/continuous-development-cli.mjs sample [--fault S0|S1|S2|S3]
  node scripts/continuous-development-cli.mjs approve <proposal-id> --actor human:<id> --reason <text>
  node scripts/continuous-development-cli.mjs reject <proposal-id> --actor human:<id> --reason <text>
  node scripts/continuous-development-cli.mjs recover <proposal-id> --actor human:<id> --decision retry|accept-result|rollback --reason <text>
  node scripts/continuous-development-cli.mjs status [proposal-id] [--json]
  node scripts/continuous-development-cli.mjs report <proposal-id>
  node scripts/continuous-development-cli.mjs audit-verify
  node scripts/continuous-development-cli.mjs continuous [--once]

Global:
  --config <path>   Default: config/continuous-development.json
  --help`;
}

function parseArguments(argv) {
  const positionals = [];
  const flags = {};
  const booleanFlags = new Set(['dry-run', 'live', 'json', 'once', 'help']);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const key = token.slice(2);
    if (booleanFlags.has(key)) {
      flags[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new ValidationError(`--${key} requires a value`);
    flags[key] = value;
    index += 1;
  }
  return { positionals, flags };
}

function required(value, label) {
  if (!value) throw new ValidationError(`${label} is required`);
  return value;
}

function printRecord(record) {
  console.log(JSON.stringify({
    id: record.id,
    status: record.status,
    riskTier: record.proposal.riskTier,
    priority: record.priority.score,
    approval: record.approval,
    recoveryRequired: record.recoveryRequired,
  }, null, 2));
}

async function main() {
  const { positionals, flags } = parseArguments(process.argv.slice(2));
  if (flags.help || !positionals.length) {
    console.log(usage());
    return;
  }
  if (flags.live && flags['dry-run']) throw new ValidationError('Choose either --dry-run or --live, not both');
  const command = positionals[0];
  const configPath = flags.config ?? 'config/continuous-development.json';
  const engine = new ContinuousDevelopmentEngine({ workspaceRoot: ROOT, configPath });

  if (command === 'intake') {
    const proposalPath = resolve(ROOT, required(positionals[1], 'proposal path'));
    const proposal = JSON.parse(readFileSync(proposalPath, 'utf8'));
    const result = engine.intake(proposal, flags.actor ?? 'human:operator');
    console.log(JSON.stringify({ id: result.record.id, status: result.record.status, idempotent: result.idempotent }, null, 2));
    return;
  }
  if (command === 'run') {
    const record = await engine.run(required(positionals[1], 'proposal ID'), {
      dryRun: flags.live ? false : true,
      faultScenario: flags.fault ?? 'S0',
    });
    printRecord(record);
    return;
  }
  if (command === 'sample') {
    const proposalPath = resolve(ROOT, 'examples', 'continuous-development', 'proposal.sample.json');
    const proposal = JSON.parse(readFileSync(proposalPath, 'utf8'));
    const { record } = engine.intake(proposal, 'human:sample-operator');
    const completed = await engine.run(record.id, { dryRun: true, faultScenario: flags.fault ?? 'S0' });
    printRecord(completed);
    return;
  }
  if (command === 'approve' || command === 'reject') {
    const method = command === 'approve' ? 'approve' : 'reject';
    const record = await engine[method](required(positionals[1], 'proposal ID'), {
      actor: required(flags.actor, '--actor'),
      reason: required(flags.reason, '--reason'),
    });
    printRecord(record);
    return;
  }
  if (command === 'recover') {
    const record = await engine.recover(required(positionals[1], 'proposal ID'), {
      actor: required(flags.actor, '--actor'),
      reason: required(flags.reason, '--reason'),
      decision: required(flags.decision, '--decision'),
    });
    printRecord(record);
    return;
  }
  if (command === 'status') {
    const records = positionals[1] ? [engine.load(positionals[1])] : engine.list();
    if (flags.json) console.log(JSON.stringify(records, null, 2));
    else records.forEach(printRecord);
    return;
  }
  if (command === 'report') {
    console.log(engine.report(required(positionals[1], 'proposal ID')));
    return;
  }
  if (command === 'audit-verify') {
    console.log(JSON.stringify(engine.verifyAudit(), null, 2));
    return;
  }
  if (command === 'continuous') {
    const controller = new AbortController();
    const stop = () => controller.abort();
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    await engine.runContinuous({ once: !!flags.once, signal: controller.signal });
    return;
  }
  throw new ValidationError(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  if (error.details?.length) error.details.forEach((detail) => console.error(`  - ${detail}`));
  process.exitCode = 1;
});
