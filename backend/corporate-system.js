// Openthai.ai — Corporate System (Public Company / บริษัทมหาชน)
// Global Standard: SET/MAI · SEC Thailand · IFRS · ESG · Governance

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ── Department Registry ────────────────────────────────────────────────────────
export const DEPARTMENTS = {
  board:        { id: 'board',        name: 'Board of Directors',         nameT: 'คณะกรรมการบริษัท',          icon: '👑', category: 'governance' },
  audit:        { id: 'audit',        name: 'Audit Committee',             nameT: 'คณะกรรมการตรวจสอบ',          icon: '🔍', category: 'governance' },
  risk:         { id: 'risk',         name: 'Risk Management',             nameT: 'บริหารความเสี่ยง',            icon: '⚠️', category: 'governance' },
  secretary:    { id: 'secretary',    name: 'Company Secretary',           nameT: 'เลขานุการบริษัท',            icon: '📋', category: 'governance' },
  ir:           { id: 'ir',           name: 'Investor Relations',          nameT: 'นักลงทุนสัมพันธ์',           icon: '📈', category: 'governance' },
  compliance:   { id: 'compliance',   name: 'Compliance & Legal',          nameT: 'กฎหมายและ Compliance',       icon: '⚖️', category: 'governance' },
  finance:      { id: 'finance',      name: 'Finance & Accounting',        nameT: 'การเงินและบัญชี',            icon: '💰', category: 'operations' },
  hr:           { id: 'hr',           name: 'Human Resources',             nameT: 'ทรัพยากรมนุษย์',             icon: '👥', category: 'operations' },
  it:           { id: 'it',           name: 'Technology & AI',             nameT: 'เทคโนโลยีและ AI',            icon: '🤖', category: 'operations' },
  marketing:    { id: 'marketing',    name: 'Marketing & Sales',           nameT: 'การตลาดและขาย',              icon: '📢', category: 'operations' },
  operations:   { id: 'operations',   name: 'Global Operations',           nameT: 'ปฏิบัติการทั่วโลก',          icon: '🌏', category: 'operations' },
  strategy:     { id: 'strategy',     name: 'Strategy & Business Dev',     nameT: 'กลยุทธ์และพัฒนาธุรกิจ',     icon: '🎯', category: 'strategy'   },
  esg:          { id: 'esg',          name: 'ESG & Sustainability',        nameT: 'ESG และความยั่งยืน',          icon: '🌿', category: 'strategy'   },
  procurement:  { id: 'procurement',  name: 'Procurement',                 nameT: 'จัดซื้อจัดจ้าง',             icon: '📦', category: 'operations' },
  globalexpand: { id: 'globalexpand', name: 'Global Expansion',           nameT: 'ขยายธุรกิจโลก',              icon: '🚀', category: 'strategy'   },
};

