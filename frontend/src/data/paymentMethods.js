// ────────────────────────────────────────────────────────────────────────────────
// OPENTHAI AI — ช่องทางชำระเงินทั้งหมด
// จัดกลุ่มตามภูมิภาค + gateway ที่ใช้ประมวลผลจริง
// ────────────────────────────────────────────────────────────────────────────────

// Gateway ที่ใช้จริง:
//   OMISE   → Omise/Opn Payments  (ไทย + SEA)
//   STRIPE  → Stripe               (การ์ด + PayPal + นานาชาติ)
//   TWOC2P  → 2C2P                 (ไทย + SEA + นานาชาติ)
//   MANUAL  → โอนมือ + แจ้งสลิป

export const PAYMENT_GROUPS = [
  {
    id: 'thai',
    label: '🇹🇭 ธนาคารไทย & E-Wallet',
    color: '#10b981',
    gateway: 'OMISE',
    methods: [
      // ─── PromptPay / QR ────────────────────────────────────────────────────
      { id: 'promptpay',   icon: '📱', label: 'PromptPay / QR Code',          desc: 'ทุกแอปธนาคารไทย สแกนได้เลย',       tag: 'แนะนำ' },
      { id: 'kbank',       icon: '🟩', label: 'KBank (กสิกรไทย)',              desc: 'KPlus App / Internet Banking' },
      { id: 'scb',         icon: '🟣', label: 'SCB (ไทยพาณิชย์)',              desc: 'SCB Easy App / Internet Banking' },
      { id: 'bbl',         icon: '🔵', label: 'Bangkok Bank (กรุงเทพ)',        desc: 'Bualuang mBanking / iBanking' },
      { id: 'ktb',         icon: '🔷', label: 'Krungthai (กรุงไทย)',           desc: 'Krungthai NEXT App' },
      { id: 'ttb',         icon: '🟦', label: 'TTB (ทหารไทยธนชาต)',           desc: 'ttb touch App' },
      { id: 'bay',         icon: '🟡', label: 'Krungsri (กรุงศรี)',            desc: 'KMA App / Internet Banking' },
      { id: 'gsb',         icon: '🟪', label: 'GSB (ออมสิน)',                  desc: 'MyMo App' },
      { id: 'ghb',         icon: '🟧', label: 'GH Bank (อาคารสงเคราะห์)',     desc: 'GH Bank App' },
      { id: 'uob_th',      icon: '🔴', label: 'UOB Thailand (ยูโอบี ไทย)',    desc: 'UOB TMRW App' },
      { id: 'cimb_th',     icon: '🟤', label: 'CIMB Thai (ซีไอเอ็มบี ไทย)', desc: 'CIMB Clicks App' },
      { id: 'tisco',       icon: '🔶', label: 'TISCO Bank (ทิสโก้)',           desc: 'TISCO My Wealth App' },
      { id: 'kk',          icon: '🟥', label: 'KKP (เกียรตินาคิน)',           desc: 'KKP Mobile App' },
      { id: 'lhbank',      icon: '⬜', label: 'LH Bank (แลนด์แอนด์เฮาส์)',   desc: 'LH Bank App' },
      { id: 'ibank',       icon: '🕌', label: 'Islamic Bank (ธ.อิสลาม)',      desc: 'iBank App' },
      // ─── E-Wallet ─────────────────────────────────────────────────────────
      { id: 'truemoney',   icon: '🟠', label: 'TrueMoney Wallet',              desc: 'โอนจาก TrueMoney' },
      { id: 'linepay',     icon: '💚', label: 'LINE Pay / Rabbit LINE Pay',    desc: 'จ่ายผ่าน LINE App' },
      { id: 'shopeepay_th',icon: '🛍️', label: 'ShopeePay Thailand',           desc: 'จ่ายผ่าน Shopee App' },
      { id: 'grabpay_th',  icon: '🟢', label: 'GrabPay Thailand',              desc: 'จ่ายผ่าน Grab App' },
    ],
  },
  {
    id: 'sea',
    label: '🌏 เอเชียตะวันออกเฉียงใต้',
    color: '#6366f1',
    gateway: 'TWOC2P',
    methods: [
      // ─── สิงคโปร์ ──────────────────────────────────────────────────────────
      { id: 'paynow',      icon: '🦁', label: 'PayNow (Singapore)',            desc: 'DBS / OCBC / UOB / SCB SG', country: 'SG' },
      { id: 'dbs',         icon: '🔴', label: 'DBS Bank (สิงคโปร์)',          desc: 'DBS Digibank', country: 'SG' },
      { id: 'ocbc',        icon: '🔵', label: 'OCBC Bank (สิงคโปร์)',         desc: 'OCBC Digital', country: 'SG' },
      { id: 'uob_sg',      icon: '🟦', label: 'UOB Singapore',                desc: 'UOB TMRW / One App', country: 'SG' },
      // ─── มาเลเซีย ─────────────────────────────────────────────────────────
      { id: 'duitnow',     icon: '🌙', label: 'DuitNow (Malaysia)',            desc: 'Maybank / CIMB / Public Bank', country: 'MY' },
      { id: 'maybank',     icon: '🟡', label: 'Maybank (มาเลเซีย)',           desc: 'Maybank2u App', country: 'MY' },
      { id: 'cimb_my',     icon: '🔴', label: 'CIMB Malaysia',                desc: 'CIMB Clicks App', country: 'MY' },
      { id: 'publicbank',  icon: '🔵', label: 'Public Bank Berhad',           desc: 'PBe App', country: 'MY' },
      { id: 'hongleong',   icon: '🟠', label: 'Hong Leong Bank',              desc: 'HLB Connect App', country: 'MY' },
      { id: 'rhb',         icon: '🟤', label: 'RHB Bank',                     desc: 'RHB Now App', country: 'MY' },
      { id: 'tng',         icon: '💙', label: 'Touch \'n Go eWallet',          desc: 'TNG Digital Malaysia', country: 'MY' },
      // ─── อินโดนีเซีย ──────────────────────────────────────────────────────
      { id: 'qris',        icon: '🇮🇩', label: 'QRIS (Indonesia)',             desc: 'GoPay / OVO / Dana / LinkAja', country: 'ID' },
      { id: 'bca',         icon: '🔵', label: 'Bank Central Asia (BCA)',       desc: 'myBCA App / KlikBCA', country: 'ID' },
      { id: 'mandiri',     icon: '🟡', label: 'Bank Mandiri',                  desc: 'Livin by Mandiri', country: 'ID' },
      { id: 'bri',         icon: '🔵', label: 'Bank Rakyat Indonesia (BRI)',  desc: 'BRImo App', country: 'ID' },
      { id: 'bni',         icon: '🟠', label: 'Bank Negara Indonesia (BNI)',  desc: 'BNI Mobile App', country: 'ID' },
      { id: 'gopay',       icon: '🟢', label: 'GoPay (Indonesia)',             desc: 'Gojek App', country: 'ID' },
      { id: 'ovo',         icon: '🟣', label: 'OVO (Indonesia)',               desc: 'OVO App', country: 'ID' },
      // ─── เวียดนาม ─────────────────────────────────────────────────────────
      { id: 'vietqr',      icon: '🇻🇳', label: 'VietQR (Vietnam)',             desc: 'Vietcombank / BIDV / Techcombank', country: 'VN' },
      { id: 'vietcombank', icon: '🟢', label: 'Vietcombank',                   desc: 'VCB Digibank', country: 'VN' },
      { id: 'bidv',        icon: '🔵', label: 'BIDV Vietnam',                  desc: 'BIDV SmartBanking', country: 'VN' },
      { id: 'techcombank', icon: '🔴', label: 'Techcombank Vietnam',           desc: 'Techcombank Mobile', country: 'VN' },
      { id: 'mbbank',      icon: '🟦', label: 'MB Bank Vietnam',               desc: 'MBBank App', country: 'VN' },
      { id: 'momo',        icon: '🩷', label: 'MoMo (Vietnam)',                desc: 'MoMo E-Wallet', country: 'VN' },
      // ─── ฟิลิปปินส์ ───────────────────────────────────────────────────────
      { id: 'gcash',       icon: '🔵', label: 'GCash (Philippines)',           desc: 'Globe Fintech', country: 'PH' },
      { id: 'bdo',         icon: '🟦', label: 'BDO Unibank',                   desc: 'BDO Mobile', country: 'PH' },
      { id: 'metrobank',   icon: '🟣', label: 'Metrobank Philippines',         desc: 'Metrobank Online', country: 'PH' },
      // ─── ทั่วภูมิภาค ──────────────────────────────────────────────────────
      { id: 'grabpay_sea', icon: '🟢', label: 'GrabPay (SEA)',                 desc: 'Singapore / Malaysia / Philippines / Vietnam', country: 'SEA' },
    ],
  },
  {
    id: 'asia',
    label: '🌏 เอเชีย (จีน, ญี่ปุ่น, เกาหลี, อินเดีย)',
    color: '#f59e0b',
    gateway: 'OMISE',
    methods: [
      // ─── จีน ───────────────────────────────────────────────────────────────
      { id: 'alipay',      icon: '💙', label: 'Alipay (支付宝)',                desc: 'ธนาคารจีนทุกแห่ง รวมถึง ICBC, ABC, BOC, CCB', country: 'CN' },
      { id: 'wechatpay',   icon: '💚', label: 'WeChat Pay (微信支付)',          desc: 'WeChat / 微信', country: 'CN' },
      { id: 'unionpay',    icon: '🔴', label: 'UnionPay (银联)',                desc: 'บัตร UnionPay ทุกธนาคารจีน', country: 'CN', tag: 'รองรับทั่วโลก' },
      { id: 'icbc',        icon: '🔴', label: 'ICBC (工商银行)',                desc: 'ธนาคารอุตฯและพาณิชย์จีน', country: 'CN' },
      { id: 'abc_cn',      icon: '🟢', label: 'Agricultural Bank of China',    desc: 'ธนาคารเพื่อการเกษตรจีน', country: 'CN' },
      { id: 'boc',         icon: '🔵', label: 'Bank of China (中国银行)',       desc: 'ธนาคารแห่งประเทศจีน', country: 'CN' },
      { id: 'ccb',         icon: '🔷', label: 'China Construction Bank',       desc: 'ธนาคารก่อสร้างจีน', country: 'CN' },
      { id: 'bocom',       icon: '🟦', label: 'Bank of Communications',        desc: 'ธนาคารแห่งการสื่อสาร', country: 'CN' },
      { id: 'cmb_cn',      icon: '🟥', label: 'China Merchants Bank (招商)',   desc: 'ธนาคารพ่อค้าจีน', country: 'CN' },
      { id: 'posb_cn',     icon: '🟫', label: 'Postal Savings Bank of China',  desc: 'ธนาคารออมสินไปรษณีย์จีน', country: 'CN' },
      { id: 'citic',       icon: '⬛', label: 'China CITIC Bank',               desc: 'ธนาคาร CITIC', country: 'CN' },
      { id: 'spdb',        icon: '🟧', label: 'Shanghai Pudong Dev Bank',      desc: 'ธนาคารพัฒนาเซี่ยงไฮ้ผู่ตง', country: 'CN' },
      { id: 'ceb',         icon: '🟪', label: 'China Everbright Bank',         desc: 'ธนาคารไชน่าเอเวอร์ไบรท์', country: 'CN' },
      { id: 'pingan',      icon: '🔶', label: 'Ping An Bank (平安)',           desc: 'ธนาคารผิงอัน', country: 'CN' },
      { id: 'minsheng',    icon: '⬜', label: 'China Minsheng Bank',           desc: 'ธนาคารจีนหมินเซิง', country: 'CN' },
      // ─── ญี่ปุ่น ──────────────────────────────────────────────────────────
      { id: 'paypay',      icon: '🟡', label: 'PayPay (Japan)',                 desc: 'แอปชำระเงินอันดับ 1 ญี่ปุ่น', country: 'JP' },
      { id: 'mufg',        icon: '🔵', label: 'MUFG Bank (三菱UFJ)',            desc: 'ธนาคาร MUFG', country: 'JP' },
      { id: 'mizuho',      icon: '🟦', label: 'Mizuho FG (みずほ)',             desc: 'กลุ่มมิซูโฮะ', country: 'JP' },
      { id: 'smbc',        icon: '🔴', label: 'SMBC (三井住友)',                desc: 'Sumitomo Mitsui', country: 'JP' },
      { id: 'norinchukin', icon: '🟩', label: 'Norinchukin Bank (農林)',        desc: 'ธนาคารนอรินชูคิน', country: 'JP' },
      // ─── เกาหลีใต้ ────────────────────────────────────────────────────────
      { id: 'kakaopay',    icon: '💛', label: 'KakaoPay (카카오페이)',           desc: 'Kakao App ชำระเงิน', country: 'KR' },
      { id: 'kbkr',        icon: '🟡', label: 'KB Financial Group',             desc: 'Kookmin Bank', country: 'KR' },
      { id: 'shinhan',     icon: '🔵', label: 'Shinhan Bank (신한)',            desc: 'Shinhan SOL App', country: 'KR' },
      { id: 'hana',        icon: '🟢', label: 'Hana Financial Group (하나)',    desc: 'Hana 1Q App', country: 'KR' },
      { id: 'woori',       icon: '🔷', label: 'Woori Bank (우리)',              desc: 'WON Banking App', country: 'KR' },
      { id: 'nh_kr',       icon: '🟩', label: 'Nonghyup Bank (농협)',           desc: 'NH올원뱅크', country: 'KR' },
      // ─── อินเดีย ──────────────────────────────────────────────────────────
      { id: 'upi',         icon: '🇮🇳', label: 'UPI (India)',                   desc: 'GPay / PhonePe / Paytm', country: 'IN' },
      { id: 'sbi',         icon: '🔵', label: 'State Bank of India',           desc: 'YONO SBI App', country: 'IN' },
      { id: 'hdfc',        icon: '🔴', label: 'HDFC Bank India',               desc: 'HDFC Mobile App', country: 'IN' },
      { id: 'icici',       icon: '🟠', label: 'ICICI Bank India',              desc: 'iMobile App', country: 'IN' },
      { id: 'paytm',       icon: '🔵', label: 'Paytm (India)',                  desc: 'Paytm Wallet', country: 'IN' },
      // ─── ตะวันออกกลาง ─────────────────────────────────────────────────────
      { id: 'qnb',         icon: '🇶🇦', label: 'QNB (Qatar)',                   desc: 'Qatar National Bank', country: 'QA' },
      { id: 'fab',         icon: '🇦🇪', label: 'First Abu Dhabi Bank',          desc: 'UAE — FAB Mobile', country: 'AE' },
    ],
  },
  {
    id: 'international',
    label: '🌍 นานาชาติ (ยุโรป, อเมริกา, ออสเตรเลีย, แอฟริกา)',
    color: '#fe2c55',
    gateway: 'STRIPE',
    methods: [
      // ─── บัตรเครดิต/เดบิต ─────────────────────────────────────────────────
      { id: 'visa',        icon: '💳', label: 'Visa',                           desc: 'บัตรเครดิต/เดบิต Visa ทั่วโลก',       tag: 'ยอดนิยม' },
      { id: 'mastercard',  icon: '💳', label: 'Mastercard',                     desc: 'บัตรเครดิต/เดบิต Mastercard ทั่วโลก', tag: 'ยอดนิยม' },
      { id: 'jcb',         icon: '💳', label: 'JCB',                            desc: 'บัตร JCB (ญี่ปุ่น + ทั่วโลก)' },
      { id: 'amex',        icon: '💳', label: 'American Express',               desc: 'บัตร AMEX' },
      // ─── ดิจิทัล ──────────────────────────────────────────────────────────
      { id: 'paypal',      icon: '🅿️', label: 'PayPal',                         desc: 'ชำระผ่าน PayPal (ทั่วโลก)', tag: 'แนะนำ' },
      { id: 'googlepay',   icon: '🟤', label: 'Google Pay',                     desc: 'GPay — รองรับในหลายประเทศ' },
      { id: 'applepay',    icon: '🍎', label: 'Apple Pay',                      desc: 'ชำระผ่าน Apple Wallet' },
      { id: 'stripe',      icon: '🔷', label: 'Stripe Checkout',                desc: 'ชำระออนไลน์ปลอดภัย' },
      // ─── สหรัฐอเมริกา ─────────────────────────────────────────────────────
      { id: 'jpmorgan',    icon: '🏦', label: 'JPMorgan Chase',                 desc: 'Wire Transfer / ACH', country: 'US' },
      { id: 'bofa',        icon: '🔴', label: 'Bank of America',                desc: 'Wire Transfer / Zelle', country: 'US' },
      { id: 'citi',        icon: '🔵', label: 'Citigroup',                      desc: 'Wire Transfer', country: 'US' },
      { id: 'wellsfargo',  icon: '🟡', label: 'Wells Fargo',                    desc: 'Wire Transfer / Zelle', country: 'US' },
      { id: 'goldman',     icon: '⬛', label: 'Goldman Sachs',                  desc: 'Wire Transfer', country: 'US' },
      { id: 'morgan',      icon: '🔷', label: 'Morgan Stanley',                 desc: 'Wire Transfer', country: 'US' },
      { id: 'usbank',      icon: '🟦', label: 'U.S. Bancorp',                   desc: 'Wire Transfer', country: 'US' },
      { id: 'capital1',    icon: '🟥', label: 'Capital One',                    desc: 'Wire Transfer', country: 'US' },
      { id: 'pnc',         icon: '🟩', label: 'PNC Financial',                  desc: 'Wire Transfer', country: 'US' },
      { id: 'truist',      icon: '🟧', label: 'Truist Financial',               desc: 'Wire Transfer', country: 'US' },
      // ─── แคนาดา ───────────────────────────────────────────────────────────
      { id: 'rbc',         icon: '🔵', label: 'Royal Bank of Canada (RBC)',     desc: 'Wire / Interac', country: 'CA' },
      { id: 'td',          icon: '🟢', label: 'TD Bank (Toronto-Dominion)',     desc: 'Wire / Interac', country: 'CA' },
      { id: 'scotiabank',  icon: '🔴', label: 'Scotiabank',                     desc: 'Wire / Interac', country: 'CA' },
      { id: 'bmo',         icon: '🔵', label: 'BMO (Bank of Montreal)',         desc: 'Wire / Interac', country: 'CA' },
      { id: 'cibc',        icon: '🟥', label: 'CIBC',                           desc: 'Wire / Interac', country: 'CA' },
      { id: 'nbc',         icon: '🟦', label: 'National Bank of Canada',        desc: 'Wire / Interac', country: 'CA' },
      // ─── สหราชอาณาจักร ────────────────────────────────────────────────────
      { id: 'hsbc',        icon: '🔴', label: 'HSBC',                           desc: 'SWIFT / Online Banking', country: 'GB' },
      { id: 'barclays',    icon: '🔵', label: 'Barclays',                       desc: 'Barclays.net / SWIFT', country: 'GB' },
      { id: 'lloyds',      icon: '⬛', label: 'Lloyds Banking Group',           desc: 'SWIFT Transfer', country: 'GB' },
      { id: 'natwest',     icon: '🟣', label: 'NatWest Group',                  desc: 'SWIFT Transfer', country: 'GB' },
      { id: 'nationwide',  icon: '🔷', label: 'Nationwide Building Society',   desc: 'Online Banking', country: 'GB' },
      { id: 'standardch',  icon: '🟩', label: 'Standard Chartered',            desc: 'SWIFT / Online', country: 'GB' },
      // ─── ยุโรป ────────────────────────────────────────────────────────────
      { id: 'bnpparibas',  icon: '🟩', label: 'BNP Paribas (ฝรั่งเศส)',        desc: 'SEPA / SWIFT', country: 'FR' },
      { id: 'creditagri',  icon: '🟢', label: 'Crédit Agricole (ฝรั่งเศส)',    desc: 'SEPA / SWIFT', country: 'FR' },
      { id: 'socgen',      icon: '🔴', label: 'Société Générale (ฝรั่งเศส)',   desc: 'SEPA / SWIFT', country: 'FR' },
      { id: 'bpce',        icon: '🟦', label: 'Groupe BPCE (ฝรั่งเศส)',        desc: 'SEPA / SWIFT', country: 'FR' },
      { id: 'deutschebank',icon: '🔷', label: 'Deutsche Bank (เยอรมนี)',        desc: 'SEPA / SWIFT', country: 'DE' },
      { id: 'commerzbank', icon: '🟡', label: 'Commerzbank (เยอรมนี)',          desc: 'SEPA / SWIFT', country: 'DE' },
      { id: 'ubs',         icon: '🔴', label: 'UBS (สวิตเซอร์แลนด์)',          desc: 'SWIFT Transfer', country: 'CH' },
      { id: 'ing',         icon: '🟠', label: 'ING (เนเธอร์แลนด์)',            desc: 'SEPA / SWIFT', country: 'NL' },
      { id: 'rabobank',    icon: '🟩', label: 'Rabobank (เนเธอร์แลนด์)',       desc: 'SEPA / SWIFT', country: 'NL' },
      { id: 'abnamro',     icon: '🟡', label: 'ABN AMRO (เนเธอร์แลนด์)',       desc: 'SEPA / SWIFT', country: 'NL' },
      { id: 'santander',   icon: '🔴', label: 'Banco Santander (สเปน)',        desc: 'SEPA / SWIFT', country: 'ES' },
      { id: 'bbva',        icon: '🔵', label: 'BBVA (สเปน)',                   desc: 'SEPA / SWIFT', country: 'ES' },
      { id: 'caixabank',   icon: '🟦', label: 'CaixaBank (สเปน)',              desc: 'SEPA / SWIFT', country: 'ES' },
      { id: 'unicredit',   icon: '🔴', label: 'UniCredit (อิตาลี)',            desc: 'SEPA / SWIFT', country: 'IT' },
      { id: 'intesasp',    icon: '🟢', label: 'Intesa Sanpaolo (อิตาลี)',      desc: 'SEPA / SWIFT', country: 'IT' },
      { id: 'nordea',      icon: '🔵', label: 'Nordea (ฟินแลนด์/สแกนดิเนเวีย)', desc: 'SEPA / SWIFT', country: 'FI' },
      { id: 'seb',         icon: '🟩', label: 'SEB (สวีเดน)',                  desc: 'SEPA / SWIFT', country: 'SE' },
      { id: 'danskebank',  icon: '🔷', label: 'Danske Bank (เดนมาร์ก)',        desc: 'SEPA / SWIFT', country: 'DK' },
      { id: 'erste',       icon: '🟦', label: 'Erste Group (ออสเตรีย)',         desc: 'SEPA / SWIFT', country: 'AT' },
      { id: 'kbc',         icon: '🟢', label: 'KBC Group (เบลเยียม)',          desc: 'SEPA / SWIFT', country: 'BE' },
      // ─── ออสเตรเลีย / นิวซีแลนด์ ────────────────────────────────────────
      { id: 'cba',         icon: '🟡', label: 'Commonwealth Bank (ออสเตรเลีย)',desc: 'PayID / BSB', country: 'AU' },
      { id: 'anz',         icon: '🔵', label: 'ANZ (ออสเตรเลีย)',              desc: 'PayID / BSB', country: 'AU' },
      { id: 'nab',         icon: '🔴', label: 'NAB (ออสเตรเลีย)',              desc: 'PayID / BSB', country: 'AU' },
      { id: 'westpac',     icon: '🟥', label: 'Westpac (ออสเตรเลีย)',          desc: 'PayID / BSB', country: 'AU' },
      // ─── ละตินอเมริกา ─────────────────────────────────────────────────────
      { id: 'itau',        icon: '🟠', label: 'Itaú Unibanco (บราซิล)',        desc: 'PIX / SWIFT', country: 'BR' },
      { id: 'bradesco',    icon: '🔴', label: 'Bradesco (บราซิล)',             desc: 'PIX / SWIFT', country: 'BR' },
      { id: 'bancobrasil', icon: '🟡', label: 'Banco do Brasil',               desc: 'PIX / SWIFT', country: 'BR' },
      { id: 'bbva_mx',     icon: '🔵', label: 'BBVA México',                   desc: 'SPEI / SWIFT', country: 'MX' },
      { id: 'banamex',     icon: '🔴', label: 'Banamex (Citi México)',         desc: 'SPEI / SWIFT', country: 'MX' },
      { id: 'banorte',     icon: '🟩', label: 'Banorte (เม็กซิโก)',            desc: 'SPEI / SWIFT', country: 'MX' },
      // ─── แอฟริกา ──────────────────────────────────────────────────────────
      { id: 'standardbank',icon: '🔵', label: 'Standard Bank (แอฟริกาใต้)',   desc: 'EFT / SWIFT', country: 'ZA' },
      { id: 'firstrand',   icon: '🔴', label: 'FirstRand (FNB) (แอฟริกาใต้)', desc: 'EFT / SWIFT', country: 'ZA' },
      { id: 'absa',        icon: '🟥', label: 'Absa Bank (แอฟริกาใต้)',        desc: 'EFT / SWIFT', country: 'ZA' },
      { id: 'nedbank',     icon: '🟩', label: 'Nedbank (แอฟริกาใต้)',          desc: 'EFT / SWIFT', country: 'ZA' },
      { id: 'nbe',         icon: '🇪🇬', label: 'National Bank of Egypt',        desc: 'SWIFT Transfer', country: 'EG' },
      { id: 'ecobank',     icon: '🟢', label: 'Ecobank (แอฟริกาตะวันตก)',     desc: 'SWIFT Transfer', country: 'TG' },
      { id: 'accessbank',  icon: '🟦', label: 'Access Bank (ไนจีเรีย)',       desc: 'SWIFT Transfer', country: 'NG' },
      // ─── SWIFT ────────────────────────────────────────────────────────────
      { id: 'swift',       icon: '🌐', label: 'SWIFT / Wire Transfer',         desc: 'โอนจากธนาคารใดก็ได้ในโลก ผ่านรหัส SWIFT/BIC', tag: 'รองรับทุกธนาคาร' },
      { id: 'sepa',        icon: '🇪🇺', label: 'SEPA Transfer (ยูโรโซน)',       desc: 'โอนภายในยุโรป EUR', country: 'EU' },
      { id: 'ach',         icon: '🇺🇸', label: 'ACH Transfer (สหรัฐ)',          desc: 'โอนภายในสหรัฐอเมริกา USD', country: 'US' },
    ],
  },
  {
    id: 'crypto',
    label: '₿ Blockchain & Cryptocurrency',
    color: '#f97316',
    gateway: 'CRYPTO',
    methods: [
      { id: 'usdt_trc20',  icon: '₮',  label: 'USDT (TRC20 / Tron)',          desc: 'Stablecoin 1:1 USD, ค่าธรรมเนียมต่ำ',    tag: 'แนะนำ' },
      { id: 'usdt_erc20',  icon: '₮',  label: 'USDT (ERC20 / Ethereum)',      desc: 'Tether USD บน Ethereum' },
      { id: 'usdc',        icon: '🔵', label: 'USDC (USD Coin)',               desc: 'Stablecoin บน Ethereum / Solana' },
      { id: 'bitcoin',     icon: '₿',  label: 'Bitcoin (BTC)',                 desc: 'Bitcoin Network' },
      { id: 'ethereum',    icon: '⟠',  label: 'Ethereum (ETH)',               desc: 'Ethereum Network' },
      { id: 'bnb',         icon: '🟡', label: 'BNB (Binance Smart Chain)',      desc: 'BNB Chain / BSC' },
      { id: 'solana',      icon: '🔮', label: 'Solana (SOL)',                   desc: 'Solana Network, ค่าธรรมเนียมต่ำมาก' },
      { id: 'xrp',         icon: '🔷', label: 'XRP (Ripple)',                   desc: 'XRP Ledger, โอนเร็ว' },
      { id: 'ton',         icon: '💎', label: 'TON (Toncoin)',                  desc: 'The Open Network / Telegram Wallet' },
      { id: 'thb_token',   icon: '🪙', label: 'Thai Baht Stablecoin (THB)',    desc: 'Stablecoin THB บน Blockchain' },
    ],
  },
];

// ── สรุปสถิติ ─────────────────────────────────────────────────────────────────
export const PAYMENT_STATS = {
  total: PAYMENT_GROUPS.reduce((s, g) => s + g.methods.length, 0),
  countries: 40,
  currencies: 35,
  gateways: ['Omise/Opn', '2C2P', 'Stripe', 'PayPal', 'Crypto'],
};

// ── Gateway info ──────────────────────────────────────────────────────────────
export const GATEWAYS = {
  OMISE:  { name: 'Omise / Opn Payments', desc: 'ครอบคลุมไทย + SEA',          url: 'https://www.opn.ooo' },
  TWOC2P: { name: '2C2P',                  desc: 'SEA + นานาชาติ',             url: 'https://2c2p.com' },
  STRIPE: { name: 'Stripe',                desc: 'การ์ดนานาชาติ + PayPal',     url: 'https://stripe.com' },
  CRYPTO: { name: 'Blockchain',            desc: 'Decentralized Payment',      url: '#' },
  MANUAL: { name: 'Manual',                desc: 'โอนตรง + แจ้งสลิป',          url: '#' },
};
