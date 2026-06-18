import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const DIMENSIONS = [
  { key: 'database',    label: 'Database',       icon: '🗄️', desc: 'SQLite / PostgreSQL connection' },
  { key: 'payment_qr',  label: 'Payment QR',     icon: '💳', desc: 'PromptPay EMV QR generator' },
  { key: 'slack',       label: 'Slack Webhook',  icon: '💬', desc: 'Notification channel' },
  { key: 'anthropic',   label: 'AI Engine',      icon: '🤖', desc: 'Claude API key' },
  { key: 'env_vars',    label: 'Env Vars',       icon: '🔑', desc: 'Required environment variables' },
];

const EXTRA_FLOWS = [
  { key: 'frontend',    label: 'Frontend',       icon: '🌐', url: '/', desc: 'openthai-ai.com' },
  { key: 'payment_page',label: 'Payment Page',   icon: '💰', url: '/payment', desc: 'Checkout flow' },
  { key: 'creative',    label: 'Creative Guild', icon: '🎨', url: '/creative-guild', desc: 'Recruitment landing' },
  { key: 'producer',    label: 'Producer',       icon: '🏭', url: '/producer', desc: 'Producer onboarding' },
];

function StatusBadge({ status }) {
  const cfg = {
    ok:      { bg: '#0d6e3c', color: '#6ee7b7', label: 'OK' },
    error:   { bg: '#7f1d1d', color: '#fca5a5', label: 'ERROR' },
    loading: { bg: '#1e3a5f', color: '#93c5fd', label: '...' },
    unknown: { bg: '#374151', color: '#9ca3af', label: '—' },
  };
  const c = cfg[status] || cfg.unknown;
  return (
    <span style={{
      background: c.bg, color: c.color,
      borderRadius: 6, padding: '2px 10px',
      fontSize: 12, fontWeight: 600, letterSpacing: 1,
    }}>{c.label}</span>
  );
}

function CheckRow({ name, icon, label, desc, status, ms, detail }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: '#f1f5f9' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          {status === 'error' ? <span style={{ color: '#fca5a5' }}>{detail}</span> : desc}
        </div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 80 }}>
        <StatusBadge status={status} />
        {ms != null && (
          <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{ms}ms</div>
        )}
      </div>
    </div>
  );
}

