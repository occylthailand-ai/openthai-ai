import { useState } from 'react';

const STEPS = [
  {
    id: 1,
    title: 'Supabase — Database + Auth',
    agent: 'Demeter + Ares',
    emoji: '🌾',
    status: 'PENDING',
    time: '15 นาที',
    color: '#10b981',
    priority: 'CRITICAL',
    impact: 'Login ทำงาน · ข้อมูลผู้ใช้บันทึกได้ · Payment บันทึกได้',
    sub_steps: [
      {
        id: '1a',
        title: 'รัน Migration 001 — สร้าง Tables',
        type: 'SQL',
        url: 'https://supabase.com/dashboard/project/tpeskbbhuuqztwyllnli/sql',
        action: 'เปิด SQL Editor → New Query → Paste → Run',
        sql: `-- Migration 001: Initial Schema
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','business')),
  plan_expires  TIMESTAMPTZ,
  ota_balance   NUMERIC(18,6) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS content_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product TEXT NOT NULL, platform TEXT NOT NULL, language TEXT DEFAULT 'th',
  hook TEXT, script JSONB, hashtags TEXT[],
  ai_source TEXT CHECK (ai_source IN ('claude','gemini','mock')),
  tokens_used INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
  commission_pct NUMERIC(5,2) DEFAULT 20.00,
  total_earned NUMERIC(12,2) DEFAULT 0, total_clicks INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  plan TEXT NOT NULL, amount_thb NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL, status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','failed','refunded')),
  slip_url TEXT, confirmed_at TIMESTAMPTZ, affiliate_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS system_config (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_content_user  ON content_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(code);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_profile"    ON profiles        FOR ALL USING (auth.uid() = id);
CREATE POLICY "user_own_content"    ON content_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_affiliate"  ON affiliates      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_payments"   ON payments        FOR SELECT USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();`,
      },
      {
        id: '1b',
        title: 'รัน Migration 002 — Payment columns',
        type: 'SQL',
        url: 'https://supabase.com/dashboard/project/tpeskbbhuuqztwyllnli/sql',
        action: 'เปิด SQL Editor → New Query → Paste → Run',
        sql: `-- Migration 002: Payment method tracking
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_group     TEXT,
  ADD COLUMN IF NOT EXISTS currency          TEXT DEFAULT 'THB',
  ADD COLUMN IF NOT EXISTS exchange_rate     NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS gateway_ref       TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method_id);
INSERT INTO system_config (key, value) VALUES
  ('payment_manual_enabled', 'true'),
  ('payment_omise_enabled',  'false'),
  ('payment_stripe_enabled', 'false'),
  ('promptpay_number', '"0972560801"'),
  ('line_id', '"@openthaiai"'),
  ('support_email', '"occylthailand@gmail.com"')
ON CONFLICT (key) DO NOTHING;`,
      },
      {
        id: '1c',
        title: 'เปิด Email Authentication',
        type: 'CLICK',
        url: 'https://supabase.com/dashboard/project/tpeskbbhuuqztwyllnli/auth/providers',
        action: 'Authentication → Providers → Email → Enable ✅ → Site URL: https://www.openthai-ai.com → Save',
      },
    ],
  },
  {
    id: 2,
    title: 'Vercel — ANTHROPIC_API_KEY',
    agent: 'Athena',
    emoji: '🦉',
    status: 'PENDING',
    time: '5 นาที',
    color: '#8b5cf6',
    priority: 'CRITICAL',
    impact: 'AI Generate จริงด้วย Claude · ไม่ใช่ Mock',
    sub_steps: [
      {
        id: '2a',
        title: 'เพิ่ม Environment Variables',
        type: 'CLICK',
        url: 'https://vercel.com/dashboard',
        action: 'Project → Settings → Environment Variables → Add',
        env_vars: [
          { key: 'ANTHROPIC_API_KEY', value: 'sk-ant-api03-...', source: 'console.anthropic.com', required: true },
          { key: 'LINE_NOTIFY_TOKEN', value: 'xxxx', source: 'notify-bot.line.me/my/', required: true },
          { key: 'GEMINI_API_KEY',    value: 'AIza...', source: 'aistudio.google.com', required: false },
        ],
      },
      {
        id: '2b',
        title: 'Redeploy',
        type: 'CLICK',
        url: 'https://vercel.com/dashboard',
        action: 'Deployments → ⋯ → Redeploy (1 คลิก)',
      },
    ],
  },
  {
    id: 3,
    title: 'LINE Notify Token',
    agent: 'Hermes',
    emoji: '⚡',
    status: 'PENDING',
    time: '3 นาที',
    color: '#f59e0b',
    priority: 'IMPORTANT',
    impact: 'Hermes ส่ง alert มือถือได้ · แจ้งเตือน payment, deploy, error',
    sub_steps: [
      {
        id: '3a',
        title: 'ขอ LINE Notify Token',
        type: 'CLICK',
        url: 'https://notify-bot.line.me/my/',
        action: 'Generate token → ชื่อ "OpenThai AI Alerts" → เลือก chat ส่วนตัว → Generate → Copy token',
      },
      {
        id: '3b',
        title: 'ใส่ใน Vercel ENV',
        type: 'CLICK',
        url: 'https://vercel.com/dashboard',
        action: 'Settings → Environment Variables → LINE_NOTIFY_TOKEN = [token ที่ copy]',
      },
    ],
  },
  {
    id: 4,
    title: 'GitHub Secrets — CI/CD',
    agent: 'Ares',
    emoji: '🛡️',
    status: 'PENDING',
    time: '10 นาที',
    color: '#ef4444',
    priority: 'IMPORTANT',
    impact: 'Deploy อัตโนมัติ · push code → live ทันที · ไม่ต้อง manual',
    sub_steps: [
      {
        id: '4a',
        title: 'ขอ Vercel Token',
        type: 'CLICK',
        url: 'https://vercel.com/account/tokens',
        action: 'Create Token → ชื่อ "GitHub Actions" → Copy',
      },
      {
        id: '4b',
        title: 'หา Vercel IDs',
        type: 'CLICK',
        url: 'https://vercel.com/dashboard',
        action: 'Project → Settings → General → copy "Project ID" และ "Team ID"',
      },
      {
        id: '4c',
        title: 'เพิ่ม GitHub Secrets',
        type: 'CLICK',
        url: 'https://github.com',
        action: 'Repo → Settings → Secrets → Actions → New secret',
        env_vars: [
          { key: 'VERCEL_TOKEN',      value: '[จากขั้น 4a]', required: true },
          { key: 'VERCEL_ORG_ID',     value: '[Team ID]',    required: true },
          { key: 'VERCEL_PROJECT_ID', value: '[Project ID]', required: true },
          { key: 'LINE_NOTIFY_TOKEN', value: '[จากขั้น 3]',  required: true },
        ],
      },
    ],
  },
];

