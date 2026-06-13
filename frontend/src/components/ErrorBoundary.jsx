import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', background: '#080812', display: 'flex',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: 24, fontFamily: "'Inter','Sarabun',sans-serif", color: '#f8fafc',
      }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>💥</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#f87171' }}>
            เกิดข้อผิดพลาดที่ไม่คาดคิด
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8, lineHeight: 1.7 }}>
            แอปพลิเคชันพบปัญหาบางอย่าง<br />กรุณาโหลดหน้าใหม่หรือกลับหน้าหลัก
          </p>
          {this.state.error && (
            <details style={{ marginBottom: 24, textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#475569', fontSize: 12, marginBottom: 8 }}>
                รายละเอียดข้อผิดพลาด (สำหรับนักพัฒนา)
              </summary>
              <pre style={{
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, padding: 12, fontSize: 11, color: '#fca5a5',
                overflow: 'auto', maxHeight: 200, textAlign: 'left', lineHeight: 1.6,
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              🔄 โหลดใหม่
            </button>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '12px 24px', fontSize: 14, color: '#94a3b8', cursor: 'pointer' }}>
              🏠 หน้าหลัก
            </button>
          </div>
        </div>
      </div>
    );
  }
}
