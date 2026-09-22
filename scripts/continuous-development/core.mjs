import { fileExists, fileSha256, resolveInside, sha256, stableStringify, ValidationError } from './utils.mjs';

export const STATES = Object.freeze([
  'proposal',
  'validated',
  'planned',
  'executing',
  'reviewing',
  'awaiting_approval',
  'approved',
  'rejected',
  'completed',
  'rolled_back',
]);

const TRANSITIONS = Object.freeze({
  proposal: ['validated'],
  validated: ['planned'],
  planned: ['executing'],
  executing: ['reviewing', 'awaiting_approval', 'rolled_back'],
  reviewing: ['awaiting_approval', 'approved', 'rolled_back'],
  awaiting_approval: ['approved', 'rejected', 'planned', 'reviewing', 'rolled_back'],
  approved: ['completed'],
  rejected: [],
  completed: [],
  rolled_back: [],
});

const RISK_TIERS = new Set(['R0', 'R1', 'R2', 'R3']);
const METRIC_NAMES = ['publicImpact', 'risk', 'effort', 'opportunityCost', 'evidenceQuality'];

function stringArray(value, label, problems, { required = true } = {}) {
  if (!Array.isArray(value) || (required && value.length === 0)) {
    problems.push(`${label} must be ${required ? 'a non-empty' : 'an'} array`);
    return [];
  }
  const normalized = [];
  value.forEach((item, index) => {
    if (typeof item !== 'string' || !item.trim()) problems.push(`${label}[${index}] must be a non-empty string`);
    else normalized.push(item.trim());
  });
  return normalized;
}

export function validateProposal(input) {
  const problems = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Proposal must be an object');
  }
  const allowed = new Set([
    'schemaVersion', 'id', 'title', 'summary', 'owner', 'riskTier', 'metrics',
    'evidence', 'acceptanceCriteria', 'dependencies', 'canonicalRefs', 'action',
    'qualityGates', 'metadata',
  ]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) problems.push(`proposal.${key} is not supported`);
  }
  if (input.schemaVersion !== 1) problems.push('proposal.schemaVersion must be 1');
  for (const field of ['title', 'summary', 'owner', 'action']) {
    if (typeof input[field] !== 'string' || !input[field].trim()) {
      problems.push(`proposal.${field} must be a non-empty string`);
    }
  }
  if (!RISK_TIERS.has(input.riskTier)) problems.push('proposal.riskTier must be R0, R1, R2, or R3');
  if (!input.metrics || typeof input.metrics !== 'object' || Array.isArray(input.metrics)) {
    problems.push('proposal.metrics must be an object');
  } else {
    for (const metric of METRIC_NAMES) {
      if (!Number.isInteger(input.metrics[metric]) || input.metrics[metric] < 0 || input.metrics[metric] > 5) {
        problems.push(`proposal.metrics.${metric} must be an integer from 0 to 5`);
      }
    }
  }
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    problems.push('proposal.evidence must be a non-empty array');
  } else {
    input.evidence.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        problems.push(`proposal.evidence[${index}] must be an object`);
        return;
      }
      for (const field of ['source', 'claim']) {
        if (typeof item[field] !== 'string' || !item[field].trim()) {
          problems.push(`proposal.evidence[${index}].${field} must be a non-empty string`);
        }
      }
    });
  }
  const acceptanceCriteria = stringArray(input.acceptanceCriteria, 'proposal.acceptanceCriteria', problems);
  const dependencies = stringArray(input.dependencies ?? [], 'proposal.dependencies', problems, { required: false });
  const canonicalRefs = stringArray(input.canonicalRefs, 'proposal.canonicalRefs', problems);
  const qualityGates = stringArray(input.qualityGates, 'proposal.qualityGates', problems);
  if (input.metadata !== undefined && (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata))) {
    problems.push('proposal.metadata must be an object when provided');
  }
  if (problems.length) throw new ValidationError('Proposal validation failed', problems);

  const normalized = {
    schemaVersion: 1,
    title: input.title.trim(),
    summary: input.summary.trim(),
    owner: input.owner.trim(),
    riskTier: input.riskTier,
    metrics: Object.fromEntries(METRIC_NAMES.map((name) => [name, input.metrics[name]])),
    evidence: input.evidence.map(({ source, claim }) => ({ source: source.trim(), claim: claim.trim() })),
    acceptanceCriteria,
    dependencies,
    canonicalRefs,
    action: input.action.trim(),
    qualityGates,
    metadata: input.metadata ?? {},
  };
  const computedId = `cdp-${sha256(stableStringify(normalized)).slice(0, 20)}`;
  if (input.id !== undefined && input.id !== computedId) {
    throw new ValidationError(`proposal.id must equal stable ID ${computedId}`);
  }
  return { id: computedId, ...normalized };
}

