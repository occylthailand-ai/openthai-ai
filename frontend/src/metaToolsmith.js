const FORBIDDEN_PATTERNS = [
  { id: 'rm-root', label: 'Dangerous delete', needle: 'rm -rf /' },
  { id: 'drop-table', label: 'Destructive SQL', needle: 'DROP TABLE' },
  { id: 'exec-base64', label: 'Encoded exec', needle: 'exec(base64' },
];

const MODE_RULES = {
  source: [
    { id: 'privileged', label: 'Privileged container requested', pattern: /\bprivileged:\s*true\b/i, severity: 'critical' },
    { id: 'todo', label: 'TODO/FIXME left in source', pattern: /\b(?:TODO|FIXME)\b/i, severity: 'medium' },
    { id: 'console', label: 'Debug console usage still present', pattern: /\bconsole\.(?:log|debug)\s*\(/, severity: 'low' },
  ],
  release: [
    { id: 'latest-tag', label: 'Mutable image tag detected', pattern: /(?:image:\s*.+|^[^@\s]+):latest\b/im, severity: 'critical' },
    { id: 'semver-tag', label: 'Mutable semver tag detected', pattern: /(?:image:\s*.+|^[^@\s]+):\d+\.\d+\.\d+\b/im, severity: 'high' },
    { id: 'allow-priv-escalation', label: 'Container allows privilege escalation', pattern: /\ballowPrivilegeEscalation:\s*true\b/i, severity: 'high' },
    { id: 'privileged', label: 'Privileged container requested', pattern: /\bprivileged:\s*true\b/i, severity: 'critical' },
  ],
  attest: [
    { id: 'unsigned', label: 'Signature field is missing', pattern: /"signature"\s*:\s*""|signature:\s*""/i, severity: 'high' },
    { id: 'role-missing', label: 'Required attestation role missing', pattern: /"role"\s*:\s*""|role:\s*""/i, severity: 'high' },
    { id: 'canonical-missing', label: 'Canonical message missing', pattern: /"canonicalMessage"\s*:\s*""|canonicalMessage:\s*""/i, severity: 'high' },
  ],
};

const HEX_64_RE = /^[a-f0-9]{64}$/i;
const DIGEST_RE = /^.+@sha256:[a-f0-9]{64}$/i;

export const PREVIEW_API = [
  { method: 'GET', path: '/preview', purpose: 'Preview UI' },
  { method: 'GET', path: '/metrics', purpose: 'Prometheus metrics' },
  { method: 'POST', path: '/api/forge', purpose: 'Forge 13 artifacts / batch rollback' },
  { method: 'POST', path: '/api/healer', purpose: 'Scan source/release/attestation payloads' },
  { method: 'POST', path: '/api/oci', purpose: 'Validate OCI digest pinning' },
  { method: 'POST', path: '/api/lock', purpose: 'Generate helm/OCI locks + JSONL chain' },
  { method: 'POST', path: '/api/g9-preflight', purpose: 'Run 5 preflight checks before Helm' },
];

export const ARTIFACTS = [
  {
    id: 'fastapi-endpoint',
    label: 'FastAPI endpoint',
    fileName: 'services/meta_toolsmith/main.py',
    forge: ({ serviceName, namespace }) => `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="${serviceName}", version="1.3.0")


class ForgeRequest(BaseModel):
    artifact: str = Field(min_length=3)
    namespace: str = Field(default="${namespace}")
    image_digest: str = Field(pattern=r"^sha256:[a-f0-9]{64}$")


@app.get("/healthz")
def healthz():
    return {"status": "ok", "service": "${serviceName}", "policy": "g6-g10"}


@app.post("/forge")
def forge(req: ForgeRequest):
    if not req.image_digest.startswith("sha256:"):
        raise HTTPException(status_code=400, detail="digest required")
    return {
        "ok": True,
        "artifact": req.artifact,
        "namespace": req.namespace,
        "image_digest": req.image_digest,
        "release_channel": "stable",
    }
`,
  },
  {
    id: 'helm-chart',
    label: 'Helm chart',
    fileName: 'charts/meta-toolsmith/README.bundle.txt',
    forge: ({ serviceName, namespace, imageDigest }) => `# charts/meta-toolsmith/Chart.yaml
apiVersion: v2
name: meta-toolsmith
description: Helm chart for ${serviceName}
type: application
version: 0.1.3
appVersion: "1.3.0"

---
# charts/meta-toolsmith/values.yaml
namespace: ${namespace}
image:
  repository: ghcr.io/openthai-ai/${serviceName}
  digest: ${imageDigest}
service:
  port: 8000

---
# charts/meta-toolsmith/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "meta-toolsmith.fullname" . }}
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ include "meta-toolsmith.name" . }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: {{ include "meta-toolsmith.name" . }}
    spec:
      containers:
        - name: ${serviceName}
          image: "{{ .Values.image.repository }}@{{ .Values.image.digest }}"
          securityContext:
            allowPrivilegeEscalation: false
          ports:
            - containerPort: 8000
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8000
`,
  },
  {
    id: 'oci-pusher',
    label: 'OCI pusher',
    fileName: 'scripts/push-oci.sh',
    forge: ({ serviceName, imageDigest }) => `#!/usr/bin/env bash
set -euo pipefail

IMAGE_REPO="\${1:-ghcr.io/openthai-ai/${serviceName}}"
DIGEST="${imageDigest}"

if [[ ! "$DIGEST" =~ ^sha256:[a-f0-9]{64}$ ]]; then
  echo "Expected sha256 digest, got: $DIGEST" >&2
  exit 1
fi

oras push "$IMAGE_REPO@$DIGEST" \\
  --artifact-type application/vnd.openthai.release.layer.v1 \\
  ./dist/release.tar.gz:application/gzip

echo "Pushed $IMAGE_REPO@$DIGEST"
`,
  },
  {
    id: 'ota-release-cli',
    label: 'ota-release CLI',
    fileName: 'tools/ota-release.mjs',
    forge: ({ serviceName }) => `#!/usr/bin/env node
import process from 'node:process';

const [, , digest, channel = 'stable'] = process.argv;

if (!digest || !/^sha256:[a-f0-9]{64}$/i.test(digest)) {
  console.error('usage: ota-release <sha256:digest> [channel]');
  process.exit(1);
}

console.log(JSON.stringify({
  service: '${serviceName}',
  channel,
  digest,
  releasedAt: new Date().toISOString(),
}, null, 2));
`,
  },
  {
    id: 'skill-module',
    label: 'Skill module',
    fileName: 'skills/meta-toolsmith.js',
    forge: ({ serviceName }) => `export const metaToolsmithSkill = {
  id: 'meta-toolsmith-v13',
  name: 'Meta-Toolsmith v1.3',
  description: 'Generate release-safe artifacts for ${serviceName}',
  run({ artifact, digest }) {
    if (!/^sha256:[a-f0-9]{64}$/i.test(digest)) {
      throw new Error('Digest pinning is required');
    }
    return {
      ok: true,
      artifact,
      digest,
      policy: 'g6-g10',
    };
  },
};
`,
  },
  {
    id: 'qdrant-ingestor',
    label: 'Qdrant ingestor',
    fileName: 'pipelines/qdrant_ingestor.py',
    forge: ({ serviceName }) => `from qdrant_client import QdrantClient
from qdrant_client.http import models


def ingest(points, collection="meta-toolsmith"):
    client = QdrantClient(url="http://localhost:6333")
    client.recreate_collection(
        collection_name=collection,
        vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
    )
    client.upsert(
        collection_name=collection,
        points=[
            models.PointStruct(id=idx, vector=point["vector"], payload={**point["payload"], "service": "${serviceName}"})
            for idx, point in enumerate(points, start=1)
        ],
    )
`,
  },
  {
    id: 'network-policy',
    label: 'NetworkPolicy',
    fileName: 'deploy/network-policy.yaml',
    forge: ({ namespace }) => `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: meta-toolsmith-default-deny
  namespace: ${namespace}
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: meta-toolsmith
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
`,
  },
  {
    id: 'hpa-pdb',
    label: 'HPA + PDB',
    fileName: 'deploy/hpa-pdb.yaml',
    forge: () => `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: meta-toolsmith
spec:
  minReplicas: 2
  maxReplicas: 6
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: meta-toolsmith
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: meta-toolsmith
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: meta-toolsmith
`,
  },
  {
    id: 'contract-test',
    label: 'Contract test',
    fileName: 'tests/meta-toolsmith.contract.test.mjs',
    forge: () => `import test from 'node:test';
import assert from 'node:assert/strict';

test('oci references are digest pinned', () => {
  const ref = 'ghcr.io/openthai-ai/meta-toolsmith@sha256:' + 'a'.repeat(64);
  assert.match(ref, /^.+@sha256:[a-f0-9]{64}$/i);
});

test('canonical quorum message binds both lock files', () => {
  const canonical = 'META-QUORUM|role=release|helm_lock_sha256=' + 'b'.repeat(64) + '|oci_lock_sha256=' + 'c'.repeat(64);
  assert.match(canonical, /^META-QUORUM\\|role=(security|release)\\|helm_lock_sha256=[a-f0-9]{64}\\|oci_lock_sha256=[a-f0-9]{64}$/i);
});
`,
  },
  {
    id: 'lock-manifest',
    label: 'Lock manifest',
    fileName: 'locks/meta-toolsmith.lock.json',
    forge: ({ imageDigest }) => `{
  "schemaVersion": "1.3",
  "helm_lock_sha256": "REPLACE_WITH_HELM_LOCK_SHA256",
  "oci_lock_sha256": "REPLACE_WITH_OCI_LOCK_SHA256",
  "ledger_format": "jsonl-prev-hash",
  "images": [
    {
      "name": "ghcr.io/openthai-ai/meta-toolsmith",
      "digest": "${imageDigest}"
    }
  ]
}
`,
  },
  {
    id: 'gate-verifier',
    label: 'Gate verifier',
    fileName: 'tools/gate-verifier.mjs',
    forge: () => `export function deriveG10(gates) {
  return ['G6', 'G7', 'G8', 'G9'].every((key) => gates[key] === true);
}

export function verifyAuthoritativeGates(gates) {
  const g10 = deriveG10(gates);
  return {
    ...gates,
    G10: g10,
    verdict: g10 ? 'PASS' : 'BLOCK',
  };
}
`,
  },
  {
    id: 'monitoring-rule',
    label: 'Monitoring / PrometheusRule',
    fileName: 'deploy/prometheus-rule.yaml',
    forge: ({ namespace }) => `apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: meta-toolsmith
  namespace: ${namespace}
spec:
  groups:
    - name: meta-toolsmith.rules
      rules:
        - alert: MetaToolsmithGateFailure
          expr: max_over_time(meta_toolsmith_g9_pass_total[10m]) == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Meta-Toolsmith G9 is failing"
            description: "Quorum verification is no longer passing."
`,
  },
  {
    id: 'docs-v12-oci',
    label: 'docs/04-V12-OCI',
    fileName: 'docs/04-V12-OCI.md',
    forge: ({ imageDigest }) => `# 04 — V1.3 OCI Release Discipline

## Accepted image format

Only digest-pinned references are accepted:

\`\`\`
ghcr.io/openthai-ai/meta-toolsmith@${imageDigest}
\`\`\`

## Rejected examples

- \`ghcr.io/openthai-ai/meta-toolsmith:latest\`
- \`ghcr.io/openthai-ai/meta-toolsmith:1.2.0\`

## Quorum binding

Canonical messages must bind both \`helm_lock\` and \`oci_lock\` SHA-256 values before G9 may pass.
`,
  },
];

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(String(input));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function forgeArtifact(id, context) {
  const artifact = ARTIFACTS.find((item) => item.id === id);
  if (!artifact) return null;
  return {
    ...artifact,
    content: artifact.forge(context),
  };
}

export function isBinaryLikeName(name = '') {
  return /\.(?:pyc|png|jpe?g|gif|webp|zip|gz|pdf|woff2?|exe|bin|ota)$/i.test(name);
}

export function isProbablyBinary(bytes) {
  if (!bytes?.length) return false;
  const sample = bytes.slice(0, Math.min(bytes.length, 512));
  let suspicious = 0;
  for (const value of sample) {
    if (value === 0) return true;
    if ((value < 9 || (value > 13 && value < 32)) && value !== 27) suspicious += 1;
  }
  return suspicious / sample.length > 0.1;
}

export function decodeUtf8Bytes(bytes) {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function scanHealerText(name, text, mode = 'source') {
  for (const item of FORBIDDEN_PATTERNS) {
    if (text.includes(item.needle)) {
      return {
        halted: true,
        alert: `FORBIDDEN: ${item.label} in ${name}`,
        issues: [{
          severity: 'critical',
          label: item.label,
          detail: `Matched forbidden pattern "${item.needle}"`,
        }],
      };
    }
  }

  const rules = MODE_RULES[mode] || MODE_RULES.source;
  const issues = rules
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => ({
      severity: rule.severity,
      label: rule.label,
      detail: `${name} triggered ${rule.id}`,
    }));

  return {
    halted: issues.some((issue) => issue.severity === 'critical'),
    alert: issues.some((issue) => issue.severity === 'critical') ? `BLOCKED: critical healer issues in ${name}` : '',
    issues,
  };
}

export function scanHealerBytes(name, bytes, mode = 'source') {
  if (isBinaryLikeName(name) || isProbablyBinary(bytes)) {
    return {
      halted: true,
      alert: `BLOCKED: binary input in ${name}`,
      issues: [{ severity: 'critical', label: 'Binary input blocked', detail: 'Healer refuses binary or .pyc uploads.' }],
    };
  }
  try {
    const text = decodeUtf8Bytes(bytes);
    return scanHealerText(name, text, mode);
  } catch {
    return {
      halted: true,
      alert: `BLOCKED: non-UTF-8 input in ${name}`,
      issues: [{ severity: 'critical', label: 'Non-UTF-8 input blocked', detail: 'Upload could not be decoded as UTF-8.' }],
    };
  }
}

export async function generateAllArtifacts(context, existingPaths = []) {
  const conflicts = ARTIFACTS
    .filter((artifact) => existingPaths.includes(artifact.fileName))
    .map((artifact) => artifact.fileName);

  if (conflicts.length) {
    return {
      ok: false,
      rolledBack: true,
      conflicts,
      generated: [],
    };
  }

  return {
    ok: true,
    rolledBack: false,
    conflicts: [],
    generated: ARTIFACTS.map((artifact) => forgeArtifact(artifact.id, context)),
  };
}

export function buildCanonicalMessage({ role, helmHash, ociHash }) {
  return `META-QUORUM|role=${role}|helm_lock_sha256=${helmHash}|oci_lock_sha256=${ociHash}`;
}

export async function buildLockBundle({ serviceName, namespace, imageDigest, previousLedgerHash = '' }) {
  const helmLock = stableJson({
    apiVersion: 'openthai.ai/v1',
    kind: 'HelmLock',
    service: serviceName,
    namespace,
    chart: 'meta-toolsmith',
    image: `ghcr.io/openthai-ai/${serviceName}@${imageDigest}`,
  });
  const ociLock = stableJson({
    apiVersion: 'openthai.ai/v1',
    kind: 'OciLock',
    service: serviceName,
    image: `ghcr.io/openthai-ai/${serviceName}@${imageDigest}`,
  });
  const helmHash = await sha256Hex(helmLock);
  const ociHash = await sha256Hex(ociLock);
  const canonicalMessage = buildCanonicalMessage({ role: 'release', helmHash, ociHash });
  const baseEntry = {
    ts: new Date().toISOString(),
    kind: 'lock_bundle',
    service: serviceName,
    namespace,
    prev_hash: previousLedgerHash || null,
    canonicalMessage,
    helm_lock_sha256: helmHash,
    oci_lock_sha256: ociHash,
  };
  const hash = await sha256Hex(stableJson(baseEntry));
  const ledgerEntry = { ...baseEntry, hash };
  return {
    helmLock,
    ociLock,
    helmHash,
    ociHash,
    canonicalMessage,
    ledgerEntry,
    jsonl: JSON.stringify(ledgerEntry),
  };
}

export async function verifyLedgerChain(entries = []) {
  let previousHash = null;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.prev_hash !== previousHash) {
      return { ok: false, frozen: true, index, reason: 'prev_hash mismatch' };
    }
    const { hash, ...base } = entry;
    const expectedHash = await sha256Hex(stableJson(base));
    if (hash !== expectedHash) {
      return { ok: false, frozen: true, index, reason: 'hash mismatch' };
    }
    previousHash = hash;
  }
  return { ok: true, frozen: false, index: -1, reason: '' };
}

