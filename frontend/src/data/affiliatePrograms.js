// ── คลังโปรแกรม Affiliate ─────────────────────────────────────────────────────
// รวมโปรแกรมพันธมิตรที่สมัครได้จริง · จัดหมวด · ปุ่ม "สมัคร" ลิงก์ไปหน้าโปรแกรมโดยตรง
// อ้างอิงรายชื่อ: https://www.shopify.com/th/blog/best-affiliate-programs
// หมายเหตุ: payout ของโปรแกรมต่างชาติเป็นธนาคาร/PayPal — เฉพาะลิงก์ /pay ของเราที่เข้าพร้อมเพย์ตรง
//
// label/note เป็น { th, en, zh } เพื่อให้ /affiliate-programs (AffiliateProgramsPage) แสดงได้ 3 ภาษา
// — เป็น funnel สาธารณะที่ affiliate เอาไปแชร์ (?ref=CODE) จึงต้องอ่านได้ทั้งไทย/อังกฤษ/จีน
// name/url/cat/hot เป็นข้อมูลกลาง (ชื่อแบรนด์/ลิงก์) ไม่ต้องแปล

// สมัครผ่านหน้าโปรแกรมโดยตรง (ใช้ search ที่เชื่อถือได้ ไม่พาไปลิงก์ที่อาจตาย)
const find = (q) => `https://www.google.com/search?q=${encodeURIComponent(q + ' affiliate program สมัคร')}`;

// หมวดหมู่
export const CATEGORIES = [
  { id: 'thai',    label: { th: '🇹🇭 ไทย / Social Commerce', en: '🇹🇭 Thai / Social Commerce', zh: '🇹🇭 泰国 / 社交电商' },     note: { th: 'ขายของได้เลย ฐานลูกค้าไทย', en: 'Sell right away, Thai customer base', zh: '立即开卖，泰国客户群' } },
  { id: 'ecom',    label: { th: '🛒 อีคอมเมิร์ซโลก', en: '🛒 Global e-commerce', zh: '🛒 全球电商' },                            note: { th: 'สินค้าทั่วไป คอมต่อยอดขาย', en: 'General goods, commission on sales', zh: '一般商品，按销售额抽成' } },
  { id: 'network', label: { th: '🔗 เครือข่าย Affiliate', en: '🔗 Affiliate networks', zh: '🔗 联盟网络' },                     note: { th: 'สมัครทีเดียว ได้หลายแบรนด์', en: 'Sign up once, get many brands', zh: '注册一次，接入多个品牌' } },
  { id: 'saas',    label: { th: '🚀 การตลาด / SaaS', en: '🚀 Marketing / SaaS', zh: '🚀 营销 / SaaS' },                        note: { th: 'คอมสูง recurring รายเดือน', en: 'High recurring monthly commission', zh: '高额每月经常性佣金' } },
  { id: 'hosting', label: { th: '🌐 เว็บโฮสติ้ง / Dev', en: '🌐 Web hosting / Dev', zh: '🌐 网站托管 / 开发' },                 note: { th: 'คอมต่อการสมัคร $65–500', en: '$65–500 per signup', zh: '每次注册 $65–500' } },
  { id: 'edu',     label: { th: '🎓 คอร์ส / บริการ', en: '🎓 Courses / Services', zh: '🎓 课程 / 服务' },                       note: { th: 'สอน/ฟรีแลนซ์/เครื่องมือ', en: 'Teaching / freelance / tools', zh: '教学 / 自由职业 / 工具' } },
];