export default function WorkflowMonitorPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logs, setLogs] = useState([]);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl('/workflow/status'));
      const d = await r.json();
      setData(d);
      setLastCheck(new Date());
    } catch (e) {
      setData({ overall: 'error', checks: [], errors: 1, error: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const r = await fetch(apiUrl('/workflow/logs?limit=20'));
      const d = await r.json();
      setLogs(d.logs || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => { fetchStatus(); fetchLogs(); }, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchStatus, fetchLogs]);

  const getCheck = (key) => {
    if (!data?.checks) return { status: 'loading' };
    return data.checks.find(c => c.name === key) || { status: 'unknown' };
  };

  const overallColor = {
    ok: '#22c55e', degraded: '#f59e0b', error: '#ef4444',
  }[data?.overall] || '#64748b';

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#f1f5f9',
      fontFamily: 'system-ui, sans-serif', padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#f8fafc' }}>
              🔭 Workflow Monitor
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              ติดตามทุก flow ทุกมิติ — real-time
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
              Auto (30s)
            </label>
            <button
              onClick={() => { fetchStatus(); fetchLogs(); }}
              disabled={loading}
              style={{
                background: '#1e40af', color: '#bfdbfe', border: 'none',
                borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13,
              }}
            >
              {loading ? '⟳ กำลังตรวจ...' : '↻ ตรวจสอบ'}
            </button>
          </div>
        </div>

        {/* Overall Status */}
        <div style={{
          background: '#1e293b', borderRadius: 12, padding: '16px 20px',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16,
          border: `1px solid ${overallColor}44`,
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: overallColor,
            boxShadow: `0 0 8px ${overallColor}`,
          }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#f8fafc' }}>
              {data ? (data.overall === 'ok' ? 'ทุกระบบทำงานปกติ ✅' : `พบปัญหา ${data.errors} จุด ⚠️`) : 'กำลังตรวจสอบ...'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {lastCheck ? `ตรวจล่าสุด: ${lastCheck.toLocaleTimeString('th-TH')}` : 'ยังไม่ได้ตรวจ'}
              {data?.env && ` · ENV: ${data.env} · v${data.version}`}
            </div>
          </div>
        </div>

        {/* Backend Checks */}
        <div style={{ background: '#1e293b', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            BACKEND SERVICES
          </div>
          {DIMENSIONS.map(d => {
            const c = getCheck(d.key);
            return (
              <CheckRow
                key={d.key}
                icon={d.icon} label={d.label} desc={d.desc}
                status={loading ? 'loading' : c.status}
                ms={c.ms} detail={c.detail}
              />
            );
          })}
        </div>

        {/* Frontend Flows */}
        <div style={{ background: '#1e293b', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            FRONTEND FLOWS
          </div>
          {EXTRA_FLOWS.map(f => (
            <div key={f.key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: '#f1f5f9' }}>{f.label}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{f.desc}</div>
              </div>
              <a
                href={f.url} target="_blank" rel="noopener noreferrer"
                style={{
                  background: '#0f3460', color: '#7dd3fc', border: 'none',
                  borderRadius: 6, padding: '5px 12px', fontSize: 12, textDecoration: 'none',
                }}
              >
                เปิด →
              </a>
            </div>
          ))}
        </div>

        {/* Pipeline Checklist */}
        <div style={{ background: '#1e293b', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            PIPELINE CHECKLIST — ทุกขั้นตอน
          </div>
          {[
            { done: true,  step: 'Git push → GitHub',       desc: 'master branch auto-deploy' },
            { done: true,  step: 'Vercel Frontend Deploy',   desc: 'openthai-ai.com' },
            { done: true,  step: 'Render Backend Deploy',    desc: 'openthai-ai-1.onrender.com' },
            { done: true,  step: 'CORS configured',          desc: 'www + non-www + vercel.app' },
            { done: true,  step: 'PROMPTPAY_ID set',         desc: 'PromptPay QR พร้อมใช้งาน' },
            { done: true,  step: 'SLACK_WEBHOOK_URL set',    desc: 'Notification ทำงาน' },
            { done: true,  step: 'payment.py module',        desc: 'EMV QR + CRC16 implementation' },
            { done: true,  step: 'POST /payment/create',     desc: 'Returns QR base64 + charge_id' },
            { done: true,  step: 'GET /payment/status/:id',  desc: 'Poll payment status from DB' },
            { done: true,  step: 'POST /creative/apply',     desc: 'Creative Guild applications' },
            { done: true,  step: 'POST /workflow/status',    desc: 'Unified health check' },
            { done: false, step: 'Payment end-to-end test',  desc: 'ทดสอบชำระเงินจริง 100 บาท' },
            { done: false, step: 'Admin confirm endpoint',   desc: 'POST /payment/confirm/:id' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              opacity: item.done ? 1 : 0.6,
            }}>
              <span style={{ fontSize: 16 }}>{item.done ? '✅' : '⬜'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: item.done ? 400 : 500, color: item.done ? '#94a3b8' : '#f1f5f9' }}>
                  {item.step}
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Errors */}
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            RECENT ERRORS {logs.length > 0 && `(${logs.length})`}
          </div>
          {logs.length === 0 ? (
            <div style={{ padding: '20px 16px', color: '#22c55e', fontSize: 13, textAlign: 'center' }}>
              ✅ ไม่มี error ในระบบ
            </div>
          ) : logs.map((log, i) => (
            <div key={i} style={{
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              fontFamily: 'monospace', fontSize: 12,
            }}>
              <span style={{ color: log.level === 'error' ? '#fca5a5' : '#fcd34d', marginRight: 8 }}>
                [{log.level?.toUpperCase()}]
              </span>
              <span style={{ color: '#7dd3fc', marginRight: 8 }}>{log.source}</span>
              <span style={{ color: '#cbd5e1' }}>{log.message}</span>
              <span style={{ color: '#475569', float: 'right' }}>{log.created_at?.slice(0, 19)}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, color: '#334155', fontSize: 12 }}>
          OpenThai.ai Workflow Monitor v2.2 · backend: openthai-ai-1.onrender.com
        </div>
      </div>
    </div>
  );
}
