// OpenThai AI — Corporate System (Public Company / บริษัทมหาชน)
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
      company: { name: 'OpenThai AI Public Company Limited', ticker: 'OTAI', market: 'MAI (planned)', founded: '2024', hq: 'Bangkok, Thailand', business: 'AI Content Generation Platform — Global' },
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
        { name: 'OpenThai AI Co., Ltd.',               country: 'Thailand', type: 'Headquarters', status: 'active'  },
        { name: 'OpenThai AI Singapore Pte. Ltd.',     country: 'Singapore',type: 'Regional Hub', status: 'planned' },
        { name: 'OpenThai AI HK Ltd.',                 country: 'HongKong', type: 'Greater China',status: 'planned' },
        { name: 'OpenThai AI USA Inc.',                country: 'USA',      type: 'Americas',    status: 'planned' },
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

    DEPARTMENTS,
  };
}