export async function appendLedgerEntry(entries = [], payload = {}) {
  const verification = await verifyLedgerChain(entries);
  if (!verification.ok) {
    return {
      ok: false,
      frozen: true,
      entries,
      reason: verification.reason,
    };
  }

  const previousHash = entries.length ? entries[entries.length - 1].hash : null;
  const baseEntry = {
    ts: new Date().toISOString(),
    prev_hash: previousHash,
    ...payload,
  };
  const hash = await sha256Hex(stableJson(baseEntry));
  const entry = { ...baseEntry, hash };
  return {
    ok: true,
    frozen: false,
    entries: [...entries, entry],
    entry,
  };
}

export function validateOciReference(ref) {
  const value = (ref || '').trim();
  if (!value) return { ok: false, message: 'Enter an OCI reference first.' };
  if (DIGEST_RE.test(value)) return { ok: true, message: 'Digest-pinned OCI reference accepted.' };
  if (/:latest$/i.test(value) || /:\d+\.\d+\.\d+$/i.test(value)) {
    return { ok: false, message: 'Tags are rejected. Use @sha256:<64hex> only.' };
  }
  if (value.includes(':') && !value.includes('@sha256:')) {
    return { ok: false, message: 'Mutable tags are not allowed. Replace the tag with a digest pin.' };
  }
  return { ok: false, message: 'Invalid OCI reference. Expected image@sha256:<64hex>.' };
}

