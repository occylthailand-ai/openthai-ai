// ── คลังโปรแกรม Affiliate ─────────────────────────────────────────────────────
// รวมโปรแกรมพันธมิตรที่สมัครได้จริง · จัดหมวด · ปุ่ม "สมัคร" ลิงก์ไปหน้าโปรแกรมโดยตรง
// อ้างอิงรายชื่อ: https://www.shopify.com/th/blog/best-affiliate-programs
// หมายเหตุ: payout ของโปรแกรมต่างชาติเป็นธนาคาร/PayPal — เฉพาะลิงก์ /pay ของเราที่เข้าพร้อมเพย์ตรง

// สมัครผ่านหน้าโปรแกรมโดยตรง (ใช้ search ที่เชื่อถือได้ ไม่พาไปลิงก์ที่อาจตาย)
const find = (q) => `https://www.google.com/search?q=${encodeURIComponent(q + ' affiliate program สมัคร')}`;

// หมวดหมู่
export const CATEGORIES = [
  { id: 'thai',     label: '🇹🇭 ไทย / Social Commerce', note: 'ขายของได้เลย ฐานลูกค้าไทย' },
  { id: 'ecom',     label: '🛒 อีคอมเมิร์ซโลก',          note: 'สินค้าทั่วไป คอมต่อยอดขาย' },
  { id: 'network',  label: '🔗 เครือข่าย Affiliate',     note: 'สมัครทีเดียว ได้หลายแบรนด์' },
  { id: 'saas',     label: '🚀 การตลาด / SaaS',          note: 'คอมสูง recurring รายเดือน' },
  { id: 'hosting',  label: '🌐 เว็บโฮสติ้ง / Dev',       note: 'คอมต่อการสมัคร $65–500' },
  { id: 'edu',      label: '🎓 คอร์ส / บริการ',          note: 'สอน/ฟรีแลนซ์/เครื่องมือ' },
];

