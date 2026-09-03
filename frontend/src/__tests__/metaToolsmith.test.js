import { describe, expect, it } from 'vitest';
import {
  appendLedgerEntry,
  buildCanonicalMessage,
  buildLockBundle,
  generateAllArtifacts,
  deriveAuthoritativeGates,
  renderPrometheusMetrics,
  runG9Preflight,
  scanHealerBytes,
  scanHealerText,
  verifyLedgerChain,
  validateOciReference,
  verifyQuorum,
} from '../metaToolsmith';

describe('metaToolsmith helpers', () => {
  it('halts healer immediately on forbidden patterns', () => {
    const result = scanHealerText('demo.sh', 'echo ok\nrm -rf /\n', 'source');
    expect(result.halted).toBe(true);
    expect(result.alert).toContain('FORBIDDEN');
  });

  it('blocks binary and non-utf8 healer uploads', () => {
    expect(scanHealerBytes('demo.pyc', new Uint8Array([1, 2, 3]), 'source').halted).toBe(true);
    expect(scanHealerBytes('demo.txt', new Uint8Array([0xc3, 0x28]), 'source').halted).toBe(true);
  });

  it('accepts only digest pinned OCI references', () => {
    expect(validateOciReference('ghcr.io/openthai-ai/app@sha256:' + 'a'.repeat(64)).ok).toBe(true);
    expect(validateOciReference('ghcr.io/openthai-ai/app:latest').ok).toBe(false);
    expect(validateOciReference('ghcr.io/openthai-ai/app:1.2.0').ok).toBe(false);
  });

  it('passes quorum only when all five checks pass', () => {
    const helmHash = 'b'.repeat(64);
    const ociHash = 'c'.repeat(64);
    const canonicalMessage = buildCanonicalMessage({ role: 'release', helmHash, ociHash });
    const attestation = JSON.stringify({
      role: 'release',
      canonicalMessage,
      helm_lock_sha256: helmHash,
      oci_lock_sha256: ociHash,
      signature: 'signed-by-release-bot',
    });
    const result = verifyQuorum({ role: 'release', canonicalMessage, attestation, helmHash, ociHash });
    expect(result.pass).toBe(true);
    expect(result.checks).toHaveLength(5);
    expect(result.checks.every((check) => check.ok)).toBe(true);
  });

  it('derives authoritative G10 from G6-G9 only', () => {
    expect(deriveAuthoritativeGates({ G6: true, G7: true, G8: true, G9: true }).G10).toBe(true);
    expect(deriveAuthoritativeGates({ G6: true, G7: true, G8: true, G9: false }).G10).toBe(false);
  });

  it('rolls back generate_all when any file conflicts', async () => {
    const result = await generateAllArtifacts(
      { serviceName: 'meta-toolsmith', namespace: 'ns', imageDigest: 'sha256:' + 'a'.repeat(64) },
      ['scripts/push-oci.sh'],
    );
    expect(result.ok).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.generated).toHaveLength(0);
  });

  it('creates lock bundles and verifies intact ledger chains', async () => {
    const bundle = await buildLockBundle({ serviceName: 'meta-toolsmith', namespace: 'ns', imageDigest: 'sha256:' + 'a'.repeat(64) });
    const first = await appendLedgerEntry([], {
      kind: 'lock_bundle',
      service: 'meta-toolsmith',
      canonicalMessage: bundle.canonicalMessage,
      helm_lock_sha256: bundle.helmHash,
      oci_lock_sha256: bundle.ociHash,
    });
    const second = await appendLedgerEntry(first.entries, { kind: 'manual_event', service: 'meta-toolsmith' });
    const verified = await verifyLedgerChain(second.entries);
    expect(verified.ok).toBe(true);
  });

  it('freezes ledger writes after tampering', async () => {
    const first = await appendLedgerEntry([], { kind: 'lock_bundle', service: 'meta-toolsmith' });
    const tampered = [{ ...first.entry, prev_hash: 'tampered' }];
    const verified = await verifyLedgerChain(tampered);
    expect(verified.ok).toBe(false);
    const append = await appendLedgerEntry(tampered, { kind: 'manual_event', service: 'meta-toolsmith' });
    expect(append.frozen).toBe(true);
  });

  it('requires all five checks before returning helm dry-run command', () => {
    const blocked = runG9Preflight({ digest: true, provenance: false, quorumPassed: true, cosignVerified: true, clusterEvidence: true });
    expect(blocked.pass).toBe(false);
    const passed = runG9Preflight({ digest: true, provenance: true, quorumPassed: true, cosignVerified: true, clusterEvidence: true });
    expect(passed.pass).toBe(true);
    expect(passed.helmCommand).toContain('--dry-run=server');
  });

  it('renders prometheus-compatible metrics text', () => {
    const text = renderPrometheusMetrics({
      forge_total: 13,
      forge_rollback_total: 1,
      healer_runs_total: 2,
      healer_blocks_total: 1,
      oci_validation_total: 2,
      oci_reject_total: 1,
      lock_writes_total: 2,
      ledger_freeze_total: 1,
      g9_preflight_total: 1,
      g9_pass_total: 0,
      ledger_frozen: 1,
      gates: { G6: false, G7: false, G8: false, G9: false, G10: false },
    });
    expect(text).toContain('meta_toolsmith_forge_total 13');
    expect(text).toContain('meta_toolsmith_authoritative_gate{gate="G10"} 0');
  });
});
