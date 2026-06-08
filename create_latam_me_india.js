const fs = require('fs');
const dir = 'C:/Openthai.ai/all-platform-files';

const platforms = [
  // ========================================
  // LATIN AMERICA (20 platforms)
  // ========================================
  {id:'mercadolibre',name:'MercadoLibre',color:'#FFE600',steps:65,sections:10,users:'148M+ Buyers',desc:'Marketplace อันดับ 1 ละตินอเมริกา (Amazon of LATAM) 18 ประเทศ',
   phases:['สมัคร Seller (6)','ยืนยันตัวตน (6)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','Mercado Envios จัดส่ง (5)','MercadoPago ชำระเงิน (5)','โปรโมชั่น Ads (5)','รับออร์เดอร์ (5)','จัดส่ง Fulfillment (5)','หลังการขาย Reputation (5)']},

  {id:'magazineluiza',name:'MagazineLuiza',color:'#0086FF',steps:55,sections:9,users:'40M+ Buyers',desc:'Marketplace อันดับ 2 บราซิล (Magalu)',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ CNPJ (5)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','Magalu Fulfillment (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน BRL (5)','หลังการขาย (4)']},

  {id:'americanas',name:'Americanas',color:'#E50019',steps:52,sections:8,users:'30M+ Buyers',desc:'Marketplace บราซิล (B2W Group)',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ (5)','เพิ่มสินค้า [AI] (8)','ตั้งค่าจัดส่ง (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน (5)','หลังการขาย (4)']},

  {id:'casasbahia',name:'CasasBahia',color:'#0066CC',steps:50,sections:8,users:'25M+ Buyers',desc:'Home + Electronics Marketplace บราซิล',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ (5)','เพิ่มสินค้า [AI] (7)','จัดส่ง (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน BRL (4)','หลังการขาย (4)']},

  {id:'linio',name:'Linio',color:'#FF6600',steps:52,sections:8,users:'20M+ Buyers',desc:'Marketplace ละตินอเมริกา (Falabella Group) MX/CO/CL/PE',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ (5)','เพิ่มสินค้า [AI] (8)','Linio Fulfillment (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน Multi-currency (5)','หลังการขาย (4)']},

  {id:'falabella',name:'Falabella',color:'#C8D400',steps:50,sections:8,users:'15M+ Buyers',desc:'Department Store Marketplace ชิลี/โคลอมเบีย/เปรู',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ (5)','เพิ่มสินค้า [AI] (7)','จัดส่ง (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน CLP/COP/PEN (4)','หลังการขาย (4)']},

  {id:'rappi',name:'Rappi',color:'#FF441F',steps:48,sections:8,users:'30M+ Users',desc:'Super App Delivery ละตินอเมริกา (Food+Commerce)',
   phases:['สมัคร Rappi Partner (6)','ยืนยันร้าน (5)','เพิ่มเมนู/สินค้า [AI] (7)','Rappi Turbo/Express (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน RappiPay (4)','หลังการขาย (4)']},

  {id:'dafiti',name:'Dafiti',color:'#FF0066',steps:48,sections:8,users:'12M+ Buyers',desc:'Fashion Marketplace ละตินอเมริกา (Global Fashion Group)',
   phases:['สมัคร Seller (6)','ยืนยันแบรนด์ (5)','เพิ่มสินค้า Fashion [AI] (7)','Fulfillment (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน (4)','หลังการขาย (4)']},

  {id:'liverpool',name:'Liverpool',color:'#E91E63',steps:48,sections:8,users:'10M+ Buyers',desc:'Department Store Marketplace เม็กซิโก',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ MX (5)','เพิ่มสินค้า [AI] (7)','จัดส่ง (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน MXN (4)','หลังการขาย (4)']},

  {id:'yavendio',name:'Yavendio',color:'#6C63FF',steps:42,sections:7,users:'MX E-com',desc:'E-commerce Platform เม็กซิโก SaaS',
   phases:['สมัคร (5)','ตั้งค่าร้าน (6)','เพิ่มสินค้า [AI] (7)','Payment MX (5)','จัดส่ง (4)','Marketing [AI] (5)','รับออร์เดอร์ (4)']},

  {id:'tiendanube',name:'TiendaNube',color:'#2D3277',steps:48,sections:8,users:'120K+ Stores',desc:'E-commerce Platform อันดับ 1 LATAM (Nuvemshop)',
   phases:['สมัคร (5)','ตั้งค่าร้าน+Theme (6)','เพิ่มสินค้า [AI] (7)','Payment MercadoPago (5)','จัดส่ง (5)','Marketing+SEO [AI] (5)','เชื่อม Marketplace (4)','รับออร์เดอร์ (4)']},

  {id:'vtex',name:'VTEX',color:'#F71963',steps:55,sections:8,users:'3,400+ Brands',desc:'Enterprise Commerce Platform LATAM/Global',
   phases:['สมัคร VTEX Account (6)','ตั้งค่า Store (7)','เพิ่มสินค้า [AI] (8)','Payment (5)','OMS + Logistics (6)','Marketing+SEO [AI] (6)','เชื่อม Marketplace (5)','Analytics (4)']},

  {id:'mercadopago',name:'MercadoPago',color:'#009EE3',steps:35,sections:6,users:'50M+ Users',desc:'Payment Gateway อันดับ 1 ละตินอเมริกา (MercadoLibre)',
   phases:['สมัคร Account (5)','ยืนยัน KYC (5)','ตั้งค่า Payment Link/QR (6)','เชื่อม E-commerce (5)','รับชำระ Multi-currency (5)','ถอนเงิน+Analytics (4)']},

  // ========================================
  // MIDDLE EAST (15 platforms)
  // ========================================
  {id:'noon',name:'Noon',color:'#FEEE00',steps:58,sections:9,users:'25M+ Buyers',desc:'Marketplace อันดับ 1 ตะวันออกกลาง UAE/KSA/Egypt',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ (6)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','Noon Fulfillment (5)','Noon Ads (4)','รับออร์เดอร์ (5)','ชำระเงิน AED/SAR/EGP (5)','หลังการขาย (5)']},

  {id:'amazonae',name:'AmazonAE',color:'#FF9900',steps:60,sections:9,users:'20M+ Buyers',desc:'Amazon UAE/KSA/Egypt (Souq เดิม)',
   phases:['สมัคร Amazon ME Seller (7)','ยืนยันตัวตน (6)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','FBA Middle East (5)','Amazon Ads (5)','รับออร์เดอร์ (5)','ชำระเงิน AED/SAR (5)','หลังการขาย (5)']},

  {id:'namshi',name:'Namshi',color:'#000000',steps:48,sections:8,users:'5M+ Buyers',desc:'Fashion Marketplace ตะวันออกกลาง (Noon Group)',
   phases:['สมัคร Brand Partner (6)','ยืนยันแบรนด์ (5)','เพิ่มสินค้า Fashion [AI] (7)','Fulfillment (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน AED/SAR (4)','หลังการขาย (4)']},

  {id:'mumzworld',name:'Mumzworld',color:'#E91E63',steps:45,sections:7,users:'3M+ Buyers',desc:'แม่และเด็ก Marketplace ตะวันออกกลาง',
   phases:['สมัคร Seller (6)','ยืนยันสินค้า (5)','เพิ่มสินค้า [AI] (7)','จัดส่ง (5)','โปรโมชั่น (4)','รับออร์เดอร์+ชำระเงิน (5)','หลังการขาย (4)']},

  {id:'carrefourae',name:'CarrefourAE',color:'#004F9F',steps:50,sections:8,users:'10M+ Buyers',desc:'Grocery + General Marketplace UAE/KSA (MAF)',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ (5)','เพิ่มสินค้า [AI] (7)','Carrefour Fulfillment (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน AED (4)','หลังการขาย (4)']},

  {id:'talabat',name:'Talabat',color:'#FF5722',steps:48,sections:8,users:'15M+ Users',desc:'Food Delivery อันดับ 1 ตะวันออกกลาง (Delivery Hero)',
   phases:['สมัคร Restaurant Partner (6)','ยืนยันร้าน (5)','เพิ่มเมนู [AI] (7)','Talabat Delivery (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน (4)','หลังการขาย (4)']},

  {id:'hungerstation',name:'HungerStation',color:'#7B1FA2',steps:45,sections:7,users:'8M+ Users',desc:'Food Delivery อันดับ 1 ซาอุดีอาระเบีย',
   phases:['สมัคร Partner (6)','ยืนยันร้าน (5)','เพิ่มเมนู [AI] (7)','Delivery Setup (5)','โปรโมชั่น (4)','รับออร์เดอร์+ชำระเงิน SAR (5)','หลังการขาย (4)']},

  {id:'opensooq',name:'OpenSooq',color:'#00BCD4',steps:40,sections:7,users:'20M+ Users',desc:'Classifieds อันดับ 1 ตะวันออกกลาง (อาหรับ)',
   phases:['สมัคร (5)','ตั้งค่าโปรไฟล์ (4)','ลงประกาศขาย [AI] อาหรับ (7)','โปรโมท (4)','รับออร์เดอร์ Chat (5)','ชำระเงิน (4)','หลังการขาย (3)']},

  {id:'dubizzle',name:'Dubizzle',color:'#E53935',steps:40,sections:7,users:'8M+ Users',desc:'Classifieds อันดับ 1 UAE',
   phases:['สมัคร (5)','ตั้งค่าโปรไฟล์ (4)','ลงประกาศขาย [AI] (7)','โปรโมท Featured (4)','รับออร์เดอร์ (5)','ชำระเงิน AED (4)','หลังการขาย (3)']},

  {id:'haraj',name:'Haraj',color:'#2196F3',steps:38,sections:6,users:'10M+ Users',desc:'Classifieds อันดับ 1 ซาอุดีอาระเบีย',
   phases:['สมัคร (5)','ตั้งค่าโปรไฟล์ (4)','ลงประกาศขาย [AI] อาหรับ (7)','รับออร์เดอร์ (5)','ชำระเงิน SAR/STC Pay (4)','หลังการขาย (3)']},

  {id:'digikala',name:'Digikala',color:'#EF394E',steps:55,sections:9,users:'40M+ Buyers',desc:'Marketplace อันดับ 1 อิหร่าน',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ (5)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','Digikala Fulfillment (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน IRR (4)','หลังการขาย (4)']},

  {id:'trendyol',name:'Trendyol',color:'#F27A1A',steps:58,sections:9,users:'30M+ Buyers',desc:'Marketplace อันดับ 1 ตุรกี (Alibaba Group)',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ (5)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','Trendyol Express (5)','Trendyol Ads (5)','รับออร์เดอร์ (5)','ชำระเงิน TRY (5)','หลังการขาย (5)']},

  {id:'hepsiburada',name:'Hepsiburada',color:'#FF6600',steps:55,sections:9,users:'15M+ Buyers',desc:'Marketplace อันดับ 2 ตุรกี',
   phases:['สมัคร Seller (6)','ยืนยันธุรกิจ (5)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','HepsiJet Logistics (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน TRY (4)','หลังการขาย (4)']},

  {id:'stcpay',name:'STCPay',color:'#4A148C',steps:32,sections:5,users:'10M+ Users',desc:'Mobile Payment ซาอุดีอาระเบีย',
   phases:['สมัคร Merchant (6)','ยืนยัน KYC (5)','ตั้งค่า Payment QR (6)','รับชำระเงิน SAR (5)','ถอนเงิน+Analytics (4)']},

  {id:'tabby',name:'Tabby',color:'#3CFFD0',steps:35,sections:6,users:'10M+ Users',desc:'Buy Now Pay Later อันดับ 1 ตะวันออกกลาง',
   phases:['สมัคร Merchant (5)','ยืนยันธุรกิจ (5)','เชื่อม E-commerce API (6)','ตั้งค่า BNPL Options (5)','รับชำระเงินผ่อน (5)','Analytics (3)']},

  // ========================================
  // INDIA (15 platforms)
  // ========================================
  {id:'flipkart',name:'Flipkart',color:'#2874F0',steps:62,sections:10,users:'450M+ Users',desc:'Marketplace อันดับ 1 อินเดีย (Walmart)',
   phases:['สมัคร Flipkart Seller (6)','ยืนยัน GST + PAN (6)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','Flipkart Fulfillment (5)','Flipkart Ads (5)','รับออร์เดอร์ (5)','ชำระเงิน INR (5)','จัดส่ง Ekart (5)','หลังการขาย (5)']},

  {id:'amazonin',name:'AmazonIN',color:'#FF9900',steps:62,sections:10,users:'300M+ Users',desc:'Amazon India อันดับ 2 อินเดีย',
   phases:['สมัคร Amazon India Seller (6)','ยืนยัน GST+PAN+Bank (6)','ตั้งค่าร้าน (5)','เพิ่มสินค้า [AI] (8)','FBA India (5)','Amazon Ads India (5)','รับออร์เดอร์ (5)','ชำระเงิน INR (5)','จัดส่ง (5)','หลังการขาย (5)']},

  {id:'meesho',name:'Meesho',color:'#570A57',steps:48,sections:8,users:'150M+ Users',desc:'Social Commerce อันดับ 1 อินเดีย (Reseller Platform)',
   phases:['สมัคร Supplier (5)','ยืนยัน GST (5)','เพิ่มสินค้า [AI] (7)','ตั้งค่าจัดส่ง (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน (4)','หลังการขาย (4)']},

  {id:'myntra',name:'Myntra',color:'#FF3F6C',steps:52,sections:8,users:'50M+ Users',desc:'Fashion Marketplace อันดับ 1 อินเดีย (Flipkart Group)',
   phases:['สมัคร Partner (6)','ยืนยันแบรนด์+GST (5)','เพิ่มสินค้า Fashion [AI] (8)','Myntra Fulfillment (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน INR (4)','หลังการขาย (4)']},

  {id:'snapdeal',name:'Snapdeal',color:'#E40046',steps:48,sections:8,users:'50M+ Users',desc:'Marketplace อินเดีย เน้นสินค้าราคาประหยัด',
   phases:['สมัคร Seller (5)','ยืนยัน GST (5)','เพิ่มสินค้า [AI] (7)','จัดส่ง (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน INR (4)','หลังการขาย (4)']},

  {id:'ajio',name:'AJIO',color:'#2C2C2C',steps:48,sections:8,users:'30M+ Users',desc:'Fashion Marketplace อินเดีย (Reliance)',
   phases:['สมัคร Seller (6)','ยืนยันแบรนด์ (5)','เพิ่มสินค้า Fashion [AI] (7)','Fulfillment (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน INR (4)','หลังการขาย (4)']},

  {id:'jiomart',name:'JioMart',color:'#0078D4',steps:50,sections:8,users:'100M+ Users',desc:'Grocery + General Marketplace อินเดีย (Reliance Jio)',
   phases:['สมัคร Partner (6)','ยืนยัน GST+FSSAI (5)','เพิ่มสินค้า [AI] (7)','JioMart Fulfillment (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน JioPay/UPI (5)','หลังการขาย (4)']},

  {id:'indiamart',name:'IndiaMart',color:'#2D61AD',steps:48,sections:8,users:'100M+ Buyers B2B',desc:'B2B Marketplace อันดับ 1 อินเดีย',
   phases:['สมัคร Supplier (5)','ยืนยัน GST+ธุรกิจ (5)','เพิ่มสินค้า B2B [AI] (7)','IndiaMART Ads (5)','รับ Inquiry (5)','เจรจา+Quotation (5)','ชำระเงิน B2B (4)','หลังการขาย (4)']},

  {id:'swiggy',name:'Swiggy',color:'#FC8019',steps:45,sections:7,users:'60M+ Users',desc:'Food Delivery อันดับ 1 อินเดีย',
   phases:['สมัคร Restaurant Partner (6)','ยืนยัน FSSAI License (5)','เพิ่มเมนู [AI] (7)','Swiggy Delivery (5)','โปรโมชั่น (4)','รับออร์เดอร์+ชำระเงิน INR (5)','หลังการขาย (4)']},

  {id:'zomato',name:'Zomato',color:'#E23744',steps:45,sections:7,users:'80M+ Users',desc:'Food Delivery + Restaurant อันดับ 2 อินเดีย',
   phases:['สมัคร Restaurant Partner (6)','ยืนยัน FSSAI License (5)','เพิ่มเมนู [AI] (7)','Zomato Delivery (5)','โปรโมชั่น (4)','รับออร์เดอร์+ชำระเงิน INR (5)','หลังการขาย (4)']},

  {id:'paytmmall',name:'PaytmMall',color:'#00B9F5',steps:48,sections:8,users:'100M+ Users',desc:'E-commerce + Payment อินเดีย (Paytm)',
   phases:['สมัคร Seller (5)','ยืนยัน GST (5)','เพิ่มสินค้า [AI] (7)','จัดส่ง (5)','Paytm Ads (4)','รับออร์เดอร์ (5)','ชำระเงิน PaytmPay/UPI (5)','หลังการขาย (4)']},

  {id:'nykaa',name:'Nykaa',color:'#FC2779',steps:48,sections:8,users:'30M+ Users',desc:'Beauty + Fashion Marketplace อินเดีย',
   phases:['สมัคร Brand Partner (6)','ยืนยันแบรนด์ Beauty (5)','เพิ่มสินค้า [AI] (7)','Nykaa Fulfillment (5)','โปรโมชั่น (4)','รับออร์เดอร์ (5)','ชำระเงิน INR (4)','หลังการขาย (4)']},

  {id:'upi',name:'UPI',color:'#4CAF50',steps:30,sections:5,users:'300M+ Users',desc:'Unified Payment Interface อินเดีย (PhonePe/GPay/Paytm)',
   phases:['สมัคร UPI Merchant (5)','ยืนยัน Bank+VPA (5)','ตั้งค่า QR Code UPI (5)','รับชำระเงิน INR (5)','ถอนเงิน+Analytics (3)']},

  {id:'phonepe',name:'PhonePe',color:'#5F259F',steps:35,sections:6,users:'500M+ Users',desc:'Payment App อันดับ 1 อินเดีย (UPI)',
   phases:['สมัคร PhonePe Business (5)','ยืนยัน KYC (5)','ตั้งค่า Payment QR/Link (6)','เชื่อม E-commerce (5)','รับชำระ UPI (5)','ถอนเงิน+Analytics (3)']},

  {id:'razorpay',name:'Razorpay',color:'#2D68C4',steps:38,sections:6,users:'India Payment',desc:'Payment Gateway อันดับ 1 อินเดีย',
   phases:['สมัคร Razorpay Account (5)','ยืนยันธุรกิจ+GST (5)','ตั้งค่า Payment API/Link (6)','เชื่อม E-commerce (5)','รับชำระ UPI/Card/NetBanking (5)','ถอนเงิน+Analytics (4)']}
];

let created = 0;
let totalSteps = 0;
let latamSteps = 0, meSteps = 0, indiaSteps = 0;

platforms.forEach(p => {
  // HTML Section
  const html = `<!-- Openthai.ai - ${p.name} Roadmap -->\n<section id="${p.id}-roadmap" style="max-width:900px;margin:2rem auto;padding:2rem;font-family:'Sarabun',sans-serif;background:#f8f9fa;border-radius:16px;">\n<h2 style="text-align:center;color:${p.color};font-size:2rem;">${p.name} — ${p.steps} ขั้นตอน</h2>\n<p style="text-align:center;color:#666;">${p.desc} | ${p.users}</p>\n<div style="background:#fff;padding:1.5rem;border-radius:12px;border-left:4px solid ${p.color};margin-top:1rem;">\n<ol>${p.phases.map((ph,i) => `<li style="padding:4px 0;"><strong>ส่วนที่ ${i+1}</strong> — ${ph}</li>`).join('\n')}</ol>\n</div>\n<div style="text-align:center;margin-top:1.5rem;padding:1rem;background:${p.color};border-radius:12px;">\n<p style="color:#fff;margin:0;">🤖 Openthai.ai ช่วยสร้าง Content ได้ทุกภาษา</p>\n<a href="/generate" style="display:inline-block;margin-top:8px;padding:10px 24px;background:#fff;color:${p.color};border-radius:20px;text-decoration:none;font-weight:bold;">สร้าง Content ${p.name} →</a>\n</div>\n</section>`;
  fs.writeFileSync(dir + '/' + p.id + '-roadmap-section.html', html);

  // HTML Guide
  const guide = `<html><head><meta charset="utf-8"><style>body{font-family:Sarabun,sans-serif;max-width:700px;margin:0 auto;padding:20px;line-height:1.6}h1{color:${p.color};border-bottom:3px solid ${p.color}}h3{margin-top:16px}</style></head><body><h1>${p.name} Roadmap</h1><p>${p.desc}</p><p><strong>${p.steps} ขั้นตอน | ${p.sections} ส่วน | ${p.users}</strong></p>${p.phases.map((ph,i) => `<h3>ส่วนที่ ${i+1} — ${ph}</h3>`).join('')}<hr><p><em>สร้างโดย Openthai.ai — www.OpenThaiAi.com</em></p></body></html>`;
  fs.writeFileSync(dir + '/Openthai.ai_' + p.name + '_Roadmap.html', guide);

  created++;
  totalSteps += p.steps;
  console.log(created + '. ' + p.name + ' (' + p.steps + ' steps) ✓');
});

console.log('\n=== ALL DONE ===');
console.log('Platforms: ' + created);
console.log('Total steps: ' + totalSteps);
