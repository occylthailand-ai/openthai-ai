import React, { useState, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const PLATFORM_COLORS = {
  Facebook: '#1877f2', TikTok: '#fe2c55', LINE: '#06c755',
  Instagram: '#e1306c', Shopee: '#ee4d2d', Lazada: '#0f146d',
};

function CustomerSegmentCard({ segment }) {
  return (
    <div style={{
      background: '#1e293b', borderRadius: 12, padding: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{segment.segment_name}</div>
        <span style={{
          background: '#1D9E7522', color: '#6ee7b7',
          borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
        }}>{segment.match_score}% match</span>
      </div>

      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.5 }}>
        {segment.description}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ background: '#0f172a', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: '#475569' }}>ขนาดกลุ่ม</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{segment.estimated_size}</div>
        </div>
        <div style={{ background: '#0f172a', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: '#475569' }}>งบซื้อ/ครั้ง</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fcd34d' }}>{segment.avg_spend_thb}</div>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>แพลตฟอร์มที่อยู่</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {segment.platforms?.map(p => (
            <span key={p} style={{
              background: (PLATFORM_COLORS[p] || '#475569') + '33',
              color: PLATFORM_COLORS[p] || '#94a3b8',
              borderRadius: 6, padding: '2px 8px', fontSize: 11,
            }}>{p}</span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>Pain Points</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {segment.pain_points?.slice(0, 2).map((p, i) => (
            <div key={i} style={{ fontSize: 11, color: '#fca5a5', display: 'flex', gap: 4 }}>
              <span>•</span><span>{p}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>วิธีเข้าถึง</div>
        <div style={{ fontSize: 12, color: '#6ee7b7' }}>{segment.how_to_reach}</div>
      </div>
    </div>
  );
}

export default function CustomerFinderPage() {
  const [product, setProduct] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const findCustomers = useCallback(async () => {
    if (!product.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(apiUrl('/api/customer-finder'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: product.trim() }),
      });
      const d = await r.json();
      setResult(d);
    } catch (e) {
      setMessage({ type: 'error', text: 'เชื่อมต่อไม่ได้ กรุณาลองใหม่' });
    } finally {
      setLoading(false);
    }
  }, [product]);

  return (
    <div style={{
      minHeight: '100vh', background: '#080812', color: '#f8fafc',
      fontFamily: "'Inter','Sarabun',sans-serif",
    }}>
      <header style={{
        background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <a href="/" style={{
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
          padding: '6px 14px', color: '#94a3b8', fontSize: 13, textDecoration: 'none',
        }}>← กลับ</a>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>🎯 Customer Finder</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>AI หาลูกค้าที่ต้องการสินค้าของคุณ</div>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>

        {/* Search */}
        <div style={{
          background: '#1e293b', borderRadius: 14, padding: '24px',
          border: '1px solid rgba(255,255,255,0.08)', marginBottom: 28,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
            ระบุสินค้าที่ต้องการขาย
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
            AI จะวิเคราะห์และหากลุ่มลูกค้าที่เหมาะสมที่สุดพร้อมวิธีเข้าถึง
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={product}
              onChange={e => setProduct(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && findCustomers()}
              placeholder="เช่น ครีมกันแดด SPF50, ชาเขียวมัทฉะ, กระเป๋าผ้า..."
              style={{
                flex: 1, background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              onClick={findCustomers}
              disabled={loading || !product.trim()}
              style={{
                background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? '🔍 กำลังวิเคราะห์...' : '🎯 ค้นหาลูกค้า'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {['ครีมกันแดด', 'กาแฟดริป', 'กระเป๋าผ้า', 'อาหารเสริม', 'ผ้าไทย'].map(s => (
              <button
                key={s}
                onClick={() => setProduct(s)}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '4px 10px', color: '#94a3b8',
                  cursor: 'pointer', fontSize: 12,
                }}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <div>AI กำลังวิเคราะห์กลุ่มลูกค้า...</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>ใช้เวลา 10-20 วินาที</div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            <div style={{
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 12, padding: '14px 18px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', marginBottom: 4 }}>
                📊 สรุปการวิเคราะห์: "{result.product}"
              </div>
              <div style={{ fontSize: 13, color: '#e2e8f0' }}>{result.summary}</div>
              <div style={{ fontSize: 12, color: '#fcd34d', marginTop: 6 }}>
                🎯 กลยุทธ์: {result.top_strategy}
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              พบ {result.segments?.length} กลุ่มลูกค้าที่เหมาะสม
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
              gap: 14,
            }}>
              {result.segments?.map((seg, i) => (
                <CustomerSegmentCard key={i} segment={seg} />
              ))}
            </div>

            {result.quick_actions && (
              <div style={{
                background: '#1e293b', borderRadius: 12, padding: '16px 18px', marginTop: 20,
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 10 }}>
                  ⚡ Quick Actions — เริ่มได้เลยวันนี้
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {result.quick_actions.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                      <span style={{ color: '#6ee7b7', minWidth: 20 }}>{i + 1}.</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {message && (
          <div style={{
            background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            borderRadius: 10, padding: '12px 16px', color: message.type === 'error' ? '#fca5a5' : '#6ee7b7',
            fontSize: 13,
          }}>{message.text}</div>
        )}

        <div style={{ textAlign: 'center', marginTop: 28, color: '#334155', fontSize: 12 }}>
          OpenThai.ai Customer Finder v1.0 · AI วิเคราะห์กลุ่มลูกค้า
        </div>
      </div>
    </div>
  );
}
