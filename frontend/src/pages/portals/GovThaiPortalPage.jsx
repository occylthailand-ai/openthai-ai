import React, { useState } from 'react';
import PortalLayout from '../../components/PortalLayout';

const T = {
  th: { cta: 'ยื่นแบบคำขอ', featuresTitle: 'บริการสำหรับหน่วยงานรัฐไทย', stepsTitle: 'ขั้นตอนการเข้าร่วม', submit: 'ส่งคำขอ', submitAnother: 'ส่งอีกครั้ง', formNote: 'ทีมงานจะติดต่อผู้ประสานงานภายใน 2 วันทำการ' },
  en: { cta: 'Submit Request', featuresTitle: 'Services for Thai Government Agencies', stepsTitle: 'Enrollment Steps', submit: 'Submit Request', submitAnother: 'Submit Again', formNote: 'Team will contact coordinator within 2 business days.' },
  zh: { cta: '提交申请', featuresTitle: '泰国政府机构服务', stepsTitle: '参与步骤', submit: '提交申请', submitAnother: '再次提交', formNote: '2个工作日内联系协调员。' },
};

export default function GovThaiPortalPage() {
  const [lang, setLang] = useState('th');
  const t = T[lang];
  return (
    <PortalLayout config={{
      icon: '🏛️',
      title: lang === 'th' ? 'พอร์ทัลหน่วยงานรัฐไทย' : lang === 'en' ? 'Thai Government Portal' : '泰国政府门户',
      titleGrad: 'linear-gradient(90deg,#1d4ed8,#0891b2)',
      sub: lang === 'th' ? 'ยกระดับบริการภาครัฐด้วย AI ไทย — ช่วยเผยแพร่ข้อมูล เชื่อมโยงผู้ประกอบการ และสนับสนุนเศรษฐกิจดิจิทัลไทย' : lang === 'en' ? "Elevate public services with Thai AI — disseminate information, connect businesses, and support Thailand's digital economy" : '用泰国AI提升公共服务——传播信息、连接企业、支持数字经济',
      color: '#1d4ed8', accent: '#0891b2',
      lang, setLang, t,
      stats: [
        { value: '77', label: lang === 'th' ? 'จังหวัด' : 'Provinces' },
        { value: '3', label: lang === 'th' ? 'ภาษา' : 'Languages' },
        { value: '24/7', label: lang === 'th' ? 'ให้บริการ' : 'Available' },
        { value: '฿0', label: lang === 'th' ? 'สำหรับหน่วยงานรัฐ' : 'For Gov Agencies' },
      ],
      features: [
        { icon: '📢', title: lang === 'th' ? 'AI เผยแพร่ข้อมูลนโยบาย' : 'AI Policy Dissemination', desc: lang === 'th' ? 'แปลและเผยแพร่นโยบาย กฎระเบียบ และประกาศของรัฐเป็น 3 ภาษา ใน 10 วินาที' : 'Translate and disseminate policies, regulations, and announcements in 3 languages in 10 seconds.' },
        { icon: '🏪', title: lang === 'th' ? 'เชื่อมผู้ประกอบการ OTOP' : 'OTOP Business Connector', desc: lang === 'th' ? 'ช่วยผู้ผลิต OTOP และ SME ในพื้นที่เข้าถึงช่องทางขายออนไลน์และตลาดต่างประเทศ' : 'Help local OTOP and SME producers access online sales channels and international markets.' },
        { icon: '📊', title: lang === 'th' ? 'Dashboard เศรษฐกิจจังหวัด' : 'Provincial Economy Dashboard', desc: lang === 'th' ? 'ติดตาม KPI เศรษฐกิจ จำนวนธุรกิจ ยอดขาย และ trend ในพื้นที่ที่รับผิดชอบ' : 'Monitor economic KPIs, business counts, sales, and local trends in your jurisdiction.' },
        { icon: '🤖', title: lang === 'th' ? 'AI Chatbot บริการประชาชน' : 'AI Citizen Service Chatbot', desc: lang === 'th' ? 'Chatbot ตอบคำถามประชาชนแบบอัตโนมัติ 24/7 ในภาษาไทย' : '24/7 automated chatbot for citizen queries in Thai.' },
        { icon: '🌐', title: lang === 'th' ? 'ส่งเสริมการส่งออก' : 'Export Facilitation', desc: lang === 'th' ? 'เชื่อมต่อผู้ประกอบการในพื้นที่กับผู้ซื้อต่างประเทศผ่านแพลตฟอร์ม OpenThai.ai' : 'Connect local businesses with international buyers through OpenThai.ai.' },
        { icon: '🔒', title: lang === 'th' ? 'ความปลอดภัยข้อมูลภาครัฐ' : 'Government Data Security', desc: lang === 'th' ? 'ข้อมูลได้รับการปกป้องตาม PDPA พ.ศ. 2562 และมาตรฐาน ISO 27001' : 'Data protected under Thailand PDPA 2019 and ISO 27001 standard.' },
      ],
      steps: [
        { title: lang === 'th' ? 'ยื่นแบบคำขอผ่านระบบ' : 'Submit Request Online', desc: lang === 'th' ? 'กรอกฟอร์มระบุหน่วยงาน ผู้ประสานงาน และวัตถุประสงค์การใช้งาน' : 'Fill the form with agency name, coordinator, and intended use.' },
        { title: lang === 'th' ? 'ทีมงานยืนยันและจัดทำ MOU' : 'Verification & MOU', desc: lang === 'th' ? 'ทีมงานติดต่อภายใน 2 วันทำการ เพื่อดำเนินการ MOU และกำหนด access level' : 'Team contacts within 2 business days to process MOU and set access level.' },
        { title: lang === 'th' ? 'เปิดใช้งานระบบ' : 'System Activation', desc: lang === 'th' ? 'ฝึกอบรมผู้ใช้งาน deploy ระบบ และเปิดใช้ dashboard สำหรับหน่วยงาน' : 'Train users, deploy system, and activate the agency dashboard.' },
      ],
      formTitle: lang === 'th' ? 'ยื่นคำขอสำหรับหน่วยงาน' : lang === 'en' ? 'Agency Request Form' : '机构申请表',
      formFields: [
        { key: 'agency', label: lang === 'th' ? 'ชื่อหน่วยงาน' : 'Agency Name', placeholder: lang === 'th' ? 'สำนักงานพัฒนาชุมชนจังหวัด...' : 'Department of...' },
        { key: 'coordinator', label: lang === 'th' ? 'ชื่อผู้ประสานงาน' : 'Coordinator Name', placeholder: lang === 'th' ? 'ชื่อ-นามสกุล / ตำแหน่ง' : 'Full Name / Position' },
        { key: 'province', label: lang === 'th' ? 'จังหวัด' : 'Province', placeholder: lang === 'th' ? 'กรุงเทพมหานคร / เชียงใหม่' : 'Bangkok / Chiang Mai' },
        { key: 'email', label: lang === 'th' ? 'อีเมลราชการ' : 'Official Email', type: 'email', placeholder: 'contact@agency.go.th' },
        { key: 'phone', label: lang === 'th' ? 'เบอร์โทรสำนักงาน' : 'Office Phone', placeholder: '02-xxx-xxxx' },
        { key: 'use_case', label: lang === 'th' ? 'วัตถุประสงค์หลัก' : 'Primary Use Case', type: 'select', options: lang === 'th' ? ['เผยแพร่นโยบาย', 'สนับสนุน OTOP/SME', 'บริการประชาชน', 'ส่งเสริมการส่งออก', 'อื่นๆ'] : ['Policy Dissemination', 'OTOP/SME Support', 'Citizen Services', 'Export Promotion', 'Other'] },
      ],
      apiEndpoint: '/api/leads/submit',
      successMsg: lang === 'th' ? 'ส่งคำขอเรียบร้อย! ทีมงานจะติดต่อภายใน 2 วันทำการ' : 'Submitted! Team will contact you within 2 business days.',
    }} />
  );
}
