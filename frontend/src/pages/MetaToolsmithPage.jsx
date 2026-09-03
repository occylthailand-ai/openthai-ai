import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ARTIFACTS,
  PREVIEW_API,
  appendLedgerEntry,
  buildCanonicalMessage,
  buildLockBundle,
  createMetricsSnapshot,
  deriveAuthoritativeGates,
  forgeArtifact,
  generateAllArtifacts,
  renderPrometheusMetrics,
  runG9Preflight,
  scanHealerBytes,
  scanHealerText,
  validateOciReference,
  verifyQuorum,
} from '../metaToolsmith';

const LANG = {
  th: {
    title: 'Meta-Toolsmith v1.3',
    subtitle: 'Forge ของจริง · Healer เข้มขึ้น · JSONL lock chain · G9 preflight · ota-preview fallback',
    back: '← Dashboard',
    forge: 'Forge',
    healer: 'Healer',
    lock: 'Lock + Ledger',
    quorum: 'Quorum + G9',
    oci: 'OCI Validator',
    gates: 'Gates',
    preview: 'Preview APIs',
    generateSelected: 'Forge selected artifact',
    generateAll: 'Generate all (atomic batch)',
    serviceName: 'ชื่อ service',
    namespace: 'namespace',
    imageDigest: 'image digest',
    existingPaths: 'ใส่ path ที่ถือว่ามีอยู่แล้วเพื่อจำลอง conflict (1 บรรทัดต่อ 1 path)',
    healerInput: 'วาง source / manifest / attestation ที่ต้องการสแกน',
    runHealer: 'Run healer',
    buildLocks: 'Build lock bundle',
    tamperLedger: 'Tamper ledger',
    appendLedger: 'Append ledger event',
    autofillQuorum: 'Autofill quorum binding',
    verifyQuorum: 'Verify quorum',
    runPreflight: 'Run G9 preflight',
    validate: 'Validate',
    simulation: 'Simulation state',
    authoritative: 'Authoritative gates',
    blocked: 'สถานะจริงยัง BLOCKED จนกว่าจะมี evidence จริงครบ',
  },
  en: {
    title: 'Meta-Toolsmith v1.3',
    subtitle: 'Real Forge · stricter Healer · JSONL lock chain · G9 preflight · ota-preview fallback',
    back: '← Dashboard',
    forge: 'Forge',
    healer: 'Healer',
    lock: 'Lock + Ledger',
    quorum: 'Quorum + G9',
    oci: 'OCI Validator',
    gates: 'Gates',
    preview: 'Preview APIs',
    generateSelected: 'Forge selected artifact',
    generateAll: 'Generate all (atomic batch)',
    serviceName: 'service name',
    namespace: 'namespace',
    imageDigest: 'image digest',
    existingPaths: 'List existing paths to simulate conflicts (one per line)',
    healerInput: 'Paste source / manifest / attestation to scan',
    runHealer: 'Run healer',
    buildLocks: 'Build lock bundle',
    tamperLedger: 'Tamper ledger',
    appendLedger: 'Append ledger event',
    autofillQuorum: 'Autofill quorum binding',
    verifyQuorum: 'Verify quorum',
    runPreflight: 'Run G9 preflight',
    validate: 'Validate',
    simulation: 'Simulation state',
    authoritative: 'Authoritative gates',
    blocked: 'Real status remains BLOCKED until genuine evidence exists.',
  },
};

const panel = {
  background: '#111827',
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: 18,
  padding: 20,
  boxShadow: '0 20px 40px rgba(15,23,42,0.25)',
};

