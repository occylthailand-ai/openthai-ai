import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { apiUrl } from '../apiBase';

const TABS = [
  { id: 'password', label: '🔑 Login', icon: '🔑' },
  { id: 'google',   label: '🟢 Google', icon: '🟢' },
  { id: 'recovery', label: '🆘 Recovery', icon: '🆘' },
];

const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState('password');

  // ── password tab ──
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // ── recovery tab ──
  const [recoveryCode, setRecoveryCode] = useState('');

  // ── shared ──
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // ── handle ?token= หรือ ?error= จาก Google OAuth callback ──
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const err = params.get('error');

    if (token) {
      localStorage.setItem('auth_token', token);
      onLogin();
      navigate('/dashboard', { replace: true });
    }
    if (err === 'google_cancelled') setError('ยกเลิกการ login ด้วย Google');
    if (err === 'not_allowed') setError('อีเมลนี้ไม่ได้รับอนุญาตให้เข้าใช้งาน');
    if (err === 'google_failed') setError('Google login ล้มเหลว กรุณาลองใหม่');
  }, []);

  const handleError = (msg) => { setError(msg); setInfo(''); };
  const handleInfo  = (msg) => { setInfo(msg); setError(''); };

  // ── Login ด้วย username/password ──
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { handleError(data.error || 'Login ล้มเหลว'); return; }
      localStorage.setItem('auth_token', data.token);
      onLogin();
      navigate('/dashboard', { replace: true });
    } catch {
      handleError('ไม่สามารถเชื่อมต่อ server — รัน backend ก่อนด้วย start.bat');
    } finally {
      setLoading(false);
    }
  };

  // ── Login ด้วย Google OAuth ──
  const handleGoogleLogin = () => {
    window.location.href = apiUrl('/api/auth/google');
  };

  // ── Login ด้วย Recovery Code ──
  const handleRecovery = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(apiUrl('/api/auth/recovery'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: recoveryCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { handleError(data.error || 'Code ไม่ถูกต้อง'); return; }
      handleInfo(data.warning || 'เข้าสู่ระบบสำเร็จ');
      localStorage.setItem('auth_token', data.token);
      setTimeout(() => { onLogin(); }, 1200);
    } catch {
      handleError('ไม่สามารถเชื่อมต่อ server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Logo size="lg" />
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
          ยินดีต้อนรับสู่ Openthai.ai Platform
        </p>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError(''); setInfo(''); }}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                background: tab === t.id ? 'var(--accent-color)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-secondary)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Password ── */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label>ชื่อผู้ใช้งาน</label>
              <input type="text" placeholder="admin" value={username}
                onChange={e => setUsername(e.target.value)} required autoFocus />
            </div>
            <div className="input-group">
              <label>รหัสผ่าน</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'กำลังตรวจสอบ...' : '🔑 เข้าสู่ระบบ'}
            </button>
          </form>
        )}

        {/* ── Tab: Google OAuth ── */}
        {tab === 'google' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', margin: 0 }}>
              เข้าสู่ระบบด้วย Google Account — ไม่ต้องจำรหัสผ่าน
            </p>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" onClick={handleGoogleLogin}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.4 30.2 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6C12.5 13 17.9 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
                <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.7-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.8.9 7.5 2.7 10.7l7.8-6z"/>
                <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.7 2.2-7.7 2.2-6.1 0-11.3-4.1-13.1-9.7l-7.8 6C6.7 42.6 14.7 48 24 48z"/>
              </svg>
              Continue with Google
            </button>
            <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: 11, textAlign: 'center', margin: 0 }}>
              ต้องตั้งค่า GOOGLE_CLIENT_ID ใน backend/.env ก่อน
            </p>
          </div>
        )}

        {/* ── Tab: Recovery Code ── */}
        {tab === 'recovery' && (
          <form onSubmit={handleRecovery} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#fca5a5',
            }}>
              ⚠️ Recovery Code ใช้ได้เพียงครั้งเดียว — ใช้เมื่อลืม password เท่านั้น
            </div>
            <div className="input-group">
              <label>Recovery Code</label>
              <input type="text" placeholder="XXXX-XXXX-XXXX" value={recoveryCode}
                onChange={e => setRecoveryCode(e.target.value)} required
                style={{ letterSpacing: 2, fontFamily: 'monospace', fontSize: 16 }} />
            </div>
            {error && <p className="error-text">{error}</p>}
            {info && (
              <p style={{ color: '#34d399', fontSize: 13, textAlign: 'center', margin: 0 }}>
                ✅ {info}
              </p>
            )}
            <button type="submit" className="btn-primary" disabled={loading || !recoveryCode.trim()}
              style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
              {loading ? 'กำลังตรวจสอบ...' : '🆘 ใช้ Recovery Code'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
