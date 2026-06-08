const fs = require('fs');
const dir = 'C:/Openthai.ai/all-platform-files';

const platforms = [
  // ========================================
  // THAILAND BANKING & PAYMENT
  // ========================================
  {id:'promptpay',name:'PromptPay',color:'#1E3A5F',steps:25,sections:5,users:'70M+ Users TH',desc:'ระบบชำระเงินแห่งชาติไทย ผูก PromptPay กับเบอร์/บัตรปชช.',
   phases:['สมัคร Mobile Banking (5)','ผูก PromptPay เบอร์/บัตรปชช. (4)','สร้าง QR Code รับเงิน (4)','รับโอนเงินจากลูกค้า (4)','ถอนเงิน+ตรวจสอบ (3)']},
  {id:'kbank',name:'KBank',color:'#138F2D',steps:30,sections:6,users:'20M+ Users',desc:'ธนาคารกสิกรไทย K PLUS + K-Shop + QR Payment',
   phases:['สมัครบัญชี KBank (5)','ลงทะเบียน K PLUS (5)','ผูก PromptPay (4)','ตั้งค่า K-Shop QR รับเงิน (5)','รับโอน+จ่ายบิล (4)','K-Connect API สำหรับธุรกิจ (3)']},
  {id:'scb',name:'SCB',color:'#4E2A84',steps:30,sections:6,users:'16M+ Users',desc:'ธนาคารไทยพาณิชย์ SCB EASY + SCB Payment Gateway',
   phases:['สมัครบัญชี SCB (5)','ลงทะเบียน SCB EASY (5)','ผูก PromptPay (4)','ตั้งค่า QR รับเงิน (5)','รับโอน+จ่ายบิล (4)','SCB Payment Gateway API (3)']},
  {id:'bbl',name:'BBL',color:'#1A237E',steps:28,sections:5,users:'12M+ Users',desc:'ธนาคารกรุงเทพ Bualuang iBanking + mBanking',
   phases:['สมัครบัญชี BBL (5)','ลงทะเบียน Bualuang mBanking (5)','ผูก PromptPay (4)','รับโอน+QR Payment (5)','ถอนเงิน+Analytics (3)']},
  {id:'ktb',name:'KTB',color:'#1E88E5',steps:28,sections:5,users:'15M+ Users',desc:'ธนาคารกรุงไทย Krungthai NEXT + เป๋าตัง',
   phases:['สมัครบัญชี KTB (5)','ลงทะเบียน Krungthai NEXT (5)','ผูก PromptPay (4)','รับโอน+QR+เป๋าตัง (5)','ถอนเงิน+Analytics (3)']},
  {id:'ttb',name:'TTB',color:'#FC6E20',steps:28,sections:5,users:'10M+ Users',desc:'ธนาคารทหารไทยธนชาต ttb touch',
   phases:['สมัครบัญชี TTB (5)','ลงทะเบียน ttb touch (5)','ผูก PromptPay (4)','รับโอน+QR Payment (5)','ถอนเงิน+Analytics (3)']},
  {id:'truemoney',name:'TrueMoney',color:'#F47B20',steps:30,sections:5,users:'30M+ Users',desc:'TrueMoney Wallet + TrueMoney Pay ชำระเงินออนไลน์',
   phases:['สมัคร TrueMoney Wallet (5)','ยืนยันตัวตน KYC (5)','เติมเงิน+ผูกบัญชี (5)','รับชำระเงิน QR/Link (5)','ถอนเงิน+Analytics (3)']},
  {id:'linepay_th',name:'LINEPayTH',color:'#06C755',steps:28,sections:5,users:'20M+ Users',desc:'LINE Pay Thailand ชำระเงินผ่าน LINE',
   phases:['สมัคร LINE Pay (5)','ยืนยันตัวตน (5)','ผูกบัญชีธนาคาร/PromptPay (4)','รับชำระเงิน QR (5)','ถอนเงิน (3)']},
  {id:'rabbit_linepay',name:'RabbitLINEPay',color:'#06C755',steps:25,sections:5,users:'15M+ Users',desc:'Rabbit LINE Pay จ่ายออนไลน์+ร้านค้า',
   phases:['สมัคร Rabbit LINE Pay (5)','ยืนยัน KYC (4)','เชื่อมบัตร Rabbit/บัญชี (4)','รับชำระเงิน (4)','ถอนเงิน (3)']},

  // ========================================
  // CHINA BANKING & PAYMENT
  // ========================================
  {id:'alipay',name:'Alipay',color:'#00A0E9',steps:35,sections:6,users:'1,300M+ Users',desc:'ระบบชำระเงินอันดับ 1 จีน (Ant Group/Alibaba)',
   phases:['สมัคร Alipay Account (5)','ยืนยันตัวตน Real-name (5)','ผูกบัญชีธนาคารจีน (5)','สมัคร Alipay Merchant (5)','รับชำระเงิน QR/Online (5)','ถอนเงิน+Cross-border (4)']},
  {id:'wechatpay',name:'WeChatPay',color:'#07C160',steps:35,sections:6,users:'900M+ Users',desc:'ระบบชำระเงินอันดับ 2 จีน (Tencent)',
   phases:['สมัคร WeChat Pay (5)','ยืนยันตัวตน (5)','ผูกบัญชีธนาคารจีน (5)','สมัคร Merchant QR (5)','รับชำระเงิน (5)','ถอนเงิน+Cross-border (4)']},
  {id:'unionpay',name:'UnionPay',color:'#E21836',steps:30,sections:5,users:'1,000M+ Cards',desc:'บัตรชำระเงินอันดับ 1 จีน (银联) รับบัตรจีนทั่วโลก',
   phases:['สมัคร UnionPay Merchant (6)','ยืนยันธุรกิจ (5)','ติดตั้ง POS/Online Terminal (5)','รับชำระบัตร UnionPay (5)','Settlement+Analytics (3)']},

  // ========================================
  // KOREA BANKING & PAYMENT
  // ========================================
  {id:'kakaopay',name:'KakaoPay',color:'#FFCD00',steps:32,sections:6,users:'37M+ Users',desc:'ระบบชำระเงินอันดับ 1 เกาหลี (Kakao)',
   phases:['สมัคร KakaoPay (5)','ยืนยันตัวตน (4)','ผูกบัญชีธนาคารเกาหลี (5)','สมัคร Merchant (5)','รับชำระเงิน KRW (5)','ถอนเงิน+Analytics (3)']},
  {id:'naverpay',name:'NaverPay',color:'#03C75A',steps:32,sections:6,users:'34M+ Users',desc:'ระบบชำระเงินอันดับ 2 เกาหลี (Naver)',
   phases:['สมัคร Naver Pay (5)','ยืนยันตัวตน (4)','ผูกบัญชีธนาคาร (5)','สมัคร Smart Store+Pay (5)','รับชำระเงิน KRW (5)','ถอนเงิน+Analytics (3)']},
  {id:'tossbk',name:'Toss',color:'#0064FF',steps:30,sections:5,users:'21M+ Users',desc:'Fintech + Payment เกาหลี (Toss Bank)',
   phases:['สมัคร Toss Business (5)','ยืนยัน KYC (5)','ตั้งค่า Payment Link/QR (5)','รับชำระเงิน KRW (5)','ถอนเงิน (3)']},

  // ========================================
  // JAPAN BANKING & PAYMENT
  // ========================================
  {id:'paypay',name:'PayPay',color:'#FF0033',steps:32,sections:6,users:'60M+ Users',desc:'ระบบชำระเงินอันดับ 1 ญี่ปุ่น (SoftBank/Yahoo Japan)',
   phases:['สมัคร PayPay Business (5)','ยืนยันธุรกิจ (5)','ตั้งค่า QR Code (5)','รับชำระเงิน JPY (5)','ถอนเงิน (4)','Analytics (3)']},
  {id:'linepay_jp',name:'LINEPayJP',color:'#06C755',steps:30,sections:5,users:'40M+ Users',desc:'LINE Pay Japan ชำระเงินอันดับ 2 ญี่ปุ่น',
   phases:['สมัคร LINE Pay Business (5)','ยืนยันธุรกิจ JP (5)','ตั้งค่า QR/Online (5)','รับชำระเงิน JPY (5)','ถอนเงิน+Analytics (3)']},
  {id:'rakutenpay',name:'RakutenPay',color:'#BF0000',steps:32,sections:5,users:'30M+ Users',desc:'Rakuten Pay ชำระเงินญี่ปุ่น (Rakuten Ecosystem)',
   phases:['สมัคร Rakuten Pay Merchant (6)','ยืนยันธุรกิจ (5)','ตั้งค่า Payment (5)','รับชำระ JPY+Rakuten Points (5)','ถอนเงิน (3)']},

  // ========================================
  // SOUTHEAST ASIA BANKING & PAYMENT
  // ========================================
  {id:'grabpay',name:'GrabPay',color:'#00B14F',steps:30,sections:5,users:'40M+ Users SEA',desc:'GrabPay ชำระเงินอาเซียน (Grab Super App)',
   phases:['สมัคร GrabPay Merchant (5)','ยืนยัน KYC (5)','ตั้งค่า QR/API (5)','รับชำระเงิน Multi-currency (5)','ถอนเงิน (3)']},
  {id:'shopeepay',name:'ShopeePay',color:'#EE4D2D',steps:28,sections:5,users:'30M+ Users SEA',desc:'ShopeePay ชำระเงินอาเซียน (Shopee)',
   phases:['สมัคร ShopeePay Merchant (5)','ยืนยัน (4)','เชื่อม Shopee Store (5)','รับชำระเงิน (5)','ถอนเงิน (3)']},
  {id:'gcash',name:'GCash',color:'#007DFE',steps:30,sections:5,users:'80M+ Users PH',desc:'Mobile Money อันดับ 1 ฟิลิปปินส์',
   phases:['สมัคร GCash Business (5)','ยืนยัน KYC (5)','ตั้งค่า QR/Payment Link (5)','รับชำระเงิน PHP (5)','ถอนเงิน+GCash Forex (3)']},
  {id:'maya',name:'Maya',color:'#00D563',steps:30,sections:5,users:'50M+ Users PH',desc:'Digital Bank + Payment ฟิลิปปินส์ (PayMaya เดิม)',
   phases:['สมัคร Maya Business (5)','ยืนยัน KYC (5)','ตั้งค่า Payment QR/Link (5)','รับชำระเงิน PHP (5)','ถอนเงิน (3)']},
  {id:'dana',name:'DANA',color:'#108EE9',steps:28,sections:5,users:'130M+ Users ID',desc:'E-Wallet อันดับ 1 อินโดนีเซีย',
   phases:['สมัคร DANA Business (5)','ยืนยัน KYC (4)','ตั้งค่า QR/Payment (5)','รับชำระเงิน IDR (5)','ถอนเงิน (3)']},
  {id:'ovo',name:'OVO',color:'#4C3494',steps:28,sections:5,users:'100M+ Users ID',desc:'E-Wallet อินโดนีเซีย (Grab+Tokopedia)',
   phases:['สมัคร OVO Merchant (5)','ยืนยัน KYC (4)','ตั้งค่า QR/Payment (5)','รับชำระเงิน IDR (5)','ถอนเงิน (3)']},
  {id:'gopay',name:'GoPay',color:'#00AA13',steps:28,sections:5,users:'80M+ Users ID',desc:'E-Wallet อินโดนีเซีย (GoTo/Gojek)',
   phases:['สมัคร GoPay Merchant (5)','ยืนยัน (4)','ตั้งค่า QR/GoBiz (5)','รับชำระ IDR (5)','ถอนเงิน (3)']},
  {id:'zalopay_vn',name:'ZaloPayVN',color:'#0068FF',steps:28,sections:5,users:'20M+ Users VN',desc:'ZaloPay ชำระเงินเวียดนาม',
   phases:['สมัคร ZaloPay Business (5)','ยืนยัน KYC (4)','ตั้งค่า QR/Payment (5)','รับชำระ VND (5)','ถอนเงิน (3)']},
  {id:'momovn',name:'MoMoVN',color:'#A50064',steps:30,sections:5,users:'35M+ Users VN',desc:'MoMo E-Wallet อันดับ 1 เวียดนาม',
   phases:['สมัคร MoMo Business (5)','ยืนยัน KYC (5)','ตั้งค่า QR/Payment Link (5)','รับชำระ VND (5)','ถอนเงิน (3)']},

  // ========================================
  // INDIA BANKING & PAYMENT (เพิ่มเติม)
  // ========================================
  {id:'paytm',name:'Paytm',color:'#00B9F5',steps:32,sections:5,users:'350M+ Users',desc:'E-Wallet+Payment อันดับ 1 อินเดีย',
   phases:['สมัคร Paytm Business (5)','ยืนยัน KYC+GST (6)','ตั้งค่า QR/Payment Gateway (5)','รับชำระ UPI/Wallet INR (5)','ถอนเงิน (3)']},
  {id:'googlepay_in',name:'GooglePayIN',color:'#4285F4',steps:28,sections:5,users:'200M+ Users IN',desc:'Google Pay India UPI Payment',
   phases:['สมัคร Google Pay Business (5)','ยืนยัน UPI VPA (4)','ตั้งค่า QR/Payment (5)','รับชำระ UPI INR (5)','Analytics (3)']},

  // ========================================
  // MIDDLE EAST BANKING & PAYMENT
  // ========================================
  {id:'applepay_me',name:'ApplePayME',color:'#000000',steps:25,sections:5,users:'ME Apple Users',desc:'Apple Pay ตะวันออกกลาง UAE/KSA/QA/BH/KW',
   phases:['สมัคร Apple Pay Merchant (5)','ยืนยันธุรกิจ (4)','เชื่อม Payment Processor (4)','รับชำระ NFC/Online (4)','Settlement (3)']},
  {id:'benefit',name:'BenefitPay',color:'#004990',steps:28,sections:5,users:'2M+ Users BH',desc:'Payment Gateway บาห์เรน/GCC',
   phases:['สมัคร Benefit Merchant (5)','ยืนยันธุรกิจ GCC (5)','ตั้งค่า Payment Gateway (5)','รับชำระ BHD/SAR/AED (5)','ถอนเงิน (3)']},
  {id:'fawry',name:'Fawry',color:'#1565C0',steps:30,sections:5,users:'40M+ Users EG',desc:'Payment Gateway อันดับ 1 อียิปต์',
   phases:['สมัคร Fawry Merchant (5)','ยืนยันธุรกิจ EG (5)','ตั้งค่า Payment QR/POS (5)','รับชำระ EGP Cash/Digital (5)','ถอนเงิน (3)']},

  // ========================================
  // AFRICA BANKING & PAYMENT (เพิ่มเติม)
  // ========================================
  {id:'mtn_momo',name:'MTNMoMo',color:'#FFCC00',steps:30,sections:5,users:'60M+ Users',desc:'MTN Mobile Money แอฟริกา 16 ประเทศ',
   phases:['สมัคร MTN MoMo Merchant (5)','ยืนยัน KYC (5)','ตั้งค่า Payment QR/USSD (5)','รับชำระ Multi-currency (5)','ถอนเงิน (3)']},
  {id:'airtel_money',name:'AirtelMoney',color:'#ED1C24',steps:28,sections:5,users:'30M+ Users',desc:'Airtel Money แอฟริกา 14 ประเทศ',
   phases:['สมัคร Airtel Money Merchant (5)','ยืนยัน KYC (4)','ตั้งค่า Payment (5)','รับชำระ (5)','ถอนเงิน (3)']},
  {id:'chipper',name:'ChipperCash',color:'#6C63FF',steps:28,sections:5,users:'5M+ Users',desc:'Cross-border Payment แอฟริกา 9 ประเทศ',
   phases:['สมัคร Chipper Business (5)','ยืนยัน KYC (4)','ตั้งค่า Payment (5)','รับชำระ Multi-currency (5)','ถอนเงิน Cross-border (3)']},

  // ========================================
  // LATIN AMERICA BANKING & PAYMENT (เพิ่มเติม)
  // ========================================
  {id:'pix',name:'PIX',color:'#00BDAE',steps:25,sections:5,users:'150M+ Users BR',desc:'ระบบชำระเงินแห่งชาติบราซิล (Central Bank)',
   phases:['สมัคร PIX Key ผ่านธนาคาร (5)','ผูก CPF/CNPJ/Phone/Email (4)','สร้าง QR Code PIX (4)','รับชำระ BRL ทันที (4)','Analytics (3)']},
  {id:'nubank',name:'Nubank',color:'#820AD1',steps:28,sections:5,users:'90M+ Users BR',desc:'Digital Bank อันดับ 1 บราซิล/ละตินอเมริกา',
   phases:['สมัคร Nubank Business (5)','ยืนยัน CNPJ (4)','ตั้งค่า PIX+Payment (5)','รับชำระ BRL (5)','ถอนเงิน (3)']},
  {id:'nequi',name:'Nequi',color:'#E91163',steps:28,sections:5,users:'17M+ Users CO',desc:'Digital Wallet อันดับ 1 โคลอมเบีย',
   phases:['สมัคร Nequi Business (5)','ยืนยัน KYC (4)','ตั้งค่า QR/Payment (5)','รับชำระ COP (5)','ถอนเงิน (3)']},
  {id:'yape',name:'Yape',color:'#6B2D90',steps:28,sections:5,users:'14M+ Users PE',desc:'Digital Wallet อันดับ 1 เปรู (BCP)',
   phases:['สมัคร Yape Merchant (5)','ยืนยัน KYC (4)','ตั้งค่า QR/Payment (5)','รับชำระ PEN (5)','ถอนเงิน (3)']},

  // ========================================
  // EUROPE BANKING & PAYMENT
  // ========================================
  {id:'stripe',name:'Stripe',color:'#635BFF',steps:35,sections:6,users:'Global 46 Countries',desc:'Payment Gateway อันดับ 1 โลก (US/EU/Global)',
   phases:['สมัคร Stripe Account (5)','ยืนยันธุรกิจ (5)','ตั้งค่า Payment API/Link (6)','เชื่อม E-commerce (5)','รับชำระ 135+ สกุลเงิน (5)','ถอนเงิน+Analytics (4)']},
  {id:'paypal',name:'PayPal',color:'#003087',steps:35,sections:6,users:'430M+ Users',desc:'Payment Gateway ระดับโลก 200+ ประเทศ',
   phases:['สมัคร PayPal Business (5)','ยืนยันตัวตน+ธนาคาร (5)','ตั้งค่า Payment Button/Invoice (6)','เชื่อม E-commerce (5)','รับชำระ Multi-currency (5)','ถอนเงิน+Forex (4)']},
  {id:'klarna',name:'Klarna',color:'#FFB3C7',steps:32,sections:5,users:'150M+ Users EU',desc:'Buy Now Pay Later อันดับ 1 ยุโรป',
   phases:['สมัคร Klarna Merchant (5)','ยืนยันธุรกิจ EU (5)','เชื่อม API/Plugin (6)','ตั้งค่า BNPL Options (5)','รับชำระ+Settlement EUR (4)']},
  {id:'adyen',name:'Adyen',color:'#0ABF53',steps:35,sections:6,users:'Enterprise Global',desc:'Payment Platform Enterprise ระดับโลก (EU)',
   phases:['สมัคร Adyen Account (5)','ยืนยันธุรกิจ (5)','ตั้งค่า Payment API (6)','เชื่อม E-commerce (5)','รับชำระ 250+ Methods (5)','Settlement Multi-currency (4)']},
  {id:'ideal',name:'iDEAL',color:'#CC0066',steps:25,sections:5,users:'15M+ Users NL',desc:'ระบบชำระเงินแห่งชาติเนเธอร์แลนด์',
   phases:['สมัครผ่าน PSP (Mollie/Adyen) (5)','ยืนยันธุรกิจ NL/EU (4)','เชื่อม API (4)','รับชำระ EUR (4)','Settlement (3)']},
  {id:'bancontact',name:'Bancontact',color:'#005498',steps:25,sections:5,users:'8M+ Users BE',desc:'ระบบชำระเงินแห่งชาติเบลเยียม',
   phases:['สมัครผ่าน PSP (5)','ยืนยันธุรกิจ BE/EU (4)','เชื่อม API (4)','รับชำระ EUR (4)','Settlement (3)']},
  {id:'swish',name:'Swish',color:'#6DB538',steps:25,sections:5,users:'8M+ Users SE',desc:'ระบบชำระเงินมือถือแห่งชาติสวีเดน',
   phases:['สมัคร Swish Business (5)','ยืนยันธุรกิจ SE (4)','ตั้งค่า QR/Payment (4)','รับชำระ SEK (4)','Settlement (3)']},
  {id:'mobilepay',name:'MobilePay',color:'#5A78FF',steps:25,sections:5,users:'5M+ Users DK/FI',desc:'ระบบชำระเงินมือถือเดนมาร์ก/ฟินแลนด์',
   phases:['สมัคร MobilePay Business (5)','ยืนยันธุรกิจ DK/FI (4)','ตั้งค่า QR/Payment (4)','รับชำระ DKK/EUR (4)','Settlement (3)']},
  {id:'vipps',name:'Vipps',color:'#FF5B24',steps:25,sections:5,users:'4M+ Users NO',desc:'ระบบชำระเงินมือถือแห่งชาตินอร์เวย์',
   phases:['สมัคร Vipps Business (5)','ยืนยันธุรกิจ NO (4)','ตั้งค่า QR/Payment (4)','รับชำระ NOK (4)','Settlement (3)']},
  {id:'twint',name:'TWINT',color:'#000000',steps:25,sections:5,users:'5M+ Users CH',desc:'ระบบชำระเงินมือถือแห่งชาติสวิตเซอร์แลนด์',
   phases:['สมัคร TWINT Business (5)','ยืนยันธุรกิจ CH (4)','ตั้งค่า QR/Payment (4)','รับชำระ CHF (4)','Settlement (3)']},
  {id:'blik',name:'BLIK',color:'#E30613',steps:25,sections:5,users:'15M+ Users PL',desc:'ระบบชำระเงินมือถือแห่งชาติโปแลนด์',
   phases:['สมัครผ่านธนาคาร PL (5)','ยืนยัน (4)','ตั้งค่า Payment (4)','รับชำระ PLN (4)','Settlement (3)']},
  {id:'mbway',name:'MBWay',color:'#E20714',steps:25,sections:5,users:'5M+ Users PT',desc:'ระบบชำระเงินมือถือโปรตุเกส',
   phases:['สมัคร MB Way (5)','ยืนยัน (4)','ตั้งค่า Payment (4)','รับชำระ EUR (4)','Settlement (3)']},
  {id:'bizum',name:'Bizum',color:'#05C3DD',steps:25,sections:5,users:'25M+ Users ES',desc:'ระบบชำระเงินมือถือสเปน',
   phases:['สมัคร Bizum Business (5)','ยืนยันธนาคาร ES (4)','ตั้งค่า Payment (4)','รับชำระ EUR (4)','Settlement (3)']},

  // ========================================
  // GLOBAL CROSS-BORDER PAYMENT
  // ========================================
  {id:'wise',name:'Wise',color:'#9FE870',steps:32,sections:5,users:'16M+ Users Global',desc:'โอนเงินระหว่างประเทศถูกที่สุด (TransferWise เดิม)',
   phases:['สมัคร Wise Business (5)','ยืนยันตัวตน+ธุรกิจ (5)','ได้ Multi-currency Account (5)','รับเงิน+แลกเงิน 50+ สกุล (5)','ถอนเงินไปธนาคารท้องถิ่น (4)']},
  {id:'payoneer',name:'Payoneer',color:'#FF4800',steps:32,sections:5,users:'5M+ Users Global',desc:'รับเงินจาก Marketplace ทั่วโลก (Amazon/Shopee/Lazada)',
   phases:['สมัคร Payoneer Account (5)','ยืนยันตัวตน (5)','ได้ Receiving Account USD/EUR/GBP (5)','เชื่อมกับ Marketplace (5)','ถอนเงิน→ธนาคารไทย (4)']},
  {id:'worldremit',name:'WorldRemit',color:'#780AFF',steps:25,sections:4,users:'Global Remittance',desc:'โอนเงินระหว่างประเทศ 150+ ประเทศ',
   phases:['สมัคร (5)','ยืนยัน KYC (5)','โอนเงิน Cross-border (5)','รับเงิน Mobile Money/Bank (4)']},
  {id:'westernunion',name:'WesternUnion',color:'#FFDD00',steps:25,sections:4,users:'Global Remittance',desc:'โอนเงินระหว่างประเทศ 200+ ประเทศ เก่าแก่ที่สุด',
   phases:['สมัคร WU Business (5)','ยืนยัน KYC (5)','ส่ง/รับเงิน Cross-border (5)','ถอนเงิน Cash/Bank (4)']}
];

