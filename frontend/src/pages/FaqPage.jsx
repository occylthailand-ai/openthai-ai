import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Public, indexable general FAQ — the broad "how does this work / is my data safe / how do I get
// paid" questions that /pricing and /affiliate (which have their own topic-specific FAQs) don't cover.
// Every answer is grounded in what the platform ACTUALLY does (consent-first funnels, no scraping,
// PromptPay+card THB via Omise, PDPA access/erasure/unsubscribe, order tracking by id+contact,
// dispute/escrow that hears both sides before an admin decides, 35 AI skills in 3 languages) — no
// invented features. Emits FAQPage JSON-LD (same client-side pattern as /pricing + /affiliate) so the
// page is eligible for FAQ rich results; accordions follow the site's keyboard/SR-operable pattern.

const T = {
  th: {
    title: 'คำถามที่พบบ่อย',
    sub: 'ทุกอย่างที่อยากรู้เกี่ยวกับ OpenThaiAi — ตรงไปตรงมา',
    faqs: [
      ['OpenThaiAi คืออะไร?', 'แพลตฟอร์ม AI เพื่อการค้าสำหรับคนไทยและตลาดโลก — รวมเครื่องมือ AI สร้างคอนเทนต์/ขายของ/SEO, ตลาดสินค้าเชื่อมผู้ผลิตกับผู้ซื้อ, ระบบ affiliate และเครื่องมือแนะนำสินค้าตามฤดูกาล ใช้ได้ 3 ภาษา (ไทย/อังกฤษ/จีน)'],
      ['ข้อมูลของฉันปลอดภัยไหม?', 'ทุกช่องทางสมัครขอความยินยอม (consent) ก่อนเก็บข้อมูลเสมอ เราไม่แอบเก็บ/ไม่ scrape/ไม่ซื้อข้อมูลใคร และคุณใช้สิทธิ PDPA ได้จริง — ขอดูข้อมูลตัวเอง ขอลบข้อมูล และยกเลิกรับอีเมลได้ทุกเมื่อที่หน้าความเป็นส่วนตัว'],
      ['ชำระเงินได้อย่างไร?', 'รองรับพร้อมเพย์ (PromptPay) และบัตรเครดิต/เดบิต ผ่านระบบชำระเงิน Omise เป็นเงินบาท (THB)'],
      ['ติดตามคำสั่งซื้อได้อย่างไร?', 'ใช้เลขที่ออเดอร์ + ช่องทางติดต่อที่ใช้ตอนสั่งซื้อ ที่หน้า “ติดตามสถานะ” (/track) — เมื่อสั่งสำเร็จ ระบบส่งอีเมลยืนยันพร้อมลิงก์ติดตามให้ (ถ้าใช้อีเมลเป็นช่องทางติดต่อ)'],
      ['ถ้ามีปัญหากับคำสั่งซื้อ ทำอย่างไร?', 'เปิดข้อพิพาท (dispute) ได้จากหน้าติดตามคำสั่งซื้อ ระบบจะพักเงิน (escrow) ไว้ก่อน เปิดโอกาสให้ทั้งสองฝ่ายชี้แจงพร้อมหลักฐาน แล้วแอดมินเป็นผู้ตัดสินโดยเห็นทั้งสองด้าน — AI เป็นแค่ผู้ช่วยเสนอความเห็น ไม่ตัดสินเงินจริงเอง'],
      ['ผู้ผลิต/ร้านค้าเข้าร่วมอย่างไร?', 'สมัครที่หน้าประตูผู้ผลิต (/portals/producer) หรือ /join โดยยินยอม PDPA ก่อน ทีมงานตรวจและอนุมัติ จากนั้นสินค้าของคุณจะขึ้นแสดงในตลาด และคุณแก้ไข/เติมสต๊อกสินค้าเองได้'],
      ['Affiliate ได้ค่าคอมอย่างไร?', 'สมัครเป็น affiliate รับลิงก์แนะนำของตัวเอง เมื่อมีคนซื้อผ่านลิงก์คุณจะได้ค่าคอมมิชชันตามขั้น (tier) ถอนเข้าพร้อมเพย์ได้ โดยยืนยันคำขอถอนผ่านอีเมลที่ลงทะเบียนไว้เพื่อความปลอดภัย'],
      ['มีเครื่องมือ AI อะไรบ้าง?', 'มีทักษะ AI มากกว่า 35 อย่าง ครบทั้งสร้างคอนเทนต์ แคปชั่นขายของ วิเคราะห์เทรนด์ SEO บริการลูกค้า ตั้งราคา ไลฟ์ขายของ และอื่นๆ ดูรายการทั้งหมดได้ที่หน้าเครื่องมือ AI (/ai-skills)'],
    ],
    ctaHead: 'พร้อมเริ่มไหม?',
    cta: 'เลือกประตูของคุณ',
    privacy: 'อ่านนโยบายความเป็นส่วนตัว',
  },
  en: {
    title: 'Frequently asked questions',
    sub: 'Everything you want to know about OpenThaiAi — straight answers',
    faqs: [
      ['What is OpenThaiAi?', 'A commerce AI platform for Thailand and global markets — AI tools for content/selling/SEO, a marketplace connecting producers with buyers, an affiliate system, and a seasonal product recommender. Available in 3 languages (Thai/English/Chinese).'],
      ['Is my data safe?', 'Every sign-up asks for consent before collecting data. We do not harvest, scrape, or buy anyone’s data, and your PDPA rights are real — view your own data, request erasure, and unsubscribe from emails anytime on the privacy page.'],
      ['How can I pay?', 'PromptPay and credit/debit cards, via the Omise payment system, in Thai Baht (THB).'],
      ['How do I track my order?', 'Use your order ID + the contact you gave at checkout on the Track page (/track). When an order succeeds we email a confirmation with a track link (if your contact is an email).'],
      ['What if there’s a problem with an order?', 'Open a dispute from the order-tracking page. Funds are held in escrow, both sides get to explain with evidence, and an admin decides after seeing both. AI only assists with a suggestion — it never moves real money on its own.'],
      ['How do producers/sellers join?', 'Apply at the producer portal (/portals/producer) or /join, consenting to PDPA first. The team reviews and approves; your products then appear in the marketplace and you can edit/restock them yourself.'],
      ['How do affiliates earn?', 'Sign up as an affiliate and get your own referral link. When someone buys through it you earn a tier-based commission, withdrawable to PromptPay — each withdrawal is confirmed via your registered email for safety.'],
      ['What AI tools are there?', 'Over 35 AI skills — content creation, sales captions, trend analysis, SEO, customer support, pricing, live selling and more. See the full list on the AI tools page (/ai-skills).'],
    ],
    ctaHead: 'Ready to start?',
    cta: 'Pick your portal',
    privacy: 'Read the privacy policy',
  },
  zh: {
    title: '常见问题',
    sub: '关于 OpenThaiAi 你想知道的一切——坦诚作答',
    faqs: [
      ['OpenThaiAi 是什么？', '面向泰国与全球市场的商用 AI 平台——内容/销售/SEO 的 AI 工具、连接生产商与买家的商城、推广（affiliate）系统，以及应季选品工具。支持三语（泰/英/中）。'],
      ['我的数据安全吗？', '每个注册入口都会先征得同意才收集数据。我们不采集、不抓取、不购买任何人的数据；你的 PDPA 权利真实可用——可查看本人数据、申请删除、随时退订邮件（在隐私页面）。'],
      ['如何付款？', '通过 Omise 支付系统支持 PromptPay 及信用卡/借记卡，以泰铢（THB）结算。'],
      ['如何追踪订单？', '在追踪页面（/track）输入订单号 + 下单时填写的联系方式。下单成功后，我们会发送含追踪链接的确认邮件（若联系方式为邮箱）。'],
      ['订单出问题怎么办？', '可在订单追踪页发起争议（dispute）。资金将进入托管（escrow），双方均可提交证据说明，管理员在了解双方后裁定。AI 仅提供建议，绝不自行划转真实资金。'],
      ['生产商/卖家如何加入？', '在生产商入口（/portals/producer）或 /join 注册，先同意 PDPA。团队审核通过后，你的商品将在商城展示，你可自行编辑/补货。'],
      ['推广者如何赚取佣金？', '注册为 affiliate 并获得专属推广链接。有人通过链接购买后，你将按等级（tier）获得佣金，可提现至 PromptPay——每笔提现需通过注册邮箱确认以保安全。'],
      ['有哪些 AI 工具？', '超过 35 项 AI 技能——内容创作、销售文案、趋势分析、SEO、客服、定价、直播带货等。完整列表见 AI 工具页面（/ai-skills）。'],
    ],
    ctaHead: '准备好了吗？',
    cta: '选择你的入口',
    privacy: '阅读隐私政策',
  },
};

