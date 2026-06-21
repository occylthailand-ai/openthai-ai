import React, { useState } from 'react';
import PortalLayout from '../../components/PortalLayout';

const T = {
  th: { cta: 'ร่วมเป็นพันธมิตร', featuresTitle: 'วิธีที่มูลนิธิ / CSR ร่วมงานกับเรา', stepsTitle: 'ขั้นตอนการเป็นพันธมิตร', submit: 'ส่งคำขอร่วมมือ', submitAnother: 'ส่งอีกครั้ง', formNote: 'ทีมงานจะติดต่อภายใน 2 วันทำการ' },
  en: { cta: 'Become a Partner', featuresTitle: 'How Foundations & CSR Partners Collaborate', stepsTitle: 'Partnership Process', submit: 'Submit Partnership Request', submitAnother: 'Submit Again', formNote: 'Team will contact within 2 business days.' },
  zh: { cta: '成为合作伙伴', featuresTitle: '基金会和CSR合作方式', stepsTitle: '合作流程', submit: '提交合作申请', submitAnother: '再次提交', formNote: '2个工作日内联系。' },
};

export default function FoundationPortalPage() {
  const [lang, setLang] = useState('th');
  const t = T[lang];
  return (
    <PortalLayout config={{
      icon: '🤲',
      title: lang === 'th' ? 'พอร์ทัลมูลนิธิ & CSR' : lang === 'en' ? 'Foundation & CSR Portal' : '基金会和CSR门户',
      titleGrad: 'linear-gradient(90deg,#059669,#d97706)',
      sub: lang === 'th' ? 'ให้ OpenThai.ai เป็นช่องทางในการส่งมอบโปรแกรมเพื่อสังคม — AI ที่ช่วยชุมชน ผู้ประกอบการรายย่อย และกลุ่มเปราะบางเข้าถึงตลาดดิจิทัล' : lang === 'en' ? 'Use OpenThai.ai as a delivery channel for social programs — AI helping communities, micro-entrepreneurs, and vulnerable groups access digital markets' : '使用OpenThai.ai作为社会项目的传递渠道——AI帮助社区和弱势群体进入数字市场',
      color: '#059669', accent: '#d97706',
      lang, setLang, t,
      stats: [
        { value: 'CSR', label: lang === 'th' ? 'รองรับโปรแกรม' : 'Program Support' },
        { value: '฿0', label: lang === 'th' ? 'ค่าแรกเข้า' : 'Entry Cost' },
        { value: 'SDG', label: lang === 'th' ? 'สนับสนุน' : 'Aligned' },
        { value: '3', label: lang === 'th' ? 'ภาษา' : 'Languages' },
      ],
      features: [
        { icon: '🎁', title: lang === 'th' ? 'สปอนเซอร์ Access ฟรีสำหรับชุมชน' : 'Sponsor Free Access for Communities', desc: lang === 'th' ? 'มูลนิธิหรือองค์กร CSR สปอนเซอร์ค่าสมาชิกให้กับกลุ่มผู้ประกอบการในชุมชนหรือกลุ่มเปราะบาง' : 'Foundations or CSR programs sponsor membership for community entrepreneurs or vulnerable groups.' },
        { icon: '📚', title: lang === 'th' ? 'โปรแกรมฝึกอบรม AI Literacy' : 'AI Literacy Training Programs', desc: lang === 'th' ? 'หลักสูตร AI literacy สำหรับชุมชน สอนใช้ AI tools สร้างรายได้ผ่านแพลตฟอร์มดิจิทัล' : 'AI literacy curriculum for communities — teaching how to use AI tools to generate income through digital platforms.' },
        { icon: '🌱', title: lang === 'th' ? 'Sustainable Commerce' : 'Sustainable Commerce', desc: lang === 'th' ? 'ช่องทางสำหรับสินค้า Fair Trade สินค้าชุมชน และสินค้าสิ่งแวดล้อมเป็นมิตร ที่ได้รับ highlight พิเศษ' : 'Dedicated channel for Fair Trade, community, and eco-friendly products with special highlighting.' },
        { icon: '👩‍🌾', title: lang === 'th' ? 'โปรแกรมผู้หญิงและเกษตรกร' : 'Women & Farmer Programs', desc: lang === 'th' ? 'โปรแกรมพิเศษสำหรับผู้ประกอบการสตรีและเกษตรกร — ค่าคอมมิชชั่นพิเศษ ฝึกอบรมฟรี' : 'Special programs for women entrepreneurs and farmers — preferential commission rates, free training.' },
        { icon: '📊', title: lang === 'th' ? 'รายงาน Impact สำหรับ CSR' : 'CSR Impact Reports', desc: lang === 'th' ? 'รายงาน impact ที่ใช้สำหรับ annual report หรือ ESG disclosure — วัดผลกระทบที่วัดได้จริง' : 'Impact reports usable for annual reports or ESG disclosure — quantified, real-world impact measurement.' },
        { icon: '🤝', title: lang === 'th' ? 'Co-branding & Visibility' : 'Co-branding & Visibility', desc: lang === 'th' ? 'Logo และชื่อมูลนิธิ/แบรนด์ปรากฏใน platform ในฐานะ "Supported by" — เพิ่ม brand visibility ในตลาดไทย' : 'Foundation or brand logo appears on platform as "Supported by" — increased brand visibility in Thai market.' },
      ],
      steps: [
        { title: lang === 'th' ? 'ยื่นแบบคำขอเป็นพันธมิตร' : 'Submit Partnership Request', desc: lang === 'th' ? 'กรอกฟอร์มระบุองค์กร โปรแกรม CSR และวัตถุประสงค์ที่ต้องการร่วมมือ' : 'Fill the form with organization details, CSR program, and partnership objectives.' },
        { title: lang === 'th' ? 'จัดทำแผนความร่วมมือ' : 'Design Cooperation Plan', desc: lang === 'th' ? 'ทีมงานร่วมออกแบบโปรแกรมที่ตอบโจทย์เป้าหมาย CSR และ impact ที่ต้องการวัด' : 'Team co-designs a program aligned with your CSR goals and desired impact metrics.' },
        { title: lang === 'th' ? 'เปิดตัวและติดตามผล' : 'Launch & Monitor Impact', desc: lang === 'th' ? 'เปิดตัวโปรแกรม รับรายงาน impact รายไตรมาส และวัดผลลัพธ์ที่แท้จริง' : 'Launch program, receive quarterly impact reports, and measure real-world outcomes.' },
      ],
      formTitle: lang === 'th' ? 'ยื่นคำขอเป็นพันธมิตร' : lang === 'en' ? 'Foundation / CSR Partnership Request' : '基金会/CSR合作申请',
      formFields: [
        { key: 'org', label: lang === 'th' ? 'ชื่อมูลนิธิ / บริษัท (CSR)' : 'Foundation / Company (CSR)', placeholder: lang === 'th' ? 'มูลนิธิ... / บริษัท... (ฝ่าย CSR)' : 'Foundation... / Company... (CSR Dept)' },
        { key: 'program', label: lang === 'th' ? 'ชื่อโปรแกรม CSR / โครงการ' : 'CSR Program / Project Name', placeholder: lang === 'th' ? 'โครงการพัฒนาผู้ประกอบการชุมชน...' : 'Community Entrepreneur Development...' },
        { key: 'target_group', label: lang === 'th' ? 'กลุ่มเป้าหมายหลัก' : 'Primary Target Group', type: 'select', options: lang === 'th' ? ['ผู้ประกอบการสตรี', 'เกษตรกร', 'เยาวชน', 'ผู้สูงอายุ', 'ชุมชนชนบท', 'ผู้พิการ', 'อื่นๆ'] : ['Women Entrepreneurs', 'Farmers', 'Youth', 'Elderly', 'Rural Communities', 'Persons with Disabilities', 'Other'] },
        { key: 'contact', label: lang === 'th' ? 'ผู้ประสานงาน CSR' : 'CSR Coordinator', placeholder: lang === 'th' ? 'ชื่อ / ตำแหน่ง' : 'Name / Title' },
        { key: 'email', label: lang === 'th' ? 'อีเมลติดต่อ' : 'Contact Email', type: 'email', placeholder: 'csr@company.com' },
        { key: 'budget_range', label: lang === 'th' ? 'งบประมาณโดยประมาณ (บาท/ปี)' : 'Approx. Annual Budget (THB)', type: 'select', options: lang === 'th' ? ['< ฿100,000', '฿100,000–500,000', '฿500,000–2,000,000', '฿2,000,000+'] : ['< ฿100,000', '฿100,000–500,000', '฿500,000–2,000,000', '฿2,000,000+'], required: false },
      ],
      apiEndpoint: '/api/leads/submit',
      successMsg: lang === 'th' ? 'ส่งคำขอเรียบร้อย! ทีมงานจะติดต่อภายใน 2 วันทำการ เพื่อออกแบบโปรแกรมร่วมกัน' : 'Partnership request received! Team will contact within 2 business days to co-design the program.',
    }} />
  );
}
