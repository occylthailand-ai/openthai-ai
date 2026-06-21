import React, { useState } from 'react';
import PortalLayout from '../../components/PortalLayout';

const TRANSLATIONS = {
  th: { cta: 'ลงทะเบียนผู้ผลิต', featuresTitle: 'สิทธิประโยชน์สำหรับผู้ผลิต', stepsTitle: 'เริ่มต้นใน 3 ขั้นตอน', submit: 'ส่งคำขอลงทะเบียน', submitAnother: 'ส่งอีกครั้ง', formNote: 'ทีมงานจะติดต่อกลับภายใน 24 ชม.' },
  en: { cta: 'Register as Producer', featuresTitle: 'Producer Benefits', stepsTitle: 'Get Started in 3 Steps', submit: 'Submit Registration', submitAnother: 'Submit Another', formNote: 'Our team will contact you within 24 hours.' },
  zh: { cta: '注册为生产商', featuresTitle: '生产商权益', stepsTitle: '3步开始', submit: '提交注册', submitAnother: '再次提交', formNote: '我们的团队将在24小时内与您联系。' },
};

export default function ProducerPortalPage() {
  const [lang, setLang] = useState('th');
  const t = TRANSLATIONS[lang];

  return (
    <PortalLayout config={{
      icon: '🏭',
      title: lang === 'th' ? 'พอร์ทัลผู้ผลิต' : lang === 'en' ? 'Producer Portal' : '生产商门户',
      titleGrad: 'linear-gradient(90deg,#6366f1,#10b981)',
      sub: lang === 'th' ? 'เชื่อมต่อสินค้าของคุณกับ AI ไทย — ขายได้ทุกตลาดโลก ด้วยระบบ inventory อัตโนมัติและ AI Content ที่สร้างให้ฟรี' : lang === 'en' ? 'Connect your products to the Thai AI ecosystem — sell globally with automated inventory and free AI content generation' : '将您的产品连接到泰国AI生态系统——通过自动库存和免费AI内容生成在全球销售',
      color: '#6366f1',
      accent: '#10b981',
      lang, setLang, t,
      stats: [
        { value: '300+', label: lang === 'th' ? 'ผู้ผลิตในระบบ' : 'Producers' },
        { value: '12', label: lang === 'th' ? 'ประเทศส่งออก' : 'Export Countries' },
        { value: '24/7', label: lang === 'th' ? 'AI ทำงานให้' : 'AI Active' },
        { value: '฿0', label: lang === 'th' ? 'ค่าเริ่มต้น' : 'Setup Cost' },
      ],
      features: [
        { icon: '🤖', title: lang === 'th' ? 'AI Content ฟรีทุกสินค้า' : 'Free AI Content per Product', desc: lang === 'th' ? 'ระบบสร้าง Hook · Script · Caption · Hashtag สำหรับทุกสินค้าโดยอัตโนมัติ ใน 3 ภาษา' : 'Auto-generates Hook, Script, Caption, Hashtag for every product in 3 languages' },
        { icon: '📦', title: lang === 'th' ? 'Inventory อัตโนมัติ' : 'Automated Inventory', desc: lang === 'th' ? 'ระบบตัดสต็อกอัตโนมัติทุกครั้งที่มีออเดอร์ แจ้งเตือนเมื่อสินค้าใกล้หมด' : 'Auto-deducts stock on every order, alerts when inventory is low' },
        { icon: '🌍', title: lang === 'th' ? 'ขายได้ทั่วโลก' : 'Global Sales', desc: lang === 'th' ? 'เข้าถึงผู้ซื้อใน 12 ประเทศ พร้อมระบบ Tax Calculator ข้ามพรมแดน' : 'Reach buyers in 12 countries with built-in cross-border tax calculator' },
        { icon: '💰', title: lang === 'th' ? 'รับเงินตรง ไม่ผ่านคนกลาง' : 'Direct Payments', desc: lang === 'th' ? 'PromptPay · บัตรเครดิต · QR Code — เงินโอนตรงให้ผู้ผลิตทันทีหลังยืนยัน' : 'PromptPay · Credit Card · QR Code — funds transfer directly after confirmation' },
        { icon: '📊', title: lang === 'th' ? 'Dashboard ยอดขาย Real-time' : 'Real-time Sales Dashboard', desc: lang === 'th' ? 'ดูยอดขาย ออเดอร์ สต็อก และ trend สินค้าแบบ real-time ในหน้าเดียว' : 'View sales, orders, stock, and trends in real-time on one dashboard' },
        { icon: '🤝', title: lang === 'th' ? 'Affiliate Network' : 'Affiliate Network', desc: lang === 'th' ? 'Creator และ Affiliate แชร์สินค้าคุณ รับ commission อัตโนมัติ ไม่ต้องจ้างทีมขาย' : 'Creators and affiliates promote your products automatically with commission payouts' },
      ],
      steps: [
        { title: lang === 'th' ? 'กรอกฟอร์มลงทะเบียน' : 'Fill Registration Form', desc: lang === 'th' ? 'ระบุข้อมูลบริษัท ประเภทสินค้า และช่องทางติดต่อ' : 'Provide company info, product type, and contact details' },
        { title: lang === 'th' ? 'ทีมงานยืนยันและ onboard' : 'Team Verification & Onboarding', desc: lang === 'th' ? 'ทีมงานติดต่อกลับภายใน 24 ชม. เพื่อยืนยันและเพิ่มสินค้าเข้าระบบ' : 'Team contacts within 24h to verify and add your products to the system' },
        { title: lang === 'th' ? 'เริ่มขายและรับออเดอร์' : 'Start Selling & Receiving Orders', desc: lang === 'th' ? 'สินค้าปรากฏใน AI Store ทันที AI Content Generator สร้าง content ให้อัตโนมัติ' : 'Products appear in AI Store immediately. AI generates content automatically' },
      ],
      formTitle: lang === 'th' ? 'ลงทะเบียนเป็นผู้ผลิต' : lang === 'en' ? 'Register as Producer' : '注册为生产商',
      formFields: [
        { key: 'name', label: lang === 'th' ? 'ชื่อบริษัท / ผู้ผลิต' : 'Company / Producer Name', placeholder: 'OpenThai Co., Ltd.' },
        { key: 'product', label: lang === 'th' ? 'ประเภทสินค้า' : 'Product Type', type: 'select', options: lang === 'th' ? ['สินค้า OTOP', 'อาหาร & เครื่องดื่ม', 'เสื้อผ้า & แฟชั่น', 'สมุนไพร & ความงาม', 'ของใช้ในบ้าน', 'อิเล็กทรอนิกส์', 'อื่นๆ'] : ['OTOP Products', 'Food & Beverage', 'Fashion', 'Herbal & Beauty', 'Home Goods', 'Electronics', 'Other'] },
        { key: 'country', label: lang === 'th' ? 'ประเทศ' : 'Country', placeholder: 'Thailand' },
        { key: 'email', label: lang === 'th' ? 'อีเมลติดต่อ' : 'Contact Email', type: 'email', placeholder: 'contact@company.com' },
        { key: 'phone', label: lang === 'th' ? 'เบอร์โทร' : 'Phone', placeholder: '+66 8x-xxx-xxxx' },
        { key: 'monthly_volume', label: lang === 'th' ? 'ปริมาณสินค้าต่อเดือน (โดยประมาณ)' : 'Est. Monthly Volume', type: 'select', options: lang === 'th' ? ['< 100 ชิ้น', '100–500 ชิ้น', '500–2000 ชิ้น', '2000+ ชิ้น'] : ['< 100 units', '100–500 units', '500–2000 units', '2000+ units'] },
      ],
      apiEndpoint: '/api/leads/submit',
      successMsg: lang === 'th' ? 'ส่งคำขอเรียบร้อย! ทีมงานจะติดต่อกลับภายใน 24 ชม.' : 'Request received! Team will contact you within 24 hours.',
    }} />
  );
}
