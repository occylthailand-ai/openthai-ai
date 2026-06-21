import React, { useState } from 'react';
import PortalLayout from '../../components/PortalLayout';

const T = {
  th: { cta: 'ยื่นแบบคำขอ', featuresTitle: 'บริการสำหรับรัฐบาลต่างประเทศ', stepsTitle: 'ขั้นตอนความร่วมมือ', submit: 'ส่งคำขอ', submitAnother: 'ส่งอีกครั้ง', formNote: 'ทีมงานจะติดต่อภายใน 3 วันทำการ' },
  en: { cta: 'Submit Request', featuresTitle: 'Services for International Governments', stepsTitle: 'Partnership Steps', submit: 'Submit Request', submitAnother: 'Submit Again', formNote: 'Team will contact within 3 business days.' },
  zh: { cta: '提交申请', featuresTitle: '国际政府服务', stepsTitle: '合作步骤', submit: '提交申请', submitAnother: '再次提交', formNote: '3个工作日内联系。' },
};

export default function GovIntlPortalPage() {
  const [lang, setLang] = useState('en');
  const t = T[lang];
  return (
    <PortalLayout config={{
      icon: '🌏',
      title: lang === 'th' ? 'พอร์ทัลรัฐบาลต่างประเทศ' : lang === 'en' ? 'International Government Portal' : '国际政府门户',
      titleGrad: 'linear-gradient(90deg,#0f766e,#0369a1)',
      sub: lang === 'th' ? 'เชื่อมโยงรัฐบาลต่างประเทศกับตลาดไทย — Trade facilitation, Business Matching และ Cultural Bridge สำหรับนักลงทุนต่างชาติ' : lang === 'en' ? 'Connect international governments with Thai markets — Trade facilitation, Business Matching, and Cultural Bridge for foreign investors' : '连接国际政府与泰国市场——贸易便利化、商业匹配和文化桥梁',
      color: '#0f766e', accent: '#0369a1',
      lang, setLang, t,
      stats: [
        { value: '12+', label: lang === 'th' ? 'ประเทศคู่ค้า' : 'Partner Countries' },
        { value: '3', label: lang === 'th' ? 'ภาษาหลัก' : 'Core Languages' },
        { value: 'B2B', label: lang === 'th' ? 'Business Matching' : 'Business Matching' },
        { value: '฿0', label: lang === 'th' ? 'ค่าใช้จ่ายเริ่มต้น' : 'Initial Cost' },
      ],
      features: [
        { icon: '🤝', title: lang === 'en' ? 'Trade Facilitation' : lang === 'th' ? 'อำนวยความสะดวกทางการค้า' : '贸易便利化', desc: lang === 'en' ? 'AI-powered trade facilitation between your country and Thailand — product matching, regulatory guidance, and market access.' : lang === 'th' ? 'AI ช่วยอำนวยความสะดวกการค้าระหว่างประเทศกับไทย — การจับคู่สินค้า คำแนะนำกฎระเบียบ และการเข้าถึงตลาด' : 'AI驱动贸易便利化——产品匹配、法规指导和市场准入' },
        { icon: '🏭', title: lang === 'en' ? 'Business Matching' : lang === 'th' ? 'จับคู่ธุรกิจ' : '商业匹配', desc: lang === 'en' ? 'Match businesses from your country with verified Thai producers, distributors, and exporters on OpenThai.ai.' : lang === 'th' ? 'จับคู่ธุรกิจจากประเทศท่านกับผู้ผลิต ผู้จัดจำหน่าย และผู้ส่งออกไทยที่ได้รับการยืนยัน' : '将贵国企业与经过验证的泰国生产商、分销商和出口商进行匹配' },
        { icon: '📋', title: lang === 'en' ? 'Regulatory & Compliance' : lang === 'th' ? 'กฎระเบียบและการปฏิบัติตาม' : '法规合规', desc: lang === 'en' ? 'AI-generated summaries of Thai import/export regulations, tariffs, and compliance requirements — in your language.' : lang === 'th' ? 'AI สรุปกฎระเบียบนำเข้า/ส่งออกของไทย ภาษีศุลกากร และข้อกำหนดการปฏิบัติตาม ในภาษาที่ต้องการ' : 'AI生成泰国进出口法规、关税和合规要求摘要' },
        { icon: '🌐', title: lang === 'en' ? 'Cultural Bridge' : lang === 'th' ? 'สะพานวัฒนธรรม' : '文化桥梁', desc: lang === 'en' ? 'AI translates business communications, contracts, and proposals between Thai and your language — reducing cultural friction.' : lang === 'th' ? 'AI แปลการสื่อสารทางธุรกิจ สัญญา และข้อเสนอระหว่างไทยและภาษาของท่าน' : 'AI翻译商务通信、合同和提案' },
        { icon: '📊', title: lang === 'en' ? 'Market Intelligence' : lang === 'th' ? 'ข้อมูลตลาด' : '市场情报', desc: lang === 'en' ? 'Real-time data on Thai market trends, consumer behavior, and industry reports — tailored to your sector.' : lang === 'th' ? 'ข้อมูล real-time เกี่ยวกับ trend ตลาดไทย พฤติกรรมผู้บริโภค และรายงานอุตสาหกรรม' : '实时泰国市场趋势、消费者行为和行业报告' },
        { icon: '🏅', title: lang === 'en' ? 'Government-to-Government MOU' : lang === 'th' ? 'MOU รัฐบาลต่อรัฐบาล' : '政府间谅解备忘录', desc: lang === 'en' ? 'Formal G2G digital cooperation framework — structured as MOU through official diplomatic channels.' : lang === 'th' ? 'กรอบความร่วมมือดิจิทัล G2G — จัดทำเป็น MOU ผ่านช่องทางการทูตอย่างเป็นทางการ' : '正式G2G数字合作框架——通过正式外交渠道' },
      ],
      steps: [
        { title: lang === 'en' ? 'Submit Cooperation Request' : lang === 'th' ? 'ยื่นคำขอความร่วมมือ' : '提交合作申请', desc: lang === 'en' ? 'Fill the form with your government agency, country, and cooperation objectives.' : lang === 'th' ? 'กรอกฟอร์มระบุหน่วยงาน ประเทศ และวัตถุประสงค์ความร่วมมือ' : '填写表格，说明政府机构、国家和合作目标' },
        { title: lang === 'en' ? 'Diplomatic Verification' : lang === 'th' ? 'การยืนยันทางการทูต' : '外交核实', desc: lang === 'en' ? 'Team coordinates with relevant Thai government bodies for verification and cooperation framework.' : lang === 'th' ? 'ทีมงานประสานงานกับหน่วยงานรัฐบาลไทยที่เกี่ยวข้องเพื่อยืนยันและจัดทำกรอบความร่วมมือ' : '团队与相关泰国政府机构协调，进行核实和合作框架' },
        { title: lang === 'en' ? 'Launch Cooperation Program' : lang === 'th' ? 'เริ่มโปรแกรมความร่วมมือ' : '启动合作计划', desc: lang === 'en' ? 'Access the platform, begin Business Matching, and leverage AI tools for bilateral trade.' : lang === 'th' ? 'เข้าถึงแพลตฟอร์ม เริ่ม Business Matching และใช้ AI tools สำหรับการค้าทวิภาคี' : '访问平台，开始商业匹配，利用AI工具进行双边贸易' },
      ],
      formTitle: lang === 'en' ? 'Government Cooperation Request' : lang === 'th' ? 'คำขอความร่วมมือระหว่างรัฐบาล' : '政府合作申请',
      formFields: [
        { key: 'country', label: lang === 'en' ? 'Country' : lang === 'th' ? 'ประเทศ' : '国家', placeholder: lang === 'en' ? 'e.g., Japan, China, USA...' : 'ระบุชื่อประเทศ' },
        { key: 'agency', label: lang === 'en' ? 'Agency / Ministry' : lang === 'th' ? 'หน่วยงาน / กระทรวง' : '机构/部委', placeholder: lang === 'en' ? 'Ministry of Trade...' : 'กระทรวงพาณิชย์...' },
        { key: 'contact', label: lang === 'en' ? 'Contact Person' : lang === 'th' ? 'ผู้ติดต่อ' : '联系人', placeholder: lang === 'en' ? 'Name / Position' : 'ชื่อ / ตำแหน่ง' },
        { key: 'email', label: lang === 'en' ? 'Official Email' : lang === 'th' ? 'อีเมลทางการ' : '官方邮箱', type: 'email', placeholder: 'contact@ministry.gov' },
        { key: 'cooperation_type', label: lang === 'en' ? 'Cooperation Type' : lang === 'th' ? 'ประเภทความร่วมมือ' : '合作类型', type: 'select', options: lang === 'en' ? ['Trade Facilitation', 'Business Matching', 'Technology Transfer', 'Cultural Exchange', 'Investment Promotion', 'Other'] : lang === 'th' ? ['อำนวยความสะดวกทางการค้า', 'จับคู่ธุรกิจ', 'ถ่ายทอดเทคโนโลยี', 'แลกเปลี่ยนวัฒนธรรม', 'ส่งเสริมการลงทุน', 'อื่นๆ'] : ['贸易便利化', '商业匹配', '技术转让', '文化交流', '投资促进', '其他'] },
      ],
      apiEndpoint: '/api/leads/submit',
      successMsg: lang === 'en' ? 'Request submitted! Our international liaison team will contact you within 3 business days.' : lang === 'th' ? 'ส่งคำขอเรียบร้อย! ทีมงานจะติดต่อภายใน 3 วันทำการ' : '申请已提交！3个工作日内联系。',
    }} />
  );
}