export function scoreProposal(proposal) {
  const { publicImpact, risk, effort, opportunityCost, evidenceQuality } = proposal.metrics;
  const components = {
    publicImpact: publicImpact * 7,
    evidenceQuality: evidenceQuality * 4,
    riskSafety: (5 - risk) * 4,
    opportunityCost: (5 - opportunityCost) * 3,
    effort: (5 - effort) * 2,
  };
  return {
    score: Object.values(components).reduce((sum, value) => sum + value, 0),
    maximum: 100,
    formula: 'impact*7 + evidence*4 + (5-risk)*4 + (5-opportunityCost)*3 + (5-effort)*2',
    components,
  };
}

export function assertTransition(from, to) {
  if (!STATES.includes(from) || !STATES.includes(to) || !TRANSITIONS[from].includes(to)) {
    throw new ValidationError(`Invalid state transition: ${from} -> ${to}`);
  }
}

export function validateCanonicalBindings(ledger, references, workspaceRoot) {
  const problems = [];
  if (!ledger || ledger.schemaVersion !== 1 || !Array.isArray(ledger.entries)) {
    throw new ValidationError('Canonical ledger must use schemaVersion 1 and contain entries[]');
  }
  const byId = new Map(ledger.entries.map((entry) => [entry.id, entry]));
  const bound = [];
  for (const reference of references) {
    const entry = byId.get(reference);
    if (!entry) {
      problems.push(`canonical reference "${reference}" is not in the ledger`);
      continue;
    }
    for (const field of ['sourcePath', 'sourceVersion', 'owner', 'sha256']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        problems.push(`canonical entry "${reference}" is missing ${field}`);
      }
    }
    if (entry.status !== 'BOUND') problems.push(`canonical entry "${reference}" is ${entry.status || 'UNBOUND'}, not BOUND`);
    if (!entry.approval || entry.approval.status !== 'approved' || !entry.approval.actor || !entry.approval.approvedAt) {
      problems.push(`canonical entry "${reference}" lacks complete approval`);
    }
    if (problems.some((problem) => problem.includes(`"${reference}"`))) continue;
    const source = resolveInside(workspaceRoot, entry.sourcePath, `canonical entry "${reference}" sourcePath`);
    if (!fileExists(source)) {
      problems.push(`canonical entry "${reference}" source does not exist: ${entry.sourcePath}`);
      continue;
    }
    const actualHash = fileSha256(source);
    if (actualHash !== entry.sha256.toLowerCase()) {
      problems.push(`canonical entry "${reference}" SHA-256 mismatch: expected ${entry.sha256}, got ${actualHash}`);
      continue;
    }
    bound.push({
      id: entry.id,
      sourcePath: entry.sourcePath,
      sourceVersion: entry.sourceVersion,
      owner: entry.owner,
      sha256: actualHash,
      approval: entry.approval,
    });
  }
  if (problems.length) throw new ValidationError('Canonical binding validation failed', problems);
  return bound;
}

export function createExecutionPlan(proposal, canonicalBindings) {
  return {
    version: 1,
    proposalId: proposal.id,
    owner: proposal.owner,
    dependencies: proposal.dependencies,
    acceptanceCriteria: proposal.acceptanceCriteria,
    canonicalReferences: canonicalBindings,
    steps: [
      {
        id: `${proposal.id}-execute`,
        owner: proposal.owner,
        action: proposal.action,
        dependsOn: proposal.dependencies,
        acceptanceCriteria: proposal.acceptanceCriteria,
        canonicalRefs: proposal.canonicalRefs,
      },
      {
        id: `${proposal.id}-critic`,
        owner: 'critic',
        action: 'independent-review',
        dependsOn: [`${proposal.id}-execute`],
        acceptanceCriteria: proposal.qualityGates.map((gate) => `quality gate passes: ${gate}`),
        canonicalRefs: proposal.canonicalRefs,
      },
    ],
  };
}
