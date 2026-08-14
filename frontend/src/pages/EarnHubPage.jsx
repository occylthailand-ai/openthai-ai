import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';

// ── ศูนย์สร้างรายได้ (Affiliate Earning Hub) ───────────────────────────────────
// หน้าเดียวจบ: คลิป TikTok → offer ฿1,000 → ปิดการขาย/สมัครพันธมิตร → เงินเข้าพร้อมเพย์
// รองรับ ?ref=CODE — ส่งต่อไปยังลิงก์จ่าย + นับคลิกให้พันธมิตร
// แชร์ลิงก์นี้ได้เลย: /earn?ref=CODE
//
// Trilingual (th/en/zh via useLang) — /earn is a homepage hero CTA ("💸 หารายได้") and a
// shareable earning/affiliate landing (/earn?ref=CODE), the same market-entry funnel as the
// rest of the site, so an affiliate sharing it (or a non-Thai visitor landing on it) gets it
// in their language instead of Thai-only. No in-page switcher — follows the global app lang
// (same pattern as About/Contact/404). Values interpolating the ฿ goal / price are functions.

const TIKTOK_URL = 'https://vt.tiktok.com/ZSCB66nhQ/';
const DAILY_GOAL = 1000;     // เป้า ฿1,000/วัน
const PACKAGE_PRICE = 1000;  // แพ็กเกจ ฿1,000 = 1 ดีลถึงเป้า