// โปรแกรม — { name, cat, note: {th,en,zh}, url, hot? }
export const PROGRAMS = [
  // 🇹🇭 ไทย / Social Commerce (เข้าถึงลูกค้าไทยทันที)
  { name: 'TikTok Shop Affiliate', cat: 'thai', note: { th: 'คอมจากคลิปติดตะกร้า', en: 'Commission from shoppable clips', zh: '带货短视频抽佣' }, url: 'https://affiliate.tiktok.com/', hot: true },
  { name: 'Shopee Affiliate',      cat: 'thai', note: { th: 'คอมทุกออเดอร์ผ่านลิงก์', en: 'Commission on every order via your link', zh: '每笔通过链接的订单抽佣' }, url: 'https://affiliate.shopee.co.th/', hot: true },
  { name: 'Lazada Affiliate',      cat: 'thai', note: { th: 'LazAffiliates คอม %', en: 'LazAffiliates % commission', zh: 'LazAffiliates 百分比佣金' }, url: 'https://www.lazada.co.th/wow/gcp/route/lazada/laz-affiliate', hot: true },
  { name: 'Facebook / Meta',       cat: 'thai', note: { th: 'Branded content + reels', en: 'Branded content + reels', zh: '品牌内容 + Reels' }, url: find('Facebook Meta creator monetization') },
  { name: 'Instagram',             cat: 'thai', note: { th: 'Affiliate + branded content', en: 'Affiliate + branded content', zh: '联盟 + 品牌内容' }, url: find('Instagram affiliate creator') },
  { name: 'LINE Shopping',         cat: 'thai', note: { th: 'แชร์สินค้ารับคอม', en: 'Share products, earn commission', zh: '分享商品赚佣金' }, url: find('LINE Shopping affiliate') },
  { name: 'YouTube Shopping',      cat: 'thai', note: { th: 'ติดสินค้าในวิดีโอ', en: 'Tag products in videos', zh: '在视频中标记商品' }, url: find('YouTube Shopping affiliate') },

  // 🛒 อีคอมเมิร์ซโลก
  { name: 'Amazon Associates',     cat: 'ecom', note: { th: 'สินค้าล้านรายการ', en: 'Millions of products', zh: '数百万商品' }, url: 'https://affiliate-program.amazon.com/', hot: true },
  { name: 'eBay Partner Network',  cat: 'ecom', note: { th: 'คอมจากยอดขาย eBay', en: 'Commission on eBay sales', zh: 'eBay 销售抽佣' }, url: 'https://partnernetwork.ebay.com/' },
  { name: 'Etsy',                  cat: 'ecom', note: { th: 'สินค้าแฮนด์เมด', en: 'Handmade goods', zh: '手工商品' }, url: find('Etsy') },
  { name: 'Target',                cat: 'ecom', note: { th: 'รีเทลใหญ่ US', en: 'Major US retailer', zh: '美国大型零售商' }, url: find('Target') },
  { name: 'NET-A-PORTER',          cat: 'ecom', note: { th: 'แฟชั่นลักชัวรี', en: 'Luxury fashion', zh: '奢侈时尚' }, url: find('NET-A-PORTER') },
  { name: 'New Balance',           cat: 'ecom', note: { th: 'รองเท้า/กีฬา', en: 'Shoes / sports', zh: '鞋类 / 运动' }, url: find('New Balance') },
  { name: 'Rakuten',               cat: 'ecom', note: { th: 'เครือข่าย + cashback', en: 'Network + cashback', zh: '网络 + 返现' }, url: 'https://rakutenadvertising.com/' },
  { name: 'Ollie',                 cat: 'ecom', note: { th: 'อาหารสุนัข subscription', en: 'Dog food subscription', zh: '狗粮订阅' }, url: find('Ollie pet food') },

  // 🔗 เครือข่าย Affiliate (สมัครทีเดียว ได้หลายแบรนด์)
  { name: 'ShareASale',            cat: 'network', note: { th: 'พันแบรนด์ในที่เดียว', en: 'Thousands of brands in one place', zh: '一站接入上千品牌' }, url: 'https://www.shareasale.com/', hot: true },
  { name: 'CJ (Commission Junction)', cat: 'network', note: { th: 'เครือข่ายระดับโลก', en: 'Global network', zh: '全球网络' }, url: 'https://www.cj.com/' },
  { name: 'Awin',                  cat: 'network', note: { th: '25,000+ แบรนด์', en: '25,000+ brands', zh: '25,000+ 品牌' }, url: 'https://www.awin.com/' },
  { name: 'Impact',                cat: 'network', note: { th: 'partnership platform', en: 'Partnership platform', zh: '合作伙伴平台' }, url: 'https://impact.com/' },
  { name: 'ClickBank',             cat: 'network', note: { th: 'สินค้าดิจิทัลคอมสูง', en: 'High-commission digital products', zh: '高佣金数字产品' }, url: 'https://www.clickbank.com/' },
  { name: 'FlexOffers',            cat: 'network', note: { th: '12,000+ โปรแกรม', en: '12,000+ programs', zh: '12,000+ 计划' }, url: find('FlexOffers') },
  { name: 'PartnerStack',          cat: 'network', note: { th: 'B2B SaaS', en: 'B2B SaaS', zh: 'B2B SaaS' }, url: find('PartnerStack') },
  { name: 'Partnerize',            cat: 'network', note: { th: 'enterprise', en: 'Enterprise', zh: '企业级' }, url: find('Partnerize') },
  { name: 'affiliaXe',             cat: 'network', note: { th: 'global CPA', en: 'Global CPA', zh: '全球 CPA' }, url: find('affiliaXe') },
  { name: 'GiddyUp',               cat: 'network', note: { th: 'DTC products', en: 'DTC products', zh: 'DTC 产品' }, url: find('GiddyUp partner') },
  { name: 'Refersion Marketplace', cat: 'network', note: { th: 'แบรนด์ DTC', en: 'DTC brands', zh: 'DTC 品牌' }, url: find('Refersion Marketplace') },
  { name: 'Bounty',                cat: 'network', note: { th: 'creator deals', en: 'Creator deals', zh: '创作者合作' }, url: find('Bounty affiliate') },

  // 🚀 การตลาด / SaaS (คอม recurring สูง)
  { name: 'Semrush',               cat: 'saas', note: { th: '$200/การขาย', en: '$200 per sale', zh: '每单 $200' }, url: find('Semrush'), hot: true },
  { name: 'HubSpot',               cat: 'saas', note: { th: 'คอมสูง 30% recurring', en: 'High 30% recurring', zh: '30% 经常性高佣' }, url: find('HubSpot') },
  { name: 'ClickFunnels',          cat: 'saas', note: { th: '30% recurring', en: '30% recurring', zh: '30% 经常性' }, url: find('ClickFunnels') },
  { name: 'Leadpages',             cat: 'saas', note: { th: '50% recurring', en: '50% recurring', zh: '50% 经常性' }, url: find('Leadpages') },
  { name: 'Instapage',             cat: 'saas', note: { th: 'landing page', en: 'Landing pages', zh: '落地页' }, url: find('Instapage') },
  { name: 'Constant Contact',      cat: 'saas', note: { th: 'email marketing', en: 'Email marketing', zh: '邮件营销' }, url: find('Constant Contact') },
  { name: 'AWeber',                cat: 'saas', note: { th: 'email 30% recurring', en: 'Email, 30% recurring', zh: '邮件，30% 经常性' }, url: find('AWeber') },
  { name: 'Mailchimp',             cat: 'saas', note: { th: 'email/CRM', en: 'Email / CRM', zh: '邮件 / CRM' }, url: find('Mailchimp') },
  { name: 'Moosend',               cat: 'saas', note: { th: 'email automation', en: 'Email automation', zh: '邮件自动化' }, url: find('Moosend') },
  { name: 'Kit (ConvertKit)',      cat: 'saas', note: { th: 'creator email', en: 'Creator email', zh: '创作者邮件' }, url: find('Kit ConvertKit') },
  { name: 'Grammarly',             cat: 'saas', note: { th: 'เขียนภาษาอังกฤษ', en: 'English writing', zh: '英语写作' }, url: find('Grammarly') },
  { name: 'Adobe',                 cat: 'saas', note: { th: 'Creative Cloud 85%', en: 'Creative Cloud 85%', zh: 'Creative Cloud 85%' }, url: find('Adobe') },
  { name: 'Wordable',              cat: 'saas', note: { th: 'content workflow', en: 'Content workflow', zh: '内容工作流' }, url: find('Wordable') },
  { name: 'Databox',               cat: 'saas', note: { th: 'analytics', en: 'Analytics', zh: '数据分析' }, url: find('Databox') },
  { name: 'CXL',                   cat: 'saas', note: { th: 'คอร์สการตลาด', en: 'Marketing courses', zh: '营销课程' }, url: find('CXL') },
  { name: 'LiveRecover',           cat: 'saas', note: { th: 'cart recovery', en: 'Cart recovery', zh: '购物车挽回' }, url: find('LiveRecover') },

  // 🌐 เว็บโฮสติ้ง / Dev (คอมต่อการสมัครสูง)
  { name: 'Bluehost',              cat: 'hosting', note: { th: '$65+/การสมัคร', en: '$65+ per signup', zh: '每次注册 $65+' }, url: find('Bluehost'), hot: true },
  { name: 'Hostinger',             cat: 'hosting', note: { th: '60%+ คอม', en: '60%+ commission', zh: '60%+ 佣金' }, url: find('Hostinger') },
  { name: 'Kinsta',                cat: 'hosting', note: { th: '$500 + recurring', en: '$500 + recurring', zh: '$500 + 经常性' }, url: find('Kinsta') },
  { name: 'WP Engine',             cat: 'hosting', note: { th: '$200/การขาย', en: '$200 per sale', zh: '每单 $200' }, url: find('WP Engine') },
  { name: 'Liquid Web',            cat: 'hosting', note: { th: 'สูงสุด $7,000', en: 'Up to $7,000', zh: '最高 $7,000' }, url: find('Liquid Web') },
  { name: 'Elementor',             cat: 'hosting', note: { th: 'WordPress builder 50%', en: 'WordPress builder 50%', zh: 'WordPress 建站 50%' }, url: find('Elementor') },
  { name: 'NordVPN',               cat: 'hosting', note: { th: 'VPN 40–100%', en: 'VPN 40–100%', zh: 'VPN 40–100%' }, url: find('NordVPN'), hot: true },

  // 🎓 คอร์ส / บริการ
  { name: 'Teachable',             cat: 'edu', note: { th: '30% recurring', en: '30% recurring', zh: '30% 经常性' }, url: find('Teachable') },
  { name: 'Skillshare',            cat: 'edu', note: { th: '$7/สมาชิกใหม่', en: '$7 per new member', zh: '每位新会员 $7' }, url: find('Skillshare') },
  { name: 'Fiverr',                cat: 'edu', note: { th: 'ฟรีแลนซ์ CPA สูง', en: 'Freelance, high CPA', zh: '自由职业，高 CPA' }, url: find('Fiverr') },
  { name: 'MarketerHire',          cat: 'edu', note: { th: 'จ้างนักการตลาด', en: 'Hire marketers', zh: '招聘营销人员' }, url: find('MarketerHire') },
  { name: 'FreshBooks',            cat: 'edu', note: { th: 'บัญชี SME', en: 'SME accounting', zh: '中小企业会计' }, url: find('FreshBooks') },
  { name: 'Shopify',               cat: 'edu', note: { th: 'สร้างร้านค้า $150', en: 'Build a store, $150', zh: '开店，$150' }, url: 'https://www.shopify.com/affiliates', hot: true },
  { name: 'Shopify Collabs',       cat: 'edu', note: { th: 'จับคู่แบรนด์', en: 'Brand matchmaking', zh: '品牌撮合' }, url: find('Shopify Collabs') },
];