export default function MetaToolsmithPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('th');
  const t = LANG[lang];
  const [context, setContext] = useState({
    serviceName: 'meta-toolsmith',
    namespace: 'openthai-system',
    imageDigest: 'sha256:' + 'a'.repeat(64),
  });
  const [activeArtifact, setActiveArtifact] = useState(ARTIFACTS[0].id);
  const forged = useMemo(() => forgeArtifact(activeArtifact, context), [activeArtifact, context]);
  const [existingPaths, setExistingPaths] = useState('');
  const [batchResult, setBatchResult] = useState(null);
  const [healerMode, setHealerMode] = useState('source');
  const [healerInput, setHealerInput] = useState(forged?.content || '');
  const [healerResult, setHealerResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [lockBundle, setLockBundle] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerFrozen, setLedgerFrozen] = useState(false);
  const [ledgerStatus, setLedgerStatus] = useState('');
  const [quorum, setQuorum] = useState({
    role: 'release',
    canonicalMessage: '',
    attestation: JSON.stringify({
      role: 'release',
      canonicalMessage: '',
      helm_lock_sha256: '',
      oci_lock_sha256: '',
      signature: 'signed-by-release-bot',
    }, null, 2),
  });
  const [quorumResult, setQuorumResult] = useState(null);
  const [evidence, setEvidence] = useState({
    digest: false,
    provenance: false,
    cosignVerified: false,
    clusterEvidence: false,
  });
  const [preflightResult, setPreflightResult] = useState(null);
  const [ociRef, setOciRef] = useState(`ghcr.io/openthai-ai/meta-toolsmith@${context.imageDigest}`);
  const [ociResult, setOciResult] = useState(null);
  const [simGates, setSimGates] = useState({ G6: false, G7: false, G8: false, G9: false, G10: false });
  const [counters, setCounters] = useState({
    forge_total: 0,
    forge_rollback_total: 0,
    healer_runs_total: 0,
    healer_blocks_total: 0,
    oci_validation_total: 0,
    oci_reject_total: 0,
    lock_writes_total: 0,
    ledger_freeze_total: 0,
    g9_preflight_total: 0,
    g9_pass_total: 0,
  });

  const authoritative = deriveAuthoritativeGates({
    G6: evidence.digest,
    G7: evidence.provenance,
    G8: evidence.cosignVerified,
    G9: preflightResult?.pass === true,
  });
  const metrics = renderPrometheusMetrics(createMetricsSnapshot({ counters, authoritative, ledgerFrozen }));

  const bump = (delta) => setCounters((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(delta).map(([key, value]) => [key, (prev[key] || 0) + value])) }));

  const onForgeSelected = () => {
    const next = forgeArtifact(activeArtifact, context);
    setHealerInput(next?.content || '');
    bump({ forge_total: 1 });
  };

  const onGenerateAll = async () => {
    const result = await generateAllArtifacts(context, existingPaths.split('\n').map((line) => line.trim()).filter(Boolean));
    setBatchResult(result);
    bump(result.ok ? { forge_total: ARTIFACTS.length } : { forge_rollback_total: 1 });
  };

  const onHealerFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    const loaded = [];
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      loaded.push({ name: file.name, bytes });
    }
    setUploadedFiles(loaded);
  };

  const onRunHealer = () => {
    const inline = scanHealerText('inline-input', healerInput, healerMode);
    const fileResults = uploadedFiles.map((file) => ({ name: file.name, ...scanHealerBytes(file.name, file.bytes, healerMode) }));
    const allResults = [{ name: 'inline-input', ...inline }, ...fileResults];
    const blocked = allResults.some((result) => result.halted);
    setHealerResult(allResults);
    bump({ healer_runs_total: 1, healer_blocks_total: blocked ? 1 : 0 });
  };

  const onBuildLocks = async () => {
    const previousLedgerHash = ledgerEntries.length ? ledgerEntries[ledgerEntries.length - 1].hash : '';
    const next = await buildLockBundle({ ...context, previousLedgerHash });
    setLockBundle(next);
    const append = await appendLedgerEntry(ledgerEntries, {
      kind: 'lock_bundle',
      service: context.serviceName,
      namespace: context.namespace,
      canonicalMessage: next.canonicalMessage,
      helm_lock_sha256: next.helmHash,
      oci_lock_sha256: next.ociHash,
    });
    if (!append.ok) {
      setLedgerFrozen(true);
      setLedgerStatus(`FROZEN — ${append.reason}`);
      bump({ ledger_freeze_total: 1 });
      return;
    }
    setLedgerEntries(append.entries);
    setLedgerStatus('Lock bundle written to JSONL chain.');
    bump({ lock_writes_total: 1 });
  };

  const onAppendLedger = async () => {
    const append = await appendLedgerEntry(ledgerEntries, {
      kind: 'manual_event',
      service: context.serviceName,
      note: 'preview-append',
    });
    if (!append.ok) {
      setLedgerFrozen(true);
      setLedgerStatus(`FROZEN — ${append.reason}`);
      bump({ ledger_freeze_total: 1 });
      return;
    }
    setLedgerEntries(append.entries);
    setLedgerStatus('Manual ledger event appended.');
    bump({ lock_writes_total: 1 });
  };

  const onTamperLedger = () => {
    if (!ledgerEntries.length) {
      setLedgerStatus('Generate a lock bundle first.');
      return;
    }
    const tampered = ledgerEntries.map((entry, index) => (index === 0 ? { ...entry, prev_hash: 'tampered' } : entry));
    setLedgerEntries(tampered);
    setLedgerFrozen(true);
    setLedgerStatus('TAMPER DETECTED — ledger writes are frozen.');
    bump({ ledger_freeze_total: 1 });
  };

  const onAutofillQuorum = () => {
    if (!lockBundle) return;
    const canonicalMessage = buildCanonicalMessage({ role: quorum.role, helmHash: lockBundle.helmHash, ociHash: lockBundle.ociHash });
    setQuorum({
      role: quorum.role,
      canonicalMessage,
      attestation: JSON.stringify({
        role: quorum.role,
        canonicalMessage,
        helm_lock_sha256: lockBundle.helmHash,
        oci_lock_sha256: lockBundle.ociHash,
        signature: quorum.role === 'security' ? 'signed-by-security-bot' : 'signed-by-release-bot',
      }, null, 2),
    });
  };

  const onVerifyQuorum = () => {
    if (!lockBundle) return;
    setQuorumResult(verifyQuorum({
      role: quorum.role,
      canonicalMessage: quorum.canonicalMessage,
      attestation: quorum.attestation,
      helmHash: lockBundle.helmHash,
      ociHash: lockBundle.ociHash,
    }));
  };

  const onRunPreflight = () => {
    const result = runG9Preflight({
      digest: evidence.digest,
      provenance: evidence.provenance,
      quorumPassed: quorumResult?.pass,
      cosignVerified: evidence.cosignVerified,
      clusterEvidence: evidence.clusterEvidence,
    });
    setPreflightResult(result);
    bump({ g9_preflight_total: 1, g9_pass_total: result.pass ? 1 : 0 });
  };

  const onValidateOci = () => {
    const result = validateOciReference(ociRef);
    setOciResult(result);
    bump({ oci_validation_total: 1, oci_reject_total: result.ok ? 0 : 1 });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#020617,#0f172a)', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 1380, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={ghostBtn}>{t.back}</button>
            <h1 style={{ margin: '14px 0 0', fontSize: 'clamp(32px,5vw,48px)', fontWeight: 900 }}>{t.title}</h1>
            <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 16 }}>{t.subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, height: 40 }}>
            {['th', 'en'].map((key) => (
              <button key={key} onClick={() => setLang(key)} style={{ ...ghostBtn, background: lang === key ? '#4338ca' : 'transparent', color: '#fff' }}>
                {key === 'th' ? 'ไทย' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 14, background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.25)', color: '#fecaca', fontWeight: 700 }}>
          ⛔ {t.blocked}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 20 }}>
          {[
            [t.forge, '13 canonical artifacts'],
            [t.healer, 'binary + non-UTF-8 + dangerous patterns'],
            [t.lock, 'helm/OCI lock + prev_hash JSONL'],
            [t.quorum, '5 checks + dry-run=server only'],
            [t.preview, '/preview + /metrics + APIs'],
          ].map(([label, sub]) => (
            <div key={label} style={{ ...panel, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <section style={panel}>
              <SectionHead title={t.forge} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 16 }}>
                <input value={context.serviceName} onChange={(e) => setContext((prev) => ({ ...prev, serviceName: e.target.value }))} placeholder={t.serviceName} style={inputStyle} />
                <input value={context.namespace} onChange={(e) => setContext((prev) => ({ ...prev, namespace: e.target.value }))} placeholder={t.namespace} style={inputStyle} />
                <input value={context.imageDigest} onChange={(e) => setContext((prev) => ({ ...prev, imageDigest: e.target.value }))} placeholder={t.imageDigest} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))', gap: 10, marginBottom: 16 }}>
                {ARTIFACTS.map((artifact) => (
                  <button
                    key={artifact.id}
                    onClick={() => setActiveArtifact(artifact.id)}
                    style={{
                      textAlign: 'left',
                      padding: 14,
                      borderRadius: 12,
                      border: `1px solid ${activeArtifact === artifact.id ? '#6366f1' : '#334155'}`,
                      background: activeArtifact === artifact.id ? 'rgba(99,102,241,0.16)' : '#0f172a',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{artifact.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{artifact.fileName}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <button onClick={onForgeSelected} style={primaryBtn}>{t.generateSelected}</button>
                <button onClick={onGenerateAll} style={{ ...primaryBtn, background: 'linear-gradient(135deg,#0ea5e9,#22c55e)' }}>{t.generateAll}</button>
              </div>
              <textarea value={existingPaths} onChange={(e) => setExistingPaths(e.target.value)} placeholder={t.existingPaths} style={{ ...inputStyle, minHeight: 72, marginBottom: 14, resize: 'vertical' }} />
              {batchResult && (
                <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, background: batchResult.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.14)', border: `1px solid ${batchResult.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                  {batchResult.ok
                    ? `✅ Generated ${batchResult.generated.length}/${ARTIFACTS.length} artifacts atomically.`
                    : `⛔ Rolled back whole batch due to conflicts: ${batchResult.conflicts.join(', ')}`}
                </div>
              )}
              <CodeBlock title={forged?.fileName} body={forged?.content} />
            </section>

            <section style={panel}>
              <SectionHead title={t.healer} />
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, marginBottom: 12 }}>
                <select value={healerMode} onChange={(e) => setHealerMode(e.target.value)} style={inputStyle}>
                  <option value="source">source</option>
                  <option value="release">release</option>
                  <option value="attest">attest</option>
                </select>
                <input type="file" multiple onChange={onHealerFiles} style={inputStyle} />
              </div>
              <textarea value={healerInput} onChange={(e) => setHealerInput(e.target.value)} placeholder={t.healerInput} style={{ ...inputStyle, minHeight: 180, resize: 'vertical' }} />
              <div style={{ marginTop: 12 }}>
                <button onClick={onRunHealer} style={primaryBtn}>{t.runHealer}</button>
              </div>
              {healerResult && (
                <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                  {healerResult.map((result) => (
                    <div key={result.name} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontWeight: 800 }}>{result.name}</div>
                      {result.alert && <div style={{ color: '#fca5a5', marginTop: 8 }}>{result.alert}</div>}
                      {result.issues.length ? (
                        <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                          {result.issues.map((issue) => (
                            <li key={`${result.name}-${issue.label}`} style={{ marginBottom: 6, color: '#cbd5e1' }}>
                              <strong style={{ color: issue.severity === 'critical' ? '#f87171' : '#fcd34d' }}>{issue.severity.toUpperCase()}</strong> — {issue.label}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ color: '#4ade80', marginTop: 8 }}>No issues found.</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section style={panel}>
              <SectionHead title={t.lock} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <button onClick={onBuildLocks} style={primaryBtn}>{t.buildLocks}</button>
                <button onClick={onAppendLedger} style={{ ...primaryBtn, background: '#334155' }} disabled={ledgerFrozen}>{t.appendLedger}</button>
                <button onClick={onTamperLedger} style={{ ...primaryBtn, background: 'linear-gradient(135deg,#dc2626,#ef4444)' }}>{t.tamperLedger}</button>
              </div>
              {ledgerStatus && (
                <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, background: ledgerFrozen ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.12)', border: `1px solid ${ledgerFrozen ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}` }}>
                  {ledgerStatus}
                </div>
              )}
              {lockBundle && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <CodeBlock title={`helm_lock sha256=${lockBundle.helmHash}`} body={lockBundle.helmLock} />
                  <CodeBlock title={`oci_lock sha256=${lockBundle.ociHash}`} body={lockBundle.ociLock} />
                </div>
              )}
              <CodeBlock
                title={`ledger.jsonl${ledgerFrozen ? ' (frozen)' : ''}`}
                body={ledgerEntries.map((entry) => JSON.stringify(entry)).join('\n') || 'No ledger entries yet.'}
              />
            </section>
          </div>

          <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
            <section style={panel}>
              <SectionHead title={t.quorum} />
              <div style={{ display: 'grid', gap: 10 }}>
                <select value={quorum.role} onChange={(e) => setQuorum((prev) => ({ ...prev, role: e.target.value }))} style={inputStyle}>
                  <option value="release">release</option>
                  <option value="security">security</option>
                </select>
                <textarea value={quorum.canonicalMessage} onChange={(e) => setQuorum((prev) => ({ ...prev, canonicalMessage: e.target.value }))} style={{ ...inputStyle, minHeight: 90 }} placeholder="canonical message" />
                <textarea value={quorum.attestation} onChange={(e) => setQuorum((prev) => ({ ...prev, attestation: e.target.value }))} style={{ ...inputStyle, minHeight: 180 }} placeholder="attestation JSON" />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                <button onClick={onAutofillQuorum} style={{ ...primaryBtn, background: '#334155' }} disabled={!lockBundle}>{t.autofillQuorum}</button>
                <button onClick={onVerifyQuorum} style={primaryBtn} disabled={!lockBundle}>{t.verifyQuorum}</button>
              </div>
              {quorumResult && (
                <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
                  {quorumResult.checks.map((check) => (
                    <MetricRow key={check.id} label={check.label} value={check.ok ? 'PASS' : 'FAIL'} good={check.ok} />
                  ))}
                </div>
              )}
              <div style={{ marginTop: 16, borderTop: '1px solid #1e293b', paddingTop: 16 }}>
                {[
                  ['digest', 'Digest'],
                  ['provenance', 'Provenance'],
                  ['cosignVerified', 'Cosign registry verification'],
                  ['clusterEvidence', 'Helm cluster evidence'],
                ].map(([key, label]) => (
                  <label key={key} style={gateRow}>
                    <span>{label}</span>
                    <input type="checkbox" checked={evidence[key]} onChange={(e) => setEvidence((prev) => ({ ...prev, [key]: e.target.checked }))} />
                  </label>
                ))}
                <button onClick={onRunPreflight} style={{ ...primaryBtn, marginTop: 12 }}>{t.runPreflight}</button>
                {preflightResult && (
                  <div style={{ marginTop: 14 }}>
                    {preflightResult.checks.map((check) => (
                      <MetricRow key={check.id} label={check.label} value={check.ok ? 'PASS' : 'FAIL'} good={check.ok} />
                    ))}
                    <div style={{ marginTop: 10, color: preflightResult.pass ? '#4ade80' : '#fca5a5', fontWeight: 700 }}>
                      {preflightResult.pass ? `✅ ${preflightResult.helmCommand}` : `⛔ ${preflightResult.blockedReason}`}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section style={panel}>
              <SectionHead title={t.oci} />
              <input value={ociRef} onChange={(e) => setOciRef(e.target.value)} placeholder="ghcr.io/openthai-ai/meta-toolsmith@sha256:..." style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={onValidateOci} style={primaryBtn}>{t.validate}</button>
              {ociResult && (
                <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: ociResult.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.14)', border: `1px solid ${ociResult.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                  {ociResult.ok ? '✅' : '⛔'} {ociResult.message}
                </div>
              )}
            </section>

            <section style={panel}>
              <SectionHead title={t.preview} />
              <div style={{ display: 'grid', gap: 8 }}>
                {PREVIEW_API.map((entry) => (
                  <div key={entry.path} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12 }}>
                      <strong>{entry.method}</strong> {entry.path}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{entry.purpose}</div>
                  </div>
                ))}
              </div>
              <CodeBlock title="/metrics" body={metrics} />
            </section>

            <section style={panel}>
              <SectionHead title={t.gates} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>{t.simulation}</div>
                  {Object.keys(simGates).map((gate) => (
                    <label key={gate} style={gateRow}>
                      <span>{gate}</span>
                      <input type="checkbox" checked={simGates[gate]} onChange={(e) => setSimGates((prev) => ({ ...prev, [gate]: e.target.checked }))} />
                    </label>
                  ))}
                </div>
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>{t.authoritative}</div>
                  {Object.entries(authoritative).map(([gate, value]) => (
                    <div key={gate} style={gateRow}>
                      <span>{gate}</span>
                      <strong style={{ color: value ? '#4ade80' : '#f87171' }}>{value ? 'PASS' : 'BLOCK'}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title }) {
  return <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>{title}</div>;
}

function MetricRow({ label, value, good }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 12px' }}>
      <span>{label}</span>
      <strong style={{ color: good ? '#4ade80' : '#f87171' }}>{value}</strong>
    </div>
  );
}

function CodeBlock({ title, body }) {
  return (
    <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden', marginTop: 14 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontSize: 12 }}>{title}</div>
      <pre style={{ margin: 0, padding: 16, overflowX: 'auto', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{body}</pre>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  background: '#020617',
  border: '1px solid #334155',
  borderRadius: 12,
  color: '#e2e8f0',
  padding: '11px 12px',
  fontSize: 13,
  boxSizing: 'border-box',
};

const primaryBtn = {
  background: 'linear-gradient(135deg,#6366f1,#0ea5e9)',
  border: 'none',
  color: '#fff',
  padding: '10px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 700,
};

const ghostBtn = {
  background: 'transparent',
  border: '1px solid #334155',
  color: '#94a3b8',
  padding: '8px 14px',
  borderRadius: 10,
  cursor: 'pointer',
};

const gateRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  fontSize: 13,
};
