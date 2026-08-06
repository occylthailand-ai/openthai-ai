// Single source of truth for the /faq page's question/answer pairs.
//
// WHY separate: the visible FAQ (FaqPage.jsx) and the FAQPage JSON-LD that makes the page
// eligible for Google's FAQ rich result must contain the SAME questions and answers — Google
// requires the structured data to match the on-page content or it drops the rich result. The
// page emits JSON-LD client-side, but the PRERENDERED /faq/index.html (the first HTML byte a
// non-JS crawler — Bing, LINE, the first Googlebot wave — actually reads) previously carried
// no FAQPage schema at all, so the rich-result eligibility depended on Google's slower,
// unreliable second render pass. scripts/route-meta.mjs now injects the same FAQPage JSON-LD
// into the prerendered HTML, built from THIS list, so the schema is present without JS. Both
// consumers importing one list is what keeps the visible Q&A and the structured data from
// drifting; src/__tests__/faqContent.test.js pins them together so drift fails CI.
//
// Pure ESM data (no React/JSX) precisely so the .mjs build/prerender script can import it too.
// Every answer is grounded in what the platform ACTUALLY does — no invented features.
export const FAQ_ITEMS = {
  th: [
    ['OpenThaiAi คืออะไร?', 'แพลตฟอร์ม AI เพื่อการค้าสำหรับคนไทยและตลาดโลก — รวมเครื่องมือ AI สร้างคอนเทนต์/ขายของ/SEO, ตลาดสินค้าเชื่อมผู้ผลิตกับผู้ซื้อ, ระบบ affiliate และเครื่องมือแนะนำสินค้าตามฤดูกาล ใช้ได้ 3 ภาษา (ไทย/อังกฤษ/จีน)'],
    ['ข้อมูลของฉันปลอดภัยไหม?', 'ทุกช่องทางสมัครขอความยินยอม (consent) ก่อนเก็บข้อมูลเสมอ เราไม่แอบเก็บ/ไม่ scrape/ไม่ซื้อข้อมูลใคร และคุณใช้สิทธิ PDPA ได้จริง — ขอดูข้อมูลตัวเอง ขอลบข้อมูล และยกเลิกรับอีเมลได้ทุกเมื่อที่หน้าความเป็นส่วนตัว'],
    ['ชำระเงินได้อย่างไร?', 'รองรับพร้อมเพย์ (PromptPay) และบัตรเครดิต/เดบิต ผ่านระบบชำระเงิน Omise เป็นเงินบาท (THB)'],
    ['มีค่าใช้จ่ายไหม ราคาเท่าไหร่?', 'เริ่มใช้ฟรีได้ (แพ็กเกจ Free ฿0) และมีแพ็กเกจรายเดือนเมื่ออยากใช้แบบไม่จำกัดและครบทุกแพลตฟอร์ม: Pro ฿299/เดือน, Premier ฿599/เดือน และ Enterprise ฿1,299/เดือน ชำระผ่านพร้อมเพย์หรือบัตรเครดิต/เดบิต (Omise) ดูรายละเอียดและเปรียบเทียบแพ็กเกจได้ที่หน้าราคา (/pricing)'],
    ['ติดตามคำสั่งซื้อได้อย่างไร?', 'ใช้เลขที่ออเดอร์ + ช่องทางติดต่อที่ใช้ตอนสั่งซื้อ ที่หน้า “ติดตามสถานะ” (/track) — เมื่อสั่งสำเร็จ ระบบส่งอีเมลยืนยันพร้อมลิงก์ติดตามให้ (ถ้าใช้อีเมลเป็นช่องทางติดต่อ)'],
    ['ถ้ามีปัญหากับคำสั่งซื้อ ทำอย่างไร?', 'เปิดข้อพิพาท (dispute) ได้จากหน้าติดตามคำสั่งซื้อ ระบบจะพักเงิน (escrow) ไว้ก่อน เปิดโอกาสให้ทั้งสองฝ่ายชี้แจงพร้อมหลักฐาน แล้วแอดมินเป็นผู้ตัดสินโดยเห็นทั้งสองด้าน — AI เป็นแค่ผู้ช่วยเสนอความเห็น ไม่ตัดสินเงินจริงเอง'],
    ['ผู้ผลิต/ร้านค้าเข้าร่วมอย่างไร?', 'สมัครที่หน้าประตูผู้ผลิต (/portals/producer) หรือ /join โดยยินยอม PDPA ก่อน ทีมงานตรวจและอนุมัติ จากนั้นสินค้าของคุณจะขึ้นแสดงในตลาด และคุณแก้ไข/เติมสต๊อกสินค้าเองได้'],
    ['เป็นผู้บริโภค/ผู้ซื้อ สมัครแล้วได้อะไร?', 'สมัครที่หน้าผู้บริโภค (/portals/consumer) โดยยินยอม PDPA และเลือกหมวดสินค้าที่สนใจ จากนั้นรับอีเมลแนะนำสินค้าใหม่ที่ตรงหมวดจากผู้ผลิตที่ผ่านการรับรอง (ระบบข้ามสินค้าที่หมดสต๊อกให้อัตโนมัติ) ยกเลิกรับอีเมลได้ทุกเมื่อ ซื้อสินค้าได้ที่ตลาด (/catalog) ชำระผ่านพร้อมเพย์หรือบัตร และติดตามคำสั่งซื้อได้ที่ /track'],
    ['Affiliate ได้ค่าคอมอย่างไร?', 'สมัครเป็น affiliate รับลิงก์แนะนำของตัวเอง เมื่อมีคนซื้อผ่านลิงก์คุณจะได้ค่าคอมมิชชันตามขั้น (tier) ถอนเข้าพร้อมเพย์ได้ โดยยืนยันคำขอถอนผ่านอีเมลที่ลงทะเบียนไว้เพื่อความปลอดภัย'],
    ['มีเครื่องมือ AI อะไรบ้าง?', 'มีทักษะ AI มากกว่า 35 อย่าง ครบทั้งสร้างคอนเทนต์ แคปชั่นขายของ วิเคราะห์เทรนด์ SEO บริการลูกค้า ตั้งราคา ไลฟ์ขายของ และอื่นๆ ดูรายการทั้งหมดได้ที่หน้าเครื่องมือ AI (/ai-skills)'],
  ],
  en: [
    ['What is OpenThaiAi?', 'A commerce AI platform for Thailand and global markets — AI tools for content/selling/SEO, a marketplace connecting producers with buyers, an affiliate system, and a seasonal product recommender. Available in 3 languages (Thai/English/Chinese).'],
    ['Is my data safe?', 'Every sign-up asks for consent before collecting data. We do not harvest, scrape, or buy anyone’s data, and your PDPA rights are real — view your own data, request erasure, and unsubscribe from emails anytime on the privacy page.'],
    ['How can I pay?', 'PromptPay and credit/debit cards, via the Omise payment system, in Thai Baht (THB).'],
    ['How much does it cost?', 'There’s a free tier (Free plan, ฿0), plus monthly paid plans for unlimited use across all platforms: Pro ฿299/mo, Premier ฿599/mo, and Enterprise ฿1,299/mo — paid via PromptPay or credit/debit card (Omise). Compare plans on the pricing page (/pricing).'],
    ['How do I track my order?', 'Use your order ID + the contact you gave at checkout on the Track page (/track). When an order succeeds we email a confirmation with a track link (if your contact is an email).'],
    ['What if there’s a problem with an order?', 'Open a dispute from the order-tracking page. Funds are held in escrow, both sides get to explain with evidence, and an admin decides after seeing both. AI only assists with a suggestion — it never moves real money on its own.'],
    ['How do producers/sellers join?', 'Apply at the producer portal (/portals/producer) or /join, consenting to PDPA first. The team reviews and approves; your products then appear in the marketplace and you can edit/restock them yourself.'],
    ['What do I get as a consumer/buyer?', 'Sign up at the consumer portal (/portals/consumer), consenting to PDPA, and pick the product categories you care about. You then get emails featuring new products that match your category from verified producers (sold-out items are skipped automatically), unsubscribe anytime, buy in the marketplace (/catalog) via PromptPay or card, and track orders at /track.'],
    ['How do affiliates earn?', 'Sign up as an affiliate and get your own referral link. When someone buys through it you earn a tier-based commission, withdrawable to PromptPay — each withdrawal is confirmed via your registered email for safety.'],
    ['What AI tools are there?', 'Over 35 AI skills — content creation, sales captions, trend analysis, SEO, customer support, pricing, live selling and more. See the full list on the AI tools page (/ai-skills).'],
  ],
  zh: [
    ['OpenThaiAi 是什么？', '面向泰国与全球市场的商用 AI 平台——内容/销售/SEO 的 AI 工具、连接生产商与买家的商城、推广（affiliate）系统，以及应季选品工具。支持三语（泰/英/中）。'],
    ['我的数据安全吗？', '每个注册入口都会先征得同意才收集数据。我们不采集、不抓取、不购买任何人的数据；你的 PDPA 权利真实可用——可查看本人数据、申请删除、随时退订邮件（在隐私页面）。'],
    ['如何付款？', '通过 Omise 支付系统支持 PromptPay 及信用卡/借记卡，以泰铢（THB）结算。'],
    ['收费吗？价格是多少？', '可免费开始使用（Free 套餐，฿0），另有按月付费套餐以解锁无限使用与全部平台：Pro ฿299/月、Premier ฿599/月、Enterprise ฿1,299/月，通过 PromptPay 或信用卡/借记卡（Omise）支付。详情与套餐对比见价格页面（/pricing）。'],
    ['如何追踪订单？', '在追踪页面（/track）输入订单号 + 下单时填写的联系方式。下单成功后，我们会发送含追踪链接的确认邮件（若联系方式为邮箱）。'],
    ['订单出问题怎么办？', '可在订单追踪页发起争议（dispute）。资金将进入托管（escrow），双方均可提交证据说明，管理员在了解双方后裁定。AI 仅提供建议，绝不自行划转真实资金。'],
    ['生产商/卖家如何加入？', '在生产商入口（/portals/producer）或 /join 注册，先同意 PDPA。团队审核通过后，你的商品将在商城展示，你可自行编辑/补货。'],
    ['作为消费者/买家能获得什么？', '在消费者入口（/portals/consumer）注册并同意 PDPA，选择你感兴趣的商品类别，即可收到来自认证生产商、与你类别匹配的新品推荐邮件（系统自动跳过缺货商品），可随时退订；在商城（/catalog）通过 PromptPay 或银行卡购买，并在 /track 追踪订单。'],
    ['推广者如何赚取佣金？', '注册为 affiliate 并获得专属推广链接。有人通过链接购买后，你将按等级（tier）获得佣金，可提现至 PromptPay——每笔提现需通过注册邮箱确认以保安全。'],
    ['有哪些 AI 工具？', '超过 35 项 AI 技能——内容创作、销售文案、趋势分析、SEO、客服、定价、直播带货等。完整列表见 AI 工具页面（/ai-skills）。'],
  ],
};
