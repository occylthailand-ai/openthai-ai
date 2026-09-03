import { describe, expect, it } from 'vitest';
import {
  buildCanonicalMessage,
  deriveAuthoritativeGates,
  scanHealerText,
  validateOciReference,
  verifyQuorum,
} from '../metaToolsmith';

describe('metaToolsmith helpers', () => {
  it('halts healer immediately on forbidden patterns', () => {
    const result = scanHealerText('demo.sh', 'echo ok\nrm -rf /\n', 'source');
    expect(result.halted).toBe(true);
    expect(result.alert).toContain('FORBIDDEN');
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
});
