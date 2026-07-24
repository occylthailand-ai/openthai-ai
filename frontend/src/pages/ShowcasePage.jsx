import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SeasonalAnglesPanel from './portals/SeasonalAnglesPanel';

// Public "come see what we've built" tour. One page that surfaces the real, live highlights so a
// visitor (or someone a fan brings along) gets the value fast — and, honestly, what is still being
// built. Everything here links to a real, working route/endpoint; the seasonal block is fetched live.

const T = {
  th: {
    title: 'มาชมสิ่งที่เราสร้างจริง',
    sub: 'OpenThaiAi — แพลตฟอร์ม AI เพื่อการค้าที่เล่นกับคนอย่างตรงไปตรงมา ทัวร์นี้พาดูของจริงที่ใช้ได้ทันที',
    liveHeading: 'ตัวอย่างสด: ระบบรู้ว่าช่วงนี้ควรดันอะไร',
    whyHeading: 'ทำไมยิ่งดูยิ่งชอบ',
    why: [
      { icon: '🤝', h: 'ขอความยินยอมก่อนเสมอ', p: 'ทุก funnel บังคับ consent ก่อนเก็บข้อมูล และคุณขอดู/ขอลบข้อมูลตัวเองได้จริงตาม PDPA' },
      { icon: '🚫', h: 'ไม่ scrape ข้อมูลใคร', p: 'เราไม่แอบเก็บ/ไม่ซื้อข้อมูลคน — ใช้ความรู้สาธารณะและข้อมูลที่ยินยอมเท่านั้น' },
      { icon: '⚡', h: 'ทำงานได้แม้ AI ล่ม', p: 'เครื่องมือแนะนำสินค้าตามฤดูกาลเป็น deterministic — ตอบทันทีโดยไม่ต้องพึ่ง LLM ตัวเดียว' },
      { icon: '📖', h: 'โปร่งใสระดับเปิดสมุดบันทึก', p: 'เราบันทึกทุกการตัดสินใจ รวมถึงไอเดียที่ปฏิเสธ ไว้ให้ตรวจสอบได้' },
    ],
    exploreHeading: 'ลองเล่นเองได้เลย',
    explore: [
      { h: 'ประตูสมาชิก 5 กลุ่ม', p: 'ผู้ผลิต / คนกลาง / affiliate / ผู้บริโภค — เห็นโอกาสประจำฤดูกาลทันที', to: '/portals', ext: false },
      { h: 'เครื่องมือ AI 35 ทักษะ', p: 'สร้างแคปชั่นขายของ 3 ภาษา, วิเคราะห์เทรนด์, SEO', to: '/tool', ext: true },
      { h: 'เอกสาร API (Swagger)', p: 'นักพัฒนา/AI agent ต่อระบบได้จริง — OpenAPI + MCP', to: '/api-docs', ext: true },
      { h: 'สิทธิความเป็นส่วนตัว', p: 'กดขอดู/ขอลบข้อมูลตัวเอง และยกเลิกรับข่าวสารได้จริง', to: '/privacy', ext: false },
    ],
    honestHeading: 'ตรงไปตรงมา: อะไรพร้อมแล้ว อะไรกำลังทำ',
    liveNow: 'พร้อมใช้แล้ว',
    building: 'กำลังทำต่อ',
    liveItems: ['ประตูสมาชิก + แนะนำสินค้าตามฤดูกาล', 'เครื่องมือ AI 35 ทักษะ (ไทย/อังกฤษ/จีน)', 'ชำระเงิน PromptPay + ระบบ affiliate', 'สิทธิ PDPA (ขอดู/ขอลบ/ยกเลิกข่าวสาร)', 'API สาธารณะ + Swagger + MCP'],
    buildingItems: ['บาง store จะถาวรเต็มตัวเมื่อรัน migration ฐานข้อมูลที่ค้างอยู่', 'เวอร์ชัน v9.0 ยังพัฒนาอยู่ ยังไม่เปิดให้ใช้', 'ทีมตอนนี้เป็นทีมเล็ก + ผู้ช่วย AI ประจำฝ่าย จะเติมคนจริงเมื่อขยาย'],
    cta: 'เริ่มเลย — เลือกประตูของคุณ',
  },
  en: {
    title: 'Come see what we actually built',
    sub: 'OpenThaiAi — a commerce AI platform that plays straight with people. This tour shows the real things that work right now.',
    liveHeading: 'Live demo: the system knows what to push this season',
    whyHeading: 'Why it grows on you',
    why: [
      { icon: '🤝', h: 'Consent first, always', p: 'Every funnel requires consent before collecting data, and you can view/delete your own data under PDPA.' },
      { icon: '🚫', h: 'No scraping', p: 'We do not harvest or buy people’s data — only public knowledge and consented data.' },
      { icon: '⚡', h: 'Works even if the AI is down', p: 'The seasonal recommender is deterministic — it answers instantly without depending on any single LLM.' },
      { icon: '📖', h: 'Radically transparent', p: 'We log every decision, including rejected ideas, for anyone to audit.' },
    ],
    exploreHeading: 'Try it yourself',
    explore: [
      { h: 'Five member portals', p: 'Producer / middleman / affiliate / consumer — see seasonal opportunities instantly.', to: '/portals', ext: false },
      { h: '35 AI skills', p: 'Sales captions in 3 languages, trend analysis, SEO.', to: '/tool', ext: true },
      { h: 'API docs (Swagger)', p: 'Developers/AI agents can connect — OpenAPI + MCP.', to: '/api-docs', ext: true },
      { h: 'Privacy rights', p: 'View/delete your own data and unsubscribe — for real.', to: '/privacy', ext: false },
    ],
    honestHeading: 'Straight talk: what’s ready, what’s in progress',
    liveNow: 'Ready now',
    building: 'In progress',
    liveItems: ['Member portals + seasonal recommendations', '35 AI skills (Thai/English/Chinese)', 'PromptPay payments + affiliate system', 'PDPA rights (access/erasure/unsubscribe)', 'Public API + Swagger + MCP'],
    buildingItems: ['Some stores become fully durable once the pending DB migrations run', 'v9.0 is still in development, not yet open', 'The team today is small + AI department officers; real hires come as we grow'],
    cta: 'Get started — pick your portal',
  },
  zh: {
    title: '来看看我们真正做出来的东西',
    sub: 'OpenThaiAi — 一个对人坦诚的商业 AI 平台。本导览展示当下真正可用的功能。',
    liveHeading: '实时演示：系统知道本季该主推什么',
    whyHeading: '为什么越看越喜欢',
    why: [
      { icon: '🤝', h: '始终先取得同意', p: '每个入口在收集数据前都要求同意，你可依 PDPA 查看/删除自己的数据。' },
      { icon: '🚫', h: '不抓取数据', p: '我们不采集也不购买他人数据——只用公开知识与已同意的数据。' },
      { icon: '⚡', h: 'AI 宕机也能用', p: '季节推荐是确定性的——无需依赖任何单一大模型即可即时回答。' },
      { icon: '📖', h: '彻底透明', p: '我们记录每一个决策，包括被否决的想法，供任何人查核。' },
    ],
    exploreHeading: '亲自试试',
    explore: [
      { h: '五类成员入口', p: '生产商/中间商/推广者/消费者——即时看到季节机会。', to: '/portals', ext: false },
      { h: '35 项 AI 技能', p: '三语销售文案、趋势分析、SEO。', to: '/tool', ext: true },
      { h: 'API 文档 (Swagger)', p: '开发者/AI 代理可接入——OpenAPI + MCP。', to: '/api-docs', ext: true },
      { h: '隐私权利', p: '查看/删除自己的数据并退订——真实可用。', to: '/privacy', ext: false },
    ],
    honestHeading: '实话实说：哪些就绪，哪些在做',
    liveNow: '已就绪',
    building: '进行中',
    liveItems: ['成员入口 + 季节推荐', '35 项 AI 技能（泰/英/中）', 'PromptPay 支付 + 推广系统', 'PDPA 权利（查看/删除/退订）', '公开 API + Swagger + MCP'],
    buildingItems: ['部分存储在运行待执行的数据库迁移后将完全持久', 'v9.0 仍在开发，尚未开放', '目前是小团队 + AI 部门专员；随成长再招真人'],
    cta: '开始 — 选择你的入口',
  },
};

