import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LANG = {
  th: {
    title: 'ประตูสู่ OpenThai.ai',
    sub: 'เลือกประเภทของท่านเพื่อเข้าร่วมเป็นส่วนหนึ่งของระบบนิเวศ AI ไทย',
    portals: [
      { id: 'producer',    icon: '🏭', color: '#6366f1', title: 'ผู้ผลิต',                  sub: 'Producer (Global)',              desc: 'นำสินค้า/บริการเข้าสู่แพลตฟอร์ม AI ไทย ไม่จำกัดประเทศ',         path: '/portals/producer' },
      { id: 'affiliate',   icon: '🤝', color: '#f59e0b', title: 'ผู้ขาย / Affiliate',       sub: 'Seller & Affiliate (Global)',    desc: 'ขายสินค้าและรับค่าคอมมิชชั่น ไม่จำกัดประเทศ',                   path: '/portals/affiliate' },
      { id: 'creator',     icon: '🎨', color: '#ec4899', title: 'ผู้ร่วมสร้างคอนเทนต์',    sub: 'Creator & Platform (Global)',    desc: 'ร่วมสร้างคอนเทนต์จากทุกแพลตฟอร์ม TikTok / IG / YouTube',     path: '/portals/creator' },
      { id: 'consumer',    icon: '🛍️', color: '#06b6d4', title: 'ผู้บริโภค',              sub: 'Consumer (Global)',              desc: 'สมัครรับส่วนลด สินค้าใหม่ และคำแนะนำเฉพาะตัวจาก AI',           path: '/portals/consumer' },
      { id: 'middleman',   icon: '🔗', color: '#f97316', title: 'คนกลาง / ตัวแทนจำหน่าย', sub: 'Distributor & Broker (Global)',  desc: 'ตัวแทนจำหน่าย ผู้ค้าส่ง นายหน้า — เข้าร่วมเครือข่ายกระจายสินค้า', path: '/portals/middleman' },
      { id: 'gov-thai',    icon: '🇹🇭', color: '#10b981', title: 'หน่วยงานรัฐไทย',          sub: 'Thai Government Agency',        desc: 'หน่วยงานภาครัฐไทยที่ต้องการบูรณาการ AI เข้าสู่ระบบงาน',       path: '/portals/gov-thai' },
      { id: 'gov-intl',   icon: '🌐', color: '#3b82f6', title: 'หน่วยงานรัฐต่างประเทศ',  sub: 'Foreign Government (Global)',   desc: 'Foreign government agencies seeking AI collaboration',           path: '/portals/gov-intl' },
      { id: 'intl-org',   icon: '🏛️', color: '#8b5cf6', title: 'องค์กรระหว่างประเทศ',    sub: 'International Organization',    desc: 'UN / ASEAN / World Bank and other international bodies',        path: '/portals/intl-org' },
      { id: 'foundation',  icon: '💚', color: '#059669', title: 'มูลนิธิเพื่อสังคม',        sub: 'Foundation & NGO',              desc: 'มูลนิธิช่วยเหลือผู้ยากไร้ — เปิดใช้งานเมื่อกำไรรวม > 10M ฿', path: '/portals/foundation' },
    ],
    join: 'เข้าร่วม →',
  },
  en: {
    title: 'Gateway to OpenThai.ai',
    sub: 'Choose your role to join the Thai AI ecosystem',
    portals: [
      { id: 'producer',    icon: '🏭', color: '#6366f1', title: 'Producer',                  sub: 'Global',    desc: 'Bring your products/services into the Thai AI platform',         path: '/portals/producer' },
      { id: 'affiliate',   icon: '🤝', color: '#f59e0b', title: 'Seller / Affiliate',         sub: 'Global',    desc: 'Sell products and earn commission worldwide',                    path: '/portals/affiliate' },
      { id: 'creator',     icon: '🎨', color: '#ec4899', title: 'Content Creator',            sub: 'Global',    desc: 'Create content across TikTok / IG / YouTube platforms',          path: '/portals/creator' },
      { id: 'consumer',    icon: '🛍️', color: '#06b6d4', title: 'Consumer',                   sub: 'Global',    desc: 'Sign up for discounts, new products, and AI-personalized picks', path: '/portals/consumer' },
      { id: 'middleman',   icon: '🔗', color: '#f97316', title: 'Distributor / Broker',       sub: 'Global',    desc: 'Distributors, wholesalers, brokers — join the distribution network', path: '/portals/middleman' },
      { id: 'gov-thai',    icon: '🇹🇭', color: '#10b981', title: 'Thai Government',            sub: 'Thailand',  desc: 'Thai government agencies integrating AI into public services',   path: '/portals/gov-thai' },
      { id: 'gov-intl',   icon: '🌐', color: '#3b82f6', title: 'Foreign Government',        sub: 'Global',    desc: 'Foreign government agencies seeking AI collaboration',            path: '/portals/gov-intl' },
      { id: 'intl-org',   icon: '🏛️', color: '#8b5cf6', title: 'International Organization', sub: 'Global',    desc: 'UN / ASEAN / World Bank and other international bodies',         path: '/portals/intl-org' },
      { id: 'foundation',  icon: '💚', color: '#059669', title: 'Foundation / NGO',           sub: 'Global',    desc: 'Poverty-relief foundations — activated when profit > 10M THB',  path: '/portals/foundation' },
    ],
    join: 'Join →',
  },
  zh: {
    title: '进入 OpenThai.ai',
    sub: '选择您的角色，加入泰国AI生态系统',
    portals: [
      { id: 'producer',    icon: '🏭', color: '#6366f1', title: '生产商',        sub: '全球',    desc: '将您的产品/服务带入泰国AI平台',   path: '/portals/producer' },
      { id: 'affiliate',   icon: '🤝', color: '#f59e0b', title: '卖家 / 联盟',   sub: '全球',    desc: '销售产品并在全球赚取佣金',         path: '/portals/affiliate' },
      { id: 'creator',     icon: '🎨', color: '#ec4899', title: '内容创作者',    sub: '全球',    desc: '跨TikTok / IG / YouTube创作内容', path: '/portals/creator' },
      { id: 'consumer',    icon: '🛍️', color: '#06b6d4', title: '消费者',        sub: '全球',    desc: '注册获取折扣、新产品和AI个性化推荐', path: '/portals/consumer' },
      { id: 'middleman',   icon: '🔗', color: '#f97316', title: '经销商/中间商', sub: '全球',    desc: '经销商、批发商、经纪人 — 加入分销网络', path: '/portals/middleman' },
      { id: 'gov-thai',    icon: '🇹🇭', color: '#10b981', title: '泰国政府机构',  sub: '泰国',    desc: '将AI整合到公共服务中的泰国政府机构', path: '/portals/gov-thai' },
      { id: 'gov-intl',   icon: '🌐', color: '#3b82f6', title: '外国政府机构',  sub: '全球',    desc: '寻求AI合作的外国政府机构',         path: '/portals/gov-intl' },
      { id: 'intl-org',   icon: '🏛️', color: '#8b5cf6', title: '国际组织',      sub: '全球',    desc: '联合国/东盟/世界银行等国际机构',   path: '/portals/intl-org' },
      { id: 'foundation',  icon: '💚', color: '#059669', title: '基金会/NGO',    sub: '全球',    desc: '扶贫基金会 — 利润超1000万泰铢时启用', path: '/portals/foundation' },
    ],
    join: '加入 →',
  },
};

