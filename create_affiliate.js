const fs = require('fs');
const dir = 'C:/Openthai.ai/all-platform-files';

// ========================================
// AFFILIATE PROGRAMS - ALL PLATFORMS
// ========================================

const affiliates = [
  // === ASIA - THAILAND ===
  {id:'aff-tiktok-th',name:'TikTok Affiliate TH',color:'#FE2C55',commission:'5-20%',cookie:'7 วัน',minPayout:'฿100',payout:'PromptPay/Bank TH',
   signup:'seller-th.tiktok.com → Affiliate Center',
   steps:['สมัคร TikTok Account + มี Follower 1,000+','เข้า Creator Center → Affiliate','เลือกสินค้าจาก Marketplace ที่ต้องการโปรโมท','สร้างวิดีโอรีวิวสินค้า + Tag สินค้า Affiliate','โพสต์วิดีโอ → ลูกค้ากดซื้อผ่านลิงก์ → ได้ Commission','ดู Dashboard รายได้ → ถอนเงินเข้า PromptPay/ธนาคาร']},
  {id:'aff-shopee-th',name:'Shopee Affiliate TH',color:'#EE4D2D',commission:'1-16%',cookie:'7 วัน',minPayout:'฿100',payout:'Shopee Wallet → Bank TH',
   signup:'affiliate.shopee.co.th',
   steps:['สมัครที่ affiliate.shopee.co.th','ยืนยัน OTP + บัญชีธนาคาร','เลือกสินค้าจาก Shopee → สร้าง Affiliate Link','แชร์ลิงก์บน TikTok/FB/IG/LINE/YouTube','ลูกค้ากดซื้อผ่านลิงก์ → ได้ Commission 1-16%','ดู Dashboard → ถอนเงินเข้า Shopee Wallet → Bank']},
  {id:'aff-lazada-th',name:'Lazada Affiliate TH',color:'#0F146D',commission:'1-12%',cookie:'7 วัน',minPayout:'฿100',payout:'Bank TH',
   signup:'lazada.com/affiliate',
   steps:['สมัครที่ lazada.com/affiliate','ยืนยันตัวตน + บัญชีธนาคาร','เลือกสินค้า → สร้าง Deep Link/Banner','แชร์ลิงก์บน Social Media','ลูกค้ากดซื้อ → Commission 1-12%','ถอนเงินเข้าธนาคารไทย']},

  // === GLOBAL MAJOR ===
  {id:'aff-amazon',name:'Amazon Associates',color:'#FF9900',commission:'1-10%',cookie:'24 ชม.',minPayout:'$10',payout:'Bank/Payoneer/Gift Card',
   signup:'affiliate-program.amazon.com',
   steps:['สมัครที่ affiliate-program.amazon.com','กรอกข้อมูลเว็บ/Social ที่จะโปรโมท','ยืนยันตัวตน + วิธีรับเงิน','เลือกสินค้า → สร้าง Affiliate Link','แชร์ลิงก์/รีวิว บน Blog/YouTube/Social','ลูกค้ากดซื้อใน 24 ชม. → Commission 1-10%','รับเงินทุกเดือน Bank/Payoneer']},
  {id:'aff-aliexpress',name:'AliExpress Affiliate',color:'#FF4747',commission:'3-9%',cookie:'3 วัน',minPayout:'$16',payout:'Bank/Payoneer',
   signup:'portals.aliexpress.com',
   steps:['สมัครที่ portals.aliexpress.com','ยืนยันเว็บ/Social','เลือกสินค้า → สร้าง Deep Link','แชร์ลิงก์บน Blog/Social/YouTube','ลูกค้ากดซื้อ → Commission 3-9%','รับเงิน Bank/Payoneer']},
  {id:'aff-temu',name:'TEMU Affiliate',color:'#FB7701',commission:'$5-20/referral',cookie:'30 วัน',minPayout:'$20',payout:'PayPal/Bank',
   signup:'temu.com/affiliate',
   steps:['สมัครที่ temu.com/affiliate','ได้รับ Referral Link','แชร์ลิงก์ → ลูกค้าใหม่สมัคร+ซื้อ','ได้ $5-20 ต่อ Referral ใหม่','รับเงิน PayPal/Bank']},
  {id:'aff-ebay',name:'eBay Partner Network',color:'#E53238',commission:'1-6%',cookie:'24 ชม.',minPayout:'$10',payout:'PayPal/Bank',
   signup:'partnernetwork.ebay.com',
   steps:['สมัครที่ partnernetwork.ebay.com','ยืนยันเว็บ/Social','สร้าง Affiliate Link สินค้า eBay','แชร์ลิงก์ → ลูกค้ากดซื้อ','Commission 1-6%','รับเงิน PayPal']},
  {id:'aff-etsy',name:'Etsy Affiliate',color:'#F1641E',commission:'2-8%',cookie:'30 วัน',minPayout:'$20',payout:'PayPal/Bank',
   signup:'etsy.com/affiliates (via Awin)',
   steps:['สมัครผ่าน Awin → Etsy Affiliate Program','ยืนยันเว็บ/Social','เลือกสินค้า Handmade → สร้าง Link','แชร์ลิงก์ Blog/Pinterest/YouTube','Commission 2-8% Cookie 30 วัน','รับเงิน PayPal/Bank']},

  // === CHINA ===
  {id:'aff-taobao',name:'Taobao Alliance (淘宝联盟)',color:'#FF5000',commission:'1-50%',cookie:'15 วัน',minPayout:'¥10',payout:'Alipay',
   signup:'pub.alimama.com (阿里妈妈)',
   steps:['สมัครที่ pub.alimama.com','ยืนยัน Alipay + ตัวตน','เลือกสินค้า Taobao/Tmall → สร้าง Link','แชร์ลิงก์บน WeChat/Weibo/Douyin/XHS','ลูกค้ากดซื้อ → Commission 1-50%','รับเงิน Alipay']},
  {id:'aff-jd',name:'JD Alliance (京东联盟)',color:'#E1251B',commission:'1-30%',cookie:'15 วัน',minPayout:'¥10',payout:'Bank CN',
   signup:'union.jd.com',
   steps:['สมัครที่ union.jd.com','ยืนยัน Real-name + Bank','เลือกสินค้า JD → สร้าง Link','แชร์บน WeChat/Weibo/Content Platform','Commission 1-30%','รับเงิน Bank จีน']},
  {id:'aff-pinduoduo',name:'Duoduo Jinbao (多多进宝)',color:'#F14E4E',commission:'10-50%',cookie:'ทันที',minPayout:'¥0.1',payout:'WeChat Pay',
   signup:'jinbao.pinduoduo.com',
   steps:['สมัครที่ jinbao.pinduoduo.com','ยืนยัน WeChat + เบอร์จีน','เลือกสินค้า PDD → สร้าง Group Buying Link','แชร์ลิงก์ใน WeChat Group','Commission สูงถึง 50%','รับเงิน WeChat Pay ทันที']},

  // === KOREA ===
  {id:'aff-coupang',name:'Coupang Partners',color:'#E01E5A',commission:'3-7%',cookie:'24 ชม.',minPayout:'₩10,000',payout:'Bank KR',
   signup:'partners.coupang.com',
   steps:['สมัครที่ partners.coupang.com','ยืนยัน Blog/เว็บ/Social','สร้าง Affiliate Link สินค้า Coupang','แชร์บน Blog Naver/YouTube/Social','Commission 3-7%','รับเงิน Bank เกาหลี']},

  // === INDIA ===
  {id:'aff-flipkart',name:'Flipkart Affiliate',color:'#2874F0',commission:'1-15%',cookie:'24 ชม.',minPayout:'₹500',payout:'Bank IN/UPI',
   signup:'affiliate.flipkart.com',
   steps:['สมัครที่ affiliate.flipkart.com','ยืนยัน PAN + Bank','สร้าง Link สินค้า Flipkart','แชร์บน Blog/YouTube/WhatsApp','Commission 1-15%','รับเงิน Bank/UPI']},

  // === EUROPE ===
  {id:'aff-zalando',name:'Zalando Partner',color:'#FF6900',commission:'5-12%',cookie:'30 วัน',minPayout:'€25',payout:'Bank EU',
   signup:'zalando.com/partner-program (via Awin)',
   steps:['สมัครผ่าน Awin → Zalando','ยืนยัน Blog/Social EU','สร้าง Link สินค้า Fashion','แชร์บน Blog/IG/Pinterest','Commission 5-12%','รับเงิน Bank EU']},
  {id:'aff-bol',name:'Bol.com Partner',color:'#0000A4',commission:'2-8%',cookie:'7 วัน',minPayout:'€10',payout:'Bank NL/BE',
   signup:'partner.bol.com',
   steps:['สมัครที่ partner.bol.com','ยืนยัน NL/BE เว็บ','สร้าง Link สินค้า Bol','แชร์บน Blog/Social','Commission 2-8%','รับเงิน Bank']},
  {id:'aff-allegro',name:'Allegro Affiliate',color:'#FF5A00',commission:'1-5%',cookie:'30 วัน',minPayout:'PLN 50',payout:'Bank PL',
   signup:'allegro.pl/affiliate',
   steps:['สมัคร Allegro Affiliate','ยืนยัน','สร้าง Link','แชร์','Commission 1-5%','รับเงิน Bank PL']},

  // === LATAM ===
  {id:'aff-mercadolibre',name:'MercadoLibre Affiliate',color:'#FFE600',commission:'1-12%',cookie:'7 วัน',minPayout:'$10',payout:'MercadoPago',
   signup:'mercadolibre.com/afiliados',
   steps:['สมัครที่ mercadolibre.com/afiliados','ยืนยัน','สร้าง Link สินค้า MELI','แชร์บน Social/Blog','Commission 1-12%','รับเงิน MercadoPago']},

  // === MIDDLE EAST ===
  {id:'aff-noon',name:'Noon Affiliate',color:'#FEEE00',commission:'3-10%',cookie:'3 วัน',minPayout:'AED 50',payout:'Bank AE/SA',
   signup:'noon.com/affiliate',
   steps:['สมัคร Noon Affiliate','ยืนยัน Blog/Social','สร้าง Link สินค้า Noon','แชร์','Commission 3-10%','รับเงิน Bank AE/SA']},

  // === AFRICA ===
  {id:'aff-jumia',name:'Jumia KOL Affiliate',color:'#F68B1E',commission:'2-11%',cookie:'30 วัน',minPayout:'$20',payout:'Bank/Mobile Money',
   signup:'jumia.com/affiliate (via Awin)',
   steps:['สมัคร Jumia Affiliate ผ่าน Awin','ยืนยัน','สร้าง Link สินค้า Jumia','แชร์บน Social/WhatsApp/Blog','Commission 2-11%','รับเงิน Bank/Mobile Money']},

  // === GLOBAL AFFILIATE NETWORKS ===
  {id:'aff-awin',name:'Awin',color:'#2BC4C1',commission:'varies',cookie:'varies',minPayout:'$20',payout:'Bank/PayPal',
   signup:'awin.com — Affiliate Network ใหญ่อันดับ 1 ยุโรป เชื่อม 21,000+ แบรนด์',
   steps:['สมัครที่ awin.com','ยืนยัน Blog/เว็บ/Social','สมัคร Program ของแบรนด์ที่ต้องการ','สร้าง Link/Banner','แชร์ → ลูกค้าซื้อ → Commission','รับเงิน Bank/PayPal']},
  {id:'aff-cj',name:'CJ Affiliate',color:'#004E97',commission:'varies',cookie:'varies',minPayout:'$50',payout:'Bank/Payoneer',
   signup:'cj.com — Affiliate Network ใหญ่อันดับ 1 สหรัฐฯ เชื่อม 3,800+ แบรนด์',
   steps:['สมัครที่ cj.com','ยืนยัน','สมัคร Advertiser Program','สร้าง Link','แชร์','รับเงิน Payoneer/Bank']},
  {id:'aff-impact',name:'Impact',color:'#0055FF',commission:'varies',cookie:'varies',minPayout:'$25',payout:'Bank/PayPal',
   signup:'impact.com — Partnership Platform (Shopify/Uber/Airbnb/Canva)',
   steps:['สมัครที่ impact.com','ยืนยัน','สมัคร Brand Partnership','สร้าง Link','แชร์','รับเงิน']},
  {id:'aff-shareasale',name:'ShareASale',color:'#3CA14C',commission:'varies',cookie:'varies',minPayout:'$50',payout:'Bank/PayPal',
   signup:'shareasale.com — Affiliate Network 4,800+ Merchants',
   steps:['สมัครที่ shareasale.com','ยืนยัน','เลือก Merchant','สร้าง Link','แชร์','รับเงิน']},
  {id:'aff-rakuten',name:'Rakuten Advertising',color:'#BF0000',commission:'varies',cookie:'varies',minPayout:'$50',payout:'Bank',
   signup:'rakutenadvertising.com — Network ญี่ปุ่น+Global',
   steps:['สมัครที่ rakutenadvertising.com','ยืนยัน','เลือก Advertiser','สร้าง Link','แชร์','รับเงิน']},

  // === E-COMMERCE PLATFORM AFFILIATE ===
  {id:'aff-shopify',name:'Shopify Affiliate',color:'#7AB55C',commission:'$150/referral',cookie:'30 วัน',minPayout:'$10',payout:'PayPal/Bank',
   signup:'shopify.com/affiliates',
   steps:['สมัครที่ shopify.com/affiliates','ยืนยัน Blog/YouTube/เว็บ','ได้ Referral Link','แนะนำคนสมัคร Shopify','ได้ $150 ต่อ Referral ที่ชำระเงิน','รับเงิน PayPal']},
  {id:'aff-wix',name:'Wix Affiliate',color:'#0C6EFC',commission:'$100/referral',cookie:'30 วัน',minPayout:'$100',payout:'Bank/PayPal',
   signup:'wix.com/affiliate',
   steps:['สมัครที่ wix.com/affiliate','ได้ Referral Link','แนะนำคนสมัคร Wix Premium','$100 ต่อ Referral','รับเงิน']},

  // === SOCIAL MEDIA AFFILIATE ===
  {id:'aff-youtube',name:'YouTube Shopping Affiliate',color:'#FF0000',commission:'5-50%',cookie:'varies',minPayout:'$100',payout:'AdSense/Bank',
   signup:'YouTube Studio → Shopping → Affiliate',
   steps:['ต้องมี YPP (1K Subs + 4K Watch Hours)','YouTube Studio → Shopping → Affiliate','เลือกสินค้าจาก Brand Partner','Tag สินค้าในวิดีโอ/Shorts','ลูกค้ากดซื้อ → Commission 5-50%','รับเงินผ่าน AdSense']},
  {id:'aff-instagram',name:'Instagram Affiliate',color:'#E1306C',commission:'5-30%',cookie:'varies',minPayout:'$100',payout:'Bank',
   signup:'Instagram → Professional Dashboard → Affiliate',
   steps:['Switch to Creator/Business Account','Professional Dashboard → Affiliate','เลือกสินค้าจาก Brand','Tag สินค้าใน Post/Story/Reel','ลูกค้ากดซื้อ → Commission','รับเงิน Bank']},
  {id:'aff-facebook',name:'Facebook Affiliate',color:'#1877F2',commission:'varies',cookie:'varies',minPayout:'$100',payout:'Bank',
   signup:'facebook.com → Monetization → Brand Collabs',
   steps:['มี Facebook Page + Followers','เข้า Brand Collabs Manager','เชื่อม Affiliate Network (Awin/CJ/Impact)','โพสต์ Content + Affiliate Link','ลูกค้ากดซื้อ → Commission','รับเงิน']},
];

