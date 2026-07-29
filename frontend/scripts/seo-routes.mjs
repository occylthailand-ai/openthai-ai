// Single source of truth for the site's public, indexable routes.
//
// This list drives three derived outputs that MUST stay in agreement:
//   1. per-route prerendered <path>/index.html (social-crawler meta) — prerender-meta.mjs
//   2. dist/sitemap.xml                                              — prerender-meta.mjs
//   3. public/robots.txt `Allow:` list                              — hand-maintained
// The invariant "sitemap URL set == robots Allow list, and every path is a real
// PUBLIC (non-auth-gated) route" was maintained by hand across several changes;
// src/__tests__/seoInvariants.test.js now enforces it automatically so the three
// copies can't silently drift and an auth-gated/nonexistent page can't be
// advertised to crawlers (which would index a /login redirect — a soft-404 SEO bug).
//
// Kept in its own module (not inside prerender-meta.mjs) because that script reads
// dist/index.html at import time — importing it from a test would fail before a
// build exists. This file has no side effects, so both the build script and the
// test can import it.
export const DOMAIN = 'https://www.openthai-ai.com';

// title/description text below is copied verbatim from each page's own `T`/`LANG` i18n object
// (same source run 18 used for document.title) — matching whichever language that page's
// useState()/useLang() actually defaults to, so the preview matches what a visitor sees on first
// load. Privacy/Terms/Contact don't have an i18n "sub" string for their hero, so their descriptions
// are a plain factual restatement of the page's real, verified purpose — not marketing copy.
export const ROUTES = [
  { path: '/showcase', title: 'มาชมสิ่งที่เราสร้างจริง', desc: 'ทัวร์นำชม OpenThaiAi — ตัวอย่างสดการแนะนำสินค้าตามฤดูกาล, เครื่องมือ AI, สิทธิความเป็นส่วนตัว และจุดเด่นที่เล่นกับคนอย่างตรงไปตรงมา (consent-first, ไม่ scrape, ทำงานได้แม้ AI ล่ม)' },
  { path: '/seasonal', title: 'สินค้ามาแรงตามฤดูกาล', desc: 'ช่วงนี้ควรผลิต ขาย หรือซื้ออะไร — อิงปฏิทิน 24 ฤดูกาลจีน (节气) + ฤดูกาลของพื้นที่ คำนวณสด ไม่ใช้ AI ไม่เก็บข้อมูล พร้อมคำแนะนำแยกตามบทบาท ผู้ผลิต/คนกลาง/affiliate/ผู้บริโภค' },
  { path: '/portals', title: 'ประตูสู่ OpenThai.ai', desc: 'เลือกประเภทของท่านเพื่อเข้าร่วมเป็นส่วนหนึ่งของระบบนิเวศ AI ไทย — ผู้ผลิต ผู้บริโภค คนกลาง ครีเอเตอร์ Affiliate หน่วยงานรัฐ องค์กรระหว่างประเทศ และมูลนิธิ' },
  { path: '/portals/producer', title: 'ทางเข้าผู้ผลิต', desc: 'เชื่อมต่อสินค้าของคุณกับตลาด AI ไทยและทั่วโลก — ขายผ่าน AI-powered store, เข้าถึงผู้ซื้อทั่วโลก, ระบบ inventory อัตโนมัติ' },
  { path: '/portals/affiliate', title: 'ทางเข้าผู้ขาย / Affiliate', desc: 'ขายสินค้าจาก OpenThai.ai และรับค่าคอมมิชชั่นสูงสุด 40% ต่อการขาย พร้อม Dashboard ติดตาม real-time' },
  { path: '/portals/creator', title: 'ทางเข้าผู้ร่วมสร้างคอนเทนต์', desc: 'ร่วมสร้างคอนเทนต์ AI จากทุกแพลตฟอร์ม TikTok / IG / YouTube ไม่จำกัดประเทศ' },
  { path: '/portals/consumer', title: 'ทางเข้าผู้บริโภค', desc: 'สมัครรับสิทธิพิเศษ ส่วนลด และสินค้าใหม่จากผู้ผลิตไทยก่อนใคร พร้อมคำแนะนำเฉพาะตัวจาก AI' },
  { path: '/portals/middleman', title: 'ทางเข้าคนกลาง / ตัวแทนจำหน่าย', desc: 'ตัวแทนจำหน่าย ผู้ค้าส่ง นายหน้า และคนกลางทุกประเภท เข้าร่วมเครือข่ายกระจายสินค้า OpenThaiAi' },
  { path: '/portals/gov-thai', title: 'ทางเข้าหน่วยงานรัฐไทย', desc: 'บูรณาการ AI เข้าสู่ระบบงานภาครัฐไทย เพื่อประชาชน — แชทบอท, วิเคราะห์ข้อมูล, Dashboard ราชการ' },
  { path: '/portals/gov-intl', title: 'Foreign Government Agency Portal', desc: 'AI collaboration for governments worldwide — no country restrictions. G2G programs, AI policy consultation, secure data exchange.' },
  { path: '/portals/intl-org', title: 'International Organization Portal', desc: 'Partnering with global institutions to advance AI for humanity — UN agencies, ASEAN bodies, development banks, SDG-aligned programs.' },
  { path: '/portals/foundation', title: 'ทางเข้ามูลนิธิเพื่อสังคม', desc: 'OpenThai.ai แบ่งปันกำไรให้มูลนิธิช่วยเหลือผู้ยากไร้เมื่อกำไรรวมเกิน 10 ล้านบาท — โปร่งใส ตรวจสอบได้' },
  // /pricing และ /affiliate อยู่ใน sitemap.xml + robots.txt Allow มาตั้งแต่ต้น แต่ไม่เคยอยู่ใน
  // รายการนี้ — แชร์สองหน้านี้บน LINE/Facebook จึงยังเห็น meta ของหน้าแรกอยู่ ทั้งที่เป็นหน้า
  // funnel หลัก (ราคา + สมัคร affiliate) /affiliate/dashboard อยู่ใน sitemap เช่นกันแต่จงใจ
  // ไม่ใส่ที่นี่: เป็นหน้า dashboard ส่วนตัว ไม่ใช่หน้า marketing ที่คนแชร์กัน
  { path: '/pricing', title: 'เลือกแพ็กเกจที่ใช่สำหรับคุณ', desc: 'ทดลองฟรี ไม่ต้องผูกบัตร • ยกเลิกได้ทุกเมื่อ' },
  { path: '/affiliate', title: 'โปรแกรม Affiliate', desc: 'แนะนำ Openthai.ai ให้เพื่อน Creator ไทย — เมื่อลูกค้าชำระเสร็จและแพลตฟอร์มโอนเงินส่วนต่างมาให้เรา เราโอนค่าคอมมิชชั่นให้คุณทุกวันจันทร์ โปร่งใส ไม่มีเงื่อนไขซ่อน' },
  { path: '/catalog', title: 'สินค้าไทยจากผู้ผลิตโดยตรง', desc: 'เลือกสินค้า → สั่งซื้อ → ผู้ผลิตติดต่อกลับเพื่อยืนยันและจัดส่ง' },
  // /store (public "Openthai Store") is linked from the homepage footer + nav and is a real
  // commerce funnel, but was never in this list, robots.txt, or the sitemap — so sharing it on
  // LINE/Facebook showed the homepage's TikTok pitch. title/desc copied verbatim from the page's
  // own mk.store.title / mk.store.sub (Thai default). Also added to robots.txt Allow to keep the
  // sitemap URL set == robots Allow list invariant (see run 76).
  { path: '/store', title: 'Openthai Store', desc: 'สินค้าอย่างเป็นทางการจาก Openthai.ai' },
  // /earn ("ศูนย์สร้างรายได้") is a homepage hero CTA ("💸 หารายได้") and an explicitly
  // shareable earning/affiliate landing (/earn?ref=CODE) — same missing-from-SEO gap /store had.
  // title from the page's own document.title; desc is a factual restatement of its real content
  // (ready-to-ship products paid via PromptPay + affiliate commission 20–40% with a share link).
  { path: '/earn', title: 'ศูนย์สร้างรายได้', desc: 'หารายได้กับ Openthai.ai — สั่งซื้อสินค้าพร้อมส่งจ่ายผ่านพร้อมเพย์ หรือสมัครเป็นพันธมิตรรับค่าคอมมิชชั่น 20–40% ต่อดีล พร้อมลิงก์และคลิปไปแชร์' },
  { path: '/join', title: 'เอาสินค้าคุณมาขายกับครีเอเตอร์ทั่วไทย', desc: 'สังกัด Openthai.ai ฟรี — ให้ครีเอเตอร์กว่า 1,200 คนช่วยสร้างคอนเทนต์ + ดันยอดขายสินค้าคุณ จ่ายค่าคอมเฉพาะเมื่อขายได้' },
  { path: '/find-producers', title: 'หาผู้ผลิตสินค้าไทยที่ใช่', desc: 'ครีเอเตอร์หาสินค้ามาโปรโมต · ลูกค้าหาของจากผู้ผลิตโดยตรง' },
  { path: '/about', title: 'เกี่ยวกับเรา', desc: 'ทีมงานเบื้องหลัง Openthai.ai และความเชี่ยวชาญที่อยู่เบื้องหลังแพลตฟอร์ม' },
  { path: '/privacy', title: 'นโยบายความเป็นส่วนตัว', desc: 'นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคล (PDPA) ของ Openthai.ai' },
  { path: '/terms', title: 'ข้อกำหนดการใช้งาน', desc: 'ข้อกำหนดและเงื่อนไขการใช้งานแพลตฟอร์ม Openthai.ai' },
  { path: '/contact', title: 'ติดต่อทีมงาน Openthai.ai', desc: 'ตอบกลับภายใน 1–2 วันทำการ · เปิดให้บริการทุกวัน' },
];
