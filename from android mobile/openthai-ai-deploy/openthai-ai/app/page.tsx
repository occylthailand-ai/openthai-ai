'use client'
import { useState } from 'react'

const PLATFORMS = [
  { id:'temu', name:'TEMU', flag:'🌍', region:'Cross-border', users:'50+ Countries', steps:50, color:'#E47A2E' },
  { id:'tiktok', name:'TikTok Shop', flag:'🎵', region:'ASEAN', users:'40M+ TH', steps:75, color:'#010101' },
  { id:'youtube', name:'YouTube', flag:'▶️', region:'Global', users:'2,500M+', steps:73, color:'#FF0000' },
  { id:'xiaohongshu', name:'Xiaohongshu', flag:'📕', region:'China', users:'300M+', steps:76, color:'#FF2442' },
  { id:'weibo', name:'Weibo', flag:'🇨🇳', region:'China', users:'600M+', steps:73, color:'#E6162D' },
  { id:'taobao', name:'Taobao', flag:'🛍', region:'China', users:'800M+', steps:69, color:'#FF6000' },
  { id:'wechat', name:'WeChat', flag:'💬', region:'China', users:'Cross-border', steps:66, color:'#07C160' },
  { id:'zhihu', name:'Zhihu 知乎', flag:'💡', region:'China', users:'100M+', steps:66, color:'#0767C8' },
  { id:'youku', name:'Youku 优酷', flag:'📺', region:'China', users:'500M+', steps:48, color:'#00A0E9' },
  { id:'zalora', name:'Zalora', flag:'👗', region:'ASEAN', users:'40M+', steps:55, color:'#1A1A1A' },
  { id:'zomato', name:'Zomato', flag:'🍽', region:'India', users:'80M+', steps:45, color:'#E23744' },
  { id:'zalo', name:'Zalo', flag:'🇻🇳', region:'Vietnam', users:'75M+', steps:65, color:'#006AF5' },
]

export default function Home() {
  const [product, setProduct] = useState('')
  const [platform, setPlatform] = useState('TEMU')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const generate = async () => {
    if (!product.trim()) return
    setLoading(true)
    setResult('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, platform, langs: ['th', 'zh-TW', 'en'] })
      })
      const data = await res.json()
      setResult(data.content || data.error || 'เกิดข้อผิดพลาด')
    } catch {
      setResult('❌ ไม่สามารถเชื่อมต่อ API ได้')
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#090704', minHeight: '100vh', color: '#E8D5A0', padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0D0A03,#1A1205)', borderBottom: '1px solid rgba(200,160,80,0.2)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#D4A853' }}>✦ Openthai.ai</span>
        <span style={{ fontSize: 10, padding: '2px 10px', background: 'rgba(212,168,83,0.15)', border: '1px solid rgba(212,168,83,0.3)', borderRadius: 20, color: '#C8A050' }}>PLATFORM v2.0</span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 32 }}>
          {[['12+','Platforms'],['700+','Total Steps'],['3B+','Users Reached']].map(([n,l]) => (
            <div key={l} style={{ background: 'rgba(212,168,83,0.06)', border: '1px solid rgba(212,168,83,0.15)', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#D4A853' }}>{n}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Platforms */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8, marginBottom: 32 }}>
          {PLATFORMS.map(p => (
            <div key={p.id} onClick={() => setPlatform(p.name)}
              style={{ background: platform===p.name?`${p.color}18`:'rgba(255,255,255,0.025)', border: `1px solid ${platform===p.name?p.color+'50':'rgba(200,160,80,0.1)'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', transition: 'all .2s' }}>
              <div style={{ fontSize: 20 }}>{p.flag}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#E8D5A0', marginTop: 4 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{p.steps} steps · {p.users}</div>
            </div>
          ))}
        </div>

        {/* Generator */}
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,168,83,0.15)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#D4A853', marginBottom: 16 }}>⚡ AI Content Generator — {platform}</div>
          <textarea
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,160,80,0.2)', borderRadius: 8, padding: '12px 14px', color: '#E8D5A0', fontSize: 13, minHeight: 80, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
            placeholder="ใส่ชื่อสินค้า เช่น: ผ้าไหมไทย OTOP, น้ำผึ้งออร์แกนิค, ครีมสมุนไพรไทย..."
            value={product} onChange={e => setProduct(e.target.value)}
          />
          <button
            onClick={generate} disabled={loading}
            style={{ marginTop: 12, padding: '11px 28px', background: loading?'rgba(212,168,83,0.1)':'linear-gradient(135deg,#B8860B,#D4A853)', border: '1px solid rgba(212,168,83,0.3)', borderRadius: 8, color: loading?'#888':'#0D0A03', fontSize: 13, fontWeight: 900, cursor: loading?'not-allowed':'pointer' }}>
            {loading ? '⏳ กำลังสร้าง...' : '✦ สร้าง Content'}
          </button>
          {result && (
            <div style={{ marginTop: 16, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(212,168,83,0.15)', borderRadius: 10, padding: 18, whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8 }}>
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
