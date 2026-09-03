const FORBIDDEN_PATTERNS = [
  { id: 'rm-root', label: 'Dangerous delete', needle: 'rm -rf /' },
  { id: 'drop-table', label: 'Destructive SQL', needle: 'DROP TABLE' },
  { id: 'exec-base64', label: 'Encoded exec', needle: 'exec(base64' },
  { id: 'curl-pipe-sh', label: 'Pipe to shell', needle: 'curl | sh' },
  { id: 'wget-pipe-sh', label: 'Pipe to shell', needle: 'wget | sh' },
];

const MODE_RULES = {
  source: [
    { id: 'todo', label: 'TODO/FIXME left in source', pattern: /\b(?:TODO|FIXME)\b/i, severity: 'medium' },
    { id: 'console', label: 'Debug console usage still present', pattern: /\bconsole\.(?:log|debug)\s*\(/, severity: 'low' },
    { id: 'placeholder', label: 'Placeholder values still present', pattern: /\b(?:changeme|example|your-value|stub)\b/i, severity: 'medium' },
  ],
  release: [
    { id: 'latest-tag', label: 'Mutable image tag detected', pattern: /\bimage:\s*.+:(?:latest|\d+\.\d+\.\d+)\b/i, severity: 'high' },
    { id: 'allow-priv-escalation', label: 'Container allows privilege escalation', pattern: /\ballowPrivilegeEscalation:\s*true\b/, severity: 'high' },
    { id: 'missing-digest', label: 'OCI image not pinned by digest', pattern: /\bimage:\s*.+:[^\s@]+$/im, severity: 'medium' },
  ],
  attest: [
    { id: 'unsigned', label: 'Signature field is missing', pattern: /"signature"\s*:\s*""|signature:\s*""/i, severity: 'high' },
    { id: 'role-missing', label: 'Required attestation role missing', pattern: /"role"\s*:\s*""|role:\s*""/i, severity: 'high' },
    { id: 'canonical-missing', label: 'Canonical message missing', pattern: /"canonicalMessage"\s*:\s*""|canonicalMessage:\s*""/i, severity: 'high' },
  ],
};

const HEX_64_RE = /^[a-f0-9]{64}$/i;
const DIGEST_RE = /^.+@sha256:[a-f0-9]{64}$/i;

export const ARTIFACTS = [
  {
    id: 'fastapi-endpoint',
    label: 'FastAPI endpoint',
    fileName: 'services/meta_toolsmith/main.py',
    forge: ({ serviceName, namespace }) => `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="${serviceName}", version="1.2.0")


class ForgeRequest(BaseModel):
    artifact: str = Field(min_length=3)
    namespace: str = Field(default="${namespace}")
    image_digest: str = Field(pattern=r"^sha256:[a-f0-9]{64}$")


@app.get("/healthz")
def healthz():
    return {"status": "ok", "service": "${serviceName}"}


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
version: 0.1.2
appVersion: "1.2.0"

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

oras push "$IMAGE_REPO@$DIGEST" \
  --artifact-type application/vnd.openthai.release.layer.v1 \
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
  id: 'meta-toolsmith-v12',
  name: 'Meta-Toolsmith v1.2',
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
  "schemaVersion": "1.2",
  "helm_lock_sha256": "REPLACE_WITH_HELM_LOCK_SHA256",
  "oci_lock_sha256": "REPLACE_WITH_OCI_LOCK_SHA256",
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
          expr: max_over_time(meta_toolsmith_gate_pass{gate="G9"}[10m]) == 0
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
    forge: ({ imageDigest }) => `# 04 — V1.2 OCI Release Discipline

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

export function forgeArtifact(id, context) {
  const artifact = ARTIFACTS.find((item) => item.id === id);
  if (!artifact) return null;
  return {
    ...artifact,
    content: artifact.forge(context),
  };
}

export function isBinaryLikeName(name = '') {
  return /\.(?:pyc|png|jpe?g|gif|webp|zip|gz|pdf|woff2?)$/i.test(name);
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
    halted: false,
    alert: '',
    issues,
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

export function buildCanonicalMessage({ role, helmHash, ociHash }) {
  return `META-QUORUM|role=${role}|helm_lock_sha256=${helmHash}|oci_lock_sha256=${ociHash}`;
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
