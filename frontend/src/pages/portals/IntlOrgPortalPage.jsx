import React, { useState } from 'react';
import PortalLayout from '../../components/PortalLayout';

const T = {
  th: { cta: 'ยื่นแบบคำขอ', featuresTitle: 'บริการสำหรับองค์กรระหว่างประเทศ', stepsTitle: 'ขั้นตอนความร่วมมือ', submit: 'ส่งคำขอ', submitAnother: 'ส่งอีกครั้ง', formNote: 'ทีมงานจะติดต่อภายใน 3 วันทำการ' },
  en: { cta: 'Submit Partnership Request', featuresTitle: 'Services for International Organizations', stepsTitle: 'Partnership Process', submit: 'Submit Request', submitAnother: 'Submit Again', formNote: 'Team will contact within 3 business days.' },
  zh: { cta: '提交合作申请', featuresTitle: '国际组织服务', stepsTitle: '合作流程', submit: '提交申请', submitAnother: '再次提交', formNote: '3个工作日内联系。' },
};

export default function IntlOrgPortalPage() {
  const [lang, setLang] = useState('en');
  const t = T[lang];
  return (
    <PortalLayout config={{
      icon: '🌐',
      title: lang === 'th' ? 'พอร์ทัลองค์กรระหว่างประเทศ' : lang === 'en' ? 'International Organization Portal' : '国际组织门户',
      titleGrad: 'linear-gradient(90deg,#7c3aed,#0891b2)',
      sub: lang === 'en' ? 'Partner with OpenThai.ai to accelerate economic development, digital inclusion, and sustainable trade across Southeast Asia' : lang === 'th' ? 'ร่วมมือกับ OpenThai.ai เพื่อเร่งการพัฒนาเศรษฐกิจ การรวมดิจิทัล และการค้าอย่างยั่งยืนในเอเชียตะวันออกเฉียงใต้' : '与OpenThai.ai合作，加速东南亚经济发展、数字包容和可持续贸易',
      color: '#7c3aed', accent: '#0891b2',
      lang, setLang, t,
      stats: [
        { value: 'ASEAN', label: lang === 'en' ? 'Focus Region' : 'ภูมิภาคหลัก' },
        { value: 'SDG', label: lang === 'en' ? 'Aligned Goals' : 'เป้าหมาย SDG' },
        { value: '3', label: lang === 'en' ? 'Languages' : 'ภาษา' },
        { value: 'MOU', label: lang === 'en' ? 'Partnership Model' : 'รูปแบบ MOU' },
      ],
      features: [
        { icon: '📈', title: lang === 'en' ? 'Economic Development Programs' : lang === 'th' ? 'โปรแกรมพัฒนาเศรษฐกิจ' : '经济发展计划', desc: lang === 'en' ? 'AI-powered tools to help SMEs, cooperatives, and micro-enterprises in emerging economies access digital markets.' : lang === 'th' ? 'เครื่องมือ AI ช่วย SME สหกรณ์ และผู้ประกอบการรายย่อยในเศรษฐกิจเกิดใหม่เข้าถึงตลาดดิจิทัล' : 'AI工具帮助SME、合作社进入数字市场' },
        { icon: '🌱', title: lang === 'en' ? 'Sustainable Trade' : lang === 'th' ? 'การค้าอย่างยั่งยืน' : '可持续贸易', desc: lang === 'en' ? 'Traceability tools and green commerce features aligned with SDG 8 (Decent Work) and SDG 12 (Responsible Consumption).' : lang === 'th' ? 'เครื่องมือ traceability และ green commerce ที่สอดคล้องกับ SDG 8 และ SDG 12' : '与SDG 8和SDG 12对齐的可追溯性工具和绿色商业功能' },
        { icon: '👩‍💼', title: lang === 'en' ? 'Women & Youth Empowerment' : lang === 'th' ? 'เสริมพลังผู้หญิงและเยาวชน' : '妇女青年赋权', desc: lang === 'en' ? 'Dedicated programs for women entrepreneurs and youth-led businesses — priority access and lower commission rates.' : lang === 'th' ? 'โปรแกรมพิเศษสำหรับผู้ประกอบการสตรีและธุรกิจที่นำโดยเยาวชน — สิทธิ์เข้าถึงก่อนและอัตราค่าคอมมิชชั่นต่ำกว่า' : '为女性企业家和青年企业提供优先准入和较低佣金率' },
        { icon: '📡', title: lang === 'en' ? 'Digital Inclusion' : lang === 'th' ? 'ความครอบคลุมทางดิจิทัล' : '数字包容', desc: lang === 'en' ? 'Multilingual AI interfaces and offline-capable tools ensure rural and underserved communities can participate.' : lang === 'th' ? 'อินเทอร์เฟซ AI หลายภาษาและเครื่องมือที่รองรับ offline ช่วยให้ชุมชนชนบทมีส่วนร่วมได้' : '多语言AI界面和离线工具确保农村和服务不足社区参与' },
        { icon: '📊', title: lang === 'en' ? 'Impact Measurement' : lang === 'th' ? 'การวัดผลกระทบ' : '影响力测量', desc: lang === 'en' ? 'Dashboards and reports for measuring SDG impact, beneficiary reach, and economic outcomes of cooperation programs.' : lang === 'th' ? 'Dashboard และรายงานสำหรับวัด SDG impact การเข้าถึงผู้รับประโยชน์ และผลลัพธ์ทางเศรษฐกิจ' : '用于衡量SDG影响、受益人范围和经济成果的仪表板和报告' },
        { icon: '🔬', title: lang === 'en' ? 'Research & Data Sharing' : lang === 'th' ? 'การวิจัยและแบ่งปันข้อมูล' : '研究与数据共享', desc: lang === 'en' ? 'Anonymized, aggregated trade data available for economic research — supporting evidence-based policy development.' : lang === 'th' ? 'ข้อมูลการค้าแบบไม่ระบุตัวตนสำหรับการวิจัยเศรษฐกิจ — สนับสนุนการพัฒนานโยบายที่อิงหลักฐาน' : '用于经济研究的匿名聚合贸易数据——支持循证政策制定' },
      ],
      steps: [
        { title: lang === 'en' ? 'Submit Partnership Inquiry' : lang === 'th' ? 'ยื่นคำขอความร่วมมือ' : '提交合作询问', desc: lang === 'en' ? 'Describe your organization, mandate, and how OpenThai.ai fits your program objectives.' : lang === 'th' ? 'อธิบายองค์กร อำนาจหน้าที่ และวิธีที่ OpenThai.ai เหมาะกับวัตถุประสงค์โปรแกรมของท่าน' : '描述贵组织、授权及OpenThai.ai如何符合计划目标' },
        { title: lang === 'en' ? 'Alignment Workshop' : lang === 'th' ? 'Workshop ปรับทิศทาง' : '对齐研讨会', desc: lang === 'en' ? 'Joint workshop to align cooperation scope, impact metrics, and technical implementation with your mandate.' : lang === 'th' ? 'Workshop ร่วมเพื่อปรับขอบเขตความร่วมมือ ตัวชี้วัดผลกระทบ และการดำเนินการทางเทคนิคให้สอดคล้องกัน' : '联合研讨会，对齐合作范围、影响指标和技术实施' },
        { title: lang === 'en' ? 'Program Launch & Monitoring' : lang === 'th' ? 'เปิดตัวโปรแกรมและติดตาม' : '计划启动与监测', desc: lang === 'en' ? 'Launch targeted programs with dedicated dashboards, impact tracking, and quarterly reviews.' : lang === 'th' ? 'เปิดตัวโปรแกรมที่กำหนดเป้าหมาย พร้อม dashboard ติดตามผลกระทบ และการทบทวนรายไตรมาส' : '启动定向计划，配备专用仪表板、影响跟踪和季度审查' },
      ],
      formTitle: lang === 'en' ? 'Partnership Inquiry' : lang === 'th' ? 'คำขอความร่วมมือ' : '合作询问',
      formFields: [
        { key: 'org', label: lang === 'en' ? 'Organization Name' : lang === 'th' ? 'ชื่อองค์กร' : '组织名称', placeholder: lang === 'en' ? 'UNDP, ADB, ILO, APEC...' : 'UNDP, ADB, ILO...' },
        { key: 'mandate', label: lang === 'en' ? 'Mandate / Focus Area' : lang === 'th' ? 'อำนาจหน้าที่ / พื้นที่ดำเนินงาน' : '授权/重点领域', type: 'select', options: lang === 'en' ? ['Economic Development', 'Trade & Commerce', 'Gender Equality', 'Youth Employment', 'Sustainable Development', 'Digital Inclusion', 'Other'] : lang === 'th' ? ['การพัฒนาเศรษฐกิจ', 'การค้า', 'ความเท่าเทียมทางเพศ', 'การจ้างงานเยาวชน', 'การพัฒนาที่ยั่งยืน', 'การรวมดิจิทัล', 'อื่นๆ'] : ['经济发展', '贸易', '性别平等', '青年就业', '可持续发展', '数字包容', '其他'] },
        { key: 'contact', label: lang === 'en' ? 'Contact Person & Title' : lang === 'th' ? 'ผู้ติดต่อ และตำแหน่ง' : '联系人及职称', placeholder: lang === 'en' ? 'Dr. Smith, Programme Officer' : 'ชื่อ / ตำแหน่ง' },
        { key: 'email', label: lang === 'en' ? 'Official Email' : lang === 'th' ? 'อีเมลทางการ' : '官方邮箱', type: 'email', placeholder: 'contact@undp.org' },
        { key: 'countries', label: lang === 'en' ? 'Target Countries / Region' : lang === 'th' ? 'ประเทศ / ภูมิภาคเป้าหมาย' : '目标国家/地区', placeholder: lang === 'en' ? 'Thailand, ASEAN, GMS...' : 'ไทย, อาเซียน...' },
      ],
      apiEndpoint: '/api/leads/submit',
      successMsg: lang === 'en' ? 'Inquiry received! Our partnerships team will be in touch within 3 business days.' : lang === 'th' ? 'ส่งคำขอเรียบร้อย! ทีมงานจะติดต่อภายใน 3 วันทำการ' : '收到询问！3个工作日内联系。',
    }} />
  );
}