const card = { background: '#111', border: '1px solid #6366f133', borderRadius: 14, padding: '18px 20px' };

export default function ShowcasePage() {
  const [lang, setLang] = useState('th');
  const t = T[lang];
  useEffect(() => { document.title = t.title + ' — Openthai.ai'; document.documentElement.lang = lang; }, [t.title, lang]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 32px', borderBottom: '1px solid #1e1e2e', gap: 8 }}>
        {['th', 'en', 'zh'].map((l) => (
          <button key={l} onClick={() => setLang(l)} type="button" aria-pressed={lang === l} style={{ background: lang === l ? '#5e61f1' : 'none', border: '1px solid #333', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{l === 'th' ? 'ไทย' : l === 'en' ? 'English' : '中文'}</button>
        ))}
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 72px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎬</div>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: '#818cf8', margin: '0 0 12px' }}>{t.title}</h1>
          <p style={{ color: '#aaa', fontSize: 17, maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>{t.sub}</p>
        </div>

        <h2 style={{ color: '#6366f1', fontSize: 20, margin: '0 0 14px' }}>{t.liveHeading}</h2>
        <SeasonalAnglesPanel group="producer" lang={lang} />

        <h2 style={{ color: '#6366f1', fontSize: 20, margin: '36px 0 16px' }}>{t.whyHeading}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          {t.why.map((w, i) => (
            <div key={i} style={card}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{w.icon}</div>
              <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 6 }}>{w.h}</div>
              <div style={{ color: '#94a3b8', fontSize: 13.5, lineHeight: 1.6 }}>{w.p}</div>
            </div>
          ))}
        </div>

        <h2 style={{ color: '#6366f1', fontSize: 20, margin: '36px 0 16px' }}>{t.exploreHeading}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          {t.explore.map((e, i) => {
            const inner = (
              <>
                <div style={{ color: '#a5b4fc', fontWeight: 700, marginBottom: 6 }}>{e.h} →</div>
                <div style={{ color: '#94a3b8', fontSize: 13.5, lineHeight: 1.6 }}>{e.p}</div>
              </>
            );
            return e.ext
              ? <a key={i} href={e.to} style={{ ...card, textDecoration: 'none', display: 'block' }}>{inner}</a>
              : <Link key={i} to={e.to} style={{ ...card, textDecoration: 'none', display: 'block' }}>{inner}</Link>;
          })}
        </div>

        <h2 style={{ color: '#6366f1', fontSize: 20, margin: '36px 0 16px' }}>{t.honestHeading}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          <div style={{ ...card, borderColor: '#10b98144' }}>
            <div style={{ color: '#10b981', fontWeight: 700, marginBottom: 10 }}>✅ {t.liveNow}</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.8 }}>{t.liveItems.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
          <div style={{ ...card, borderColor: '#f59e0b44' }}>
            <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: 10 }}>🚧 {t.building}</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.8 }}>{t.buildingItems.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 44 }}>
          <Link to="/portals" style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '14px 32px', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>{t.cta}</Link>
        </div>
      </div>
    </div>
  );
}