let created = 0;

// Create main Affiliate Hub page
let hubHtml = `<!-- Openthai.ai - Global Affiliate Hub -->
<html><head><meta charset="utf-8"><style>
body{font-family:'Sarabun',sans-serif;max-width:1000px;margin:0 auto;padding:20px;background:#f8f9fa}
h1{text-align:center;color:#FF6B00;font-size:2.5rem}
.aff-card{background:#fff;border-radius:12px;padding:16px;margin:12px 0;border-left:4px solid #ddd;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.aff-badge{background:#FF6B00;color:#fff;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:bold}
.aff-link{display:inline-block;padding:8px 16px;border-radius:20px;text-decoration:none;font-weight:bold;font-size:13px}
.steps{font-size:13px;color:#555;margin-top:8px}
.steps ol{padding-left:20px;margin:4px 0}
</style></head><body>
<h1>🤖 Openthai.ai — Affiliate Hub</h1>
<p style="text-align:center;color:#666;font-size:1.1rem;">${affiliates.length} Affiliate Programs ทุกแพลตฟอร์ม | คลิกเดียวเริ่มขายได้เลย</p>
<p style="text-align:center;background:#FF6B00;color:#fff;padding:12px;border-radius:12px;font-size:1.1rem;">🔥 สมัคร Affiliate → แชร์ลิงก์ → ลูกค้าซื้อ → ได้ Commission ทันที | ไม่ต้องมีสินค้าเอง!</p>
`;

