const fs = require('fs');
const dir = 'C:/Openthai.ai/all-platform-files';

// ========================================
// GLOBAL PRODUCT CATALOG - ALL CONTINENTS
// ========================================

const continents = [
  // ========================================
  // ASIA - THAILAND
  // ========================================
  {id:'products-thailand',name:'ThailandProducts',color:'#0066CC',icon:'🇹🇭',
   continent:'Asia',country:'Thailand',
   steps:45,sections:8,users:'สินค้าไทย OTOP + Export',
   desc:'สินค้าไทยส่งออกทั่วโลก — OTOP / สมุนไพร / อาหาร / ผ้าไหม / เครื่องเงิน',
   categories:[
     {name:'อาหารและเครื่องดื่ม',items:['ข้าวหอมมะลิ','น้ำมันมะพร้าว','กะทิ','ซอสพริก/น้ำปลา','ผลไม้อบแห้ง (มะม่วง/ทุเรียน/มังคุด)','ชาไทย/กาแฟไทย','ขนมไทย','บะหมี่กึ่งสำเร็จรูป','เครื่องแกง','น้ำผึ้ง']},
     {name:'สมุนไพรและสุขภาพ',items:['ขมิ้นชัน/ขิง','ตะไคร้หอม','น้ำมันนวด/ยาหม่อง','สมุนไพรลูกประคบ','ผลิตภัณฑ์ว่านหางจระเข้','ชาสมุนไพร','ยาดม','แคปซูลสมุนไพร']},
     {name:'ความงามและสปา',items:['สบู่สมุนไพร','ครีมบำรุง/มาส์กหน้า','น้ำมันหอมระเหย','ผลิตภัณฑ์สปา','แชมพู/ครีมนวดสมุนไพร','ลิปบาล์มธรรมชาติ']},
     {name:'ผ้าไหมและสิ่งทอ',items:['ผ้าไหมไทย','ผ้าขาวม้า','ผ้าบาติก','กระเป๋าผ้า','ผ้าพันคอ','เสื้อผ้าแฟชั่นไทย']},
     {name:'หัตถกรรมและเครื่องประดับ',items:['เครื่องเงิน','เครื่องจักสาน','เซรามิกเบญจรงค์','ไม้แกะสลัก','เครื่องประดับหิน','กล่องเครื่องเขิน']},
     {name:'ของใช้ในบ้าน',items:['เครื่องครัวไม้','จานชามเซรามิก','เทียนหอม','ตะเกียบ/ช้อนไม้','พัดใบลาน','กระถางดินเผา']},
     {name:'สินค้าเกษตร',items:['ยางพารา','มันสำปะหลัง','น้ำตาลมะพร้าว','กุ้งแห้ง/ปลาแห้ง','เครื่องเทศ','ผลไม้สด (ทุเรียน/มังคุด/ลำไย)']},
     {name:'สินค้า Tech/Digital',items:['อุปกรณ์ IoT','ชิ้นส่วนอิเล็กทรอนิกส์','HDD/SSD','อุปกรณ์มือถือ','Solar Panel','EV Parts']}
   ]},

  // ========================================
  // ASIA - CHINA
  // ========================================
  {id:'products-china',name:'ChinaProducts',color:'#DE2910',icon:'🇨🇳',
   continent:'Asia',country:'China',
   steps:50,sections:10,users:'สินค้าจีน Cross-border',
   desc:'สินค้าจีนขายทั่วโลก — Electronics / Fashion / Home / Gadget',
   categories:[
     {name:'อิเล็กทรอนิกส์',items:['สมาร์ทโฟน','แท็บเล็ต','หูฟังไร้สาย','พาวเวอร์แบงค์','สมาร์ทวอทช์','กล้องวงจรปิด','โดรน','LED Lights']},
     {name:'แฟชั่น',items:['เสื้อผ้าผู้หญิง','เสื้อผ้าผู้ชาย','รองเท้า','กระเป๋า','เครื่องประดับ','แว่นตา','ผ้าพันคอ']},
     {name:'ของใช้ในบ้าน',items:['เครื่องใช้ไฟฟ้า','เครื่องครัว','เฟอร์นิเจอร์','ของตกแต่งบ้าน','เครื่องนอน','อุปกรณ์ทำความสะอาด']},
     {name:'ของเล่นและเกม',items:['ของเล่นเด็ก','Board Games','RC Cars','Puzzle','Educational Toys','Action Figures']},
     {name:'ความงาม',items:['เครื่องสำอาง','Skincare','เครื่องมือทำผม','แปรงแต่งหน้า','มาส์กหน้า','เซรั่ม']},
     {name:'กีฬาและ Outdoor',items:['อุปกรณ์ออกกำลังกาย','เสื้อผ้ากีฬา','จักรยาน','อุปกรณ์แคมป์ปิ้ง','Yoga Mat','กระเป๋าเดินทาง']},
     {name:'ยานยนต์',items:['อะไหล่รถยนต์','อุปกรณ์ตกแต่งรถ','กล้องติดรถ','เครื่องฟอกอากาศในรถ','ที่ชาร์จในรถ']},
     {name:'อุปกรณ์ IT',items:['คีย์บอร์ด/เมาส์','จอมอนิเตอร์','Router/Switch','USB Hub','Webcam','Microphone']},
     {name:'สัตว์เลี้ยง',items:['อาหารสัตว์','ของเล่นสัตว์','เสื้อผ้าสัตว์','อุปกรณ์กรง','แปรงขน','GPS Tracker']},
     {name:'วัสดุก่อสร้าง',items:['กระเบื้อง','สุขภัณฑ์','ก๊อกน้ำ','ไฟ LED','สายไฟ','เครื่องมือช่าง']}
   ]},

  // ASIA - JAPAN
  {id:'products-japan',name:'JapanProducts',color:'#BC002D',icon:'🇯🇵',
   continent:'Asia',country:'Japan',steps:40,sections:8,users:'สินค้าญี่ปุ่น Premium',
   desc:'สินค้าญี่ปุ่นพรีเมี่ยม — Skincare / Snacks / Anime / Tech',
   categories:[
     {name:'ความงาม Skincare',items:['Shiseido','SK-II','CANMAKE','DHC','Biore','Hada Labo','Sheet Mask','Sunscreen']},
     {name:'อาหารและขนม',items:['ชาเขียว Matcha','KitKat รสพิเศษ','Pocky','ราเมนกึ่งสำเร็จรูป','วาซาบิ','ซอสถั่วเหลือง','Mochi','Sake']},
     {name:'Anime/Manga',items:['ฟิกเกอร์','Manga','Gashapon','Plush Toys','Cosplay','Stationery Anime']},
     {name:'เทคโนโลยี',items:['กล้อง Canon/Nikon/Sony','หูฟัง Sony/Audio-Technica','เครื่องเล่นเกม Nintendo','คีย์บอร์ด Mechanical','Smart Home']},
     {name:'เครื่องใช้ในบ้าน',items:['มีด Japanese Knife','เซรามิก Arita','ผ้าขนหนู Imabari','เครื่องครัว Muji','กระติกน้ำ Zojirushi']},
     {name:'แฟชั่น',items:['Uniqlo','Comme des Garcons','Issey Miyake','กิโมโน','Streetwear Harajuku']},
     {name:'สุขภาพ',items:['Supplement DHC','Eye Drops','ยาสามัญประจำบ้าน','Collagen','Vitamin']},
     {name:'เครื่องเขียน',items:['ปากกา Pilot/Zebra','สมุด Kokuyo','ดินสอกด Pentel','Washi Tape','Planner']}
   ]},

  // ASIA - KOREA
  {id:'products-korea',name:'KoreaProducts',color:'#003478',icon:'🇰🇷',
   continent:'Asia',country:'Korea',steps:40,sections:7,users:'สินค้าเกาหลี K-Beauty/K-Pop',
   desc:'สินค้าเกาหลี — K-Beauty / K-Pop / K-Food / K-Fashion',
   categories:[
     {name:'K-Beauty',items:['Sheet Mask','BB Cream','Cushion Foundation','Serum/Essence','Lip Tint','Sunscreen','Skincare Set','Snail Cream']},
     {name:'K-Pop Merchandise',items:['Album BTS/BLACKPINK','Photocard','Lightstick','Poster','Keychain','T-Shirt Official']},
     {name:'K-Food',items:['Ramyeon (มาม่าเกาหลี)','Kimchi','Gochujang','Soju','Korean Snack','Seaweed','Tteokbokki','Korean BBQ Sauce']},
     {name:'K-Fashion',items:['เสื้อผ้า Korean Style','กระเป๋า','รองเท้า','แว่นตา','เครื่องประดับ']},
     {name:'เทคโนโลยี',items:['Samsung Galaxy','LG Electronics','Hyundai Accessories','Korean Keyboard']},
     {name:'Health',items:['Ginseng (โสมเกาหลี)','Vitamin','Collagen','Probiotics','Red Ginseng Extract']},
     {name:'Lifestyle',items:['เครื่องใช้ Kakao Friends','LINE Friends','Stationery Cute','Home Decor Minimalist']}
   ]},

  // ASIA - INDIA
  {id:'products-india',name:'IndiaProducts',color:'#FF9933',icon:'🇮🇳',
   continent:'Asia',country:'India',steps:40,sections:7,users:'สินค้าอินเดีย Spice/Textile/Ayurveda',
   desc:'สินค้าอินเดีย — เครื่องเทศ / ผ้า / Ayurveda / Jewelry / IT Services',
   categories:[
     {name:'เครื่องเทศ',items:['Turmeric','Cardamom','Cumin','Chili Powder','Garam Masala','Saffron','Black Pepper','Cinnamon']},
     {name:'Ayurveda/สมุนไพร',items:['Ashwagandha','Tulsi','Neem','Triphala','Ayurvedic Oil','Herbal Tea','Amla']},
     {name:'ผ้าและสิ่งทอ',items:['ผ้าไหม Silk Saree','ผ้า Pashmina','Cotton Organic','Jute Bags','Handloom','Embroidery']},
     {name:'เครื่องประดับ',items:['เครื่องเงิน','Kundan Jewelry','Bangle','Beads','Handicraft Jewelry']},
     {name:'ชาและกาแฟ',items:['Darjeeling Tea','Assam Tea','Chai Masala','Indian Coffee','Herbal Tea']},
     {name:'หัตถกรรม',items:['Marble Inlay','Wood Carving','Brass Handicraft','Pottery','Leather Goods']},
     {name:'IT/Software',items:['Software Development','Mobile App','Web Development','AI/ML Services','Cloud Services']}
   ]},

  // ASIA - VIETNAM
  {id:'products-vietnam',name:'VietnamProducts',color:'#DA251D',icon:'🇻🇳',
   continent:'Asia',country:'Vietnam',steps:35,sections:6,users:'สินค้าเวียดนาม',
   desc:'สินค้าเวียดนาม — กาแฟ / Cashew / Textile / Furniture / Seafood',
   categories:[
     {name:'กาแฟ',items:['Vietnamese Coffee Robusta','Ca Phe Sua Da','Weasel Coffee','Coffee Filter Phin']},
     {name:'อาหาร',items:['Pho Noodle','Fish Sauce Nuoc Mam','Cashew Nuts','Dried Fruits','Rice Paper','Spring Roll']},
     {name:'หัตถกรรม',items:['เครื่องเขิน Lacquerware','Silk Lantern','Bamboo Craft','Conical Hat Non La','Ceramic Bat Trang']},
     {name:'สิ่งทอ',items:['Ao Dai','Silk','Cotton Garment','Shoes/Sandals','Bags']},
     {name:'เฟอร์นิเจอร์',items:['Rattan Furniture','Bamboo Furniture','Wood Furniture','Home Decor']},
     {name:'Seafood',items:['Shrimp','Pangasius Fish','Squid','Dried Seafood']}
   ]},

  // ASIA - INDONESIA
  {id:'products-indonesia',name:'IndonesiaProducts',color:'#FF0000',icon:'🇮🇩',
   continent:'Asia',country:'Indonesia',steps:35,sections:6,users:'สินค้าอินโดนีเซีย',
   desc:'สินค้าอินโดนีเซีย — Batik / Coffee / Spice / Rattan / Palm Oil',
   categories:[
     {name:'Batik และสิ่งทอ',items:['ผ้า Batik','Ikat Weaving','Songket','Kebaya','Sarong']},
     {name:'กาแฟและอาหาร',items:['Kopi Luwak','Toraja Coffee','Rendang Paste','Sambal','Krupuk','Tempeh Chips']},
     {name:'เครื่องเทศ',items:['Clove','Nutmeg','Vanilla','Cinnamon','White Pepper']},
     {name:'หัตถกรรม',items:['Rattan Basket','Wood Carving Bali','Silver Jewelry Bali','Wayang Puppet','Ceramic']},
     {name:'ความงาม',items:['Jamu Herbal','Coconut Oil','Lulur Scrub','Boreh Mask']},
     {name:'เฟอร์นิเจอร์',items:['Teak Furniture','Rattan Furniture','Bamboo Products','Garden Furniture']}
   ]},

  // ========================================
  // EUROPE
  // ========================================
  {id:'products-europe',name:'EuropeProducts',color:'#003399',icon:'🇪🇺',
   continent:'Europe',country:'EU Multi',steps:45,sections:9,users:'สินค้ายุโรป Premium',
   desc:'สินค้ายุโรป — Fashion / Wine / Cheese / Luxury / Design / Organic',
   categories:[
     {name:'แฟชั่น Luxury',items:['กระเป๋า Designer (FR/IT)','รองเท้า Italian','นาฬิกา Swiss','แว่นตา Italian','เครื่องหนัง','Perfume FR']},
     {name:'ไวน์และเครื่องดื่ม',items:['Wine FR/IT/ES','Champagne','Whisky Scotch','Beer DE/BE','Olive Oil IT/ES/GR','Gin UK']},
     {name:'ชีสและอาหาร',items:['Cheese FR/IT/NL/CH','Chocolate BE/CH','Pasta IT','Jamón ES','Sausage DE','Truffle IT']},
     {name:'เครื่องสำอาง',items:['Skincare FR','Makeup IT','Natural Cosmetics DE','Organic Beauty Nordic']},
     {name:'Design/Home',items:['Scandinavian Design','German Engineering','Italian Furniture','Dutch Design','Porcelain']},
     {name:'Organic/Bio',items:['Organic Food','Bio Cosmetics','Fair Trade Coffee','Natural Supplements','Herbal Tea']},
     {name:'เทคโนโลยี',items:['Bosch/Siemens DE','Philips NL','Nokia FI','Dyson UK','IKEA SE']},
     {name:'ยานยนต์',items:['BMW/Mercedes Parts','VW Accessories','Volvo Parts','Fiat Parts']},
     {name:'กีฬา',items:['Football Merchandise','Cycling Gear','Ski Equipment','Running Shoes EU']}
   ]},

  // ========================================
  // AFRICA
  // ========================================
  {id:'products-africa',name:'AfricaProducts',color:'#009639',icon:'🌍',
   continent:'Africa',country:'Africa Multi',steps:35,sections:7,users:'สินค้าแอฟริกา',
   desc:'สินค้าแอฟริกา — Coffee / Cocoa / Shea Butter / Fabric / Mineral',
   categories:[
     {name:'กาแฟและโกโก้',items:['Ethiopian Coffee','Kenyan Coffee','Ghana Cocoa','Ivory Coast Cocoa','Rwanda Coffee']},
     {name:'Shea Butter และความงาม',items:['Shea Butter Raw','African Black Soap','Marula Oil','Baobab Oil','Moringa Oil']},
     {name:'ผ้าและแฟชั่น',items:['Ankara Fabric','Kente Cloth','Dashiki','Maasai Beads','African Print']},
     {name:'หัตถกรรม',items:['Wood Carving','Basket Weaving','Beadwork','Soapstone','Mask Decoration']},
     {name:'อาหาร',items:['Rooibos Tea ZA','Dried Fruits','Macadamia Nuts','Moringa Powder','Baobab Powder']},
     {name:'แร่ธาตุ',items:['Tanzanite','Diamond (certified)','Gold Jewelry','Copper Craft']},
     {name:'เกษตร',items:['Cashew Nuts','Sesame Seeds','Vanilla Madagascar','Clove Zanzibar','Avocado']}
   ]},

  // ========================================
  // LATIN AMERICA
  // ========================================
  {id:'products-latam',name:'LatamProducts',color:'#009B3A',icon:'🌎',
   continent:'LatinAmerica',country:'LATAM Multi',steps:35,sections:7,users:'สินค้าละตินอเมริกา',
   desc:'สินค้าละตินอเมริกา — Coffee / Cacao / Silver / Textile / Superfoods',
   categories:[
     {name:'กาแฟ',items:['Colombian Coffee','Brazilian Coffee','Costa Rica Coffee','Guatemala Coffee','Peru Coffee']},
     {name:'โกโก้และช็อกโกแลต',items:['Cacao Ecuador','Chocolate Mexico','Cacao Peru','Artisan Chocolate']},
     {name:'Superfoods',items:['Quinoa','Chia Seeds','Acai Berry','Maca Root','Spirulina','Camu Camu']},
     {name:'เครื่องเงินและหัตถกรรม',items:['Silver Mexico','Alpaca Wool Peru','Hammock','Pottery','Leather Argentina']},
     {name:'ผ้าและแฟชั่น',items:['Alpaca Sweater','Poncho','Panama Hat','Huarache Sandals','Embroidered Blouse']},
     {name:'อาหาร',items:['Tequila/Mezcal MX','Yerba Mate AR','Dulce de Leche','Hot Sauce','Achiote']},
     {name:'เครื่องดื่ม',items:['Pisco Peru/Chile','Rum Caribbean','Cachaca Brazil','Mate Tea','Horchata']}
   ]},

  // ========================================
  // MIDDLE EAST
  // ========================================
  {id:'products-middleeast',name:'MiddleEastProducts',color:'#006C35',icon:'🕌',
   continent:'MiddleEast',country:'ME Multi',steps:35,sections:7,users:'สินค้าตะวันออกกลาง',
   desc:'สินค้าตะวันออกกลาง — Dates / Saffron / Oud / Carpet / Gold / Halal',
   categories:[
     {name:'อินทผลัมและอาหาร',items:['Medjool Dates','Ajwa Dates','Halva','Baklava','Tahini','Hummus','Zaatar']},
     {name:'น้ำหอมและ Oud',items:['Oud Oil','Bakhoor','Arabian Perfume','Attar','Incense']},
     {name:'Saffron',items:['Iranian Saffron','Afghan Saffron','Saffron Powder','Saffron Thread']},
     {name:'พรม Carpet',items:['Persian Carpet','Turkish Carpet','Kilim','Prayer Rug']},
     {name:'ทองและเครื่องประดับ',items:['Gold Jewelry Dubai','Silver','Pearl','Gemstone']},
     {name:'สินค้าฮาลาล',items:['Halal Food Products','Halal Cosmetics','Halal Supplements','Modest Fashion']},
     {name:'หัตถกรรม',items:['Mosaic Lamp Turkey','Ceramics','Calligraphy Art','Lantern','Brass Work']}
   ]},

  // ========================================
  // NORTH AMERICA
  // ========================================
  {id:'products-northamerica',name:'NorthAmericaProducts',color:'#002868',icon:'🇺🇸',
   continent:'NorthAmerica',country:'US/CA',steps:40,sections:8,users:'สินค้าอเมริกา/แคนาดา',
   desc:'สินค้าอเมริกาเหนือ — Tech / Fashion / Supplements / Organic / Entertainment',
   categories:[
     {name:'เทคโนโลยี',items:['Apple Products','Google Devices','Amazon Devices','Gaming PC Parts','Software/SaaS']},
     {name:'แฟชั่น',items:['Nike/Adidas','Levi\'s','Ralph Lauren','Coach','Victoria\'s Secret']},
     {name:'สุขภาพ Supplements',items:['Whey Protein','Vitamins','Probiotics','CBD Products','Organic Supplements']},
     {name:'Organic/Natural',items:['Organic Food','Natural Skincare','Essential Oils','Honey','Maple Syrup CA']},
     {name:'Entertainment',items:['Vinyl Records','Board Games','Collectibles','Sports Memorabilia','Disney Merchandise']},
     {name:'Outdoor',items:['Camping Gear','Fishing Equipment','BBQ/Grill','Hunting Accessories']},
     {name:'Pet Products',items:['Premium Dog Food','Cat Toys','Pet Supplements','Pet Clothing','Pet Tech']},
     {name:'Home',items:['Kitchen Gadgets','Smart Home','Bedding','Candles','Wall Art']}
   ]},

  // ========================================
  // OCEANIA
  // ========================================
  {id:'products-oceania',name:'OceaniaProducts',color:'#00008B',icon:'🇦🇺',
   continent:'Oceania',country:'AU/NZ',steps:30,sections:6,users:'สินค้าออสเตรเลีย/นิวซีแลนด์',
   desc:'สินค้าโอเชียเนีย — Manuka Honey / Wool / Wine / Skincare / Organic',
   categories:[
     {name:'น้ำผึ้ง Manuka',items:['Manuka Honey NZ','Manuka Skincare','Propolis','Bee Pollen']},
     {name:'ขนสัตว์ Wool',items:['Merino Wool AU','Possum Merino NZ','Sheepskin','UGG Boots']},
     {name:'ไวน์',items:['Shiraz AU','Sauvignon Blanc NZ','Pinot Noir NZ','Chardonnay AU']},
     {name:'สุขภาพ',items:['Vitamin AU','Collagen','Fish Oil','Probiotic','Tea Tree Oil']},
     {name:'Organic Food',items:['Organic Beef','Dairy Products','Macadamia','Avocado Oil']},
     {name:'Aboriginal/Maori Art',items:['Aboriginal Art','Maori Carving','Greenstone Jade NZ','Boomerang']}
   ]}
];