// ── IT Department — Role Categories (Large IT Company Standard) ───────────────
export const IT_ROLE_CATEGORIES = [
  {
    id: 'leadership', name: 'IT Leadership', nameT: 'ผู้บริหารไอที', icon: '👑', color: '#f59e0b',
    roles: [
      { id: 'r01', title: 'Chief Technology Officer (CTO)',            level: 'C-Level', count: 1, salary: '฿300K–฿600K/เดือน', skills: ['Technology Strategy', 'R&D', 'Architecture', 'AI Vision'] },
      { id: 'r02', title: 'Chief Information Officer (CIO)',            level: 'C-Level', count: 1, salary: '฿250K–฿500K/เดือน', skills: ['IT Strategy', 'Digital Transformation', 'Vendor Mgmt'] },
      { id: 'r03', title: 'Chief Information Security Officer (CISO)', level: 'C-Level', count: 1, salary: '฿250K–฿500K/เดือน', skills: ['Cybersecurity', 'Risk Management', 'ISO 27001'] },
      { id: 'r04', title: 'VP of Engineering',                          level: 'VP',      count: 1, salary: '฿150K–฿300K/เดือน', skills: ['Engineering Management', 'Architecture', 'Agile'] },
      { id: 'r05', title: 'VP of Product',                              level: 'VP',      count: 1, salary: '฿150K–฿300K/เดือน', skills: ['Product Strategy', 'Roadmap', 'Market Analysis'] },
      { id: 'r06', title: 'VP of Data & AI',                            level: 'VP',      count: 1, salary: '฿150K–฿300K/เดือน', skills: ['AI Strategy', 'Data Governance', 'ML Platforms'] },
    ],
  },
  {
    id: 'engineering', name: 'Software Engineering', nameT: 'วิศวกรซอฟต์แวร์', icon: '💻', color: '#6366f1',
    roles: [
      { id: 'r07', title: 'Engineering Manager',        level: 'Manager', count: 3, salary: '฿100K–฿200K/เดือน', skills: ['Team Leadership', 'Agile', 'Technical Direction'] },
      { id: 'r08', title: 'Senior Full-Stack Engineer', level: 'Senior',  count: 5, salary: '฿80K–฿150K/เดือน',  skills: ['React', 'Node.js', 'PostgreSQL', 'AWS'] },
      { id: 'r09', title: 'Frontend Engineer',           level: 'Mid',     count: 4, salary: '฿50K–฿100K/เดือน',  skills: ['React', 'TypeScript', 'CSS', 'Web Performance'] },
      { id: 'r10', title: 'Backend Engineer',            level: 'Mid',     count: 4, salary: '฿50K–฿100K/เดือน',  skills: ['Node.js', 'Python', 'REST/GraphQL', 'Microservices'] },
      { id: 'r11', title: 'Mobile Developer',            level: 'Mid',     count: 3, salary: '฿60K–฿120K/เดือน',  skills: ['React Native', 'iOS', 'Android', 'Flutter'] },
      { id: 'r12', title: 'Junior Software Engineer',    level: 'Junior',  count: 8, salary: '฿25K–฿50K/เดือน',   skills: ['JavaScript', 'Python', 'Git', 'APIs'] },
    ],
  },
  {
    id: 'ai_data', name: 'AI & Data', nameT: 'ปัญญาประดิษฐ์และข้อมูล', icon: '🤖', color: '#8b5cf6',
    roles: [
      { id: 'r13', title: 'AI Research Lead',          level: 'Lead',   count: 1, salary: '฿120K–฿250K/เดือน', skills: ['LLM', 'AI Research', 'Papers', 'Model Training'] },
      { id: 'r14', title: 'Machine Learning Engineer', level: 'Senior', count: 3, salary: '฿80K–฿160K/เดือน',  skills: ['PyTorch', 'TensorFlow', 'MLOps', 'LLMs'] },
      { id: 'r15', title: 'Data Scientist',            level: 'Mid',    count: 3, salary: '฿60K–฿120K/เดือน',  skills: ['Python', 'Statistics', 'SQL', 'Visualization'] },
      { id: 'r16', title: 'Data Engineer',             level: 'Mid',    count: 2, salary: '฿60K–฿120K/เดือน',  skills: ['ETL', 'Airflow', 'Spark', 'Data Warehouse'] },
      { id: 'r17', title: 'AI Product Engineer',       level: 'Mid',    count: 3, salary: '฿70K–฿140K/เดือน',  skills: ['AI APIs', 'Prompt Engineering', 'LangChain', 'RAG'] },
    ],
  },
  {
    id: 'infrastructure', name: 'Infrastructure & DevOps', nameT: 'โครงสร้างพื้นฐานและ DevOps', icon: '⚙️', color: '#06b6d4',
    roles: [
      { id: 'r18', title: 'Cloud Architect',        level: 'Senior', count: 2, salary: '฿100K–฿200K/เดือน', skills: ['AWS', 'GCP', 'Azure', 'Terraform', 'Architecture'] },
      { id: 'r19', title: 'DevOps / SRE Engineer',  level: 'Mid',    count: 3, salary: '฿70K–฿140K/เดือน',  skills: ['CI/CD', 'Docker', 'Kubernetes', 'Monitoring'] },
      { id: 'r20', title: 'Database Administrator', level: 'Mid',    count: 2, salary: '฿60K–฿120K/เดือน',  skills: ['PostgreSQL', 'MySQL', 'MongoDB', 'Performance Tuning'] },
      { id: 'r21', title: 'Network Engineer',       level: 'Mid',    count: 2, salary: '฿50K–฿100K/เดือน',  skills: ['Networking', 'Firewall', 'VPN', 'DNS/CDN'] },
      { id: 'r22', title: 'System Administrator',   level: 'Mid',    count: 2, salary: '฿45K–฿90K/เดือน',   skills: ['Linux', 'Windows Server', 'Backup', 'Monitoring'] },
    ],
  },
  {
    id: 'security', name: 'Cybersecurity', nameT: 'ความปลอดภัยทางไซเบอร์', icon: '🔒', color: '#ef4444',
    roles: [
      { id: 'r23', title: 'Security Architect',    level: 'Lead',   count: 1, salary: '฿120K–฿250K/เดือน', skills: ['Security Design', 'Zero Trust', 'IAM', 'SIEM'] },
      { id: 'r24', title: 'Security Engineer',     level: 'Senior', count: 2, salary: '฿80K–฿160K/เดือน',  skills: ['AppSec', 'Cloud Security', 'DevSecOps', 'Threat Modeling'] },
      { id: 'r25', title: 'SOC Analyst',           level: 'Mid',    count: 3, salary: '฿50K–฿100K/เดือน',  skills: ['Incident Response', 'SIEM', 'Threat Hunting', 'Forensics'] },
      { id: 'r26', title: 'Penetration Tester',    level: 'Senior', count: 1, salary: '฿80K–฿160K/เดือน',  skills: ['Ethical Hacking', 'Red Team', 'OSCP', 'Bug Bounty'] },
    ],
  },
  {
    id: 'product_ux', name: 'Product & UX', nameT: 'ผลิตภัณฑ์และประสบการณ์ผู้ใช้', icon: '🎨', color: '#ec4899',
    roles: [
      { id: 'r27', title: 'Product Manager', level: 'Mid', count: 3, salary: '฿70K–฿150K/เดือน', skills: ['Product Roadmap', 'Agile', 'Market Research', 'Analytics'] },
      { id: 'r28', title: 'UX/UI Designer',  level: 'Mid', count: 3, salary: '฿50K–฿100K/เดือน', skills: ['Figma', 'User Research', 'Prototyping', 'Design System'] },
      { id: 'r29', title: 'UX Researcher',   level: 'Mid', count: 1, salary: '฿50K–฿100K/เดือน', skills: ['User Research', 'A/B Testing', 'Usability Testing', 'Analytics'] },
    ],
  },
  {
    id: 'qa', name: 'QA & Testing', nameT: 'QA และการทดสอบระบบ', icon: '🧪', color: '#10b981',
    roles: [
      { id: 'r30', title: 'QA Manager',              level: 'Manager', count: 1, salary: '฿80K–฿150K/เดือน', skills: ['QA Strategy', 'Team Lead', 'Process Improvement'] },
      { id: 'r31', title: 'Senior QA Engineer',       level: 'Senior',  count: 2, salary: '฿60K–฿120K/เดือน', skills: ['Test Planning', 'Automation', 'Performance Testing'] },
      { id: 'r32', title: 'QA Engineer',              level: 'Mid',     count: 4, salary: '฿40K–฿80K/เดือน',  skills: ['Manual Testing', 'Test Cases', 'Bug Reporting', 'Regression'] },
      { id: 'r33', title: 'Automation Test Engineer', level: 'Mid',     count: 2, salary: '฿50K–฿100K/เดือน', skills: ['Selenium', 'Cypress', 'Playwright', 'CI Integration'] },
    ],
  },
  {
    id: 'it_support', name: 'IT Support & Operations', nameT: 'สนับสนุนไอทีและปฏิบัติการ', icon: '🛠️', color: '#f97316',
    roles: [
      { id: 'r34', title: 'IT Manager',            level: 'Manager', count: 1, salary: '฿70K–฿130K/เดือน', skills: ['IT Operations', 'Vendor Management', 'Budgeting', 'ITIL'] },
      { id: 'r35', title: 'Senior IT Support',     level: 'Senior',  count: 2, salary: '฿40K–฿70K/เดือน',  skills: ['Systems Admin', 'Troubleshooting', 'Escalation', 'ITSM'] },
      { id: 'r36', title: 'IT Support Specialist', level: 'Mid',     count: 5, salary: '฿25K–฿45K/เดือน',  skills: ['Help Desk', 'Hardware', 'Software Support', 'Ticketing'] },
      { id: 'r37', title: 'IT Technician',         level: 'Junior',  count: 3, salary: '฿18K–฿30K/เดือน',  skills: ['Hardware Setup', 'Cable Management', 'Device Imaging'] },
    ],
  },
];

