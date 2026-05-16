const fs = require('fs');
const dir = 'C:/OPENTHAI AI/all-platform-files';

const platforms = [
  // === AFRICA MARKETPLACES ===
  {id:'jumia',name:'Jumia',color:'#F68B1E',steps:62,sections:10,users:'30M+ Buyers',desc:'Marketplace อันดับ 1 แอฟริกา (Amazon of Africa) 11 ประเทศ',
   phases:['สมัคร Jumia Seller (6)','ยืนยันตัวตนธุรกิจ (6)','ตั้งค่าร้านค้า (5)','เพิ่มสินค้า [AI] (8)','ตั้งค่าจัดส่ง Jumia Logistics (5)','โปรโมชั่น Jumia Ads (5)','รับออร์เดอร์ (5)','ชำระเงิน JumiaPay/COD (5)','จัดส่ง Drop-off/Pickup (5)','หลังการขาย (5)']},

  {id:'takealot',name:'Takealot',color:'#0B79BF',steps:58,sections:9,users:'7M+ Buyers',desc:'Marketplace อันดับ 1 แอฟริกาใต้ (Amazon of SA)',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ SA (6)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','Takealot Fulfillment (5)','โปรโมชั่น CPC Ads (4)','รับออร์เดอร์ (5)','ชำระเงิน ZAR (5)','หลังการขาย (5)']},

  {id:'kilimall',name:'Kilimall',color:'#E53935',steps:52,sections:8,users:'10M+ Buyers',desc:'E-commerce Platform เคนยา/อูกันดา/ไนจีเรีย',
   phases:['สมัคร Seller (6)','ยืนยันตัวตน (5)','เพิ่มสินค้า [AI] (8)','ตั้งค่าจัดส่ง (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน M-Pesa/COD (5)','หลังการขาย (4)']},

  {id:'konga',name:'Konga',color:'#ED1C24',steps:55,sections:9,users:'15M+ Buyers',desc:'Marketplace อันดับ 2 ไนจีเรีย',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ (5)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','KongaPay (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','จัดส่ง (5)','หลังการขาย (4)']},

  {id:'bidorbuy',name:'BidOrBuy',color:'#003B71',steps:48,sections:8,users:'5M+ Buyers',desc:'Marketplace + Auction แอฟริกาใต้ (คล้าย eBay)',
   phases:['สมัคร Seller (5)','ยืนยันตัวตน (5)','เพิ่มสินค้า/ประมูล [AI] (7)','ตั้งค่าจัดส่ง (5)','โปรโมชั่น (3)','รับออร์เดอร์ (5)','ชำระเงิน ZAR (4)','หลังการขาย (4)']},

  {id:'tonaton',name:'Tonaton',color:'#00A651',steps:40,sections:7,users:'3M+ Users',desc:'Classifieds อันดับ 1 กานา (คล้าย Kaidee)',
   phases:['สมัคร (5)','ตั้งค่าโปรไฟล์ (4)','ลงประกาศขาย [AI] (7)','โปรโมท (3)','รับออร์เดอร์ Chat (5)','ชำระเงิน Mobile Money (4)','หลังการขาย (3)']},

  {id:'jiji',name:'Jiji',color:'#FFCC00',steps:42,sections:7,users:'15M+ Users',desc:'Classifieds อันดับ 1 ไนจีเรีย + แอฟริกาตะวันตก',
   phases:['สมัคร (5)','ตั้งค่าโปรไฟล์ (4)','ลงประกาศขาย [AI] (7)','โปรโมท TOP/VIP (4)','รับออร์เดอร์ Chat (5)','ชำระเงิน Mobile Money/Transfer (4)','หลังการขาย (3)']},

  {id:'afrikrea',name:'Afrikrea',color:'#E67E22',steps:50,sections:8,users:'5M+ Buyers',desc:'Handmade + Fashion แอฟริกัน (Etsy of Africa)',
   phases:['สมัคร Seller (6)','ตั้งค่าร้าน (5)','เพิ่มสินค้า African Fashion [AI] (8)','Afrikrea SEO [AI] (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน International (5)','หลังการขาย (4)']},

  {id:'masoko',name:'Masoko',color:'#FF6F00',steps:45,sections:7,users:'2M+ Buyers',desc:'E-commerce Platform เคนยา by Safaricom',
   phases:['สมัคร Seller (6)','ยืนยันตัวตน (5)','เพิ่มสินค้า [AI] (7)','ตั้งค่าจัดส่ง (5)','รับออร์เดอร์ (5)','ชำระเงิน M-Pesa (4)','หลังการขาย (3)']},

  {id:'zoompay',name:'ZoomTanzania',color:'#1B5E20',steps:38,sections:6,users:'1M+ Users',desc:'Classifieds + E-commerce แทนซาเนีย',
   phases:['สมัคร (5)','ตั้งค่าโปรไฟล์ (4)','ลงประกาศขาย [AI] (7)','รับออร์เดอร์ (5)','ชำระเงิน Mobile Money (4)','หลังการขาย (3)']},

  {id:'kaymu',name:'Kaymu',color:'#F44336',steps:42,sections:7,users:'5M+ Users',desc:'Marketplace แอฟริกาหลายประเทศ (Jumia Group)',
   phases:['สมัคร Seller (5)','ยืนยันตัวตน (4)','เพิ่มสินค้า [AI] (7)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน COD/Mobile Money (4)','หลังการขาย (3)']},

  {id:'tradedepot',name:'TradeDepot',color:'#2196F3',steps:45,sections:7,users:'B2B Africa',desc:'B2B Marketplace แอฟริกา FMCG Distribution',
   phases:['สมัคร Supplier (6)','ยืนยันธุรกิจ (5)','เพิ่มสินค้า B2B [AI] (7)','ตั้งค่า Distribution (5)','รับออร์เดอร์ B2B (5)','ชำระเงิน B2B (4)','หลังการขาย (3)']},

  {id:'copia',name:'Copia',color:'#4CAF50',steps:40,sections:7,users:'3M+ Buyers',desc:'E-commerce เคนยา เน้นชนบท Agent-based',
   phases:['สมัคร Seller/Agent (5)','ยืนยันตัวตน (4)','เพิ่มสินค้า [AI] (7)','ตั้งค่า Agent Network (5)','รับออร์เดอร์ (5)','ชำระเงิน M-Pesa/COD (4)','หลังการขาย (3)']},

  {id:'superbalist',name:'Superbalist',color:'#000000',steps:48,sections:8,users:'4M+ Buyers',desc:'Fashion Marketplace แอฟริกาใต้ (Takealot Group)',
   phases:['สมัคร Brand Partner (6)','ยืนยันแบรนด์ (5)','เพิ่มสินค้า Fashion [AI] (7)','Superbalist Fulfillment (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน ZAR (4)','หลังการขาย (4)']},

  {id:'souq',name:'Souq',color:'#FF9800',steps:55,sections:9,users:'10M+ Buyers',desc:'Marketplace อันดับ 1 แอฟริกาเหนือ/ตะวันออกกลาง (Amazon)',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ (6)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','Fulfillment by Souq (5)','โปรโมชั่น Ads (4)','รับออร์เดอร์ (5)','ชำระเงิน COD/Card (5)','หลังการขาย (4)']},

  // === AFRICA PAYMENT / SUPER APPS ===
  {id:'mpesa',name:'MPesa',color:'#4CAF50',steps:35,sections:6,users:'50M+ Users',desc:'Mobile Money อันดับ 1 แอฟริกา (Safaricom/Vodafone)',
   phases:['สมัคร M-Pesa Agent/Merchant (6)','ยืนยัน KYC (5)','ตั้งค่า Lipa na M-Pesa (5)','รับชำระเงินจากลูกค้า (5)','โอนเงินและถอนเงิน (4)','Analytics (3)']},

  {id:'flutterwave',name:'Flutterwave',color:'#F5A623',steps:38,sections:6,users:'Pan-Africa Payment',desc:'Payment Gateway อันดับ 1 แอฟริกา รับเงินจาก 150+ ประเทศ',
   phases:['สมัคร Flutterwave Account (5)','ยืนยันธุรกิจ (5)','ตั้งค่า Payment Link/API (6)','เชื่อม E-commerce (5)','รับชำระเงิน Multi-currency (5)','ถอนเงินและ Analytics (4)']},

  {id:'paystack',name:'Paystack',color:'#00C3F7',steps:38,sections:6,users:'NG/GH/ZA Payment',desc:'Payment Gateway ไนจีเรีย/กานา/แอฟริกาใต้ (Stripe of Africa)',
   phases:['สมัคร Paystack Account (5)','ยืนยันธุรกิจ (5)','ตั้งค่า Payment API (6)','เชื่อม E-commerce (5)','รับชำระเงิน NGN/GHS/ZAR (5)','ถอนเงินและ Analytics (4)']},

  // === AFRICA SOCIAL COMMERCE ===
  {id:'whatsappbusiness_africa',name:'WhatsAppAfrica',color:'#25D366',steps:42,sections:7,users:'200M+ Users Africa',desc:'WhatsApp Business สำหรับแอฟริกา (ช่องทางขายหลัก)',
   phases:['สมัคร WhatsApp Business (5)','ตั้งค่า Business Profile (5)','สร้าง Catalog [AI] (7)','Broadcast+Status [AI] (5)','รับออร์เดอร์ Chat (5)','ชำระเงิน M-Pesa/Mobile Money (4)','หลังการขาย (3)']},

  {id:'facebookafrica',name:'FacebookAfrica',color:'#1877F2',steps:45,sections:7,users:'250M+ Users Africa',desc:'Facebook Marketplace + Page สำหรับแอฟริกา',
   phases:['สร้าง Facebook Page ร้านค้า (6)','ตั้งค่า Facebook Shop (6)','เพิ่มสินค้า [AI] (7)','โพสต์ Content [AI] (5)','Facebook Marketplace (5)','รับออร์เดอร์ Messenger (5)','ชำระเงิน Mobile Money/COD (4)']},

  {id:'instagramafrica',name:'InstagramAfrica',color:'#E1306C',steps:42,sections:7,users:'60M+ Users Africa',desc:'Instagram Shopping + Reels สำหรับแอฟริกา',
   phases:['สร้าง Business Account (5)','ตั้งค่า Instagram Shop (5)','เพิ่มสินค้า+Tag [AI] (7)','สร้าง Reels+Stories [AI] (6)','Engagement (4)','รับออร์เดอร์ DM (5)','ชำระเงิน (3)']}
];

let created = 0;
let totalSteps = 0;

platforms.forEach(p => {
  // HTML Section
  const html = `<!-- OpenThai AI - ${p.name} Africa Roadmap -->\n<section id="${p.id}-roadmap" style="max-width:900px;margin:2rem auto;padding:2rem;font-family:'Sarabun',sans-serif;background:#f8f9fa;border-radius:16px;">\n<h2 style="text-align:center;color:${p.color};font-size:2rem;">🌍 ${p.name} — ${p.steps} ขั้นตอน</h2>\n<p style="text-align:center;color:#666;">${p.desc} | ${p.users}</p>\n<div style="background:#fff;padding:1.5rem;border-radius:12px;border-left:4px solid ${p.color};margin-top:1rem;">\n<ol>${p.phases.map((ph,i) => `<li style="padding:4px 0;"><strong>ส่วนที่ ${i+1}</strong> — ${ph}</li>`).join('\n')}</ol>\n</div>\n<div style="text-align:center;margin-top:1.5rem;padding:1rem;background:${p.color};border-radius:12px;">\n<p style="color:#fff;margin:0;">🤖 OpenThai AI ช่วยสร้าง Content ได้ทุกภาษา</p>\n<a href="/generate" style="display:inline-block;margin-top:8px;padding:10px 24px;background:#fff;color:${p.color};border-radius:20px;text-decoration:none;font-weight:bold;">สร้าง Content ${p.name} →</a>\n</div>\n</section>`;
  fs.writeFileSync(dir + '/' + p.id + '-roadmap-section.html', html);

  // HTML Guide
  const guide = `<html><head><meta charset="utf-8"><style>body{font-family:Sarabun,sans-serif;max-width:700px;margin:0 auto;padding:20px;line-height:1.6}h1{color:${p.color};border-bottom:3px solid ${p.color}}h3{margin-top:16px}</style></head><body><h1>🌍 ${p.name} Roadmap</h1><p>${p.desc}</p><p><strong>${p.steps} ขั้นตอน | ${p.sections} ส่วน | ${p.users}</strong></p>${p.phases.map((ph,i) => `<h3>ส่วนที่ ${i+1} — ${ph}</h3>`).join('')}<hr><p><em>สร้างโดย OpenThai AI — www.openthaiai.com</em></p></body></html>`;
  fs.writeFileSync(dir + '/OpenThaiAI_' + p.name + '_Roadmap.html', guide);

  created++;
  totalSteps += p.steps;
  console.log(created + '. ' + p.name + ' (' + p.steps + ' steps) ✓');
});

console.log('\n=== AFRICA PLATFORMS DONE ===');
console.log('Platforms: ' + created);
console.log('Total steps: ' + totalSteps);