// โปรแกรม — { name, cat, note, url, hot? }
export const PROGRAMS = [
  // 🇹🇭 ไทย / Social Commerce (เข้าถึงลูกค้าไทยทันที)
  { name: 'TikTok Shop Affiliate', cat: 'thai', note: 'คอมจากคลิปติดตะกร้า', url: 'https://affiliate.tiktok.com/', hot: true },
  { name: 'Shopee Affiliate',      cat: 'thai', note: 'คอมทุกออเดอร์ผ่านลิงก์', url: 'https://affiliate.shopee.co.th/', hot: true },
  { name: 'Lazada Affiliate',      cat: 'thai', note: 'LazAffiliates คอม %', url: 'https://www.lazada.co.th/wow/gcp/route/lazada/laz-affiliate', hot: true },
  { name: 'Facebook / Meta',       cat: 'thai', note: 'Branded content + reels', url: find('Facebook Meta creator monetization') },
  { name: 'Instagram',             cat: 'thai', note: 'Affiliate + branded content', url: find('Instagram affiliate creator') },
  { name: 'LINE Shopping',         cat: 'thai', note: 'แชร์สินค้ารับคอม', url: find('LINE Shopping affiliate') },
  { name: 'YouTube Shopping',      cat: 'thai', note: 'ติดสินค้าในวิดีโอ', url: find('YouTube Shopping affiliate') },

  // 🛒 อีคอมเมิร์ซโลก
  { name: 'Amazon Associates',     cat: 'ecom', note: 'สินค้าล้านรายการ', url: 'https://affiliate-program.amazon.com/', hot: true },
  { name: 'eBay Partner Network',  cat: 'ecom', note: 'คอมจากยอดขาย eBay', url: 'https://partnernetwork.ebay.com/' },
  { name: 'Etsy',                  cat: 'ecom', note: 'สินค้าแฮนด์เมด', url: find('Etsy') },
  { name: 'Target',                cat: 'ecom', note: 'รีเทลใหญ่ US', url: find('Target') },
  { name: 'NET-A-PORTER',          cat: 'ecom', note: 'แฟชั่นลักชัวรี', url: find('NET-A-PORTER') },
  { name: 'New Balance',           cat: 'ecom', note: 'รองเท้า/กีฬา', url: find('New Balance') },
  { name: 'Rakuten',               cat: 'ecom', note: 'เครือข่าย + cashback', url: 'https://rakutenadvertising.com/' },
  { name: 'Ollie',                 cat: 'ecom', note: 'อาหารสุนัข subscription', url: find('Ollie pet food') },

  // 🔗 เครือข่าย Affiliate (สมัครทีเดียว ได้หลายแบรนด์)
  { name: 'ShareASale',            cat: 'network', note: 'พันแบรนด์ในที่เดียว', url: 'https://www.shareasale.com/', hot: true },
  { name: 'CJ (Commission Junction)', cat: 'network', note: 'เครือข่ายระดับโลก', url: 'https://www.cj.com/' },
  { name: 'Awin',                  cat: 'network', note: '25,000+ แบรนด์', url: 'https://www.awin.com/' },
  { name: 'Impact',                cat: 'network', note: 'partnership platform', url: 'https://impact.com/' },
  { name: 'ClickBank',             cat: 'network', note: 'สินค้าดิจิทัลคอมสูง', url: 'https://www.clickbank.com/' },
  { name: 'FlexOffers',            cat: 'network', note: '12,000+ โปรแกรม', url: find('FlexOffers') },
  { name: 'PartnerStack',          cat: 'network', note: 'B2B SaaS', url: find('PartnerStack') },
  { name: 'Partnerize',            cat: 'network', note: 'enterprise', url: find('Partnerize') },
  { name: 'affiliaXe',             cat: 'network', note: 'global CPA', url: find('affiliaXe') },
  { name: 'GiddyUp',               cat: 'network', note: 'DTC products', url: find('GiddyUp partner') },
  { name: 'Refersion Marketplace', cat: 'network', note: 'แบรนด์ DTC', url: find('Refersion Marketplace') },
  { name: 'Bounty',                cat: 'network', note: 'creator deals', url: find('Bounty affiliate') },

  // 🚀 การตลาด / SaaS (คอม recurring สูง)
  { name: 'Semrush',               cat: 'saas', note: '$200/การขาย', url: find('Semrush'), hot: true },
  { name: 'HubSpot',               cat: 'saas', note: 'คอมสูง 30% recurring', url: find('HubSpot') },
  { name: 'ClickFunnels',          cat: 'saas', note: '30% recurring', url: find('ClickFunnels') },
  { name: 'Leadpages',             cat: 'saas', note: '50% recurring', url: find('Leadpages') },
  { name: 'Instapage',             cat: 'saas', note: 'landing page', url: find('Instapage') },
  { name: 'Constant Contact',      cat: 'saas', note: 'email marketing', url: find('Constant Contact') },
  { name: 'AWeber',                cat: 'saas', note: 'email 30% recurring', url: find('AWeber') },
  { name: 'Mailchimp',             cat: 'saas', note: 'email/CRM', url: find('Mailchimp') },
  { name: 'Moosend',               cat: 'saas', note: 'email automation', url: find('Moosend') },
  { name: 'Kit (ConvertKit)',      cat: 'saas', note: 'creator email', url: find('Kit ConvertKit') },
  { name: 'Grammarly',             cat: 'saas', note: 'เขียนภาษาอังกฤษ', url: find('Grammarly') },
  { name: 'Adobe',                 cat: 'saas', note: 'Creative Cloud 85%', url: find('Adobe') },
  { name: 'Wordable',              cat: 'saas', note: 'content workflow', url: find('Wordable') },
  { name: 'Databox',               cat: 'saas', note: 'analytics', url: find('Databox') },
  { name: 'CXL',                   cat: 'saas', note: 'คอร์สการตลาด', url: find('CXL') },
  { name: 'LiveRecover',           cat: 'saas', note: 'cart recovery', url: find('LiveRecover') },

  // 🌐 เว็บโฮสติ้ง / Dev (คอมต่อการสมัครสูง)
  { name: 'Bluehost',              cat: 'hosting', note: '$65+/การสมัคร', url: find('Bluehost'), hot: true },
  { name: 'Hostinger',             cat: 'hosting', note: '60%+ คอม', url: find('Hostinger') },
  { name: 'Kinsta',                cat: 'hosting', note: '$500 + recurring', url: find('Kinsta') },
  { name: 'WP Engine',             cat: 'hosting', note: '$200/การขาย', url: find('WP Engine') },
  { name: 'Liquid Web',            cat: 'hosting', note: 'สูงสุด $7,000', url: find('Liquid Web') },
  { name: 'Elementor',             cat: 'hosting', note: 'WordPress builder 50%', url: find('Elementor') },
  { name: 'NordVPN',               cat: 'hosting', note: 'VPN 40–100%', url: find('NordVPN'), hot: true },

  // 🎓 คอร์ส / บริการ
  { name: 'Teachable',             cat: 'edu', note: '30% recurring', url: find('Teachable') },
  { name: 'Skillshare',            cat: 'edu', note: '$7/สมาชิกใหม่', url: find('Skillshare') },
  { name: 'Fiverr',                cat: 'edu', note: 'ฟรีแลนซ์ CPA สูง', url: find('Fiverr') },
  { name: 'MarketerHire',          cat: 'edu', note: 'จ้างนักการตลาด', url: find('MarketerHire') },
  { name: 'FreshBooks',            cat: 'edu', note: 'บัญชี SME', url: find('FreshBooks') },
  { name: 'Shopify',               cat: 'edu', note: 'สร้างร้านค้า $150', url: 'https://www.shopify.com/affiliates', hot: true },
  { name: 'Shopify Collabs',       cat: 'edu', note: 'จับคู่แบรนด์', url: find('Shopify Collabs') },
];