const card = { background: '#111', border: '1px solid #6366f133', borderRadius: 12 };

export default function FaqPage() {
  const [lang, setLang] = useState('th');
  const [open, setOpen] = useState(0);
  const t = T[lang];

  useEffect(() => { document.title = t.title + ' — Openthai.ai'; document.documentElement.lang = lang; }, [t.title, lang]);

  // FAQPage JSON-LD derived from the SAME visible Q&A (same client-side pattern as /pricing +
  // /affiliate) — Google renders the SPA and reads it, making /faq eligible for FAQ rich results.
  const faqLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faqs.map(([q, a]) => ({ '@type': 'Question', name: String(q), acceptedAnswer: { '@type': 'Answer', text: String(a) } })),
  }).replace(/</g, '\\u003c');

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 32px', borderBottom: '1px solid #1e1e2e', gap: 8 }}>
        {['th', 'en', 'zh'].map((l) => (
          <button key={l} onClick={() => setLang(l)} type="button" aria-pressed={lang === l} style={{ background: lang === l ? '#5e61f1' : 'none', border: '1px solid #333', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{l === 'th' ? 'ไทย' : l === 'en' ? 'English' : '中文'}</button>
        ))}
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 72px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>❓</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#818cf8', margin: '0 0 12px' }}>{t.title}</h1>
          <p style={{ color: '#aaa', fontSize: 16, lineHeight: 1.6 }}>{t.sub}</p>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {t.faqs.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={card}>
                <div
                  role="button" tabIndex={0} aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(isOpen ? -1 : i); } }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 18px', cursor: 'pointer', outline: 'none' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{q}</span>
                  <span style={{ color: '#818cf8', fontSize: 18, flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && <div style={{ padding: '0 18px 16px', color: '#cbd5e1', fontSize: 14, lineHeight: 1.7 }}>{a}</div>}
              </div>
            );
          })}
        </div>

        <div style={{ ...card, borderColor: '#6366f155', marginTop: 36, textAlign: 'center', padding: '24px 20px' }}>
          <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{t.ctaHead}</div>
          <Link to="/portals" style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', marginRight: 10 }}>{t.cta}</Link>
          <Link to="/privacy" style={{ display: 'inline-block', color: '#a5b4fc', padding: '12px', fontSize: 14, textDecoration: 'none' }}>{t.privacy} →</Link>
        </div>
      </div>
    </div>
  );
}