let created = 0;
let totalSteps = 0;
let totalProducts = 0;

continents.forEach(c => {
  const productCount = c.categories.reduce((s,cat) => s + cat.items.length, 0);
  totalProducts += productCount;

  // HTML Section with product catalog
  const catHtml = c.categories.map((cat,i) =>
    `<div style="margin:12px 0;padding:12px;background:#fff;border-radius:8px;border-left:3px solid ${c.color};">
    <h4 style="margin:0 0 8px;color:${c.color};">${cat.name} (${cat.items.length} รายการ)</h4>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">${cat.items.map(item =>
      `<span style="background:#f0f0f0;padding:4px 10px;border-radius:12px;font-size:13px;">${item}</span>`
    ).join('')}</div></div>`
  ).join('\n');

  const html = `<!-- Openthai.ai - ${c.name} Product Catalog -->
<section id="${c.id}" style="max-width:900px;margin:2rem auto;padding:2rem;font-family:'Sarabun',sans-serif;background:#f8f9fa;border-radius:16px;">
<h2 style="text-align:center;color:${c.color};font-size:2rem;">${c.icon} ${c.country} — ${productCount} สินค้า</h2>
<p style="text-align:center;color:#666;">${c.desc}</p>
<p style="text-align:center;"><strong>${c.categories.length} หมวด | ${productCount} รายการ | พร้อมขายบนทุกแพลตฟอร์ม</strong></p>
${catHtml}
<div style="text-align:center;margin-top:2rem;padding:1rem;background:${c.color};border-radius:12px;">
<p style="color:#fff;margin:0;">🤖 Openthai.ai ช่วยเขียน Product Description ทุกภาษา ทุกแพลตฟอร์ม</p>
<a href="/generate" style="display:inline-block;margin-top:8px;padding:10px 24px;background:#fff;color:${c.color};border-radius:20px;text-decoration:none;font-weight:bold;">สร้าง Product Content →</a>
</div>
</section>`;
  fs.writeFileSync(dir + '/' + c.id + '-catalog.html', html);

  // HTML Guide
  const guide = `<html><head><meta charset="utf-8"><style>body{font-family:Sarabun,sans-serif;max-width:700px;margin:0 auto;padding:20px;line-height:1.6}h1{color:${c.color};border-bottom:3px solid ${c.color}}h3{color:${c.color};margin-top:20px}span{background:#f0f0f0;padding:2px 8px;border-radius:8px;margin:2px;display:inline-block;font-size:13px}</style></head><body>
<h1>${c.icon} ${c.country} Product Catalog</h1>
<p>${c.desc}</p>
<p><strong>${c.categories.length} หมวด | ${productCount} รายการสินค้า</strong></p>
${c.categories.map(cat => `<h3>${cat.name} (${cat.items.length})</h3><p>${cat.items.map(i => `<span>${i}</span>`).join(' ')}</p>`).join('')}
<hr><p><em>สร้างโดย Openthai.ai — www.Openthai.ai.com</em></p></body></html>`;
  fs.writeFileSync(dir + '/Openthai.ai_' + c.name + '_Catalog.html', guide);

  // JSON Product Database
  const json = JSON.stringify({
    continent: c.continent,
    country: c.country,
    totalProducts: productCount,
    categories: c.categories
  }, null, 2);
  fs.writeFileSync(dir + '/' + c.id + '.json', json);

  created++;
  totalSteps += c.steps;
  console.log(created + '. ' + c.icon + ' ' + c.country + ': ' + productCount + ' products | ' + c.categories.length + ' categories ✓');
});

console.log('\n=== GLOBAL PRODUCT CATALOG DONE ===');
console.log('Continents/Countries: ' + created);
console.log('Total Products: ' + totalProducts);
console.log('Total Categories: ' + continents.reduce((s,c) => s + c.categories.length, 0));