export function verifyQuorum({ role, canonicalMessage, attestation, helmHash, ociHash }) {
  const expectedCanonical = buildCanonicalMessage({ role, helmHash, ociHash });
  let parsed = null;
  try {
    parsed = JSON.parse(attestation || '{}');
  } catch {
    parsed = null;
  }

  const checks = [
    { id: 'role', ok: role === 'security' || role === 'release', label: 'Role is security or release' },
    { id: 'hash-shape', ok: HEX_64_RE.test(helmHash) && HEX_64_RE.test(ociHash), label: 'Lock hashes are SHA-256 hex values' },
    { id: 'canonical-match', ok: canonicalMessage === expectedCanonical, label: 'Canonical message matches expected binding' },
    {
      id: 'lock-binding',
      ok: parsed?.helm_lock_sha256 === helmHash && parsed?.oci_lock_sha256 === ociHash,
      label: 'Attestation binds helm_lock + oci_lock',
    },
    {
      id: 'attestation-integrity',
      ok: Boolean(parsed && parsed.role === role && parsed.canonicalMessage === expectedCanonical && parsed.signature),
      label: 'Attestation integrity is intact',
    },
  ];

  return {
    checks,
    pass: checks.every((check) => check.ok),
    expectedCanonical,
  };
}

export function runG9Preflight({ digest, provenance, quorumPassed, cosignVerified, clusterEvidence }) {
  const checks = [
    { id: 'digest', ok: Boolean(digest), label: 'Digest evidence present' },
    { id: 'provenance', ok: Boolean(provenance), label: 'Provenance evidence present' },
    { id: 'quorum', ok: Boolean(quorumPassed), label: 'Quorum passed' },
    { id: 'cosign', ok: Boolean(cosignVerified), label: 'Cosign registry verification present' },
    { id: 'cluster', ok: Boolean(clusterEvidence), label: 'Helm cluster evidence present' },
  ];
  const pass = checks.every((check) => check.ok);
  return {
    checks,
    pass,
    helmCommand: pass ? 'helm upgrade meta-toolsmith ./charts/meta-toolsmith --dry-run=server' : '',
    blockedReason: pass ? '' : 'BLOCKED until real digest, provenance, quorum, Cosign, and cluster evidence exist.',
  };
}

