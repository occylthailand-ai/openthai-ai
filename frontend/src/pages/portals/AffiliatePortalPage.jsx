import React, { useState } from 'react';
import PortalLayout from '../../components/PortalLayout';

const T = {
  th: { cta: 'สมัคร Affiliate', featuresTitle: 'ทำไมต้องเป็น Affiliate กับเรา', stepsTitle: 'เริ่มสร้างรายได้', submit: 'สมัครทันที', submitAnother: 'สมัครอีก', formNote: 'ได้รับ link พิเศษภายใน 1 ชั่วโมง ค่าตอบแทนโปร่งใส' },
  en: { cta: 'Join Affiliate', featuresTitle: 'Why Join Our Affiliate Program', stepsTitle: 'Start Earning', submit: 'Apply Now', submitAnother: 'Apply Again', formNote: 'Receive your unique link within 1 hour. Transparent compensation.' },
  zh: { cta: '加入联盟', featuresTitle: '为什么加入联盟计划', stepsTitle: '开始赚钱', submit: '立即申请', submitAnother: '再次申请', formNote: '1小时内收到专属链接。透明佣金。' },
};

export default function AffiliatePortalPage() {
  const [lang, setLang] = useState('th');
  const t = T[lang];
  return (
    <PortalLayout config={{
      icon: '🤝',
      title: lang === 'th' ? 'พอร์ทัล Affiliate' : lang === 'en' ? 'Affiliate Portal' : '联盟门户',
      titleGrad: 'linear-gradient(90deg,#f59e0b,#ef4444)',
      sub: lang === 'th' ? 'แชร์ link — รับเงินทุก platform ทันทีที่ยอดขายเสร็จสิ้น ค่าตอบแทนโปร่งใส ชัดเจน ไม่มีเงื่อนไขซับซ้อน' : lang === 'en' ? 'Share a link — earn from every platform instantly when sales complete. Transparent, no hidden conditions.' : '分享链接——销售完成即时到账，透明无隐藏条件。',
      color: '#f59e0b', accent: '#ef4444',
      lang, setLang, t,
      stats: [
        { value: '10%', label: 'TikTok / Shopee / Lazada' },
        { value: '8%', label: 'FB / Instagram / Line' },
        { value: '24h', label: lang === 'th' ? 'โอนเงินรวดเร็ว' : 'Fast Payout' },
        { value: '฿0', label: lang === 'th' ? 'ค่าสมัคร' : 'Signup Cost' },
      ],
      features: [
        { icon: '🔗', title: lang === 'th' ? 'Link พิเศษประจำตัว' : 'Unique Affiliate Link', desc: lang === 'th' ? 'รับ link เฉพาะตัวทันทีหลังสมัคร แชร์ได้ทุก platform ระบบติดตาม click และ conversion อัตโนมัติ' : 'Get a unique link instantly. Works on all platforms. Auto-tracks clicks and conversions.' },
        { icon: '💸', title: lang === 'th' ? 'Commission อัตโนมัติ' : 'Auto Commission', desc: lang === 'th' ? 'TikTok/Shopee/Lazada 10% | FB/IG/Line 8% โอนทันทีที่เงินเข้า OpenThai.ai' : 'TikTok/Shopee/Lazada 10% | FB/IG/Line 8%. Paid the moment funds reach OpenThai.ai.' },
        { icon: '📊', title: lang === 'th' ? 'Dashboard Real-time' : 'Real-time Dashboard', desc: lang === 'th' ? 'ดู click, conversion, ยอดขาย และ commission แยกตาม platform' : 'View clicks, conversions, and commissions by platform in real-time.' },
        { icon: '🌐', title: lang === 'th' ? 'ครบทุก Platform' : 'All Platforms', desc: lang === 'th' ? 'TikTok · Shopee · Lazada · Facebook · Instagram · Line ในบัญชีเดียว' : 'TikTok · Shopee · Lazada · Facebook · Instagram · Line — all in one account.' },
        { icon: '👥', title: lang === 'th' ? 'Multi-Level Referral' : 'Multi-Level Referral', desc: lang === 'th' ? 'แนะนำ Affiliate คนอื่น รับ bonus เพิ่ม โครงสร้างโปร่งใส' : 'Refer others, earn bonus commissions. Transparent structure.' },
        { icon: '🤖', title: lang === 'th' ? 'AI ช่วยสร้าง Content' : 'AI Content Help', desc: lang === 'th' ? 'ใช้ AI Content Generator สร้าง caption + hashtag สำหรับสินค้าที่แชร์ได้ฟรี' : 'Free AI-generated captions and hashtags for products you promote.' },
      ],
      steps: [
        { title: lang === 'th' ? 'สมัครและรับ Affiliate Code' : 'Apply & Get Code', desc: lang === 'th' ? 'กรอกฟอร์มด้านล่าง รับ affiliate_code และ link ภายใน 1 ชั่วโมง' : 'Fill the form, receive your code and link within 1 hour.' },
        { title: lang === 'th' ? 'แชร์ Link บน Platform ที่ถนัด' : 'Share on Your Platform', desc: lang === 'th' ? 'โพสต์ link ใน TikTok, Shopee, FB, IG, Line หรือช่องทางที่มีผู้ชม' : 'Post your link wherever your audience is.' },
        { title: lang === 'th' ? 'รับ Commission อัตโนมัติ' : 'Get Paid Automatically', desc: lang === 'th' ? 'เมื่อยอดขายเสร็จและเงินเข้า OpenThai.ai ระบบโอนให้คุณทันที' : 'When a sale clears, the system transfers your commission immediately.' },
      ],
      formTitle: lang === 'th' ? 'สมัครเป็น Affiliate' : lang === 'en' ? 'Join Affiliate Program' : '申请联盟计划',
      formFields: [
        { key: 'name', label: lang === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name', placeholder: lang === 'th' ? 'สมชาย ใจดี' : 'John Doe' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
        { key: 'phone', label: lang === 'th' ? 'เบอร์โทร' : 'Phone', placeholder: '+66 8x-xxx-xxxx' },
        { key: 'primary_platform', label: lang === 'th' ? 'Platform หลัก' : 'Primary Platform', type: 'select', options: ['TikTok', 'Shopee', 'Lazada', 'Facebook', 'Instagram', 'Line', 'YouTube', 'Other'] },
        { key: 'audience_size', label: lang === 'th' ? 'ขนาดผู้ติดตาม' : 'Audience Size', type: 'select', options: ['< 1,000', '1,000–10,000', '10,000–100,000', '100,000+'] },
      ],
      apiEndpoint: '/api/affiliate/apply',
      successMsg: lang === 'th' ? 'สมัครเรียบร้อย! รับ Affiliate Link ภายใน 1 ชั่วโมง' : 'Registered! Your Affiliate Link will arrive within 1 hour.',
    }} />
  );
}
