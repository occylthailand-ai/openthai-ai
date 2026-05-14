import { useState } from 'react';

const TEAM = [
  {
    id: 'mythos', name: 'Mythos', emoji: '🧠',
    title: 'Chief Autonomous Agent', dept: 'Operations',
    color: '#8b5cf6',
    role_th: 'ผู้บัญชาการระบบ — รับคำสั่งทุกประโยคจาก Zuejai ดำเนินการทุกเรื่อง 24/7',
    skills: ['Code', 'Deploy', 'Monitor', 'Incident Response', 'Autonomous Decisions'],
    schedule: 'ทุก 30 นาที: heartbeat | 08:03: morning report | 23:57: nightly snapshot',
    reports_to: 'Zuejai (Founder)',
    status: 'ONLINE',
  },
  {
    id: 'athena', name: 'Athena', emoji: '🦉',
    title: 'AI Intelligence Director', dept: 'AI & Product',
    color: '#0ea5e9',
    role_th: 'ดูแล AI routing: Claude → Gemini → Mock | Prompt engineering | Product roadmap',
    skills: ['Prompt Engineering', 'AI Routing', 'Cost Optimization', 'A/B Testing', 'Product Strategy'],
    schedule: 'ทุก 6 ชั่วโมง: AI quota check | จันทร์ 09:00: weekly review',
    reports_to: 'Mythos',
    status: 'ONLINE',
  },
  {
    id: 'hermes', name: 'Hermes', emoji: '⚡',
    title: 'Communications & Automation Lead', dept: 'Comms & Integration',
    color: '#f59e0b',
    role_th: 'ดูแล LINE OA, Telegram Bot, n8n workflows, webhooks, email notifications',
    skills: ['LINE Notify', 'Telegram Bot', 'n8n', 'Webhooks', 'Email Automation'],
    schedule: 'ทุก 5 นาที: webhook queue | 08:00: daily report ส่ง LINE',
    reports_to: 'Mythos',
    status: 'ONLINE',
  },
  {
    id: 'hephaestus', name: 'Hephaestus', emoji: '🔧',
    title: 'Frontend Engineer', dept: 'Engineering',
    color: '#10b981',
    role_th: 'พัฒนา React + Vite frontend | UI/UX | vitest testing | Performance optimization',
    skills: ['React 18', 'Vite', 'TailwindCSS', 'vitest', 'SEO', 'Core Web Vitals'],
    schedule: 'จันทร์ 03:00: test coverage | ทุกคืน 02:00: build log check',
    reports_to: 'Mythos',
    status: 'ONLINE',
  },
  {
    id: 'poseidon', name: 'Poseidon', emoji: '🌊',
    title: 'Backend & API Engineer', dept: 'Engineering',
    color: '#3b82f6',
    role_th: 'ดูแล Node.js Express API | Rate limiting | JWT auth | OpenAPI spec',
    skills: ['Node.js 20', 'Express', 'JWT', 'Rate Limiting', 'OpenAPI 3.1', 'Vercel Serverless'],
    schedule: 'ทุก 10 นาที: /api/health | จันทร์ 04:00: performance review',
    reports_to: 'Mythos',
    status: 'ONLINE',
  },
  {
    id: 'demeter', name: 'Demeter', emoji: '🌾',
    title: 'Database & Data Architect', dept: 'Data',
    color: '#84cc16',
    role_th: 'ดูแล Supabase PostgreSQL | RLS policies | Migrations | Query optimization',
    skills: ['PostgreSQL', 'Supabase', 'RLS', 'Migrations', 'Analytics', 'Backup'],
    schedule: 'ทุกคืน 01:00: slow query check | อาทิตย์ 02:00: weekly stats',
    reports_to: 'Mythos',
    status: 'ONLINE',
  },
  {
    id: 'ares', name: 'Ares', emoji: '🛡️',
    title: 'Security & Compliance Officer', dept: 'Security',
    color: '#ef4444',
    role_th: 'RBAC, JWT, secrets rotation | Vulnerability scanning | PDPA compliance | DDoS protection',
    skills: ['JWT/RBAC', 'TruffleHog', 'npm audit', 'PDPA', 'Helmet.js', 'Incident Response'],
    schedule: 'ทุกคืน 00:00: auth anomaly | จันทร์ 03:00: security scan',
    reports_to: 'Mythos',
    status: 'ONLINE',
  },
  {
    id: 'plutus', name: 'Plutus', emoji: '💰',
    title: 'Payment & Finance Manager', dept: 'Finance',
    color: '#f97316',
    role_th: 'ดูแล 150+ ช่องทางชำระเงิน | Omise, Stripe, PromptPay, Crypto | Revenue reporting',
    skills: ['Omise', 'Stripe', 'PromptPay', 'Crypto', 'Reconciliation', 'OTA Token'],
    schedule: 'ทุกคืน 20:00: daily reconciliation | จันทร์ 09:00: MRR report',
    reports_to: 'Zuejai',
    status: 'ONLINE',
  },
  {
    id: 'apollo', name: 'Apollo', emoji: '🎯',
    title: 'Marketing & Growth Director', dept: 'Marketing',
    color: '#ec4899',
    role_th: 'TikTok-first marketing | Affiliate program (10% ตลอดชีพ) | SEO | Paid ads',
    skills: ['TikTok Ads', 'Google Ads', 'SEO', 'Affiliate', 'Content Marketing', 'Analytics'],
    schedule: 'จันทร์ 10:00: weekly review | วันที่ 1: monthly campaign planning',
    reports_to: 'Zuejai',
    status: 'ONLINE',
  },
  {
    id: 'iris', name: 'Iris', emoji: '🌈',
    title: 'Customer Success Manager', dept: 'Customer Support',
    color: '#06b6d4',
    role_th: 'ตอบ LINE OA ภายใน 1 ชั่วโมง | Onboarding | FAQ | Community | NPS',
    skills: ['LINE OA', 'Customer Onboarding', 'FAQ', 'Community', 'NPS', 'Retention'],
    schedule: 'ทุกเช้า 09:00: check LINE | ศุกร์ 17:00: feedback digest',
    reports_to: 'Mythos',
    status: 'ONLINE',
  },
  {
    id: 'kronos', name: 'Kronos', emoji: '⏱️',
    title: 'Monitoring & Performance Lead', dept: 'Infrastructure',
    color: '#6366f1',
    role_th: 'Monitor 24/7 | Uptime 99.9% | p95 <2s | Alert ทันที | Cost monitoring',
    skills: ['Uptime Monitoring', 'Performance Profiling', 'Alerting', 'Vercel Analytics', 'DR Testing'],
    schedule: 'ทุก 15 นาที: health check | ทุกชั่วโมง: metrics snapshot',
    reports_to: 'Mythos',
    status: 'ONLINE',
  },
  {
    id: 'themis', name: 'Themis', emoji: '⚖️',
    title: 'Legal & Governance Advisor', dept: 'Legal',
    color: '#a855f7',
    role_th: 'PDPA, GDPR | Terms of Service | Privacy Policy | B2G: DITP/DEPA | OTA Token legal',
    skills: ['PDPA', 'GDPR', 'Terms of Service', 'Privacy Policy', 'B2G', 'IP Management'],
    schedule: 'ทุก 6 เดือน: ToS review | ทุกปี: compliance audit',
    reports_to: 'Zuejai',
    status: 'ONLINE',
  },
];