const T = {
  th: {
    doc: 'ศูนย์สร้างรายได้ — Openthai.ai',
    back: '← หน้าหลัก',
    hubTitle: '💸 ศูนย์สร้างรายได้',
    heroGoal: (g) => `เป้า ฿${g}/วัน`,
    heroSubA: 'ปิดได้แค่ ',
    heroSubStrong: '1 ดีล/วัน',
    heroSubB: (p) => ` ก็ถึงเป้า — ขายแพ็กเกจคอนเทนต์ AI ฿${p}`,
    refBadgeA: '🤝 ลิงก์พันธมิตร: ',
    refBadgeB: ' (ค่าคอมเข้าคุณอัตโนมัติ)',
    payItemLabel: 'แพ็กเกจคอนเทนต์ AI 30 ชิ้น',
    tiktokTitle: '🎬 ดูคลิปขายบน TikTok',
    tiktokSub: 'แตะเพื่อดูตัวอย่าง — แชร์คลิปนี้เพื่อดึงลูกค้า',
    offerLabel: 'แพ็กเกจที่ขาย',
    offerName: 'คอนเทนต์ AI 30 ชิ้น',
    buyCta: (p) => `📱 สั่งซื้อ — จ่ายพร้อมเพย์ ฿${p}`,
    payNote: 'สแกนจ่าย → เงินเข้าพร้อมเพย์ → ยืนยันอัตโนมัติ',
    productsTitle: '🛍️ สินค้าพร้อมส่ง',
    productsSub: 'กดสั่งซื้อ → จ่ายพร้อมเพย์ → ยืนยันอัตโนมัติ',
    buyBtn: 'ซื้อ',
    affTitle: '🤝 อยากให้คนอื่นช่วยขาย?',
    affDescA: 'สมัครเป็นพันธมิตร รับค่าคอม ',
    affDescStrong: '20–40%',
    affDescB: ' ต่อดีล · ได้ลิงก์เงิน + คลิป TikTok ไปแชร์ · ระบบเครดิตค่าคอมอัตโนมัติ',
    affBtn1: 'สมัครพันธมิตร / เปิด Dashboard →',
    affBtn2: '🔗 ดูโปรแกรม Affiliate ทั้งหมด (50+) →',
    affBtn3: '✍️ Content Studio — สร้างแคปชั่นขาย →',
    affBtn4: '🏆 อันดับพันธมิตร (Leaderboard) →',
    affBtn5: '🏛️ OpenThaiAi Council — AI 3 เจ้าวิเคราะห์ →',
    affBtn6: '🧠 Smart Model Router — ต้นทุน AI →',
    shareTitle: '🔗 แชร์ศูนย์สร้างรายได้นี้',
    copied: '✅ คัดลอกแล้ว',
    copyBtn: '📋 คัดลอก',
    flowTitle: '⚙️ ระบบทำงานเอง 24/7 (หลังตั้ง Omise)',
    flow: [
      ['แชร์คลิป TikTok + ลิงก์นี้', 'ลง bio / คอมเมนต์ / กลุ่ม'],
      ['ลูกค้าสแกนจ่ายพร้อมเพย์', 'Omise ยืนยันการจ่าย'],
      ['เงินเข้าพร้อมเพย์ของร้านเต็ม', 'ค่าคอมเข้าพันธมิตรอัตโนมัติ'],
    ],
    flowNoteA: '⚠️ ตรงไปตรงมา: การจ่าย/เครดิตค่าคอมทำงานเองบน cloud ตลอด 24/7 — แต่ยอดขายจริงต้องมี ',
    flowNoteStrong: 'คนเห็นโพสต์แล้วกดจ่าย',
    flowNoteB: (g) => ` ระบบการันตี ฿${g}/วันให้ไม่ได้ ยิ่งแชร์เยอะยิ่งมีโอกาสถึงเป้า`,
  },
  en: {
    doc: 'Earning Hub — Openthai.ai',
    back: '← Home',
    hubTitle: '💸 Earning Hub',
    heroGoal: (g) => `Goal ฿${g}/day`,
    heroSubA: 'Close just ',
    heroSubStrong: '1 deal/day',
    heroSubB: (p) => ` to hit the goal — sell the AI content pack ฿${p}`,
    refBadgeA: '🤝 Affiliate link: ',
    refBadgeB: ' (commission credited to you automatically)',
    payItemLabel: 'AI content pack — 30 pieces',
    tiktokTitle: '🎬 Watch the sales clip on TikTok',
    tiktokSub: 'Tap to preview — share this clip to pull in customers',
    offerLabel: 'What you sell',
    offerName: 'AI content — 30 pieces',
    buyCta: (p) => `📱 Order — pay via PromptPay ฿${p}`,
    payNote: 'Scan to pay → money lands in PromptPay → auto-confirmed',
    productsTitle: '🛍️ Ready-to-ship products',
    productsSub: 'Tap to order → pay via PromptPay → auto-confirmed',
    buyBtn: 'Buy',
    affTitle: '🤝 Want others to sell for you?',
    affDescA: 'Become an affiliate and earn ',
    affDescStrong: '20–40%',
    affDescB: ' per deal · get a payment link + TikTok clip to share · commission credited automatically',
    affBtn1: 'Become an affiliate / open Dashboard →',
    affBtn2: '🔗 See all affiliate programs (50+) →',
    affBtn3: '✍️ Content Studio — write sales captions →',
    affBtn4: '🏆 Affiliate leaderboard →',
    affBtn5: '🏛️ OpenThaiAi Council — 3 AIs analyze →',
    affBtn6: '🧠 Smart Model Router — AI cost →',
    shareTitle: '🔗 Share this Earning Hub',
    copied: '✅ Copied',
    copyBtn: '📋 Copy',
    flowTitle: '⚙️ Runs itself 24/7 (once Omise is set up)',
    flow: [
      ['Share the TikTok clip + this link', 'in bio / comments / groups'],
      ['Customer scans & pays via PromptPay', 'Omise confirms the payment'],
      ["Money lands in the shop's PromptPay in full", 'affiliate commission credited automatically'],
    ],
    flowNoteA: '⚠️ Straight talk: payment/commission crediting runs itself on the cloud 24/7 — but real sales need ',
    flowNoteStrong: 'people to see the post and pay',
    flowNoteB: (g) => `. We can't guarantee ฿${g}/day — the more you share, the better your odds of hitting the goal.`,
  },
  zh: {
    doc: '赚钱中心 — Openthai.ai',
    back: '← 首页',
    hubTitle: '💸 赚钱中心',
    heroGoal: (g) => `目标 ฿${g}/天`,
    heroSubA: '只要成交 ',
    heroSubStrong: '每天 1 单',
    heroSubB: (p) => ` 即可达标 —— 销售 AI 内容套餐 ฿${p}`,
    refBadgeA: '🤝 合伙人链接：',
    refBadgeB: '（佣金自动计入你的账户）',
    payItemLabel: 'AI 内容套餐 —— 30 条',
    tiktokTitle: '🎬 在 TikTok 观看销售短片',
    tiktokSub: '点击预览 —— 分享此短片以吸引客户',
    offerLabel: '你所销售的',
    offerName: 'AI 内容 —— 30 条',
    buyCta: (p) => `📱 下单 —— 用 PromptPay 支付 ฿${p}`,
    payNote: '扫码支付 → 款项进入 PromptPay → 自动确认',
    productsTitle: '🛍️ 现货商品',
    productsSub: '点击下单 → 用 PromptPay 支付 → 自动确认',
    buyBtn: '购买',
    affTitle: '🤝 想让别人帮你卖？',
    affDescA: '成为合伙人，每单赚取 ',
    affDescStrong: '20–40%',
    affDescB: ' · 获得收款链接 + TikTok 短片去分享 · 佣金自动计入',
    affBtn1: '成为合伙人 / 打开控制台 →',
    affBtn2: '🔗 查看全部合伙计划（50+）→',
    affBtn3: '✍️ 内容工作室 —— 撰写销售文案 →',
    affBtn4: '🏆 合伙人排行榜 →',
    affBtn5: '🏛️ OpenThaiAi 议会 —— 3 个 AI 分析 →',
    affBtn6: '🧠 智能模型路由 —— AI 成本 →',
    shareTitle: '🔗 分享这个赚钱中心',
    copied: '✅ 已复制',
    copyBtn: '📋 复制',
    flowTitle: '⚙️ 全天候 24/7 自动运行（配置 Omise 后）',
    flow: [
      ['分享 TikTok 短片 + 此链接', '发到简介 / 评论 / 群组'],
      ['客户扫码用 PromptPay 支付', 'Omise 确认付款'],
      ['款项全额进入店铺 PromptPay', '合伙人佣金自动计入'],
    ],
    flowNoteA: '⚠️ 实话实说：付款 / 佣金计入在云端全天候 24/7 自动运行 —— 但真实成交需要 ',
    flowNoteStrong: '有人看到帖子并付款',
    flowNoteB: (g) => `。我们无法保证 ฿${g}/天 —— 分享得越多，达标的机会越大。`,
  },
};