let created = 0;
let totalSteps = 0;

platforms.forEach(p => {
  const html = `<!-- Openthai.ai - ${p.name} Banking/Payment Roadmap -->\n<section id="${p.id}-roadmap" style="max-width:900px;margin:2rem auto;padding:2rem;font-family:'Sarabun',sans-serif;background:#f8f9fa;border-radius:16px;">\n<h2 style="text-align:center;color:${p.color};font-size:2rem;">🏦 ${p.name} — ${p.steps} ขั้นตอน</h2>\n<p style="text-align:center;color:#666;">${p.desc} | ${p.users}</p>\n<div style="background:#fff;padding:1.5rem;border-radius:12px;border-left:4px solid ${p.color};margin-top:1rem;">\n<ol>${p.phases.map((ph,i) => `<li style="padding:4px 0;"><strong>ส่วนที่ ${i+1}</strong> — ${ph}</li>`).join('\n')}</ol>\n</div>\n<div style="text-align:center;margin-top:1.5rem;padding:1rem;background:${p.color};border-radius:12px;">\n<p style="color:#fff;margin:0;">🤖 Openthai.ai เชื่อมต่อระบบชำระเงินทุกทวีป</p>\n</div>\n</section>`;
  fs.writeFileSync(dir + '/' + p.id + '-roadmap-section.html', html);

  const guide = `<html><head><meta charset="utf-8"><style>body{font-family:Sarabun,sans-serif;max-width:700px;margin:0 auto;padding:20px;line-height:1.6}h1{color:${p.color};border-bottom:3px solid ${p.color}}h3{margin-top:16px}</style></head><body><h1>🏦 ${p.name} Payment Roadmap</h1><p>${p.desc}</p><p><strong>${p.steps} ขั้นตอน | ${p.sections} ส่วน | ${p.users}</strong></p>${p.phases.map((ph,i) => `<h3>ส่วนที่ ${i+1} — ${ph}</h3>`).join('')}<hr><p><em>สร้างโดย Openthai.ai — www.OpenThaiAi.com</em></p></body></html>`;
  fs.writeFileSync(dir + '/Openthai.ai_' + p.name + '_Roadmap.html', guide);

  created++;
  totalSteps += p.steps;
  console.log(created + '. ' + p.name + ' (' + p.steps + ' steps) ✓');
});

console.log('\n=== BANKING & PAYMENT ALL DONE ===');
console.log('Platforms: ' + created);
console.log('Total steps: ' + totalSteps);