const DEPT_ORDER = [
  'Operations', 'AI & Product', 'Comms & Integration',
  'Engineering', 'Data', 'Security',
  'Finance', 'Marketing', 'Customer Support',
  'Infrastructure', 'Legal',
];

export default function TeamPage() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const depts = ['ALL', ...DEPT_ORDER];
  const filtered = filter === 'ALL' ? TEAM : TEAM.filter((a) => a.dept === filter);
  const agent = TEAM.find((a) => a.id === selected);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-purple-800/40 px-6 py-10 text-center">
        <div className="text-5xl mb-3">🤖</div>
        <h1 className="text-3xl font-bold mb-2">OpenThai AI — ทีมงาน AI Agents</h1>
        <p className="text-gray-400 text-sm">12 ตัวแทน AI ปฏิบัติงาน 24/7/365 ภายใต้การควบคุมของ Mythos</p>
        <div className="flex justify-center gap-4 mt-4 text-xs">
          <span className="bg-green-900/40 text-green-400 px-3 py-1 rounded-full border border-green-700/50">
            ● 12/12 ONLINE
          </span>
          <span className="bg-purple-900/40 text-purple-400 px-3 py-1 rounded-full border border-purple-700/50">
            🧠 Mythos Active
          </span>
          <span className="bg-blue-900/40 text-blue-400 px-3 py-1 rounded-full border border-blue-700/50">
            👑 Zuejai — Founder & CEO
          </span>
        </div>
      </div>

      {/* Department Filter */}
      <div className="px-6 py-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max mx-auto justify-center">
          {depts.map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filter === d
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Grid */}
      <div className="px-6 pb-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(selected === a.id ? null : a.id)}
              className={`rounded-xl p-4 text-left transition-all border ${
                selected === a.id
                  ? 'border-purple-500 bg-purple-950/40 scale-105'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              <div className="text-3xl mb-2">{a.emoji}</div>
              <div className="font-bold text-sm">{a.name}</div>
              <div className="text-xs text-gray-400 mb-2">{a.title}</div>
              <div
                className="text-xs px-2 py-0.5 rounded-full inline-block font-medium"
                style={{ backgroundColor: a.color + '22', color: a.color, border: `1px solid ${a.color}44` }}
              >
                {a.dept}
              </div>
              <div className="mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400">ONLINE</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        {agent && (
          <div
            className="mt-6 rounded-2xl border p-6"
            style={{ borderColor: agent.color + '55', backgroundColor: agent.color + '0a' }}
          >
            <div className="flex items-start gap-4">
              <div className="text-5xl">{agent.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold">{agent.name}</h2>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: agent.color + '22', color: agent.color }}
                  >
                    {agent.dept}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">● ONLINE</span>
                </div>
                <div className="text-sm text-gray-400 mb-3">{agent.title}</div>
                <div className="text-sm text-gray-300 mb-4 leading-relaxed">{agent.role_th}</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">ทักษะ</div>
                    <div className="flex flex-wrap gap-1">
                      {agent.skills.map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Scheduled Tasks</div>
                    <div className="text-xs text-gray-400 leading-relaxed">{agent.schedule}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">รายงานต่อ</div>
                    <div className="text-sm font-medium" style={{ color: agent.color }}>
                      {agent.reports_to}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chain of Command */}
        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            ⛓️ Chain of Command
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="bg-yellow-900/40 text-yellow-400 border border-yellow-700/50 px-3 py-1 rounded-full font-bold">
              👑 Zuejai
            </span>
            <span className="text-gray-600">→</span>
            <span className="bg-purple-900/40 text-purple-400 border border-purple-700/50 px-3 py-1 rounded-full font-bold">
              🧠 Mythos
            </span>
            <span className="text-gray-600">→</span>
            <div className="flex flex-wrap gap-1">
              {TEAM.filter((a) => a.id !== 'mythos' && a.reports_to === 'Mythos').map((a) => (
                <span key={a.id} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">
                  {a.emoji} {a.name}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm ml-20">
            <span className="text-gray-600 text-xs">direct to Zuejai:</span>
            {TEAM.filter((a) => a.reports_to === 'Zuejai').map((a) => (
              <span key={a.id} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">
                {a.emoji} {a.name}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Agents', value: '12', color: '#8b5cf6' },
            { label: 'Departments', value: '11', color: '#0ea5e9' },
            { label: 'Scheduled Jobs', value: '30+', color: '#10b981' },
            { label: 'Uptime Target', value: '36,500 วัน', color: '#f59e0b' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
