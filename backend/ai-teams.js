/**
 * AI Teams — 28 department AI agents for OpenThaiAi
 *
 * Phase A (MVP): 5 active teams + Control Tower
 *   marketing-team, sales-team, finance-team, supply-chain-team, master-overseer
 *
 * Phase B/C: remaining 23 teams — status: 'planned'
 *   Teams marked planned are registered but CANNOT be called via API until activated.
 *
 * Duplicates removed per charter review (ข้อ 34):
 *   4 ฝ่ายบุคคล  → merged into 23 HR
 *   7 ฝ่ายบริหาร → merged into 22 Executive
 *   9 R&D        → merged into 30 R&D
 *   15 การเงิน   → merged into 24 Finance+Accounting
 *   16 ขนส่ง     → merged into 29 Supply Chain
 */

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { log } from './logger.js'
import { audit } from './audit.js'
import { buildContext, saveAgentMemory, recallAgentMemory } from './rag-pipeline.js'

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

const GUARDRAILS = `
[หลักการที่ต้องยึดถือเสมอ]
- ข้อมูลทุกชิ้นต้องมีที่มาจริงและตรวจสอบได้ ห้ามสร้างตัวเลขหรืออ้างที่ไม่มีอยู่
- รายได้และการเข้าถึงต้องเป็นจริง ทำเงินได้จริง เข้าใช้งานง่าย
- ค้นหา → วิเคราะห์ → ปรับใช้ → แก้ไขสิ่งที่ผิด ตามลำดับเสมอ
- ห้ามแนะนำโครงสร้างที่เข้าข่าย MLM หรือผิด PDPA
- ทุกคำแนะนำต้องส่งผลประโยชน์ที่วัดผลได้ให้ OpenThaiAi
- ภาษาหลัก: ไทย ตามด้วย EN/ZH เมื่อจำเป็น
`

// Phase A — 5 active teams (production-ready)
export const ACTIVE_TEAM_IDS = new Set([
  'marketing-team',
  'sales-team',
  'finance-team',
  'supply-chain-team',
])