export default function EarnHubPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = T[lang] || T.th;
  useEffect(() => { document.title = t.doc; }, [t.doc]);
  const [searchParams] = useSearchParams();
  const ref = (searchParams.get('ref') || '').replace(/[^A-Z0-9a-z_-]/g, '').slice(0, 40);
  const [copied, setCopied] = useState('');
  const [shopProducts, setShopProducts] = useState([]);   // สินค้าจริงจากคลัง

  // นับคลิกลิงก์ ref (ครั้งเดียวต่อการเข้าหน้า)
  useEffect(() => {
    if (!ref) return;
    const source = searchParams.get('utm_source') || searchParams.get('source') || '';
    fetch(apiUrl('/api/affiliate/click'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, source }),
    }).catch(() => {});
  }, [ref]);

  // โหลดสินค้าจริงจากคลัง (เพิ่มที่ /admin) มาให้ลูกค้าเห็น+กดซื้อ
  useEffect(() => {
    fetch(apiUrl('/api/shop/products'))
      .then(r => r.json())
      .then(d => { if (d.success) setShopProducts((d.products || []).filter(p => p.in_stock).slice(0, 12)); })
      .catch(() => {});
  }, []);

  const refQS = ref ? `&ref=${encodeURIComponent(ref)}` : '';
  const payLink = `/pay?amount=${PACKAGE_PRICE}&label=${encodeURIComponent(t.payItemLabel)}${refQS}`;
  const shareLink = `https://www.openthai-ai.com/earn${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key); setTimeout(() => setCopied(''), 2000);
  };

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';
  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '24px' };
  const btnPrimary = { display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', padding: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer', textDecoration: 'none' };
  const btnGhost = { display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e5e7eb', fontSize: '15px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' };

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>{t.back}</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{t.hubTitle}</h1>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* HERO — เป้า ฿1,000/วัน */}
        <div style={{ ...card, textAlign: 'center', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)' }}>
          <div style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 700, letterSpacing: '1px' }}>OPENTHAI.AI · AFFILIATE</div>
          <div style={{ fontSize: '34px', fontWeight: 900, margin: '8px 0 4px' }}>{t.heroGoal(DAILY_GOAL.toLocaleString())}</div>
          <div style={{ fontSize: '15px', color: '#d0d0e0' }}>{t.heroSubA}<strong style={{ color: '#6ee7b7' }}>{t.heroSubStrong}</strong>{t.heroSubB(PACKAGE_PRICE.toLocaleString())}</div>
          {ref && <div style={{ marginTop: '12px', fontSize: '12px', color: '#6ee7b7', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', padding: '6px 14px', display: 'inline-block' }}>{t.refBadgeA}{ref}{t.refBadgeB}</div>}
        </div>

        {/* TikTok video card */}
        <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" style={{ ...card, display: 'block', textDecoration: 'none', color: '#fff', border: '1px solid rgba(254,44,85,0.35)', background: 'linear-gradient(135deg, rgba(254,44,85,0.12), rgba(99,102,241,0.1))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '60px', height: '60px', flexShrink: 0, borderRadius: '14px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>▶️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '16px' }}>{t.tiktokTitle}</div>
              <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '2px' }}>{t.tiktokSub}</div>
            </div>
            <div style={{ fontSize: '20px', color: '#fda4af' }}>↗</div>
          </div>
        </a>

        {/* OFFER + CTA */}
        <div style={card}>
          <div style={{ fontSize: '13px', color: '#a0a0b0' }}>{t.offerLabel}</div>
          <div style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 2px' }}>{t.offerName}</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#6ee7b7', marginBottom: '14px' }}><span style={{ fontSize: '16px', fontWeight: 400 }}>฿</span>{PACKAGE_PRICE.toLocaleString()}</div>
          <a href={payLink} onClick={(e) => { e.preventDefault(); navigate(payLink); }} style={btnPrimary}>{t.buyCta(PACKAGE_PRICE.toLocaleString())}</a>
          <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '10px' }}>{t.payNote}</div>
        </div>

        {/* REAL PRODUCTS — สินค้าจริงจากคลัง */}
        {shopProducts.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>{t.productsTitle}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>{t.productsSub}</div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {shopProducts.map(p => {
                const buy = `/pay?amount=${encodeURIComponent(p.price || 0)}&label=${encodeURIComponent(p.name || '')}${refQS}`;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    {p.image_url
                      ? <img src={p.image_url} alt="" style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>📦</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: '#6ee7b7' }}>฿{Number(p.price || 0).toLocaleString()}</div>
                    </div>
                    <button onClick={() => navigate(buy)} style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{t.buyBtn}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BECOME AFFILIATE */}
        <div style={card}>
          <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>{t.affTitle}</div>
          <div style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '14px', lineHeight: 1.6 }}>{t.affDescA}<strong style={{ color: '#6ee7b7' }}>{t.affDescStrong}</strong>{t.affDescB}</div>
          <button onClick={() => navigate('/affiliate')} style={btnGhost}>{t.affBtn1}</button>
          <button onClick={() => navigate(`/affiliate-programs${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`)} style={{ ...btnGhost, marginTop: '10px' }}>{t.affBtn2}</button>
          <button onClick={() => navigate('/content-studio')} style={{ ...btnGhost, marginTop: '10px' }}>{t.affBtn3}</button>
          <button onClick={() => navigate('/leaderboard')} style={{ ...btnGhost, marginTop: '10px' }}>{t.affBtn4}</button>
          <button onClick={() => navigate('/council')} style={{ ...btnGhost, marginTop: '10px' }}>{t.affBtn5}</button>
          <button onClick={() => navigate('/router')} style={{ ...btnGhost, marginTop: '10px' }}>{t.affBtn6}</button>
        </div>

        {/* SHARE THIS ENVIRONMENT */}
        <div style={card}>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>{t.shareTitle}</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <code style={{ flex: 1, minWidth: '200px', fontSize: '13px', color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareLink}</code>
            <button onClick={() => copy(shareLink, 'share')} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', background: copied === 'share' ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.12)', color: '#6ee7b7', fontWeight: 700, cursor: 'pointer' }}>
              {copied === 'share' ? t.copied : t.copyBtn}
            </button>
          </div>
        </div>

        {/* 24/7 FLOW */}
        <div style={{ ...card, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>{t.flowTitle}</div>
          {t.flow.map(([title, sub], i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', padding: '8px 0' }}>
              <div style={{ width: '26px', height: '26px', flexShrink: 0, borderRadius: '50%', background: 'rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>{i + 1}</div>
              <div><div style={{ fontSize: '14px', fontWeight: 700 }}>{title}</div><div style={{ fontSize: '12px', color: '#94a3b8' }}>{sub}</div></div>
            </div>
          ))}
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
            {t.flowNoteA}<strong style={{ color: '#e5e7eb' }}>{t.flowNoteStrong}</strong>{t.flowNoteB(DAILY_GOAL.toLocaleString())}
          </div>
        </div>

      </div>
    </div>
  );
}