export default function PortalHubPage() {
  const [lang, setLang] = useState('th');
  const navigate = useNavigate();
  const t = LANG[lang];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #1e1e2e' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid #333', color: '#aaa', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>
          ← หน้าหลัก
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {['th','en','zh'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{ background: lang===l ? '#6366f1' : 'none', border: '1px solid #333', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              {l==='th'?'ไทย':l==='en'?'English':'中文'}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '64px 32px 48px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🌏</div>
        <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 800, margin: '0 0 16px', background: 'linear-gradient(135deg,#6366f1,#ec4899,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t.title}
        </h1>
        <p style={{ color: '#aaa', fontSize: 18, maxWidth: 600, margin: '0 auto' }}>{t.sub}</p>
      </div>

      {/* Portal Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 24, maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>
        {t.portals.map((p) => {
          const locked = p.id === 'foundation';
          return (
            <div key={p.id}
              onClick={() => !locked && navigate(p.path)}
              style={{ background: locked ? '#0d0d0d' : '#111', border: `1px solid ${locked ? '#333' : p.color + '33'}`, borderRadius: 16, padding: 28, cursor: locked ? 'not-allowed' : 'pointer', transition: 'all .2s', position: 'relative', overflow: 'hidden', opacity: locked ? 0.55 : 1 }}
              onMouseEnter={e => { if (!locked) { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${p.color}22`; } }}
              onMouseLeave={e => { if (!locked) { e.currentTarget.style.borderColor = `${p.color}33`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
            >
              {locked && (
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(100,116,139,0.25)', color: '#94a3b8', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  🔒 ยังไม่เปิดใช้งาน
                </div>
              )}
              <div style={{ position: 'absolute', top: 16, right: 16, background: `${p.color}22`, color: locked ? '#64748b' : p.color, fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{p.sub}</div>
              <div style={{ fontSize: 40, marginBottom: 12, marginTop: locked ? 20 : 0 }}>{p.icon}</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 20, color: locked ? '#64748b' : '#fff' }}>{p.title}</h3>
              <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>{p.desc}</p>
              <div style={{ color: locked ? '#475569' : p.color, fontWeight: 700, fontSize: 14 }}>{locked ? '🔒 เปิดเมื่อกำไรสะสม > 10M ฿' : t.join}</div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '32px', borderTop: '1px solid #1e1e2e', color: '#555', fontSize: 13 }}>
        OpenThai.ai — Unified AI Ecosystem · {new Date().getFullYear()}
      </div>
    </div>
  );
}
