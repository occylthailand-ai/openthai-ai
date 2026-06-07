import React, { createContext, useContext, useState, useCallback } from 'react';

// ── Supported languages ───────────────────────────────────────────────────────
export const LANGS = [
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'english' },
  { code: 'zh', label: '中文' },
];

// ── Translation dictionary ────────────────────────────────────────────────────
// เพิ่มคีย์ได้เรื่อยๆ — ถ้าภาษาไหนไม่มีคีย์ จะ fallback เป็นไทยแล้วเป็น key
const translations = {
  th: {
    // nav + language menu
    'nav.affiliate': '💰 Affiliate',
    'nav.pricing': 'ราคา',
    'nav.login': 'Login',
    'nav.freeCta': 'ใช้ฟรีตอนนี้ →',
    'lang.label': 'ภาษา',
    // pricing page
    'pp.nav.home': '← หน้าหลัก',
    'pp.hero.badge': '💳 ราคาและแพ็กเกจ',
    'pp.hero.title': 'เลือกแพ็กเกจที่ใช่สำหรับคุณ',
    'pp.hero.sub': 'ทดลองฟรี ไม่ต้องผูกบัตร • ยกเลิกได้ทุกเมื่อ',
    'pp.faq.title': '❓ คำถามที่พบบ่อย',
    'pp.aff.title': 'แชร์ → รับคอมมิชชั่นสูงสุด 40%',
    'pp.aff.desc': 'สมัคร Affiliate ฟรี รับลิงก์ส่วนตัว แชร์ได้เลยทันที',
    'pp.aff.cta': '🤝 สมัคร Affiliate ฟรี →',
    'pp.plans': {
      free: { name: 'Free', unit: '/วัน', desc: 'ทดลองใช้ ไม่ต้องสมัคร', cta: 'ใช้ฟรีเลย', features: [{ ok: true, t: '3 คอนเทนต์ต่อวัน' }, { ok: true, t: 'TikTok + Facebook' }, { ok: true, t: 'AI Critic พื้นฐาน' }, { ok: true, t: 'แฮชแท็ก 5 อัน' }, { ok: false, t: 'ไม่จำกัดจำนวน' }, { ok: false, t: 'ทุกแพลตฟอร์ม 241+' }, { ok: false, t: 'ประวัติคอนเทนต์' }] },
      pro: { name: 'Pro', unit: '/เดือน', desc: 'สำหรับ Creator จริงจัง', cta: 'เริ่ม Pro ฿20/เดือน', features: [{ ok: true, t: 'ไม่จำกัดจำนวน' }, { ok: true, t: 'ทุกแพลตฟอร์ม 241+' }, { ok: true, t: 'AI Critic เต็มรูปแบบ' }, { ok: true, t: 'แฮชแท็ก 20+ อัน' }, { ok: true, t: 'ประวัติ 30 วัน' }, { ok: true, t: 'Priority Support' }, { ok: false, t: 'API Access' }] },
      premier: { name: 'Premier', unit: '/เดือน', desc: 'สำหรับทีมและธุรกิจ', cta: 'เริ่ม Premier ฿30/เดือน', features: [{ ok: true, t: 'ทุกอย่างใน Pro' }, { ok: true, t: 'ทีม 5 คน' }, { ok: true, t: 'API Access' }, { ok: true, t: 'White-label' }, { ok: true, t: 'Dedicated Manager' }, { ok: true, t: 'SLA 99.9%' }, { ok: true, t: 'Custom integration' }] },
    },
    'pp.faq': [
      ['ทดลองฟรีได้กี่ครั้ง?', '3 ครั้งต่อวัน ไม่ต้องสมัคร ไม่ต้องใส่บัตรเครดิต'],
      ['ยกเลิกได้เมื่อไหร่?', 'ยกเลิกได้ทุกเมื่อ ไม่มีค่าปรับ ไม่มีสัญญาผูกมัด'],
      ['จ่ายด้วยอะไรได้บ้าง?', 'PromptPay QR และบัตรเครดิต/เดบิต (Visa, Mastercard, JCB) ชำระอัตโนมัติผ่านระบบ Omise'],
      ['Pro กับ Premier ต่างกันอย่างไร?', 'Premier เพิ่ม Team 5 คน, API Access, White-label และ Dedicated Manager'],
      ['มี Affiliate Program ไหม?', 'มี! แชร์ให้เพื่อนรับคอมมิชชั่นสูงสุด 40% ทุกออเดอร์ที่ผ่านลิงก์คุณ'],
    ],
    // hero
    'hero.badge': '🔥 คนไทยกว่า 1,200 คนใช้แล้ว — ทดลองฟรีวันนี้!',
    'hero.line1': 'สร้างคอนเทนต์ TikTok ปัง',
    'hero.line3': 'ใน 10 วินาที ด้วย AI ไทยแท้',
    'hero.sub1': 'ไม่ต้องคิดสคริปต์ ไม่ต้องเขียนแคปชั่น ไม่ต้องหาแฮชแท็ก',
    'hero.sub2': 'Openthai.ai สร้างครบเซ็ตพร้อมโพสต์ทันที ภาษาไทยธรรมชาติ',
    'hero.ctaFree': '🎁 ใช้ฟรี 3 ครั้ง — ไม่ต้องสมัคร!',
    'hero.ctaPricing': 'ดูราคา →',
    'typing': ['ผ้าไหมอุบล', 'น้ำพริกป้าแดง', 'เซรั่มข้าวหอม', 'กาแฟดอยช้าง', 'สบู่มะขาม'],
    'stats': [
      { v: '1,200+', l: 'Creator ใช้แล้ว' },
      { v: '3x', l: 'คอนเทนต์โตไว' },
      { v: '10 วิ', l: 'สร้างเสร็จ' },
      { v: '241', l: 'แพลตฟอร์ม' },
    ],
    // demo preview
    'demo.title': 'Openthai.ai Generator — ผ้าไหมอุบล',
    'demo.hook.label': '🎣 Hook',
    'demo.hook.text': 'ทำไมผ้าไหมอุบลถึงแพงกว่าที่อื่น? เฉลยตอนท้าย!',
    'demo.score.label': '📊 AI Score',
    'demo.caption.label': '📝 Caption พร้อมโพสต์',
    'demo.caption.text': '✨ ผ้าไหมอุบล — สิ่งทอไทยที่ UNESCO รับรอง||💯 ทออย่างพิถีพิถัน ใช้ได้หลายร้อยปี||🚚 ส่งฟรีทั่วไทย • สั่งได้ใน Bio!',
    'demo.hashtags.label': '#️⃣ Hashtags',
    'demo.hashtags': ['#ผ้าไหม', '#OTOP', '#สินค้าไทย', '#ของดีบ้านเรา', '#TikTokShop', '#ภูมิปัญญาไทย', '#Openthai.ai'],
    // how it works
    'how.badge': 'วิธีใช้งาน',
    'how.title': 'สร้างคอนเทนต์ใน 4 ขั้นตอน',
    'steps': [
      { n: '1', title: 'กรอกชื่อสินค้า', desc: 'เช่น "ผ้าไหมอุบล", "น้ำพริกป้าแดง", "เซรั่มข้าวหอม"' },
      { n: '2', title: 'เลือกสไตล์', desc: 'Educational, Entertainment, Sales — เลือกให้ตรงจุดประสงค์' },
      { n: '3', title: 'กด Generate', desc: 'AI สร้างสคริปต์ + แคปชั่น + แฮชแท็กให้ครบใน 10 วินาที' },
      { n: '4', title: 'โพสต์ได้เลย', desc: 'คัดลอกแล้วแปะลง TikTok / Facebook / Instagram ได้ทันที' },
    ],
    // features
    'features.badge': 'ฟีเจอร์',
    'features.title': 'ทำไมต้อง Openthai.ai?',
    'features': [
      { icon: '⚡', title: 'สร้างใน 10 วินาที', desc: 'กรอกชื่อสินค้า กด Generate — ได้สคริปต์+แคปชั่น+แฮชแท็กพร้อมโพสต์ทันที' },
      { icon: '🇹🇭', title: 'AI ไทยแท้ 100%', desc: 'เข้าใจวัฒนธรรม ภาษา และเทรนด์คนไทย ไม่ใช่แค่แปลมาจากภาษาอังกฤษ' },
      { icon: '🎯', title: 'โดนใจทุก Gen', desc: 'ปรับสไตล์ได้ตั้งแต่ Gen Z ไปถึงผู้ใหญ่ — ภาษาธรรมชาติ อ่านแล้วอยากกด Like' },
      { icon: '📊', title: 'AI Critic 9.0', desc: 'ให้คะแนนคอนเทนต์ 0-10 พร้อมคำแนะนำปรับปรุง ก่อนโพสต์จริง' },
      { icon: '🛒', title: 'ครอบคลุม 241 แพลตฟอร์ม', desc: 'TikTok, Facebook, Instagram, Shopee, Lazada และอีกกว่า 200 ช่องทาง' },
      { icon: '💰', title: 'Affiliate Program', desc: 'แชร์ให้เพื่อน — ได้คอมมิชชั่นสูงสุด 40% ทุกออเดอร์ที่ผ่านลิงก์คุณ' },
    ],
    // reviews
    'reviews.badge': 'รีวิว',
    'reviews.title': 'Creator ไทยพูดว่า...',
    'reviews': [
      { name: 'คุณแพร', role: 'เจ้าของร้าน OTOP ขอนแก่น', stars: 5, text: 'ก่อนหน้านี้เขียนแคปชั่นนึงใช้เวลา 30 นาที ตอนนี้ 10 วินาที ยอดขายดีขึ้น 3 เท่า!' },
      { name: 'คุณมิน', role: 'TikTok Creator 50k followers', stars: 5, text: 'สคริปต์ที่ได้เป็นภาษาไทยธรรมชาติมาก ไม่ได้ดูออกว่า AI เขียน คนดูรู้สึกจริง' },
      { name: 'คุณโจ', role: 'SME เชียงใหม่', stars: 5, text: 'ทดลองฟรี 3 ครั้งแล้วสมัคร Pro ทันที คุ้มมากครับ ใช้ทุกวัน' },
    ],
    // pricing
    'pricing.badge': 'ราคา',
    'pricing.title': 'เลือกแพ็กเกจที่ใช่',
    'pricing.recommended': '⭐ แนะนำ',
    'plans': {
      free: { name: 'Free', unit: '/วัน', desc: 'ทดลองใช้ฟรี ไม่ต้องสมัคร', cta: 'เริ่มใช้ฟรี', features: ['สร้างคอนเทนต์ 3 ครั้ง/วัน', 'TikTok + Facebook', 'AI Critic พื้นฐาน', 'แฮชแท็ก 5 อัน'] },
      pro: { name: 'Pro', unit: '/เดือน', desc: 'สำหรับ Creator จริงจัง', cta: 'เริ่ม Pro ฟรี 7 วัน', features: ['ไม่จำกัดจำนวนครั้ง', 'ทุกแพลตฟอร์ม 241+', 'AI Critic เต็มรูปแบบ', 'แฮชแท็ก 20+ อัน', 'ประวัติคอนเทนต์ 30 วัน', 'Priority Support'] },
      premier: { name: 'Premier', unit: '/เดือน', desc: 'สำหรับทีมและธุรกิจ', cta: 'เริ่ม Premier', features: ['ทุกอย่างใน Pro', 'ทีม 5 คน', 'API Access', 'White-label', 'Dedicated Manager', 'SLA 99.9%'] },
    },
    // email capture
    'email.title': 'รับ Tips สร้างคอนเทนต์ฟรี',
    'email.desc': 'เคล็ดลับ TikTok + แนวโน้มเทรนด์ไทย ส่งทุกอาทิตย์',
    'email.placeholder': 'your@email.com',
    'email.submit': 'สมัคร →',
    'email.submitting': '⏳ กำลังส่ง...',
    'email.joined': '✅ ขอบคุณ! จะส่งข้อมูลให้ที่อีเมลเร็ว ๆ นี้',
    // footer
    'footer.tagline': 'AI ไทยแท้ สร้างคอนเทนต์ TikTok||ใน 10 วินาที รองรับ 241 แพลตฟอร์ม',
    'footer.services': 'บริการ',
    'footer.info': 'ข้อมูล',
    'footer.link.generator': 'AI Generator',
    'footer.link.pricing': 'ราคา',
    'footer.link.affiliate': 'Affiliate',
    'footer.link.privacy': 'นโยบายความเป็นส่วนตัว',
    'footer.link.terms': 'ข้อกำหนดการใช้งาน',
    'footer.link.contact': 'ติดต่อเรา',
    'footer.copyright': '© 2026 Openthai.ai — สงวนลิขสิทธิ์',
    'footer.made': '🇹🇭 Made in Thailand · Powered by Gemini AI',
  },

  en: {
    'nav.affiliate': '💰 Affiliate',
    'nav.pricing': 'Pricing',
    'nav.login': 'Login',
    'nav.freeCta': 'Try Free Now →',
    'lang.label': 'Language',
    // pricing page
    'pp.nav.home': '← Home',
    'pp.hero.badge': '💳 Pricing & plans',
    'pp.hero.title': 'Pick the plan that fits you',
    'pp.hero.sub': 'Free trial, no card required • cancel anytime',
    'pp.faq.title': '❓ Frequently asked questions',
    'pp.aff.title': 'Share → earn up to 40% commission',
    'pp.aff.desc': 'Join the Affiliate program free, get your personal link, start sharing instantly',
    'pp.aff.cta': '🤝 Join Affiliate free →',
    'pp.plans': {
      free: { name: 'Free', unit: '/day', desc: 'Free trial, no signup', cta: 'Use it free', features: [{ ok: true, t: '3 generations/day' }, { ok: true, t: 'TikTok + Facebook' }, { ok: true, t: 'Basic AI Critic' }, { ok: true, t: '5 hashtags' }, { ok: false, t: 'Unlimited generations' }, { ok: false, t: 'All 241+ platforms' }, { ok: false, t: 'Content history' }] },
      pro: { name: 'Pro', unit: '/mo', desc: 'For serious creators', cta: 'Start Pro ฿20/mo', features: [{ ok: true, t: 'Unlimited generations' }, { ok: true, t: 'All 241+ platforms' }, { ok: true, t: 'Full AI Critic' }, { ok: true, t: '20+ hashtags' }, { ok: true, t: '30-day history' }, { ok: true, t: 'Priority Support' }, { ok: false, t: 'API Access' }] },
      premier: { name: 'Premier', unit: '/mo', desc: 'For teams & businesses', cta: 'Start Premier ฿30/mo', features: [{ ok: true, t: 'Everything in Pro' }, { ok: true, t: '5 team seats' }, { ok: true, t: 'API Access' }, { ok: true, t: 'White-label' }, { ok: true, t: 'Dedicated Manager' }, { ok: true, t: 'SLA 99.9%' }, { ok: true, t: 'Custom integration' }] },
    },
    'pp.faq': [
      ['How many free trials?', '3 per day — no signup, no credit card needed'],
      ['When can I cancel?', 'Cancel anytime, no penalty, no lock-in contract'],
      ['What payment methods?', 'PromptPay QR and credit/debit cards (Visa, Mastercard, JCB), auto-charged via Omise'],
      ['Pro vs Premier?', 'Premier adds a 5-seat team, API Access, White-label and a Dedicated Manager'],
      ['Is there an Affiliate program?', 'Yes! Share with friends and earn up to 40% commission on every order via your link'],
    ],
    'hero.badge': '🔥 1,200+ Thai creators already onboard — try free today!',
    'hero.line1': 'Create viral TikTok content',
    'hero.line3': 'in 10 seconds with authentic Thai AI',
    'hero.sub1': 'No scripts, no captions, no hashtag hunting',
    'hero.sub2': 'Openthai.ai builds the whole set ready to post — in natural Thai',
    'hero.ctaFree': '🎁 3 free generations — no signup!',
    'hero.ctaPricing': 'See Pricing →',
    'typing': ['Ubon silk', "Aunt Daeng's chili paste", 'rice serum', 'Doi Chang coffee', 'tamarind soap'],
    'stats': [
      { v: '1,200+', l: 'creators using it' },
      { v: '3x', l: 'faster content growth' },
      { v: '10 sec', l: 'to generate' },
      { v: '241', l: 'platforms' },
    ],
    'demo.title': 'Openthai.ai Generator — Ubon silk',
    'demo.hook.label': '🎣 Hook',
    'demo.hook.text': 'Why is Ubon silk pricier than the rest? The answer is at the end!',
    'demo.score.label': '📊 AI Score',
    'demo.caption.label': '📝 Ready-to-post caption',
    'demo.caption.text': '✨ Ubon silk — Thai textile recognized by UNESCO||💯 Meticulously woven, lasts for centuries||🚚 Free shipping nationwide • Order in Bio!',
    'demo.hashtags.label': '#️⃣ Hashtags',
    'demo.hashtags': ['#ThaiSilk', '#OTOP', '#ThaiProducts', '#LocalGems', '#TikTokShop', '#ThaiCraft', '#Openthai.ai'],
    'how.badge': 'How it works',
    'how.title': 'Create content in 4 steps',
    'steps': [
      { n: '1', title: 'Enter product name', desc: 'e.g. "Ubon silk", "Aunt Daeng\'s chili paste", "rice serum"' },
      { n: '2', title: 'Pick a style', desc: 'Educational, Entertainment, Sales — match your goal' },
      { n: '3', title: 'Hit Generate', desc: 'AI writes script + caption + hashtags in 10 seconds' },
      { n: '4', title: 'Post right away', desc: 'Copy and paste straight to TikTok / Facebook / Instagram' },
    ],
    'features.badge': 'Features',
    'features.title': 'Why Openthai.ai?',
    'features': [
      { icon: '⚡', title: 'Done in 10 seconds', desc: 'Enter a product name, hit Generate — script, caption & hashtags ready to post' },
      { icon: '🇹🇭', title: '100% authentic Thai AI', desc: 'Understands Thai culture, language and trends — not just translated from English' },
      { icon: '🎯', title: 'Resonates with every gen', desc: 'Tune the style from Gen Z to grown-ups — natural copy people want to like' },
      { icon: '📊', title: 'AI Critic 9.0', desc: 'Scores your content 0–10 with improvement tips before you post' },
      { icon: '🛒', title: 'Covers 241 platforms', desc: 'TikTok, Facebook, Instagram, Shopee, Lazada and 200+ more channels' },
      { icon: '💰', title: 'Affiliate Program', desc: 'Share with friends — earn up to 40% commission on every order via your link' },
    ],
    'reviews.badge': 'Reviews',
    'reviews.title': 'Thai creators say...',
    'reviews': [
      { name: 'Prae', role: 'OTOP shop owner, Khon Kaen', stars: 5, text: 'A caption used to take me 30 minutes. Now it\'s 10 seconds — and sales tripled!' },
      { name: 'Min', role: 'TikTok creator, 50k followers', stars: 5, text: 'The scripts read like natural Thai. You can\'t tell AI wrote them — viewers feel it\'s real.' },
      { name: 'Joe', role: 'SME, Chiang Mai', stars: 5, text: 'Tried 3 free generations and subscribed to Pro right away. So worth it — I use it daily.' },
    ],
    'pricing.badge': 'Pricing',
    'pricing.title': 'Pick the plan that fits',
    'pricing.recommended': '⭐ Recommended',
    'plans': {
      free: { name: 'Free', unit: '/day', desc: 'Free trial, no signup', cta: 'Start free', features: ['3 generations/day', 'TikTok + Facebook', 'Basic AI Critic', '5 hashtags'] },
      pro: { name: 'Pro', unit: '/mo', desc: 'For serious creators', cta: 'Start Pro — 7 days free', features: ['Unlimited generations', 'All 241+ platforms', 'Full AI Critic', '20+ hashtags', '30-day content history', 'Priority Support'] },
      premier: { name: 'Premier', unit: '/mo', desc: 'For teams & businesses', cta: 'Start Premier', features: ['Everything in Pro', '5 team seats', 'API Access', 'White-label', 'Dedicated Manager', 'SLA 99.9%'] },
    },
    'email.title': 'Get free content tips',
    'email.desc': 'TikTok tips + Thai trend insights, every week',
    'email.placeholder': 'your@email.com',
    'email.submit': 'Subscribe →',
    'email.submitting': '⏳ Sending...',
    'email.joined': '✅ Thank you! We\'ll email you shortly.',
    'footer.tagline': 'Authentic Thai AI for TikTok content||in 10 seconds, across 241 platforms',
    'footer.services': 'Services',
    'footer.info': 'Info',
    'footer.link.generator': 'AI Generator',
    'footer.link.pricing': 'Pricing',
    'footer.link.affiliate': 'Affiliate',
    'footer.link.privacy': 'Privacy Policy',
    'footer.link.terms': 'Terms of Service',
    'footer.link.contact': 'Contact us',
    'footer.copyright': '© 2026 Openthai.ai — All rights reserved',
    'footer.made': '🇹🇭 Made in Thailand · Powered by Gemini AI',
  },

  zh: {
    'nav.affiliate': '💰 联盟',
    'nav.pricing': '价格',
    'nav.login': '登录',
    'nav.freeCta': '立即免费试用 →',
    'lang.label': '语言',
    // pricing page
    'pp.nav.home': '← 首页',
    'pp.hero.badge': '💳 价格与套餐',
    'pp.hero.title': '选择适合你的套餐',
    'pp.hero.sub': '免费试用，无需绑卡 • 随时取消',
    'pp.faq.title': '❓ 常见问题',
    'pp.aff.title': '分享 → 最高赚 40% 佣金',
    'pp.aff.desc': '免费加入联盟计划，获取专属链接，立即开始分享',
    'pp.aff.cta': '🤝 免费加入联盟 →',
    'pp.plans': {
      free: { name: 'Free', unit: '/天', desc: '免费试用，无需注册', cta: '免费使用', features: [{ ok: true, t: '每天 3 条内容' }, { ok: true, t: 'TikTok + Facebook' }, { ok: true, t: '基础 AI 评论家' }, { ok: true, t: '5 个标签' }, { ok: false, t: '无限次生成' }, { ok: false, t: '全部 241+ 平台' }, { ok: false, t: '内容记录' }] },
      pro: { name: 'Pro', unit: '/月', desc: '为认真的创作者', cta: '开通 Pro ฿20/月', features: [{ ok: true, t: '无限次生成' }, { ok: true, t: '全部 241+ 平台' }, { ok: true, t: '完整 AI 评论家' }, { ok: true, t: '20+ 个标签' }, { ok: true, t: '30 天记录' }, { ok: true, t: '优先支持' }, { ok: false, t: 'API 接入' }] },
      premier: { name: 'Premier', unit: '/月', desc: '为团队与企业', cta: '开通 Premier ฿30/月', features: [{ ok: true, t: 'Pro 全部功能' }, { ok: true, t: '5 个团队席位' }, { ok: true, t: 'API 接入' }, { ok: true, t: '白标' }, { ok: true, t: '专属客户经理' }, { ok: true, t: 'SLA 99.9%' }, { ok: true, t: '定制集成' }] },
    },
    'pp.faq': [
      ['可以免费试用几次？', '每天 3 次 — 无需注册，无需信用卡'],
      ['什么时候可以取消？', '随时取消，无罚款，无合约绑定'],
      ['支持哪些支付方式？', 'PromptPay 二维码及信用卡/借记卡（Visa、Mastercard、JCB），通过 Omise 自动扣款'],
      ['Pro 和 Premier 有什么区别？', 'Premier 增加 5 人团队、API 接入、白标和专属客户经理'],
      ['有联盟计划吗？', '有！分享给朋友，通过你的链接每笔订单最高赚 40% 佣金'],
    ],
    'hero.badge': '🔥 超过 1,200 位泰国创作者已在使用 — 今天免费试用！',
    'hero.line1': '打造爆款 TikTok 内容',
    'hero.line3': '用正宗泰国 AI，10 秒搞定',
    'hero.sub1': '无需脚本、无需文案、无需找标签',
    'hero.sub2': 'Openthai.ai 一键生成整套内容，立即发布 — 自然地道泰语',
    'hero.ctaFree': '🎁 免费生成 3 次 — 无需注册！',
    'hero.ctaPricing': '查看价格 →',
    'typing': ['乌汶丝绸', '阿姨辣椒酱', '大米精华液', '象山咖啡', '罗望子香皂'],
    'stats': [
      { v: '1,200+', l: '创作者已使用' },
      { v: '3x', l: '内容增长更快' },
      { v: '10 秒', l: '生成完成' },
      { v: '241', l: '个平台' },
    ],
    'demo.title': 'Openthai.ai 生成器 — 乌汶丝绸',
    'demo.hook.label': '🎣 开场钩子',
    'demo.hook.text': '为什么乌汶丝绸比别处更贵？答案在最后揭晓！',
    'demo.score.label': '📊 AI 评分',
    'demo.caption.label': '📝 可直接发布的文案',
    'demo.caption.text': '✨ 乌汶丝绸 — 获 UNESCO 认证的泰国织物||💯 精工细织，可传承数百年||🚚 全泰国免邮 • 主页可下单！',
    'demo.hashtags.label': '#️⃣ 话题标签',
    'demo.hashtags': ['#泰国丝绸', '#OTOP', '#泰国好物', '#家乡好货', '#TikTokShop', '#泰国工艺', '#Openthai.ai'],
    'how.badge': '使用方法',
    'how.title': '4 步生成内容',
    'steps': [
      { n: '1', title: '输入产品名称', desc: '例如"乌汶丝绸"、"阿姨辣椒酱"、"大米精华液"' },
      { n: '2', title: '选择风格', desc: '科普、娱乐、销售 — 按目标选择' },
      { n: '3', title: '点击生成', desc: 'AI 在 10 秒内写好脚本 + 文案 + 标签' },
      { n: '4', title: '立即发布', desc: '复制粘贴即可发到 TikTok / Facebook / Instagram' },
    ],
    'features.badge': '功能',
    'features.title': '为什么选 Openthai.ai？',
    'features': [
      { icon: '⚡', title: '10 秒搞定', desc: '输入产品名，点击生成 — 脚本、文案、标签即刻可发布' },
      { icon: '🇹🇭', title: '100% 正宗泰国 AI', desc: '懂泰国文化、语言与潮流，而非简单从英文翻译' },
      { icon: '🎯', title: '打动各世代', desc: '风格可从 Z 世代调到长辈 — 自然文案，让人想点赞' },
      { icon: '📊', title: 'AI 评论家 9.0', desc: '发布前为内容打 0–10 分并给出改进建议' },
      { icon: '🛒', title: '覆盖 241 个平台', desc: 'TikTok、Facebook、Instagram、Shopee、Lazada 等 200 多个渠道' },
      { icon: '💰', title: '联盟计划', desc: '分享给朋友 — 通过你的链接每笔订单最高赚 40% 佣金' },
    ],
    'reviews.badge': '评价',
    'reviews.title': '泰国创作者怎么说...',
    'reviews': [
      { name: '小芮', role: '孔敬府 OTOP 店主', stars: 5, text: '以前写一条文案要 30 分钟，现在 10 秒，销量翻了 3 倍！' },
      { name: '小敏', role: 'TikTok 创作者 5 万粉丝', stars: 5, text: '生成的脚本是非常自然的泰语，看不出是 AI 写的，观众觉得很真实。' },
      { name: '小乔', role: '清迈中小企业', stars: 5, text: '免费试了 3 次就立刻订了 Pro，太值了，我每天都用。' },
    ],
    'pricing.badge': '价格',
    'pricing.title': '选择合适的套餐',
    'pricing.recommended': '⭐ 推荐',
    'plans': {
      free: { name: 'Free', unit: '/天', desc: '免费试用，无需注册', cta: '免费开始', features: ['每天生成 3 次', 'TikTok + Facebook', '基础 AI 评论家', '5 个标签'] },
      pro: { name: 'Pro', unit: '/月', desc: '为认真的创作者', cta: 'Pro 免费试用 7 天', features: ['无限次生成', '全部 241+ 平台', '完整 AI 评论家', '20+ 个标签', '30 天内容记录', '优先支持'] },
      premier: { name: 'Premier', unit: '/月', desc: '为团队与企业', cta: '开通 Premier', features: ['Pro 全部功能', '5 个团队席位', 'API 接入', '白标', '专属客户经理', 'SLA 99.9%'] },
    },
    'email.title': '免费获取内容技巧',
    'email.desc': 'TikTok 技巧 + 泰国潮流洞察，每周发送',
    'email.placeholder': 'your@email.com',
    'email.submit': '订阅 →',
    'email.submitting': '⏳ 发送中...',
    'email.joined': '✅ 谢谢！我们会尽快给你发邮件。',
    'footer.tagline': '正宗泰国 AI，10 秒生成 TikTok 内容||覆盖 241 个平台',
    'footer.services': '服务',
    'footer.info': '信息',
    'footer.link.generator': 'AI 生成器',
    'footer.link.pricing': '价格',
    'footer.link.affiliate': '联盟',
    'footer.link.privacy': '隐私政策',
    'footer.link.terms': '使用条款',
    'footer.link.contact': '联系我们',
    'footer.copyright': '© 2026 Openthai.ai — 版权所有',
    'footer.made': '🇹🇭 泰国制造 · 由 Gemini AI 驱动',
  },
};

const LanguageContext = createContext(null);

const read = (key, lang) => {
  const dict = translations[lang] || translations.th;
  if (key in dict) return dict[key];
  return key in translations.th ? translations.th[key] : key;
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('otai_lang') || 'th'; } catch { return 'th'; }
  });

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem('otai_lang', l); } catch { /* ignore */ }
    try { document.documentElement.lang = l; } catch { /* ignore */ }
  }, []);

  const t = useCallback((key) => read(key, lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, langs: LANGS }}>
      {children}
    </LanguageContext.Provider>
  );
}

// resilient: ใช้ได้แม้ไม่มี Provider (fallback ไทย) — กัน component แตกตอนเทสต์
export function useLang() {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return { lang: 'th', setLang: () => {}, t: (key) => read(key, 'th'), langs: LANGS };
}
