import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const DIRECTION_CFG = {
  rising:  { label: '🚀 กำลังมา',  color: '#22c55e' },
  peak:    { label: '🔥 ฮิตสุด',   color: '#f59e0b' },
  stable:  { label: '📊 คงที่',    color: '#60a5fa' },
};

const DEMAND_CFG = {
  very_high: { label: 'สูงมาก', color: '#ef4444' },
  high:      { label: 'สูง',    color: '#f59e0b' },
  medium:    { label: 'ปานกลาง', color: '#60a5fa' },
};

function TrendCard({ product, onGenerate }) {
  const dir = DIRECTION_CFG[product.trend_direction] || DIRECTION_CFG.stable;
  const dem = DEMAND_CFG[product.demand_level] || DEMAND_CFG.medium;

  return (
    <div style={{
      background: '#1e293b', borderRadius: 12, padding: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          background: '#0f172a', borderRadius: 8, width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: '#94a3b8',
        }}>#{product.rank}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{
            background: dir.color + '22', color: dir.color,
            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
          }}>{dir.label}</span>
          <span style={{
            background: dem.color + '22', color: dem.color,
            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
          }}>{dem.label}</span>
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#f1f5f9' }}>{product.name_th}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{product.name_en} · {product.category}</div>
      </div>

      <div style={{
        background: '#0f172a', borderRadius: 8, padding: '10px 12px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>TREND SCORE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              flex: 1, height: 6, background: '#1e293b', borderRadius: 99, overflow: 'hidden',
            }}>
              <div style={{ width: `${product.trend_score}%`, height: '100%', background: '#22c55e', borderRadius: 99 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>{product.trend_score}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>ราคาเฉลี่ย</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
            {product.avg_price_thb ? `฿${product.avg_price_thb.toLocaleString()}` : 'ตามตลาด'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
        <span style={{ color: '#fcd34d' }}>💡 </span>{product.why_trending}
      </div>

      <div style={{ fontSize: 12, color: '#6ee7b7', lineHeight: 1.6 }}>
        <span>🎯 </span>{product.opportunity}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {product.platforms?.map(p => (
          <span key={p} style={{
            background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
            borderRadius: 6, padding: '2px 8px', fontSize: 11,
          }}>{p}</span>
        ))}
        <span style={{
          background: 'rgba(100,116,139,0.2)', color: '#94a3b8',
          borderRadius: 6, padding: '2px 8px', fontSize: 11,
        }}>{product.season}</span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {product.hashtags?.slice(0, 4).map(h => (
          <span key={h} style={{ fontSize: 11, color: '#60a5fa' }}>{h}</span>
        ))}
      </div>

      <button
        onClick={() => onGenerate(product)}
        style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px',
          cursor: 'pointer', fontSize: 12, fontWeight: 600, marginTop: 4,
        }}
      >
        🎬 สร้าง TikTok Content
      </button>
    </div>
  );
}

export default function TrendProductHunterPage() {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchTrends = useCallback(async (bust = false) => {
    setLoading(true);
    try {
      const url = bust ? apiUrl('/api/trending?bust=1') : apiUrl('/api/trending');
      const [r1, r2] = await Promise.all([
        fetch(url),
        fetch(apiUrl('/api/trending/categories')),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      setData(d1);
      setCategories(d2);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = '🔥 Trend Product Hunter — OpenThai.ai';
    fetchTrends();
  }, []);

  const handleGenerate = (product) => {
    const query = encodeURIComponent(product.name_th);
    window.location.href = `/?product=${query}`;
  };

  const filtered = data?.trending_products?.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'rising') return p.trend_direction === 'rising';
    if (filter === 'peak') return p.trend_direction === 'peak';
    if (filter === 'very_high') return p.demand_level === 'very_high';
    return true;
  }) || [];

  return (
    <div style={{
      minHeight: '100vh', background: '#080812', color: '#f8fafc',
      fontFamily: "'Inter','Sarabun',sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 5%', display: 'flex', alignItems: 'center',
        gap: 14, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <a href="/" style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '6px 14px', color: '#94a3b8',
          cursor: 'pointer', fontSize: 13, textDecoration: 'none',
        }}>← กลับ</a>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>🔥 Trend Product Hunter</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {lastUpdate
              ? `อัปเดต: ${lastUpdate.toLocaleTimeString('th-TH')} · AI วิเคราะห์ตลาดไทย`
              : 'AI กำลังวิเคราะห์ตลาด...'}
          </div>
        </div>
        <button
          onClick={() => fetchTrends(true)}
          disabled={loading}
          style={{
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 8, padding: '7px 14px', color: '#a5b4fc',
            cursor: 'pointer', fontSize: 13,
          }}
        >
          {loading ? '⟳ กำลังวิเคราะห์...' : '🔄 อัปเดต'}
        </button>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Market Insight */}
        {data && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', marginBottom: 6 }}>
              📊 Market Insight
            </div>
            <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.6 }}>
              {data.market_insight}
            </div>
            <div style={{ fontSize: 12, color: '#fcd34d', marginTop: 8 }}>
              🎯 Best Opportunity: {data.best_opportunity}
            </div>
          </div>
        )}

        {/* Hot Categories */}
        {categories && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>📂 หมวดหมู่กำลังฮิต</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {categories.categories?.map(c => (
                <div key={c.name} style={{
                  background: '#1e293b', borderRadius: 10, padding: '8px 14px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 16 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, color: '#f1f5f9' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#22c55e' }}>{c.growth}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'ทั้งหมด' },
            { key: 'rising', label: '🚀 กำลังมา' },
            { key: 'peak', label: '🔥 ฮิตสุด' },
            { key: 'very_high', label: '📈 ดีมานด์สูงมาก' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filter === f.key ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8, padding: '6px 14px', color: filter === f.key ? '#a5b4fc' : '#94a3b8',
                cursor: 'pointer', fontSize: 12, fontWeight: filter === f.key ? 600 : 400,
              }}
            >{f.label}</button>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#475569', alignSelf: 'center' }}>
            {filtered.length} สินค้า
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div>AI กำลังวิเคราะห์ตลาด TikTok, Shopee, Lazada...</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>ใช้เวลา 10-20 วินาที</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}>
            {filtered.map(p => (
              <TrendCard key={p.rank} product={p} onGenerate={handleGenerate} />
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, color: '#334155', fontSize: 12 }}>
          OpenThai.ai Trend Product Hunter v1.0 · AI วิเคราะห์ทุกชั่วโมง · ข้อมูลอ้างอิงจาก Claude AI
        </div>
      </div>
    </div>
  );
}