affiliates.forEach((a, idx) => {
  // Individual affiliate page
  const pageHtml = `<!-- Openthai.ai - ${a.name} Affiliate -->
<section id="${a.id}" style="max-width:900px;margin:2rem auto;padding:2rem;font-family:'Sarabun',sans-serif;background:#f8f9fa;border-radius:16px;">
<h2 style="text-align:center;color:${a.color};font-size:2rem;">💰 ${a.name}</h2>
<p style="text-align:center;color:#666;">${a.signup}</p>
<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:16px 0;">
  <span style="background:${a.color};color:#fff;padding:8px 16px;border-radius:20px;font-weight:bold;">Commission: ${a.commission}</span>
  <span style="background:#333;color:#fff;padding:8px 16px;border-radius:20px;">Cookie: ${a.cookie}</span>
  <span style="background:#4CAF50;color:#fff;padding:8px 16px;border-radius:20px;">Min Payout: ${a.minPayout}</span>
  <span style="background:#2196F3;color:#fff;padding:8px 16px;border-radius:20px;">💳 ${a.payout}</span>
</div>
<div style="background:#fff;padding:1.5rem;border-radius:12px;border-left:4px solid ${a.color};margin-top:16px;">
<h3>ขั้นตอนสมัครและเริ่มรับเงิน:</h3>
<ol>${a.steps.map(s => '<li style="padding:4px 0;">'+s+'</li>').join('\n')}</ol>
</div>
<div style="text-align:center;margin-top:1.5rem;padding:1rem;background:${a.color};border-radius:12px;">
<p style="color:#fff;margin:0;font-size:1.1rem;">🤖 Openthai.ai ช่วยสร้าง Content Affiliate ทุกภาษา ทุกแพลตฟอร์ม</p>
<a href="/generate" style="display:inline-block;margin-top:8px;padding:10px 24px;background:#fff;color:${a.color};border-radius:20px;text-decoration:none;font-weight:bold;">สร้าง Affiliate Content →</a>
</div>
</section>`;
  fs.writeFileSync(dir + '/' + a.id + '-affiliate.html', pageHtml);

  // Add to hub
  hubHtml += `
<div class="aff-card" style="border-left-color:${a.color};">
  <div style="flex:1;min-width:200px;">
    <strong style="font-size:1.1rem;color:${a.color};">${idx+1}. ${a.name}</strong>
    <span class="aff-badge" style="background:${a.color};margin-left:8px;">${a.commission}</span>
    <br><small style="color:#888;">Cookie: ${a.cookie} | Min: ${a.minPayout} | 💳 ${a.payout}</small>
    <div class="steps"><ol>${a.steps.map(s => '<li>'+s+'</li>').join('')}</ol></div>
  </div>
  <a href="${a.id}-affiliate.html" class="aff-link" style="background:${a.color};color:#fff;">สมัครเลย →</a>
</div>`;

  created++;
  console.log(created + '. ' + a.name + ' (' + a.commission + ') ✓');
});

hubHtml += `
<div style="text-align:center;margin-top:2rem;padding:2rem;background:linear-gradient(135deg,#FF6B00,#FF0066);border-radius:16px;">
<h2 style="color:#fff;margin:0;">🤖 Openthai.ai Affiliate Hub</h2>
<p style="color:#fff;font-size:1.2rem;">${affiliates.length} Programs | ทุกแพลตฟอร์ม | คลิกเดียวเริ่มขาย</p>
<p style="color:#fff;">สมัคร Affiliate ฟรี → แชร์ลิงก์ → ลูกค้าซื้อ → ได้ Commission ทันที</p>
<a href="/generate" style="display:inline-block;padding:14px 32px;background:#fff;color:#FF6B00;border-radius:24px;text-decoration:none;font-weight:bold;font-size:1.1rem;">เริ่มสร้าง Affiliate Content ทุกแพลตฟอร์ม →</a>
</div>
</body></html>`;

fs.writeFileSync(dir + '/affiliate-hub.html', hubHtml);
console.log('\n' + (created+1) + '. Affiliate Hub (รวมทุก Program) ✓');

console.log('\n=== AFFILIATE PROGRAMS DONE ===');
console.log('Programs: ' + created);
console.log('Hub page: affiliate-hub.html');
