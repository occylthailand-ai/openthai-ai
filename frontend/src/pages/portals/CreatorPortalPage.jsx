import React, { useState } from 'react';
import PortalLayout from '../../components/PortalLayout';

const T = {
  th: { cta: 'เริ่มสร้าง Content', featuresTitle: 'เครื่องมือสำหรับ Creator', stepsTitle: 'เริ่มต้นง่ายๆ', submit: 'สมัครทันที', submitAnother: 'สมัครอีก', formNote: 'ไม่มีค่าใช้จ่าย ทดลองใช้ได้เลย' },
  en: { cta: 'Start Creating', featuresTitle: 'Tools for Creators', stepsTitle: 'Get Started Easily', submit: 'Apply Now', submitAnother: 'Apply Again', formNote: 'No cost. Start immediately.' },
  zh: { cta: '开始创作', featuresTitle: '创作者工具', stepsTitle: '简单开始', submit: '立即申请', submitAnother: '再次申请', formNote: '免费。立即开始。' },
};

export default function CreatorPortalPage() {
  const [lang, setLang] = useState('th');
  const t = T[lang];
  return (
    <PortalLayout config={{
      icon: '🎬',
      title: lang === 'th' ? 'พอร์ทัล Creator' : lang === 'en' ? 'Creator Portal' : '创作者门户',
      titleGrad: 'linear-gradient(90deg,#ec4899,#8b5cf6)',
      sub: lang === 'th' ? 'AI ช่วยสร้าง Content ไวขึ้น 10 เท่า — Hook · Script · Caption · Hashtag · Video Script ในภาษาไทย จีน อังกฤษ' : lang === 'en' ? 'AI helps you create content 10x faster — Hook, Script, Caption, Hashtag, Video Script in Thai, Chinese, English' : 'AI帮助您创作速度提升10倍——Thai、Chinese、English的Hook、脚本、Caption、Hashtag、视频脚本',
      color: '#ec4899', accent: '#8b5cf6',
      lang, setLang, t,
      stats: [
        { value: '10s', label: lang === 'th' ? 'สร้าง Content' : 'Content Created' },
        { value: '3', label: lang === 'th' ? 'ภาษา' : 'Languages' },
        { value: '9', label: lang === 'th' ? 'AI Tools' : 'AI Tools' },
        { value: '฿0', label: lang === 'th' ? 'ค่าเริ่มต้น' : 'Start Free' },
      ],
      features: [
        { icon: '⚡', title: lang === 'th' ? 'AI Content Generator' : 'AI Content Generator', desc: lang === 'th' ? 'สร้าง Hook · Script · Caption · Hashtag สำหรับ TikTok, IG Reels, YouTube Shorts ใน 10 วินาที' : 'Generate Hook, Script, Caption, Hashtag for TikTok, IG Reels, YouTube Shorts in 10 seconds.' },
        { icon: '🎙️', title: lang === 'th' ? 'Voice Command' : 'Voice Command', desc: lang === 'th' ? 'สั่งงาน AI ด้วยเสียงภาษาไทย ไม่ต้องพิมพ์ เหมาะสำหรับ creator ที่ทำคนเดียว' : 'Give Thai-language voice commands to AI — perfect for solo creators.' },
        { icon: '🎬', title: lang === 'th' ? 'Video Script Generator' : 'Video Script Generator', desc: lang === 'th' ? 'สร้าง Script + Storyboard วิดีโอสินค้าอัตโนมัติ พร้อม shot list และ timing' : 'Auto-generate Script + Storyboard with shot list and timing.' },
        { icon: '🔍', title: lang === 'th' ? 'AI Critic' : 'AI Critic', desc: lang === 'th' ? 'ให้ AI วิเคราะห์ content ของคุณ ให้คะแนน 0–10 พร้อมคำแนะนำปรับปรุงแบบละเอียด' : 'AI scores your content 0–10 with detailed improvement suggestions.' },
        { icon: '📈', title: lang === 'th' ? 'Trend Product Hunter' : 'Trend Product Hunter', desc: lang === 'th' ? 'รู้ก่อนว่าตอนนี้ควรทำ content เรื่องอะไร ก่อนที่ทุกคนจะทำ' : 'Know what content to make before it becomes mainstream.' },
        { icon: '💰', title: lang === 'th' ? 'Affiliate + Creator Fund' : 'Affiliate + Creator Fund', desc: lang === 'th' ? 'แชร์สินค้าผ่าน content รับ commission 8–10% ทุกยอดขาย' : 'Share products through your content, earn 8–10% commission per sale.' },
      ],
      steps: [
        { title: lang === 'th' ? 'สมัครและรับ Creator Account' : 'Sign Up for Creator Account', desc: lang === 'th' ? 'กรอกฟอร์ม รับสิทธิ์ใช้งาน AI Tools ทั้ง 9 โปรแกรมฟรี' : 'Fill the form, get access to all 9 AI tools for free.' },
        { title: lang === 'th' ? 'เลือกสินค้าและสร้าง Content' : 'Choose Products & Create Content', desc: lang === 'th' ? 'เลือกสินค้าจาก catalog ให้ AI ช่วยสร้าง script และ caption ในภาษาที่ต้องการ' : 'Pick products from the catalog, let AI generate scripts and captions in your language.' },
        { title: lang === 'th' ? 'โพสต์และรับ Commission' : 'Post & Earn Commission', desc: lang === 'th' ? 'โพสต์ content พร้อม affiliate link รับ commission อัตโนมัติทุกยอดขายที่เกิดขึ้น' : 'Post content with your affiliate link, earn commission on every resulting sale.' },
      ],
      formTitle: lang === 'th' ? 'สมัครเป็น Creator' : lang === 'en' ? 'Join as Creator' : '加入创作者计划',
      formFields: [
        { key: 'name', label: lang === 'th' ? 'ชื่อ / ชื่อ Channel' : 'Name / Channel Name', placeholder: 'สมชาย / @somchai_creates' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'creator@example.com' },
        { key: 'primary_platform', label: lang === 'th' ? 'Platform หลัก' : 'Primary Platform', type: 'select', options: ['TikTok', 'YouTube', 'Instagram', 'Facebook', 'Line', 'Other'] },
        { key: 'content_type', label: lang === 'th' ? 'ประเภท Content' : 'Content Type', type: 'select', options: lang === 'th' ? ['สินค้า / Product Review', 'ไลฟ์สไตล์', 'อาหาร', 'แฟชั่น', 'เทคโนโลยี', 'ท่องเที่ยว', 'อื่นๆ'] : ['Product Review', 'Lifestyle', 'Food', 'Fashion', 'Tech', 'Travel', 'Other'] },
        { key: 'followers', label: lang === 'th' ? 'จำนวน Followers รวม' : 'Total Followers', type: 'select', options: ['< 1K', '1K–10K', '10K–100K', '100K–1M', '1M+'] },
      ],
      apiEndpoint: '/api/leads/submit',
      successMsg: lang === 'th' ? 'สมัครเรียบร้อย! ทีมงานจะส่ง Creator Access ให้ภายใน 24 ชั่วโมง' : 'Applied! Team will send your Creator Access within 24 hours.',
    }} />
  );
}