// ── Generate all 90 IT positions from categories ──────────────────────────────
function generateITPositions() {
  const positions = [];
  let idx = 1;
  for (const cat of IT_ROLE_CATEGORIES) {
    for (const role of cat.roles) {
      for (let n = 1; n <= role.count; n++) {
        positions.push({
          id: `pos-${String(idx).padStart(3, '0')}`,
          role_id: role.id,
          title: role.title,
          slot: n,
          total_slots: role.count,
          level: role.level,
          category_id: cat.id,
          category_name: cat.nameT,
          category_icon: cat.icon,
          category_color: cat.color,
          salary: role.salary,
          skills: role.skills,
          name: null,
          status: 'open',
          hired_at: null,
        });
        idx++;
      }
    }
  }
  // Mark active staff into their positions
  const cto = positions.find(p => p.role_id === 'r01');
  if (cto) Object.assign(cto, { name: 'Zuejai (ซึ้ใจ)', status: 'active', hired_at: '2024-01' });
  const aiEng = positions.find(p => p.role_id === 'r17' && p.slot === 1);
  if (aiEng) Object.assign(aiEng, { name: 'AI Agent (Claude)', status: 'active', hired_at: '2024-01' });
  return positions;
}

// ── Corporate Data Store ───────────────────────────────────────────────────────
export function createCorporateSystem(writeDir) {
  const path = f => join(writeDir, f);
  const ensure = () => { if (!existsSync(writeDir)) mkdirSync(writeDir, { recursive: true }); };

  const load = (file, def) => {
    try { if (existsSync(path(file))) return JSON.parse(readFileSync(path(file), 'utf8')); } catch (_) {}
    return def;
  };
  const save = (file, data) => {
    try { ensure(); writeFileSync(path(file), JSON.stringify(data, null, 2), 'utf8'); } catch (_) {}
  };

  return {
    // ── Board Members ───────────────────────────────────────────────────────
    getBoard: () => load('corp_board.json', [
      { id: 'b1', name: 'Zuejai (ซึ้ใจ)', title: 'Chairman & CEO', titleT: 'ประธานกรรมการและซีอีโอ', type: 'executive', tenure: '2024-Present', nationality: 'Thai', expertise: ['AI', 'Strategy', 'Technology'], independent: false },
      { id: 'b2', name: 'Board Member 2',  title: 'Independent Director', titleT: 'กรรมการอิสระ', type: 'independent', tenure: '2024-Present', nationality: 'Thai', expertise: ['Finance', 'Audit'], independent: true },
      { id: 'b3', name: 'Board Member 3',  title: 'Independent Director', titleT: 'กรรมการอิสระ', type: 'independent', tenure: '2024-Present', nationality: 'Thai', expertise: ['Legal', 'Compliance'], independent: true },
    ]),
    saveBoard: (data) => save('corp_board.json', data),

    // ── Compliance Checklist (ก.ล.ต. / SET) ────────────────────────────────
    getCompliance: () => load('corp_compliance.json', {
      sec_filings: [
        { id: 'c1', title: '56-1 One Report', period: 'Annual', status: 'pending', due: '4 months after FY end', priority: 'critical' },
        { id: 'c2', title: 'Form 56-2 (Proxy Statement)', period: 'Annual', status: 'pending', due: 'Before AGM', priority: 'critical' },
        { id: 'c3', title: 'Quarterly Financial Statements', period: 'Q1-Q4', status: 'pending', due: '45 days after quarter', priority: 'high' },
        { id: 'c4', title: 'Material Event Disclosure', period: 'Ad-hoc', status: 'ok', due: 'Within 1 business day', priority: 'critical' },
        { id: 'c5', title: 'AGM Notice + Proxy', period: 'Annual', status: 'pending', due: '21+ days before AGM', priority: 'high' },
        { id: 'c6', title: 'Connected Transaction Disclosure', period: 'Ad-hoc', status: 'ok', due: 'Within 3 days', priority: 'high' },
        { id: 'c7', title: 'PDPA Compliance Report', period: 'Annual', status: 'ok', due: 'Ongoing', priority: 'medium' },
        { id: 'c8', title: 'Anti-Bribery & Corruption Policy', period: 'Annual Review', status: 'ok', due: 'Annual', priority: 'medium' },
      ],
      global_compliance: [
        { id: 'g1', title: 'GDPR (EU)',              status: 'in_progress', region: 'EU',     priority: 'high'   },
        { id: 'g2', title: 'PDPA (Thailand)',         status: 'ok',         region: 'TH',     priority: 'high'   },
        { id: 'g3', title: 'CCPA (California)',       status: 'pending',    region: 'US',     priority: 'medium' },
        { id: 'g4', title: 'PIPL (China)',            status: 'pending',    region: 'CN',     priority: 'high'   },
        { id: 'g5', title: 'ISO 27001 (Info Security)', status: 'in_progress', region: 'Global', priority: 'high' },
        { id: 'g6', title: 'SOC 2 Type II',          status: 'pending',    region: 'Global', priority: 'medium' },
        { id: 'g7', title: 'AI Act (EU)',             status: 'pending',    region: 'EU',     priority: 'high'   },
      ],
      updatedAt: new Date().toISOString(),
    }),
    saveCompliance: (data) => { data.updatedAt = new Date().toISOString(); save('corp_compliance.json', data); },

    // ── IR Data ─────────────────────────────────────────────────────────────
    getIR: () => load('corp_ir.json', {
      company: { name: 'Openthai.ai Public Company Limited', ticker: 'OTAI', market: 'MAI (planned)', founded: '2024', hq: 'Bangkok, Thailand', business: 'AI Content Generation Platform — Global' },
      financials: {
        fiscal_year: '2025',
        revenue_thb: 0,
        mrr_thb: 0,
        arr_thb: 0,
        paying_customers: 0,
        target_ipo_year: '2027',
        valuation_target_thb: 1000000000,
      },
      shareholders: [
        { name: 'Founding Team', pct: 60, type: 'founder' },
        { name: 'Reserved (ESOP)',pct: 10, type: 'employee' },
        { name: 'Future Investors', pct: 30, type: 'reserved' },
      ],
      meetings: [],
      announcements: [],
      updatedAt: new Date().toISOString(),
    }),
    saveIR: (data) => { data.updatedAt = new Date().toISOString(); save('corp_ir.json', data); },

    // ── HR & Staff ──────────────────────────────────────────────────────────
    getHR: () => load('corp_hr.json', {
      headcount: { total: 1, fulltime: 1, contractor: 0, target_2025: 5, target_2026: 20 },
      departments_headcount: Object.fromEntries(Object.keys(DEPARTMENTS).map(k => [k, 0])),
      open_positions: [
        { id: 'j1', title: 'Chief Technology Officer', dept: 'it',        level: 'C-Level', status: 'open', priority: 'critical' },
        { id: 'j2', title: 'Chief Financial Officer',   dept: 'finance',   level: 'C-Level', status: 'open', priority: 'critical' },
        { id: 'j3', title: 'VP Marketing (Global)',     dept: 'marketing', level: 'VP',      status: 'open', priority: 'high'     },
        { id: 'j4', title: 'Full-Stack Engineer',       dept: 'it',        level: 'Senior',  status: 'open', priority: 'high'     },
        { id: 'j5', title: 'Compliance Manager',        dept: 'compliance',level: 'Manager', status: 'open', priority: 'medium'   },
        { id: 'j6', title: 'IR Manager',                dept: 'ir',        level: 'Manager', status: 'open', priority: 'medium'   },
      ],
      policies: [
        { name: 'Code of Conduct', status: 'active', version: '1.0' },
        { name: 'Anti-Bribery Policy', status: 'active', version: '1.0' },
        { name: 'Data Privacy Policy (PDPA)', status: 'active', version: '1.1' },
        { name: 'Whistleblower Policy', status: 'active', version: '1.0' },
        { name: 'Remote Work Policy', status: 'active', version: '1.0' },
        { name: 'AI Ethics Policy', status: 'active', version: '1.0' },
      ],
      updatedAt: new Date().toISOString(),
    }),
    saveHR: (data) => { data.updatedAt = new Date().toISOString(); save('corp_hr.json', data); },

    // ── ESG Report ──────────────────────────────────────────────────────────
    getESG: () => load('corp_esg.json', {
      score: { environmental: 0, social: 0, governance: 70, total: 23, rating: 'B', target_rating: 'AA' },
      environmental: [
        { kpi: 'Carbon Footprint (tCO₂e)',    value: 'Calculating', target: 'Net Zero 2030', status: 'in_progress' },
        { kpi: 'Renewable Energy Usage',       value: '0%',          target: '100% by 2027',  status: 'pending'     },
        { kpi: 'Green Cloud Infrastructure',   value: 'Vercel (CDN)', target: '100% green',   status: 'partial'     },
        { kpi: 'E-Waste Management',           value: 'N/A',          target: 'Policy by Q3', status: 'pending'     },
      ],
      social: [
        { kpi: 'Local Thai SME Supported',        value: '0',    target: '10,000 SMEs/year', status: 'in_progress' },
        { kpi: 'AI Skills Training (free)',        value: '0',    target: '1,000 people/year',status: 'pending'     },
        { kpi: 'OTOP Digital Transformation',     value: '0',    target: '500 OTOP/year',    status: 'in_progress' },
        { kpi: 'Gender Diversity (leadership)',    value: '0%',   target: '>30% women',       status: 'pending'     },
        { kpi: 'Community Investment (THB)',       value: '0',    target: '1M THB/year',      status: 'pending'     },
      ],
      governance: [
        { kpi: 'Independent Directors',       value: '2/3 (67%)',  target: '>33%',          status: 'ok'          },
        { kpi: 'Anti-Corruption Policy',      value: 'Active',     target: 'Certified',     status: 'ok'          },
        { kpi: 'Whistleblower Channel',       value: 'Active',     target: 'Operational',   status: 'ok'          },
        { kpi: 'Board Meeting Attendance',    value: '100%',       target: '>75%',          status: 'ok'          },
        { kpi: 'Cybersecurity Framework',     value: 'In Progress',target: 'ISO 27001',     status: 'in_progress' },
        { kpi: 'AI Ethics Framework',         value: 'Active',     target: 'Certified',     status: 'ok'          },
      ],
      sdg_alignment: [
        { sdg: 4, title: 'Quality Education',        contribution: 'AI Skills Training สำหรับชาวไทย' },
        { sdg: 8, title: 'Decent Work & Growth',     contribution: 'ช่วย SME/OTOP เพิ่มรายได้ด้วย AI' },
        { sdg: 9, title: 'Industry & Innovation',    contribution: 'AI-native platform สำหรับเอเชีย' },
        { sdg: 10, title: 'Reduced Inequalities',    contribution: 'ประชาธิปไตย AI — ทุกคนเข้าถึงได้' },
        { sdg: 17, title: 'Partnerships for Goals',  contribution: 'ร่วมมือ 241 platforms ทั่วโลก' },
      ],
      updatedAt: new Date().toISOString(),
    }),
    saveESG: (data) => { data.updatedAt = new Date().toISOString(); save('corp_esg.json', data); },

    // ── Global Operations ────────────────────────────────────────────────────
    getGlobalOps: () => load('corp_global.json', {
      regions: [
        { id: 'sea',   name: 'Southeast Asia',   countries: ['Thailand','Vietnam','Indonesia','Malaysia','Philippines','Singapore'], status: 'active',   users: 0, revenue_pct: 70 },
        { id: 'east',  name: 'East Asia',         countries: ['China','Japan','South Korea','Taiwan','HongKong'],                   status: 'expanding', users: 0, revenue_pct: 15 },
        { id: 'south', name: 'South Asia',        countries: ['India','Bangladesh','Sri Lanka','Nepal'],                           status: 'planned',   users: 0, revenue_pct: 5  },
        { id: 'mideast',name: 'Middle East',      countries: ['UAE','Saudi Arabia','Qatar','Kuwait'],                              status: 'planned',   users: 0, revenue_pct: 5  },
        { id: 'eu',    name: 'Europe',            countries: ['UK','Germany','France','Netherlands'],                              status: 'planned',   users: 0, revenue_pct: 3  },
        { id: 'us',    name: 'North America',     countries: ['USA','Canada'],                                                    status: 'planned',   users: 0, revenue_pct: 2  },
      ],
      languages_supported: ['ไทย','中文','English','日本語','한국어','Bahasa','Tiếng Việt','हिंदी'],
      platforms_count: 241,
      entities: [
        { name: 'Openthai.ai Co., Ltd.',               country: 'Thailand', type: 'Headquarters', status: 'active'  },
        { name: 'Openthai.ai Singapore Pte. Ltd.',     country: 'Singapore',type: 'Regional Hub', status: 'planned' },
        { name: 'Openthai.ai HK Ltd.',                 country: 'HongKong', type: 'Greater China',status: 'planned' },
        { name: 'Openthai.ai USA Inc.',                country: 'USA',      type: 'Americas',    status: 'planned' },
      ],
      updatedAt: new Date().toISOString(),
    }),
    saveGlobalOps: (data) => { data.updatedAt = new Date().toISOString(); save('corp_global.json', data); },

    // ── Finance Summary ──────────────────────────────────────────────────────
    getFinance: () => load('corp_finance.json', {
      fiscal_year: '2025',
      currency: 'THB',
      summary: { revenue: 0, expenses: 0, profit: 0, cash: 0, runway_months: 0 },
      budget_by_dept: Object.fromEntries(Object.keys(DEPARTMENTS).map(k => [k, { budget: 0, spent: 0 }])),
      ipo_roadmap: [
        { phase: 'Phase 1', title: 'Pre-Series A',       year: '2025', milestone: 'MRR ฿500K+, 1,000 paying users',    status: 'in_progress' },
        { phase: 'Phase 2', title: 'Series A',           year: '2026', milestone: 'MRR ฿5M+, 10,000 users, 3 countries', status: 'planned' },
        { phase: 'Phase 3', title: 'Series B / Pre-IPO', year: '2026', milestone: 'Revenue ฿100M+, 50,000 users',        status: 'planned' },
        { phase: 'Phase 4', title: 'IPO — MAI/SET',      year: '2027', milestone: 'Market Cap ฿1,000M+',               status: 'planned' },
      ],
      updatedAt: new Date().toISOString(),
    }),
    saveFinance: (data) => { data.updatedAt = new Date().toISOString(); save('corp_finance.json', data); },

    // ── IT Department Staff & Roles ──────────────────────────────────────────
    getITDept: () => load('corp_it.json', {
      overview: {
        total_categories: IT_ROLE_CATEGORIES.length,
        total_roles: IT_ROLE_CATEGORIES.reduce((s, c) => s + c.roles.length, 0),
        total_positions: IT_ROLE_CATEGORIES.reduce((s, c) => s + c.roles.reduce((rs, r) => rs + r.count, 0), 0),
        current_headcount: 2,
        open_positions: IT_ROLE_CATEGORIES.reduce((s, c) => s + c.roles.reduce((rs, r) => rs + r.count, 0), 0) - 2,
        tech_stack: ['React', 'Node.js', 'FastAPI', 'PostgreSQL', 'Supabase', 'Vercel', 'AWS', 'Docker', 'Python', 'TypeScript'],
        methodologies: ['Agile/Scrum', 'DevOps', 'CI/CD', 'GitOps', 'Domain-Driven Design'],
      },
      categories: IT_ROLE_CATEGORIES,
      positions: generateITPositions(),
      updatedAt: new Date().toISOString(),
    }),
    saveITDept: (data) => { data.updatedAt = new Date().toISOString(); save('corp_it.json', data); },

    DEPARTMENTS,
  };
}