function StatusBadge({ status }) {
  const map = {
    PENDING:  'bg-gray-800 text-gray-400 border-gray-700',
    DONE:     'bg-green-900/40 text-green-400 border-green-700/50',
    RUNNING:  'bg-blue-900/40 text-blue-400 border-blue-700/50',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status] || map.PENDING}`}>
      {status === 'DONE' ? '✅ Done' : status === 'RUNNING' ? '⏳ กำลังทำ' : '⏸ รอดำเนินการ'}
    </span>
  );
}

export default function SetupGuidePage() {
  const [done, setDone] = useState({});
  const [expanded, setExpanded] = useState({ 1: true });
  const [copied, setCopied] = useState(null);

  const toggleDone = (id) => setDone(d => ({ ...d, [id]: !d[id] }));
  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const copySQL = (sql, id) => {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const doneCount = STEPS.filter(s => done[s.id]).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🚀</span>
            <h1 className="text-2xl font-bold">Launch Setup Guide</h1>
          </div>
          <p className="text-gray-400 text-sm mb-4">4 ขั้นตอน สู่ OpenThai AI Production — จัดทำโดย Mythos Team</p>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white">{doneCount}/{STEPS.length}</span>
          </div>
          {doneCount === STEPS.length && (
            <div className="mt-3 text-center bg-green-900/30 border border-green-700/50 rounded-lg py-2 text-green-400 text-sm font-bold">
              🎉 พร้อม Launch แล้ว!
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`rounded-2xl border transition-all ${done[step.id] ? 'border-green-700/40 bg-green-950/10 opacity-70' : 'border-gray-700 bg-gray-900'}`}
          >
            {/* Step Header */}
            <div
              className="flex items-center gap-3 p-5 cursor-pointer"
              onClick={() => toggleExpand(step.id)}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: step.color + '22', border: `1px solid ${step.color}44` }}
              >
                {done[step.id] ? '✅' : step.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">ขั้นที่ {step.id}: {step.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${step.priority === 'CRITICAL' ? 'bg-red-900/40 text-red-400 border-red-700/50' : 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50'}`}>
                    {step.priority === 'CRITICAL' ? '🔴 CRITICAL' : '🟡 IMPORTANT'}
                  </span>
                  <span className="text-xs text-gray-500">⏱ {step.time}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  <span style={{ color: step.color }}>👤 {step.agent}</span>
                  <span className="mx-2">·</span>
                  {step.impact}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={done[step.id] ? 'DONE' : 'PENDING'} />
                <span className="text-gray-600 text-lg">{expanded[step.id] ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Sub Steps */}
            {expanded[step.id] && (
              <div className="px-5 pb-5 space-y-3 border-t border-gray-800 pt-4">
                {step.sub_steps.map((sub) => (
                  <div key={sub.id} className="bg-gray-950 rounded-xl border border-gray-800 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-medium text-sm">{sub.id}. {sub.title}</div>
                      <span className={`text-xs px-2 py-0.5 rounded font-mono shrink-0 ${sub.type === 'SQL' ? 'bg-blue-900/40 text-blue-400' : 'bg-purple-900/40 text-purple-400'}`}>
                        {sub.type}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 mb-3">
                      📋 <span className="text-gray-300">{sub.action}</span>
                    </div>

                    {sub.url && (
                      <a
                        href={sub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mb-3 underline"
                      >
                        🔗 เปิด {sub.url.replace('https://', '').split('/')[0]}
                      </a>
                    )}

                    {sub.sql && (
                      <div className="relative">
                        <pre className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-green-300 overflow-x-auto max-h-48 font-mono leading-relaxed">
                          {sub.sql}
                        </pre>
                        <button
                          onClick={() => copySQL(sub.sql, sub.id)}
                          className="absolute top-2 right-2 text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                        >
                          {copied === sub.id ? '✅ Copied!' : '📋 Copy'}
                        </button>
                      </div>
                    )}

                    {sub.env_vars && (
                      <div className="space-y-2">
                        {sub.env_vars.map(v => (
                          <div key={v.key} className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                            <code className="text-xs text-yellow-400 font-mono">{v.key}</code>
                            <span className="text-gray-600 text-xs">=</span>
                            <code className="text-xs text-gray-400 font-mono">{v.value}</code>
                            {v.required && <span className="ml-auto text-xs text-red-400">required</span>}
                            {v.source && (
                              <span className="text-xs text-gray-600">← {v.source}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  onClick={() => toggleDone(step.id)}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                    done[step.id]
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      : 'bg-green-600 hover:bg-green-500 text-white'
                  }`}
                >
                  {done[step.id] ? '↩ ยังไม่เสร็จ' : `✅ ขั้นที่ ${step.id} เสร็จแล้ว`}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Auto-done by Mythos */}
        <div className="rounded-2xl border border-purple-700/40 bg-purple-950/10 p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🧠</span>
            <div>
              <div className="font-bold text-purple-300">Mythos ดำเนินการอัตโนมัติแล้ว</div>
              <div className="text-xs text-gray-500">ไม่ต้องทำเอง</div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { icon: '⏱️', text: 'Kronos Warmup Ping ทุก 5 นาที — เพิ่มใน vercel.json แล้ว (แก้ cold start 3.5s)' },
              { icon: '🔧', text: 'Hephaestus — vitest 41/41 PASS · build 115 modules ✅' },
              { icon: '🛡️', text: 'Ares — npm audit fix: 0 vulnerabilities ✅' },
              { icon: '🦉', text: 'Athena — Prompt Library 6 แพลตฟอร์มพร้อม' },
              { icon: '📋', text: 'Command Board, Foundation, Team, Setup Guide — ทุกหน้าออนไลน์' },
            ].map(item => (
              <div key={item.text} className="flex items-start gap-2 text-sm">
                <span className="shrink-0">{item.icon}</span>
                <span className="text-gray-400">{item.text}</span>
                <span className="ml-auto text-green-400 text-xs shrink-0">✅</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
