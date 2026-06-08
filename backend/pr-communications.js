// OpenThaiAi — PR & Global Communications System
// Press Room · Media Center · Crisis Comms · KOL · Newsletter · Global Campaigns

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export function createPRSystem(writeDir) {
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
    // ── Press Releases ────────────────────────────────────────────────────────
    getPressReleases: () => load('pr_releases.json', [
      {
        id: 'pr001', title: 'OpenThaiAi เปิดตัวระบบ AI Content Generator สำหรับ SME ไทย',
        titleEN: 'OpenThaiAi Launches AI Content Generator for Thai SMEs',
        date: '2026-05-20', status: 'published', category: 'product',
        languages: ['th', 'en', 'zh'],
        summary: 'OpenThaiAi เปิดตัวแพลตฟอร์ม AI สร้างคอนเทนต์ครบวงจร รองรับ 241 แพลตฟอร์มทั่วโลก',
        content: '', views: 0, media_picked_up: [],
      },
      {
        id: 'pr002', title: 'OpenThaiAi ประกาศแผน IPO บน MAI ภายในปี 2027',
        titleEN: 'OpenThaiAi Announces IPO Plans on MAI by 2027',
        date: '2026-06-01', status: 'draft', category: 'corporate',
        languages: ['th', 'en'],
        summary: 'บริษัทตั้งเป้า Market Cap ฿1,000M+ ก่อนเข้าจดทะเบียนใน MAI/SET',
        content: '', views: 0, media_picked_up: [],
      },
    ]),
    savePressReleases: (data) => save('pr_releases.json', data),

    // ── Media Contacts ────────────────────────────────────────────────────────
    getMediaContacts: () => load('pr_media_contacts.json', [
      { id: 'mc001', outlet: 'กรุงเทพธุรกิจ',       country: 'TH', beat: 'Technology',  contact: 'editor@bangkokbiznews.com', tier: 1 },
      { id: 'mc002', outlet: 'The Nation Thailand',  country: 'TH', beat: 'Business',    contact: 'tech@nationthailand.com',  tier: 1 },
      { id: 'mc003', outlet: 'TechCrunch',           country: 'US', beat: 'Startups',    contact: 'tips@techcrunch.com',      tier: 1 },
      { id: 'mc004', outlet: 'Tech in Asia',         country: 'SG', beat: 'SEA Tech',    contact: 'news@techinasia.com',      tier: 1 },
      { id: 'mc005', outlet: 'Kr-Asia',              country: 'SG', beat: 'ASEAN',       contact: 'editorial@kr-asia.com',    tier: 2 },
      { id: 'mc006', outlet: '36Kr (36氪)',           country: 'CN', beat: 'China Tech',  contact: 'pr@36kr.com',              tier: 1 },
      { id: 'mc007', outlet: 'Nikkei Asia',          country: 'JP', beat: 'Asia Biz',    contact: 'asia@nikkei.com',          tier: 1 },
      { id: 'mc008', outlet: 'e27',                  country: 'SG', beat: 'SEA Startup', contact: 'editorial@e27.co',         tier: 2 },
    ]),
    saveMediaContacts: (data) => save('pr_media_contacts.json', data),

    // ── Global Campaigns ──────────────────────────────────────────────────────
    getCampaigns: () => load('pr_campaigns.json', [
      {
        id: 'camp001', name: 'Thailand AI Revolution',
        nameLocal: 'ปฏิวัติ AI ไทย',
        region: 'TH', status: 'active',
        channels: ['LINE', 'Facebook', 'TikTok', 'Press Release'],
        audience: 'Thai SME owners, OTOP sellers',
        message: 'AI ไม่ใช่เรื่องยาก — OpenThaiAi ทำให้ทุกคนเข้าถึงได้',
        kpi: { reach: 0, engagement: 0, leads: 0, target_reach: 1000000 },
        startDate: '2026-05-01', endDate: '2026-08-31',
      },
      {
        id: 'camp002', name: 'ASEAN AI for All',
        nameLocal: 'AI เพื่อ ASEAN',
        region: 'SEA', status: 'planning',
        channels: ['LinkedIn', 'Tech Media', 'Conference'],
        audience: 'SEA entrepreneurs, investors',
        message: 'OpenThaiAi — The First AI Platform Built for Southeast Asia',
        kpi: { reach: 0, engagement: 0, leads: 0, target_reach: 5000000 },
        startDate: '2026-09-01', endDate: '2026-12-31',
      },
      {
        id: 'camp003', name: '泰国AI平台 — 进军中国市场',
        nameLocal: 'OpenThaiAi 进中国',
        region: 'CN', status: 'planning',
        channels: ['WeChat', 'Weibo', 'Xiaohongshu', '36Kr Media'],
        audience: '中国出海品牌, 跨境电商',
        message: '专为亚洲市场打造的AI内容生成平台',
        kpi: { reach: 0, engagement: 0, leads: 0, target_reach: 2000000 },
        startDate: '2026-10-01', endDate: '2027-03-31',
      },
    ]),
    saveCampaigns: (data) => save('pr_campaigns.json', data),

    // ── KOL / Influencer Management ───────────────────────────────────────────
    getKOLs: () => load('pr_kols.json', [
      { id: 'kol001', name: 'TBD — Thai Tech Influencer', platform: 'TikTok',    followers: '500K+', niche: 'Tech/Business', region: 'TH', status: 'prospecting', tier: 1 },
      { id: 'kol002', name: 'TBD — SME Coach',            platform: 'Facebook',  followers: '200K+', niche: 'SME/Retail',   region: 'TH', status: 'prospecting', tier: 2 },
      { id: 'kol003', name: 'TBD — OTOP Reviewer',        platform: 'TikTok',    followers: '300K+', niche: 'OTOP/Local',   region: 'TH', status: 'prospecting', tier: 2 },
      { id: 'kol004', name: 'TBD — SEA Tech Blogger',     platform: 'LinkedIn',  followers: '50K+',  niche: 'Tech/Startup', region: 'SEA',status: 'prospecting', tier: 1 },
      { id: 'kol005', name: 'TBD — 中文科技博主',           platform: 'Xiaohongshu',followers:'100K+', niche: 'Tech/AI',     region: 'CN', status: 'prospecting', tier: 1 },
    ]),
    saveKOLs: (data) => save('pr_kols.json', data),

    // ── Crisis Communication Plan ─────────────────────────────────────────────
    getCrisisPlan: () => load('pr_crisis.json', {
      levels: [
        { level: 1, color: '#10b981', label: 'Low',      desc: 'ข้อร้องเรียนทั่วไป, negative review', response_time: '24 ชม.', owner: 'PR Team' },
        { level: 2, color: '#f59e0b', label: 'Medium',   desc: 'ข่าวเชิงลบ, data incident minor',    response_time: '4 ชม.',  owner: 'PR + Legal' },
        { level: 3, color: '#ef4444', label: 'High',     desc: 'Data breach, PR crisis, viral negative', response_time: '1 ชม.', owner: 'CEO + PR + Legal' },
        { level: 4, color: '#7c3aed', label: 'Critical', desc: 'Regulatory action, major breach',    response_time: '30 นาที', owner: 'All C-Suite' },
      ],
      contacts: [
        { role: 'PR Lead',       name: 'TBD', phone: '+66-xxx', email: 'pr@OpenThaiAi.com' },
        { role: 'Legal Counsel', name: 'TBD', phone: '+66-xxx', email: 'legal@OpenThaiAi.com' },
        { role: 'CEO',           name: 'Zuejai', phone: 'Direct', email: 'ceo@OpenThaiAi.com' },
      ],
      holding_statements: {
        th: 'บริษัทได้รับทราบสถานการณ์ดังกล่าวแล้ว และกำลังดำเนินการตรวจสอบอย่างเร่งด่วน ขอยืนยันว่าความปลอดภัยของลูกค้าคือสิ่งสำคัญสูงสุดของเรา',
        en: 'We are aware of the situation and are investigating urgently. The safety and security of our customers remains our highest priority.',
        zh: '我们已注意到相关情况，正在紧急调查中。我们的客户安全始终是我们的最高优先事项。',
      },
    }),

    // ── Newsletters ──────────────────────────────────────────────────────────
    getNewsletters: () => load('pr_newsletters.json', {
      subscribers: { th: 0, en: 0, zh: 0, total: 0 },
      sent: [],
      templates: [
        { id: 'nl001', name: 'Monthly Product Update',   freq: 'Monthly',  lang: ['th','en'],    status: 'active' },
        { id: 'nl002', name: 'Weekly AI Tips (Thai)',     freq: 'Weekly',   lang: ['th'],         status: 'planning' },
        { id: 'nl003', name: 'Investor Newsletter',       freq: 'Quarterly',lang: ['th','en'],    status: 'planning' },
        { id: 'nl004', name: '中文月报 (Chinese Monthly)',  freq: 'Monthly',  lang: ['zh'],         status: 'planning' },
      ],
    }),

    // ── Team Tasks (Command Center) ───────────────────────────────────────────
    getTasks: () => load('cmd_tasks.json', [
      { id: 't001', dept: 'it',        title: 'ติดตั้ง OMISE_SECRET_KEY ใน Vercel',         priority: 'critical', status: 'pending',     assignee: 'IT Team',    due: '2026-05-25' },
      { id: 't002', dept: 'it',        title: 'ตั้งค่า N8N_URL + import workflow',           priority: 'high',     status: 'pending',     assignee: 'IT Team',    due: '2026-05-27' },
      { id: 't003', dept: 'it',        title: 'รัน Supabase pgvector migration SQL',         priority: 'high',     status: 'pending',     assignee: 'IT Team',    due: '2026-05-30' },
      { id: 't004', dept: 'finance',   title: 'เปิด Omise Business Account',                priority: 'critical', status: 'pending',     assignee: 'Finance',    due: '2026-05-23' },
      { id: 't005', dept: 'hr',        title: 'โพสต์รับสมัคร CTO + CFO',                   priority: 'critical', status: 'pending',     assignee: 'HR Team',    due: '2026-05-25' },
      { id: 't006', dept: 'compliance',title: 'ยื่นขอจดทะเบียนบริษัท (DBD)',               priority: 'critical', status: 'in_progress', assignee: 'Legal',      due: '2026-06-01' },
      { id: 't007', dept: 'ir',        title: 'จัดทำ Pitch Deck Series A',                   priority: 'high',     status: 'pending',     assignee: 'CEO + IR',   due: '2026-06-15' },
      { id: 't008', dept: 'marketing', title: 'เปิด Facebook Page บริษัท',                  priority: 'high',     status: 'in_progress', assignee: 'Marketing',  due: '2026-05-22' },
      { id: 't009', dept: 'marketing', title: 'สร้าง TikTok Account @OpenThaiAi',            priority: 'high',     status: 'pending',     assignee: 'PR Team',    due: '2026-05-25' },
      { id: 't010', dept: 'pr',        title: 'เขียน Press Release เปิดตัว (TH+EN)',         priority: 'high',     status: 'pending',     assignee: 'PR Team',    due: '2026-06-01' },
      { id: 't011', dept: 'esg',       title: 'จัดทำ Carbon Footprint Baseline Report',     priority: 'medium',   status: 'pending',     assignee: 'ESG Team',   due: '2026-07-01' },
      { id: 't012', dept: 'strategy',  title: 'ทำ Market Research ASEAN Q3 2026',            priority: 'medium',   status: 'pending',     assignee: 'Strategy',   due: '2026-07-31' },
      { id: 't013', dept: 'it',        title: 'ขอ API Key: RunwayML / Pika / Kling',        priority: 'medium',   status: 'pending',     assignee: 'IT Team',    due: '2026-06-15' },
      { id: 't014', dept: 'it',        title: 'ต่อ Domain OpenThaiAi.com → Vercel',         priority: 'high',     status: 'in_progress', assignee: 'IT Team',    due: '2026-05-22' },
      { id: 't015', dept: 'pr',        title: 'ลงทะเบียน Google News Publisher',             priority: 'medium',   status: 'pending',     assignee: 'PR Team',    due: '2026-06-15' },
    ]),
    saveTasks: (data) => save('cmd_tasks.json', data),

    // ── Department KPIs ───────────────────────────────────────────────────────
    getKPIs: () => load('cmd_kpis.json', {
      month: 'May 2026',
      departments: [
        { dept: 'it',         kpis: [{ name: 'System Uptime', target: '99.9%', actual: '99.5%', ok: true }, { name: 'API Response', target: '<500ms', actual: '320ms', ok: true }, { name: 'Deploy Frequency', target: '2/week', actual: '1/week', ok: false }] },
        { dept: 'marketing',  kpis: [{ name: 'Website Traffic', target: '5,000', actual: '1,200', ok: false }, { name: 'Social Followers', target: '1,000', actual: '50', ok: false }, { name: 'Lead Gen', target: '100', actual: '12', ok: false }] },
        { dept: 'finance',    kpis: [{ name: 'MRR (THB)', target: '฿50,000', actual: '฿0', ok: false }, { name: 'Paying Users', target: '50', actual: '0', ok: false }, { name: 'Runway', target: '12mo', actual: 'TBD', ok: false }] },
        { dept: 'pr',         kpis: [{ name: 'Press Mentions', target: '5', actual: '0', ok: false }, { name: 'Newsletter Subs', target: '500', actual: '0', ok: false }, { name: 'KOL Partnerships', target: '3', actual: '0', ok: false }] },
        { dept: 'hr',         kpis: [{ name: 'Open Positions Posted', target: '6', actual: '0', ok: false }, { name: 'Candidates Pipeline', target: '20', actual: '0', ok: false }, { name: 'Policies Published', target: '8', actual: '6', ok: true }] },
        { dept: 'compliance', kpis: [{ name: 'Company Registration', target: 'Done', actual: 'In Progress', ok: false }, { name: 'PDPA Compliance', target: 'Done', actual: 'Done', ok: true }, { name: 'ISO 27001 Start', target: 'Q3', actual: 'Planned', ok: true }] },
      ],
      updatedAt: new Date().toISOString(),
    }),
    saveKPIs: (data) => { data.updatedAt = new Date().toISOString(); save('cmd_kpis.json', data); },
  };
}
