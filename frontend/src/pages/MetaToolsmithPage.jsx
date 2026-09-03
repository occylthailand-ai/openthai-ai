import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ARTIFACTS,
  deriveAuthoritativeGates,
  forgeArtifact,
  isBinaryLikeName,
  scanHealerText,
  validateOciReference,
  verifyQuorum,
} from '../metaToolsmith';

const LANG = {
  th: {
    title: 'Meta-Toolsmith v1.2',
    subtitle: 'Forge · Healer · Quorum · OCI Validator · Gates',
    back: '← Dashboard',
    forge: 'Forge',
    healer: 'Healer',
    quorum: 'Quorum',
    oci: 'OCI Validator',
    gates: 'Gates',
    forgeAll: 'Forge selected artifact',
    forgeHint: 'เลือก 1 ใน 13 artifacts แล้วคัดลอกโค้ดไปใช้ได้ทันที',
    serviceName: 'ชื่อ service',
    namespace: 'namespace',
    imageDigest: 'image digest',
    healerMode: 'โหมด scan',
    healerInput: 'วาง source / manifest / attestation ที่ต้องการสแกน',
    healerRun: 'Run healer',
    healerFiles: 'แนบไฟล์เพิ่มเติม',
    quorumRole: 'role',
    canonicalMessage: 'canonical message',
    attestation: 'attestation JSON',
    verifyQuorum: 'Verify quorum',
    ociInput: 'OCI reference',
    validate: 'Validate',
    simulation: 'Simulation state',
    authoritative: 'Authoritative gates',
    derived: 'Derived from G6–G9 only',
    noShortcut: 'G10 authoritative ถูกคำนวณอัตโนมัติ — ไม่มีปุ่มลัด',
  },
  en: {
    title: 'Meta-Toolsmith v1.2',
    subtitle: 'Forge · Healer · Quorum · OCI Validator · Gates',
    back: '← Dashboard',
    forge: 'Forge',
    healer: 'Healer',
    quorum: 'Quorum',
    oci: 'OCI Validator',
    gates: 'Gates',
    forgeAll: 'Forge selected artifact',
    forgeHint: 'Pick 1 of 13 artifacts and copy the generated code bundle immediately.',
    serviceName: 'service name',
    namespace: 'namespace',
    imageDigest: 'image digest',
    healerMode: 'scan mode',
    healerInput: 'Paste the source / manifest / attestation to scan',
    healerRun: 'Run healer',
    healerFiles: 'Attach extra files',
    quorumRole: 'role',
    canonicalMessage: 'canonical message',
    attestation: 'attestation JSON',
    verifyQuorum: 'Verify quorum',
    ociInput: 'OCI reference',
    validate: 'Validate',
    simulation: 'Simulation state',
    authoritative: 'Authoritative gates',
    derived: 'Derived from G6–G9 only',
    noShortcut: 'Authoritative G10 is computed automatically — no shortcut.',
  },
};