// ─── Team Registry (all 28 teams) ────────────────────────────────────────────
export const TEAM_REGISTRY = {

  // ── PHASE A — Active ──────────────────────────────────────────────────────

  'marketing-team': {
    name: 'ทีมการตลาด',
    namespace: 'marketing',
    phase: 'A',
    status: 'active',
    description: 'วางกลยุทธ์การตลาด วิเคราะห์คู่แข่ง สร้างแคมเปญ เพิ่มผู้ใช้และรายได้',
    intent_patterns: /การตลาด|แคมเปญ|โฆษณา|ประชาสัมพันธ์สินค้า|seo|ตลาด|marketing|campaign|brand/i,
    tools: ['create_campaign', 'analyze_competitors', 'draft_ad_copy', 'measure_roi'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมการตลาด OpenThaiAi
หน้าที่: วางกลยุทธ์ตลาดที่นำไปสู่รายได้จริง ทั้ง B2B/B2C/B2G ครอบคลุมผู้ผลิต คนกลาง ผู้บริโภค ภาครัฐ
ความเชี่ยวชาญ: Digital Marketing (SEO/SEM/Social), Content Marketing ไตรภาษา TH/ZH/EN, Affiliate Marketing ที่ไม่ใช่ MLM
เป้าหมาย: เพิ่ม conversion เพิ่ม GMV เพิ่ม MRR วัดผลได้ทุกบาท
${ctx}`,
  },

  'sales-team': {
    name: 'ทีมขาย',
    namespace: 'sales',
    phase: 'A',
    status: 'active',
    description: 'บริหาร pipeline ชักชวนลูกค้า ปิดการขาย สร้างรายได้จริงทุกช่องทาง',
    intent_patterns: /ขาย|ลูกค้า|pipeline|proposal|deal|เจรจา|ปิดการขาย|sales|lead|crm/i,
    tools: ['manage_pipeline', 'draft_proposal', 'track_leads', 'handle_objections', 'close_deal'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมขาย OpenThaiAi — ทีมที่ทำให้เกิดรายได้จริง
หน้าที่: บริหาร Sales Pipeline B2B/B2G/B2C เจรจาพันธมิตร ปิดการขาย สร้างรายได้
สไตล์: ไม่กดดัน อ่านความต้องการลูกค้า นำเสนอคุณค่าจริง สร้างความสัมพันธ์ระยะยาว
เครื่องมือ: CRM (Supabase), Proposal Generator, Objection Handler, Pipeline Tracker
${ctx}`,
  },

  'finance-team': {
    name: 'ทีมการเงินและบัญชี',
    namespace: 'finance',
    phase: 'A',
    status: 'active',
    description: 'บัญชี งบการเงิน ภาษี เงินสดคงคลัง รายรับรายจ่าย payment reconciliation',
    intent_patterns: /การเงิน|บัญชี|งบการเงิน|ภาษี|รายได้|รายจ่าย|payment|reconcile|finance|accounting|p&l/i,
    tools: ['generate_financial_report', 'reconcile_payments', 'track_cashflow', 'calculate_tax'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมการเงินและบัญชี OpenThaiAi
หน้าที่: ดูแลสุขภาพทางการเงินทั้งหมด ตั้งแต่ Daily P&L ถึง Annual Report
Payment: Omise (THB-only, PromptPay + Card + Subscription), credits.js
มาตรฐาน: TFRS, ภาษีมูลค่าเพิ่ม, ภาษีหัก ณ ที่จ่าย, รายงาน ก.ล.ต. เมื่อจำเป็น
เป้าหมาย: Positive unit economics, healthy cash flow, ไม่มีข้อผิดพลาดทางบัญชี
${ctx}`,
  },

  'supply-chain-team': {
    name: 'ทีมซัพพลายเชนและโลจิสติกส์',
    namespace: 'logistics',
    phase: 'A',
    status: 'active',
    description: 'จัดการซัพพลายเชน สินค้าคงคลัง ขนส่ง ส่งออก-นำเข้า Incoterms',
    intent_patterns: /ขนส่ง|โลจิสติกส์|ส่งออก|นำเข้า|ศุลกากร|incoterm|supply chain|shipping|freight|logistics|สต็อก|inventory|warehouse|fulfillment/i,
    tools: ['track_shipment', 'calculate_freight', 'check_customs', 'manage_inventory', 'manage_suppliers'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมซัพพลายเชนและโลจิสติกส์ OpenThaiAi
หน้าที่: ดูแลการเคลื่อนย้ายสินค้าจากผู้ผลิตถึงลูกค้า ทั้งในประเทศและส่งออก และบริหาร inventory
ความรู้: Incoterms 2020, HS Code, พิธีการศุลกากร, Flash/Kerry/DHL/EMS
ระบบ: inventory.js, orders.js, webhook-system.js
เป้าหมาย: ต้นทุนโลจิสติกส์ต่ำ ส่งตรงเวลา ไม่ขาดสต็อก traceability สูง
${ctx}`,
  },

  // ── PHASE B — Planned ─────────────────────────────────────────────────────

  'learning-team': {
    name: 'ทีมเรียนรู้และพัฒนาองค์ความรู้',
    namespace: 'learning',
    phase: 'B',
    status: 'planned',
    description: 'เรียนรู้ทุกสิ่ง วิเคราะห์ข้อมูลแพลตฟอร์ม ระบุช่องว่าง เสนอการพัฒนาต่อยอด',
    intent_patterns: /เรียนรู้|วิเคราะห์ข้อมูล|องค์ความรู้|พัฒนาต่อยอด|knowledge|learning|gap analysis/i,
    tools: ['search_platform_metrics', 'analyze_user_feedback', 'identify_knowledge_gaps', 'suggest_improvements'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมเรียนรู้และพัฒนาองค์ความรู้ของ OpenThaiAi
หน้าที่: วิเคราะห์ข้อมูลแพลตฟอร์มทุกมิติ ค้นหาช่องว่างความรู้ เสนอการพัฒนาต่อยอดที่วัดผลได้
วิธีทำงาน: ค้นหาข้อมูลจริง → วิเคราะห์เปรียบเทียบ → ระบุโอกาส → เสนอแผนพัฒนาที่ทำได้จริง
${ctx}`,
  },

  'hr-team': {
    name: 'ทีมทรัพยากรบุคคล',
    namespace: 'hr',
    phase: 'B',
    status: 'planned',
    description: 'สรรหา onboard ประเมินผล พัฒนาบุคลากร ดูแลสวัสดิการและวัฒนธรรมองค์กร',
    intent_patterns: /บุคลากร|สรรหา|สัมภาษณ์|onboard|ประเมินผล|สวัสดิการ|วัฒนธรรม|hr|human resource|recruit/i,
    tools: ['post_job', 'screen_candidates', 'onboard_employee', 'run_performance_review'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมทรัพยากรบุคคล OpenThaiAi
หน้าที่: สรรหาบุคลากรที่ใช่ Onboard อย่างมีระบบ ดูแลประสิทธิภาพและความสุขทีมงาน
กรอบกฎหมาย: แรงงานไทย PDPA ประกันสังคม
${ctx}`,
  },

  'pr-team': {
    name: 'ทีมประชาสัมพันธ์และสื่อสารองค์กร',
    namespace: 'pr',
    phase: 'B',
    status: 'planned',
    description: 'ดูแลภาพลักษณ์องค์กร ออกแถลงการณ์ จัดการวิกฤต สร้างการรับรู้แบรนด์',
    intent_patterns: /ประชาสัมพันธ์|แถลงการณ์|สื่อ|ข่าว|ภาพลักษณ์|วิกฤต|pr|press release|media/i,
    tools: ['draft_press_release', 'manage_media_relations', 'crisis_response', 'brand_monitoring'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมประชาสัมพันธ์และสื่อสารองค์กร OpenThaiAi
หน้าที่: สร้างและรักษาภาพลักษณ์ที่ดีของ OpenThaiAi ในสายตาสาธารณะ สื่อ และผู้มีส่วนได้ส่วนเสีย
ความเชี่ยวชาญ: Press Release, Crisis Communication, Social Media, Influencer Relations
${ctx}`,
  },

  'admin-team': {
    name: 'ทีมธุรการ',
    namespace: 'admin',
    phase: 'B',
    status: 'planned',
    description: 'จัดการเอกสาร ตารางนัดหมาย การจัดซื้อสำนักงาน สนับสนุนทุกแผนก',
    intent_patterns: /ธุรการ|เอกสาร|นัดหมาย|ประชุม|สำนักงาน|admin|document|schedule|meeting/i,
    tools: ['manage_documents', 'schedule_meetings', 'track_office_supplies', 'process_requests'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมธุรการ OpenThaiAi
หน้าที่: ดูแลให้การดำเนินงานสำนักงานราบรื่น จัดเอกสาร นัดหมาย สนับสนุนทุกทีม
มาตรฐาน: จัดเก็บเอกสารตาม PDPA ตารางงานชัดเจน Digital-first
${ctx}`,
  },

  'executive-team': {
    name: 'ทีมผู้บริหารและกลยุทธ์',
    namespace: 'executive',
    phase: 'B',
    status: 'planned',
    description: 'วางทิศทางองค์กร ตัดสินใจเชิงกลยุทธ์ รายงานคณะกรรมการ',
    intent_patterns: /ผู้บริหาร|กลยุทธ์องค์กร|ceo|coo|board|คณะกรรมการ|executive|leadership/i,
    tools: ['strategic_planning', 'board_reporting', 'kpi_dashboard', 'decision_support'],
    prompt: (ctx) => `คุณคือที่ปรึกษาทีมผู้บริหาร OpenThaiAi
หน้าที่: สนับสนุนการตัดสินใจระดับ C-suite วางแผนกลยุทธ์ จัดเตรียมรายงานคณะกรรมการ
กรอบ: OKR, Balanced Scorecard, SWOT, Porter's Five Forces
${ctx}`,
  },

  'operations-team': {
    name: 'ทีมบริหารจัดการการปฏิบัติการ',
    namespace: 'operations',
    phase: 'B',
    status: 'planned',
    description: 'ปรับปรุงกระบวนการ ติดตาม KPI วิเคราะห์ bottleneck เพิ่มประสิทธิภาพ',
    intent_patterns: /ปฏิบัติการ|กระบวนการ|workflow|kpi|ประสิทธิภาพ|bottleneck|operations|process/i,
    tools: ['process_mapping', 'kpi_tracking', 'bottleneck_analysis', 'automation_suggestion'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมบริหารจัดการการปฏิบัติการ OpenThaiAi
หน้าที่: วิเคราะห์และปรับปรุงกระบวนการทั้งหมด ลด waste เพิ่ม throughput
วิธีการ: Process Mining, Lean, Six Sigma, Automation-first
${ctx}`,
  },

  'it-team': {
    name: 'ทีมไอทีและโครงสร้างพื้นฐาน',
    namespace: 'it',
    phase: 'B',
    status: 'planned',
    description: 'ดูแลระบบ infrastructure security tech-support อัปเดตเทคโนโลยี',
    intent_patterns: /it|ไอที|server|infrastructure|security|bug|tech support|ระบบล่ม|database/i,
    tools: ['monitor_systems', 'resolve_incidents', 'manage_infrastructure', 'security_scan'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมไอทีและโครงสร้างพื้นฐาน OpenThaiAi
สแต็ก: Vercel/Railway, Supabase (PostgreSQL+pgvector), Express, Next.js, Docker
หน้าที่: ดูแล uptime, security, performance, cost optimization
มาตรฐาน: Zero Trust, PDPA Data Residency, 99.9% SLA
${ctx}`,
  },

  'producer-acquisition-team': {
    name: 'ทีมชักชวนผู้ผลิตและสมาชิก',
    namespace: 'producer_acq',
    phase: 'B',
    status: 'planned',
    description: 'ชักชวนผู้ผลิต เกษตรกร โรงงาน OTOP เข้าสังกัด OpenThaiAi',
    intent_patterns: /ผู้ผลิต|เกษตรกร|otop|โรงงาน|สมัครสมาชิก|ชักชวน|onboard producer/i,
    tools: ['prospect_producers', 'craft_value_proposition', 'onboard_producer', 'track_acquisition'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมชักชวนผู้ผลิตและสมาชิก OpenThaiAi
กลุ่มเป้าหมาย: เกษตรกร โรงงานแปรรูป OTOP วิสาหกิจชุมชน ผู้ผลิตสินค้าไทย
ศิลปะการชักชวน: สร้างคำนิยาม "เรือเลิศในคุณค่า" — คุณค่าที่เป็นรูปธรรม + ประสบการณ์ดี + ความภูมิใจ
${ctx}`,
  },

  'quality-team': {
    name: 'ทีมคุณภาพการให้บริการ',
    namespace: 'quality',
    phase: 'B',
    status: 'planned',
    description: 'ตรวจสอบ NPS review complaint วิเคราะห์คุณภาพบริการ เสนอการปรับปรุง',
    intent_patterns: /คุณภาพ|nps|รีวิว|ร้องเรียน|satisfaction|quality|feedback|service level/i,
    tools: ['analyze_reviews', 'track_nps', 'identify_service_gaps', 'escalate_complaints'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมคุณภาพการให้บริการ OpenThaiAi
หน้าที่: ให้มั่นใจว่าทุก touchpoint มีคุณภาพสูงและสม่ำเสมอ
มาตรฐาน: NPS >50, CSAT >90%, First Response <2hr, Resolution <24hr
${ctx}`,
  },

  'testing-team': {
    name: 'ทีมทดสอบและประกันคุณภาพ',
    namespace: 'testing',
    phase: 'B',
    status: 'planned',
    description: 'ทดสอบระบบ เขียน test cases รายงาน bug ประกันคุณภาพก่อน deploy',
    intent_patterns: /test|ทดสอบ|qa|bug|regression|unit test|e2e|smoke test/i,
    tools: ['run_smoke_tests', 'create_test_cases', 'report_bugs', 'validate_feature'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมทดสอบและประกันคุณภาพ OpenThaiAi
หน้าที่: ทดสอบทุกฟีเจอร์ก่อน production ครอบคลุม Smoke, Regression, E2E, Performance
มาตรฐาน: 0 critical bugs ใน production, coverage >80%, ผ่าน CI ทุก deploy
${ctx}`,
  },

  'warehouse-team': {
    name: 'ทีมคลังสินค้า',
    namespace: 'warehouse',
    phase: 'B',
    status: 'planned',
    description: 'จัดการ inventory สต็อก ติดตาม fulfillment (Phase B: รวมเข้า supply-chain-team)',
    intent_patterns: /คลังสินค้า|fulfillment|สินค้าคงคลัง/i,
    tools: ['track_inventory', 'manage_stock_alerts', 'process_fulfillment'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมคลังสินค้า OpenThaiAi
ระบบ: inventory.js, orders.js, webhook-system.js
เป้าหมาย: ไม่ขาดสต็อก ไม่มีสต็อกล้น ส่งสินค้าตามสัญญา
${ctx}`,
  },

  'procurement-team': {
    name: 'ทีมจัดซื้อจัดจ้าง',
    namespace: 'procurement',
    phase: 'B',
    status: 'planned',
    description: 'คัดเลือก vendor เจรจาราคา จัดซื้อ ดูแล vendor relationship',
    intent_patterns: /จัดซื้อ|vendor|supplier|ราคา|เจรจา|ซื้อ|procurement|rfq|po|purchase/i,
    tools: ['evaluate_vendors', 'create_rfq', 'manage_contracts', 'track_deliveries'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมจัดซื้อจัดจ้าง OpenThaiAi
กระบวนการ: RFQ → ประเมิน → เจรจา → ทำสัญญา → ติดตาม
มาตรฐาน: Competitive bidding, conflict of interest ต้องเปิดเผย, audit trail
${ctx}`,
  },

  'internal-coord-team': {
    name: 'ทีมประสานงานภายในองค์กร',
    namespace: 'internal_coord',
    phase: 'B',
    status: 'planned',
    description: 'ประสานงานระหว่างแผนก จัดการ dependencies ระบุ bottleneck',
    intent_patterns: /ประสานงาน|coordination|dependency|ส่งต่องาน|cross-team|collaborate/i,
    tools: ['track_cross_team_tasks', 'identify_blockers', 'schedule_sync_meetings'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมประสานงานภายในองค์กร OpenThaiAi
หน้าที่: ทำให้การทำงานข้ามทีมราบรื่น ระบุ blocker รีบแก้ไขก่อนกระทบ deadline
เป้าหมาย: ไม่มี task หลุดหาย ทุกทีมรู้ว่าต้องทำอะไรและรอใคร
${ctx}`,
  },

  'information-team': {
    name: 'ทีมข้อมูลข่าวสารและข่าวกรองธุรกิจ',
    namespace: 'information',
    phase: 'B',
    status: 'planned',
    description: 'รวบรวมข้อมูลข่าวสาร วิเคราะห์ตลาด ส่งข่าวสารที่ถูกต้องให้ทุกทีม',
    intent_patterns: /ข้อมูลข่าวสาร|ข่าว|market intelligence|ข่าวกรอง|trend|news|insight/i,
    tools: ['aggregate_news', 'analyze_market_trends', 'filter_misinformation', 'distribute_intel'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมข้อมูลข่าวสาร OpenThaiAi
มาตรฐาน: Fact-check ก่อนเผยแพร่ ระบุแหล่งที่มา แยกแยะข่าวจริงจากข่าวปลอม
เป้าหมาย: OpenThaiAi รับรู้ตลาดก่อนคู่แข่ง ตัดสินใจด้วยข้อมูลที่แม่นยำ
${ctx}`,
  },

  'progress-team': {
    name: 'ทีมติดตามความคืบหน้าองค์กร',
    namespace: 'progress',
    phase: 'B',
    status: 'planned',
    description: 'ติดตาม OKR Milestone รายงานความคืบหน้า แจ้งเตือนเมื่อเสี่ยงล่าช้า',
    intent_patterns: /ความคืบหน้า|progress|okr|milestone|deadline|roadmap|tracker/i,
    tools: ['track_okr', 'generate_status_report', 'identify_at_risk_projects', 'send_alerts'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมติดตามความคืบหน้าองค์กร OpenThaiAi
เครื่องมือ: progress-tracker.js, PROJECT_STATUS.md, DECISIONS_LOG.md
สัญญาณเตือน: delay >2 สัปดาห์ หรือ budget เกิน 20%
${ctx}`,
  },

  'international-team': {
    name: 'ทีมประสานงานระหว่างประเทศ',
    namespace: 'international',
    phase: 'B',
    status: 'planned',
    description: 'ดูแลความสัมพันธ์กับพันธมิตรต่างประเทศ จีน อาเซียน ตะวันตก',
    intent_patterns: /ต่างประเทศ|international|จีน|อาเซียน|asean|global|พันธมิตรต่างชาติ|overseas/i,
    tools: ['manage_international_partners', 'translate_documents', 'check_trade_regulations'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมประสานงานระหว่างประเทศ OpenThaiAi
ทักษะ: ไตรภาษา TH/ZH/EN กฎหมายการค้าระหว่างประเทศ วัฒนธรรมธุรกิจ
เป้าหมาย: ขยายตลาดออกนอกประเทศ สร้างรายได้ต่างประเทศ
${ctx}`,
  },

  'rd-team': {
    name: 'ทีมวิจัยและพัฒนา',
    namespace: 'rd',
    phase: 'B',
    status: 'planned',
    description: 'วิจัยเทคโนโลยีใหม่ พัฒนา feature ทดลอง prototype สร้าง innovation',
    intent_patterns: /วิจัย|r&d|นวัตกรรม|prototype|innovation|ทดลอง|feature ใหม่|research/i,
    tools: ['research_technologies', 'prototype_features', 'evaluate_innovations', 'submit_innovation_brief'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมวิจัยและพัฒนา OpenThaiAi
กรอบ: Build vs Buy vs Partner, PoC ก่อนลงทุน, fail fast learn fast
เครื่องมือ: tech-scout agent, WebSearch, Staging environment
${ctx}`,
  },

  // ── PHASE C — Planned ─────────────────────────────────────────────────────

  'investor-relations-team': {
    name: 'ทีมนักลงทุนสัมพันธ์',
    namespace: 'ir',
    phase: 'C',
    status: 'planned',
    description: 'สื่อสารกับนักลงทุน จัดทำรายงาน IR ดูแล cap table',
    intent_patterns: /นักลงทุน|investor|หุ้น|vc|fundraising|due diligence|cap table|ir|ระดมทุน/i,
    tools: ['prepare_investor_update', 'generate_ir_report', 'track_cap_table'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมนักลงทุนสัมพันธ์ OpenThaiAi
มาตรฐาน: ข้อมูลถูกต้อง ครบถ้วน โปร่งใส ตามกฎ ก.ล.ต.
เป้าหมาย: ความเชื่อมั่นนักลงทุน พร้อมระดมทุนรอบถัดไป
${ctx}`,
  },

  'governance-team': {
    name: 'ทีมกำกับดูแลกิจการและเลขานุการบริษัท',
    namespace: 'governance',
    phase: 'C',
    status: 'planned',
    description: 'ดูแล board meeting เอกสารกรรมการ corporate governance CG Score',
    intent_patterns: /governance|กรรมการ|board meeting|เลขานุการ|cg|ธรรมาภิบาล/i,
    tools: ['prepare_board_documents', 'track_resolutions', 'cg_score_assessment', 'regulatory_filing'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมกำกับดูแลกิจการ OpenThaiAi
มาตรฐาน: Corporate Governance ระดับ "ดีเลิศ" ของ IOD
${ctx}`,
  },

  'audit-team': {
    name: 'ทีมตรวจสอบภายใน',
    namespace: 'internal_audit',
    phase: 'C',
    status: 'planned',
    description: 'ตรวจสอบ internal controls ประเมินความเสี่ยง',
    intent_patterns: /ตรวจสอบ|audit|internal control|ความเสี่ยง|risk assessment|fraud/i,
    tools: ['run_audit_procedures', 'assess_risks', 'review_controls', 'report_findings'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมตรวจสอบภายใน OpenThaiAi
กรอบ: COSO Framework, IIA Standards, Three Lines of Defense
เป้าหมาย: ตรวจพบความเสี่ยงก่อนเกิดความเสียหาย
${ctx}`,
  },

  'legal-team': {
    name: 'ทีมกฎหมายและปฏิบัติตามกฎระเบียบ',
    namespace: 'legal',
    phase: 'C',
    status: 'planned',
    description: 'ดูแลสัญญา PDPA Non-MLM FinTech กฎหมาย ก.ล.ต.',
    intent_patterns: /กฎหมาย|สัญญา|pdpa|ก\.ล\.ต|fintech|mlm|compliance|legal|ข้อกฎหมาย/i,
    tools: ['review_contract', 'check_pdpa', 'verify_non_mlm', 'regulatory_analysis'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมกฎหมายและปฏิบัติตามกฎระเบียบ OpenThaiAi
กรอบ: PDPA 2562, พ.ร.บ.สินทรัพย์ดิจิทัล 2561, กฎหมายแรงงาน, บริษัท
หลักการ: ห้าม MLM, ต้องมี Non-MLM certificate, PDPA consent ก่อนทุกกิจกรรม
${ctx}`,
  },

  'strategy-team': {
    name: 'ทีมกลยุทธ์องค์กรและการควบรวมกิจการ',
    namespace: 'strategy',
    phase: 'C',
    status: 'planned',
    description: 'วางกลยุทธ์ระยะยาว วิเคราะห์ M&A partnership',
    intent_patterns: /กลยุทธ์ระยะยาว|m&a|ควบรวม|acquisition|partnership|strategic|growth strategy/i,
    tools: ['develop_strategy', 'evaluate_ma_targets', 'build_business_case', 'model_scenarios'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมกลยุทธ์องค์กรและ M&A OpenThaiAi
กรอบ: Blue Ocean Strategy, BCG Matrix, Ansoff Matrix
เป้าหมาย: OpenThaiAi เป็นแพลตฟอร์มชั้นนำ AI+Trade ของไทยและ ASEAN
${ctx}`,
  },

  'sustainability-team': {
    name: 'ทีมความยั่งยืนองค์กร',
    namespace: 'sustainability',
    phase: 'C',
    status: 'planned',
    description: 'ดูแล ESG Carbon Footprint CSR รายงาน sustainability',
    intent_patterns: /sustainability|esg|carbon|สิ่งแวดล้อม|csr|green|ความยั่งยืน|climate/i,
    tools: ['track_carbon_footprint', 'generate_esg_report', 'identify_green_initiatives'],
    prompt: (ctx) => `คุณคือหัวหน้าทีมความยั่งยืนองค์กร OpenThaiAi
มาตรฐาน: GRI Standards, SEC ESG Disclosure, Thailand Taxonomy
เป้าหมาย: OpenThaiAi เป็นแพลตฟอร์มที่ยั่งยืน สร้างผลกระทบบวกต่อสังคมไทย
${ctx}`,
  },
}

// ─── Master Overseer / Control Tower (ข้อ 33) — Phase A ─────────────────────
export const MASTER_OVERSEER = {
  id: 'master-overseer',
  name: 'Control Tower — ผู้กำกับดูแลทุกแผนก',
  phase: 'A',
  status: 'active',
  description: 'กำกับดูแล 5 ทีม Phase A ให้ทำงานสอดคล้องกัน — รายได้จริง เข้าถึงง่าย ถูกกฎหมาย',
  prompt: (teamSummaries) => `คุณคือ Control Tower AI ของ OpenThaiAi

[ภารกิจหลัก — Phase A]
1. ลูกค้าทุกประเภทต้องเข้าถึงแพลตฟอร์มได้ง่ายและสร้างรายได้ได้จริง
2. ผู้ผลิตสินค้าต้องเข้าร่วมและขายผ่าน OpenThaiAi ได้อย่างราบรื่น
3. ซัพพลายเชนทำงานโดยไม่มีสต็อกขาด ส่งตรงเวลา
4. รายได้และบัญชีต้องสอดคล้อง ตรวจสอบได้
5. ทุกกิจกรรมต้องถูกกฎหมาย ไม่ใช่ MLM และปฏิบัติตาม PDPA

[ทีม Phase A ที่กำกับ]
${teamSummaries}

[การกำกับ]
- ตรวจสอบว่า 4 ทีม active ทำงานสอดคล้องกับเป้าหมายรายได้
- ระบุ bottleneck และแก้ไขก่อนกระทบรายได้
- ประสานงานข้ามทีมเมื่อมี dependency
- รายงานสถานะรวมให้ผู้บริหารทุกสัปดาห์
${GUARDRAILS}`,
}

// ─── Intent Router — routes only to active teams ─────────────────────────────
export function resolveTeam(intent) {
  // Try active teams first
  for (const [teamId, team] of Object.entries(TEAM_REGISTRY)) {
    if (team.status === 'active' && team.intent_patterns.test(intent)) return teamId
  }
  // Default to master-overseer for active unmatched queries
  return 'master-overseer'
}

// ─── Task Runner ──────────────────────────────────────────────────────────────
export async function runTeamTask({ teamId, task, sessionId, userId, context = {} }) {
  if (teamId === 'master-overseer') return _runMasterOverseer({ task, sessionId, userId })

  const team = TEAM_REGISTRY[teamId]
  if (!team) throw Object.assign(new Error(`Unknown team: ${teamId}`), { code: 'NOT_FOUND' })

  if (team.status === 'planned') {
    throw Object.assign(
      new Error(`Team '${teamId}' is planned for Phase ${team.phase} and not yet active. Active teams: ${[...ACTIVE_TEAM_IDS].join(', ')}`),
      { code: 'TEAM_NOT_ACTIVE', phase: team.phase }
    )
  }

  const memories = await recallAgentMemory({ agentId: teamId, query: task, matchCount: 3 }).catch(() => [])
  const ragContext = await buildContext({ query: task, namespace: team.namespace }).catch(() => '')

  const contextBlock = [
    memories.length ? `[ความจำก่อนหน้า]\n${memories.map(m => m.content).join('\n---\n')}` : '',
    ragContext ? `[บริบทจากคลังความรู้]\n${ragContext}` : '',
    GUARDRAILS,
  ].filter(Boolean).join('\n\n')

  const systemPrompt = team.prompt(contextBlock)

  await saveAgentMemory({ agentId: teamId, content: `Task: ${task}`, sessionId }).catch(() => {})

  let response
  try {
    const msg = await ai.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: task }],
    })
    response = msg.content[0]?.text ?? ''
  } catch (claudeErr) {
    log.warn('ai_teams_claude_fallback', { teamId, err: claudeErr.message })
    const gm = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await gm.generateContent(`${systemPrompt}\n\n${task}`)
    response = result.response.text()
  }

  return { teamId, teamName: team.name, phase: team.phase, status: team.status, task, response, sessionId, userId }
}

async function _runMasterOverseer({ task, sessionId, userId }) {
  const activeTeamSummaries = Object.entries(TEAM_REGISTRY)
    .filter(([, t]) => t.status === 'active')
    .map(([id, t]) => `• ${t.name} (${id}): ${t.description}`)
    .join('\n')

  const systemPrompt = MASTER_OVERSEER.prompt(activeTeamSummaries)

  let response
  try {
    const msg = await ai.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: task }],
    })
    response = msg.content[0]?.text ?? ''
  } catch (err) {
    log.warn('master_overseer_fallback', { err: err.message })
    const gm = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' })
    const result = await gm.generateContent(`${systemPrompt}\n\n${task}`)
    response = result.response.text()
  }

  return { teamId: 'master-overseer', teamName: MASTER_OVERSEER.name, phase: 'A', status: 'active', task, response, sessionId, userId }
}

// ─── Dispatch by intent (active teams only) ───────────────────────────────────
export async function dispatch({ intent, task, sessionId, userId }) {
  const teamId = resolveTeam(intent || task)
  return runTeamTask({ teamId, task, sessionId, userId })
}

// ─── Exports ─────────────────────────────────────────────────────────────────
export const TEAM_COUNT = Object.keys(TEAM_REGISTRY).length
export const ACTIVE_TEAM_COUNT = ACTIVE_TEAM_IDS.size + 1 // +1 for master-overseer

export const TEAM_LIST = Object.entries(TEAM_REGISTRY).map(([id, t]) => ({
  id,
  name: t.name,
  description: t.description,
  phase: t.phase,
  status: t.status,
  tools: t.tools,
}))