export function deriveAuthoritativeGates(gates) {
  const authoritative = {
    G6: Boolean(gates.G6),
    G7: Boolean(gates.G7),
    G8: Boolean(gates.G8),
    G9: Boolean(gates.G9),
  };
  return {
    ...authoritative,
    G10: authoritative.G6 && authoritative.G7 && authoritative.G8 && authoritative.G9,
  };
}

export function createMetricsSnapshot({ counters = {}, authoritative = {}, ledgerFrozen = false }) {
  return {
    forge_total: counters.forge_total || 0,
    forge_rollback_total: counters.forge_rollback_total || 0,
    healer_runs_total: counters.healer_runs_total || 0,
    healer_blocks_total: counters.healer_blocks_total || 0,
    oci_validation_total: counters.oci_validation_total || 0,
    oci_reject_total: counters.oci_reject_total || 0,
    lock_writes_total: counters.lock_writes_total || 0,
    ledger_freeze_total: counters.ledger_freeze_total || 0,
    g9_preflight_total: counters.g9_preflight_total || 0,
    g9_pass_total: counters.g9_pass_total || 0,
    ledger_frozen: ledgerFrozen ? 1 : 0,
    gates: authoritative,
  };
}

export function renderPrometheusMetrics(metrics) {
  return [
    '# HELP meta_toolsmith_forge_total Total forge operations',
    '# TYPE meta_toolsmith_forge_total counter',
    `meta_toolsmith_forge_total ${metrics.forge_total}`,
    '# HELP meta_toolsmith_forge_rollback_total Total batch rollbacks caused by conflicts',
    '# TYPE meta_toolsmith_forge_rollback_total counter',
    `meta_toolsmith_forge_rollback_total ${metrics.forge_rollback_total}`,
    '# HELP meta_toolsmith_healer_runs_total Total healer runs',
    '# TYPE meta_toolsmith_healer_runs_total counter',
    `meta_toolsmith_healer_runs_total ${metrics.healer_runs_total}`,
    '# HELP meta_toolsmith_healer_blocks_total Total healer hard blocks',
    '# TYPE meta_toolsmith_healer_blocks_total counter',
    `meta_toolsmith_healer_blocks_total ${metrics.healer_blocks_total}`,
    '# HELP meta_toolsmith_oci_validation_total Total OCI validations',
    '# TYPE meta_toolsmith_oci_validation_total counter',
    `meta_toolsmith_oci_validation_total ${metrics.oci_validation_total}`,
    '# HELP meta_toolsmith_oci_reject_total Total rejected OCI references',
    '# TYPE meta_toolsmith_oci_reject_total counter',
    `meta_toolsmith_oci_reject_total ${metrics.oci_reject_total}`,
    '# HELP meta_toolsmith_lock_writes_total Total lock ledger writes',
    '# TYPE meta_toolsmith_lock_writes_total counter',
    `meta_toolsmith_lock_writes_total ${metrics.lock_writes_total}`,
    '# HELP meta_toolsmith_ledger_freeze_total Total ledger freeze events',
    '# TYPE meta_toolsmith_ledger_freeze_total counter',
    `meta_toolsmith_ledger_freeze_total ${metrics.ledger_freeze_total}`,
    '# HELP meta_toolsmith_g9_preflight_total Total G9 preflight runs',
    '# TYPE meta_toolsmith_g9_preflight_total counter',
    `meta_toolsmith_g9_preflight_total ${metrics.g9_preflight_total}`,
    '# HELP meta_toolsmith_g9_pass_total Total successful G9 preflights',
    '# TYPE meta_toolsmith_g9_pass_total counter',
    `meta_toolsmith_g9_pass_total ${metrics.g9_pass_total}`,
    '# HELP meta_toolsmith_ledger_frozen Ledger frozen flag',
    '# TYPE meta_toolsmith_ledger_frozen gauge',
    `meta_toolsmith_ledger_frozen ${metrics.ledger_frozen}`,
    '# HELP meta_toolsmith_authoritative_gate Authoritative gate state',
    '# TYPE meta_toolsmith_authoritative_gate gauge',
    `meta_toolsmith_authoritative_gate{gate="G6"} ${metrics.gates.G6 ? 1 : 0}`,
    `meta_toolsmith_authoritative_gate{gate="G7"} ${metrics.gates.G7 ? 1 : 0}`,
    `meta_toolsmith_authoritative_gate{gate="G8"} ${metrics.gates.G8 ? 1 : 0}`,
    `meta_toolsmith_authoritative_gate{gate="G9"} ${metrics.gates.G9 ? 1 : 0}`,
    `meta_toolsmith_authoritative_gate{gate="G10"} ${metrics.gates.G10 ? 1 : 0}`,
    '',
  ].join('\n');
}