const panel = {
  background: '#111827',
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: 18,
  padding: 20,
  boxShadow: '0 20px 40px rgba(15,23,42,0.25)',
};

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

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
  const [healerMode, setHealerMode] = useState('source');
  const [healerInput, setHealerInput] = useState(forged?.content || '');
  const [healerResult, setHealerResult] = useState(null);
  const [healerFiles, setHealerFiles] = useState([]);
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
    helmLock: 'chart=meta-toolsmith\nversion=0.1.2\n',
    ociLock: `image=ghcr.io/openthai-ai/meta-toolsmith@${context.imageDigest}\n`,
  });
  const [quorumResult, setQuorumResult] = useState(null);
  const [ociRef, setOciRef] = useState(`ghcr.io/openthai-ai/meta-toolsmith@${context.imageDigest}`);
  const [ociResult, setOciResult] = useState(null);
  const [simGates, setSimGates] = useState({ G6: false, G7: false, G8: false, G9: false, G10: false });
  const [authGates, setAuthGates] = useState({ G6: true, G7: true, G8: true, G9: false });
  const authoritative = deriveAuthoritativeGates(authGates);

  const onForge = () => {
    const next = forgeArtifact(activeArtifact, context);
    setHealerInput(next?.content || '');
  };

  const onHealerFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    const loaded = [];
    for (const file of files) {
      if (isBinaryLikeName(file.name) || file.type.startsWith('image/') || file.type === 'application/octet-stream') {
        loaded.push({ name: file.name, skipped: true, reason: 'binary/.pyc skipped' });
      } else {
        loaded.push({ name: file.name, skipped: false, text: await file.text() });
      }
    }
    setHealerFiles(loaded);
  };

  const runHealer = () => {
    const sources = [{ name: 'inline-input', skipped: false, text: healerInput }, ...healerFiles];
    const results = [];
    for (const source of sources) {
      if (source.skipped) {
        results.push({ name: source.name, skipped: true, issues: [] });
        continue;
      }
      const result = scanHealerText(source.name, source.text || '', healerMode);
      results.push({ name: source.name, ...result, skipped: false });
      if (result.halted) {
        setHealerResult({ halted: true, alert: result.alert, results });
        return;
      }
    }
    setHealerResult({ halted: false, alert: '', results });
  };

  const runQuorum = async () => {
    const helmHash = await sha256Hex(quorum.helmLock);
    const ociHash = await sha256Hex(quorum.ociLock);
    const result = verifyQuorum({
      role: quorum.role,
      canonicalMessage: quorum.canonicalMessage,
      attestation: quorum.attestation,
      helmHash,
      ociHash,
    });
    setQuorumResult({ ...result, helmHash, ociHash });
  };

  const updateQuorumExample = async () => {
    const helmHash = await sha256Hex(quorum.helmLock);
    const ociHash = await sha256Hex(quorum.ociLock);
    const canonicalMessage = `META-QUORUM|role=${quorum.role}|helm_lock_sha256=${helmHash}|oci_lock_sha256=${ociHash}`;
    const attestation = JSON.stringify({
      role: quorum.role,
      canonicalMessage,
      helm_lock_sha256: helmHash,
      oci_lock_sha256: ociHash,
      signature: quorum.role === 'security' ? 'signed-by-security-bot' : 'signed-by-release-bot',
    }, null, 2);
    setQuorum((prev) => ({ ...prev, canonicalMessage, attestation }));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#020617,#0f172a)', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '8px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 14 }}>
              {t.back}
            </button>
            <h1 style={{ margin: 0, fontSize: 'clamp(32px,5vw,48px)', fontWeight: 900 }}>{t.title}</h1>
            <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 16 }}>{t.subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, height: 40 }}>
            {['th', 'en'].map((key) => (
              <button key={key} onClick={() => setLang(key)} style={{ background: lang === key ? '#6366f1' : 'transparent', border: '1px solid #334155', color: '#fff', padding: '0 14px', borderRadius: 10, cursor: 'pointer' }}>
                {key === 'th' ? 'ไทย' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 20 }}>
          {[
            [t.forge, '13 artifacts'],
            [t.healer, '5 forbidden patterns'],
            [t.quorum, '5 checks before G9'],
            [t.oci, '@sha256 only'],
            [t.gates, 'G10 derived only'],
          ].map(([label, sub]) => (
            <div key={label} style={{ ...panel, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 20 }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <section style={panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{t.forge}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{t.forgeHint}</div>
                </div>
                <button onClick={onForge} style={{ background: 'linear-gradient(135deg,#4f46e5,#22c55e)', border: 'none', color: '#fff', padding: '11px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
                  {t.forgeAll}
                </button>
              </div>
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
              <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontSize: 12 }}>{forged?.fileName}</div>
                <pre style={{ margin: 0, padding: 16, overflowX: 'auto', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{forged?.content}</pre>
              </div>
            </section>

            <section style={panel}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>{t.healer}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, marginBottom: 12 }}>
                <select value={healerMode} onChange={(e) => setHealerMode(e.target.value)} style={inputStyle}>
                  <option value="source">source</option>
                  <option value="release">release</option>
                  <option value="attest">attest</option>
                </select>
                <input type="file" multiple onChange={onHealerFiles} style={inputStyle} aria-label={t.healerFiles} />
              </div>
              <textarea value={healerInput} onChange={(e) => setHealerInput(e.target.value)} placeholder={t.healerInput} style={{ ...inputStyle, minHeight: 180, resize: 'vertical' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{t.healerMode}: {healerMode}</div>
                <button onClick={runHealer} style={primaryBtn}>{t.healerRun}</button>
              </div>
              {healerResult && (
                <div style={{ marginTop: 16 }}>
                  {healerResult.halted && (
                    <div style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.35)', color: '#fecaca', padding: '12px 14px', borderRadius: 12, marginBottom: 12 }}>
                      ⛔ {healerResult.alert}
                    </div>
                  )}
                  <div style={{ display: 'grid', gap: 10 }}>
                    {healerResult.results.map((result) => (
                      <div key={result.name} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 14 }}>
                        <div style={{ fontWeight: 700 }}>{result.name}</div>
                        {result.skipped ? (
                          <div style={{ color: '#fbbf24', fontSize: 13, marginTop: 8 }}>Skipped binary/.pyc input — no UTF-8 read attempted.</div>
                        ) : result.issues.length ? (
                          <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: '#cbd5e1' }}>
                            {result.issues.map((issue) => (
                              <li key={`${result.name}-${issue.label}`} style={{ marginBottom: 6 }}>
                                <strong style={{ color: issue.severity === 'high' || issue.severity === 'critical' ? '#fca5a5' : '#fcd34d' }}>{issue.severity.toUpperCase()}</strong> — {issue.label}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div style={{ color: '#4ade80', fontSize: 13, marginTop: 8 }}>No issues found for this mode.</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
            <section style={panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{t.quorum}</div>
                <button onClick={updateQuorumExample} style={{ ...primaryBtn, background: '#334155' }}>Autofill binding</button>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <select value={quorum.role} onChange={(e) => setQuorum((prev) => ({ ...prev, role: e.target.value }))} style={inputStyle}>
                  <option value="release">release</option>
                  <option value="security">security</option>
                </select>
                <textarea value={quorum.helmLock} onChange={(e) => setQuorum((prev) => ({ ...prev, helmLock: e.target.value }))} style={{ ...inputStyle, minHeight: 90 }} placeholder="helm_lock" />
                <textarea value={quorum.ociLock} onChange={(e) => setQuorum((prev) => ({ ...prev, ociLock: e.target.value }))} style={{ ...inputStyle, minHeight: 90 }} placeholder="oci_lock" />
                <textarea value={quorum.canonicalMessage} onChange={(e) => setQuorum((prev) => ({ ...prev, canonicalMessage: e.target.value }))} style={{ ...inputStyle, minHeight: 88 }} placeholder={t.canonicalMessage} />
                <textarea value={quorum.attestation} onChange={(e) => setQuorum((prev) => ({ ...prev, attestation: e.target.value }))} style={{ ...inputStyle, minHeight: 180 }} placeholder={t.attestation} />
              </div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={runQuorum} style={primaryBtn}>{t.verifyQuorum}</button>
              </div>
              {quorumResult && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ color: quorumResult.pass ? '#4ade80' : '#f87171', fontWeight: 800, marginBottom: 10 }}>
                    {quorumResult.pass ? '✅ G9 PASS' : '⛔ G9 BLOCK'}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                    helm_lock={quorumResult.helmHash} · oci_lock={quorumResult.ociHash}
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {quorumResult.checks.map((check) => (
                      <div key={check.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 12px' }}>
                        <span>{check.label}</span>
                        <strong style={{ color: check.ok ? '#4ade80' : '#f87171' }}>{check.ok ? 'PASS' : 'FAIL'}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section style={panel}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>{t.oci}</div>
              <input value={ociRef} onChange={(e) => setOciRef(e.target.value)} placeholder={t.ociInput} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={() => setOciResult(validateOciReference(ociRef))} style={primaryBtn}>{t.validate}</button>
              {ociResult && (
                <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: ociResult.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${ociResult.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}` }}>
                  {ociResult.ok ? '✅ ' : '⛔ '} {ociResult.message}
                </div>
              )}
            </section>

            <section style={panel}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{t.gates}</div>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>{t.noShortcut}</div>
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
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.authoritative}</div>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 12 }}>{t.derived}</div>
                  {['G6', 'G7', 'G8', 'G9'].map((gate) => (
                    <label key={gate} style={gateRow}>
                      <span>{gate}</span>
                      <input type="checkbox" checked={authGates[gate]} onChange={(e) => setAuthGates((prev) => ({ ...prev, [gate]: e.target.checked }))} />
                    </label>
                  ))}
                  <div style={{ ...gateRow, marginTop: 10, paddingTop: 10, borderTop: '1px solid #1e293b' }}>
                    <span>G10</span>
                    <strong style={{ color: authoritative.G10 ? '#4ade80' : '#f87171' }}>{authoritative.G10 ? 'PASS' : 'BLOCK'}</strong>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
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

const gateRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  fontSize: 13,
};
