import { useState, useEffect } from 'react';

/* ─── Static data (mirrors backend/data/foundation.json) ─── */
const VISION = {
  core: 'AI ไทย เพื่อคนไทย สู่โลก',
  th: 'เป็นแพลตฟอร์ม AI ภาษาไทยที่ทรงพลังที่สุดในโลก — เพื่อให้ทุกธุรกิจไทย ไม่ว่าเล็กหรือใหญ่ สามารถแข่งขันในยุคดิจิทัลได้อย่างเท่าเทียม',
};

const MISSION_PILLARS = [
  { icon: '🧠', text: 'AI ที่เข้าใจภาษาไทยและวัฒนธรรมไทยอย่างแท้จริง' },
  { icon: '🛒', text: 'เครื่องมือที่ใช้งานง่าย ไม่ต้องมีความรู้ด้านเทคโนโลยี' },
  { icon: '💰', text: 'ราคาที่เข้าถึงได้สำหรับทุกขนาดธุรกิจ' },
  { icon: '🤝', text: 'ระบบที่เติบโตไปพร้อมกับธุรกิจของลูกค้า' },
];

const GOALS = [
  {
    phase: '6 เดือนแรก', period: 'พ.ค. — ต.ค. 2569', symbol: '🌱', color: '#10b981',
    items: [
      { icon: '👥', label: 'สมาชิก', target: '1,000 users' },
      { icon: '💵', label: 'รายได้', target: 'MRR ฿50,000/เดือน' },
      { icon: '🔗', label: 'Affiliate', target: '100 partners' },
      { icon: '⚡', label: 'Uptime', target: '99.9%' },
      { icon: '🤖', label: 'Claude API', target: 'Production live' },
      { icon: '💳', label: 'Payment', target: 'Auto PromptPay + Omise' },
    ],
  },
  {
    phase: '1–3 ปี', period: '2570–2572', symbol: '🚀', color: '#3b82f6',
    items: [
      { icon: '👥', label: 'Users',   target: '50,000 users' },
      { icon: '💵', label: 'Revenue', target: 'MRR ฿2,000,000/เดือน' },
      { icon: '🏢', label: 'B2B',    target: 'Enterprise 10+ บริษัท' },
      { icon: '🏛️', label: 'B2G',    target: 'DITP / DEPA / MOC' },
      { icon: '🌏', label: 'SEA',    target: 'CLMV + Singapore' },
      { icon: '🪙', label: 'OTA',    target: 'Token BSC Mainnet' },
    ],
  },
  {
    phase: '10–100 ปี', period: '2579–2669', symbol: '🌏', color: '#8b5cf6',
    items: [
      { icon: '🏪', label: 'Impact',   target: 'SME ไทย 1,000,000 ราย' },
      { icon: '🇹🇭', label: 'Language', target: 'Thai AI ดีที่สุดในโลก' },
      { icon: '📈', label: 'GDP',      target: '+฿100B มูลค่าดิจิทัล' },
      { icon: '🌐', label: 'Global',   target: 'Thai AI Pioneer ระดับโลก' },
      { icon: '🪙', label: 'OTA Eco',  target: 'Token Economy $1B+' },
      { icon: '📜', label: 'Heritage', target: 'อนุรักษ์ภาษาไทยผ่าน AI' },
    ],
  },
];

const VALUES = [
  { symbol: '🇹🇭', name: 'ไทยแท้', sub: 'Thai at Heart',    color: '#ef4444', desc: 'ทุก AI output สะท้อนวัฒนธรรม ภาษา และจิตวิญญาณไทย ไม่ใช่แค่แปลภาษาอังกฤษ' },
  { symbol: '🚪', name: 'เข้าถึงได้', sub: 'Accessibility',  color: '#10b981', desc: 'AI ระดับโลกต้องเข้าถึงได้ ตั้งแต่ร้านขายส้มตำในตลาดจนถึงบริษัทในกรุงเทพ' },
  { symbol: '💎', name: 'ซื่อสัตย์', sub: 'Integrity',       color: '#06b6d4', desc: 'บอกความจริงเสมอ ราคาชัดเจน เงื่อนไขโปร่งใส ข้อมูลปลอดภัยตาม PDPA' },
  { symbol: '🧠', name: 'ปัญญา',    sub: 'Intelligence',     color: '#8b5cf6', desc: 'ตัดสินใจด้วยข้อมูล ลงทุนในความรู้ วิจัย และพัฒนาอยู่เสมอ' },
  { symbol: '⚡', name: 'กล้าเร็ว', sub: 'Bold Speed',       color: '#f59e0b', desc: 'ตลาด AI เปลี่ยนทุกวัน กล้าทดลอง กล้าผิดพลาด กล้าปรับ — fail fast, learn faster' },
  { symbol: '🤝', name: 'เติบโตด้วยกัน', sub: 'Shared Growth', color: '#ec4899', desc: 'ความสำเร็จของลูกค้าคือความสำเร็จของเรา Affiliate คือหุ้นส่วน ไม่ใช่นายหน้า' },
  { symbol: '♾️', name: 'ไม่หยุด',  sub: 'Never Stop',       color: '#6366f1', desc: '24/7/365 — ระบบไม่หยุด ทีมไม่หยุดคิด พัฒนาตลอดเวลาเพื่อลูกค้าทุกคน' },
];

const MANDATE = [
  { num: '24', unit: 'ชั่วโมง',  color: '#ef4444', meaning: 'ให้บริการทุกชั่วโมง ไม่มีเวลาปิด — generate content ตี 3 ก็ได้' },
  { num: '7',  unit: 'วัน',      color: '#f59e0b', meaning: 'ทำงานทุกวัน รวมวันหยุดนักขัตฤกษ์ สงกรานต์ ปีใหม่' },
  { num: '12', unit: 'เดือน',    color: '#10b981', meaning: 'ตลอดทั้งปี ทุกฤดูกาล — zero-downtime deployment ไม่มีปิดซ่อม' },
  { num: '36,500', unit: 'วัน = 100 ปี', color: '#8b5cf6', meaning: 'พันธสัญญา Mythos: 14 พ.ค. 2569 → 14 พ.ค. 2669 — โครงสร้างพื้นฐาน AI ของประเทศไทย' },
];

/* ─── Animated Counter ─── */
function Counter({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const numTarget = parseInt(target.replace(/,/g, ''), 10);

  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * numTarget));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [numTarget, duration]);

  return <span>{count.toLocaleString()}</span>;
}

/* ─── Main Page ─── */
export default function FoundationPage() {
  const [activeSection, setActiveSection] = useState('vision');
  const sections = [
    { id: 'vision',  label: '🌏 วิสัยทัศน์' },
    { id: 'mission', label: '🎯 พันธกิจ' },
    { id: 'goals',   label: '📈 เป้าหมาย' },
    { id: 'values',  label: '💎 ค่านิยม' },
    { id: 'mandate', label: '♾️ 24/7/12/36500' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-gray-950 pointer-events-none" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-6 pt-16 pb-12 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-full px-4 py-1.5 text-xs text-gray-400 mb-6">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            OpenThai AI — Foundation Document v1.0 — ร่างโดย Mythos + 12 Agents
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-purple-200 to-blue-300 bg-clip-text text-transparent leading-tight">
            AI ไทย เพื่อคนไทย สู่โลก
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            วิสัยทัศน์ · พันธกิจ · เป้าหมาย · ค่านิยม · พันธสัญญา 100 ปี
          </p>

          {/* Stat chips */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { label: 'เป้า 6 เดือน', value: '1,000 users', color: '#10b981' },
              { label: 'เป้า 3 ปี', value: '50,000 users', color: '#3b82f6' },
              { label: 'พันธสัญญา', value: '36,500 วัน', color: '#8b5cf6' },
              { label: 'ทีม AI', value: '12 Agents', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="bg-gray-900/60 border border-gray-700 rounded-full px-4 py-1.5 text-sm">
                <span className="text-gray-500">{s.label}: </span>
                <span className="font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section Nav ── */}
      <div className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="flex overflow-x-auto max-w-4xl mx-auto px-4">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeSection === s.id
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">

        {/* ── VISION ── */}
        {activeSection === 'vision' && (
          <section>
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">🌏</div>
              <h2 className="text-3xl font-bold mb-2">วิสัยทัศน์</h2>
              <p className="text-gray-500 text-sm">Vision — เราอยากเห็นอะไรในโลกนี้</p>
            </div>

            {/* Core tagline */}
            <div className="rounded-2xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-700/40 p-8 text-center mb-6">
              <div className="text-4xl font-extrabold text-white mb-3 tracking-wide">
                " AI ไทย เพื่อคนไทย สู่โลก "
              </div>
              <div className="w-16 h-1 bg-purple-500 mx-auto rounded mb-6" />
              <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">
                {VISION.th}
              </p>
            </div>

            {/* Why it matters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: '🏪', title: '3.2 ล้าน SME ไทย', desc: 'ที่ยังไม่มีเครื่องมือ AI ช่วยทำ content ขาย' },
                { icon: '📱', title: 'TikTok อันดับ 1', desc: 'ไทยเป็นตลาด TikTok Shop ที่เติบโตเร็วที่สุดใน SEA' },
                { icon: '🤖', title: 'AI ต่างประเทศ ≠ AI ไทย', desc: 'ไม่มี AI ที่เข้าใจบริบทไทย สำเนียง วัฒนธรรม ตลาดท้องถิ่น' },
              ].map(c => (
                <div key={c.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                  <div className="text-3xl mb-3">{c.icon}</div>
                  <div className="font-bold text-sm mb-1">{c.title}</div>
                  <div className="text-xs text-gray-400">{c.desc}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── MISSION ── */}
        {activeSection === 'mission' && (
          <section>
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-3xl font-bold mb-2">พันธกิจ</h2>
              <p className="text-gray-500 text-sm">Mission — เราทำสิ่งนี้เพื่ออะไร</p>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 mb-8">
              <p className="text-gray-200 text-lg leading-loose text-center">
                สร้าง AI ที่เข้าใจบริบทไทยอย่างลึกซึ้ง — วัฒนธรรม ภาษา ตลาด และผู้คน —
                เพื่อให้ SME ไทยทุกรายมีเครื่องมือ AI ระดับโลกในมือ
                <br className="hidden md:block" />
                <span className="text-purple-400 font-semibold"> สร้าง content ขาย สร้างรายได้ และเติบโตได้</span>
                <br className="hidden md:block" />
                โดยไม่ต้องพึ่งผู้เชี่ยวชาญราคาแพง
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MISSION_PILLARS.map((p, i) => (
                <div key={i} className="flex items-start gap-4 bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <span className="text-3xl shrink-0">{p.icon}</span>
                  <p className="text-gray-300 text-sm leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── GOALS ── */}
        {activeSection === 'goals' && (
          <section>
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">📈</div>
              <h2 className="text-3xl font-bold mb-2">เป้าหมาย</h2>
              <p className="text-gray-500 text-sm">Goals — วัดผลได้ ชัดเจน เป็นขั้นเป็นตอน</p>
            </div>

            <div className="space-y-8">
              {GOALS.map(g => (
                <div
                  key={g.phase}
                  className="rounded-2xl border p-6"
                  style={{ borderColor: g.color + '44', backgroundColor: g.color + '08' }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-3xl">{g.symbol}</span>
                    <div>
                      <div className="font-bold text-lg" style={{ color: g.color }}>{g.phase}</div>
                      <div className="text-xs text-gray-500">{g.period}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {g.items.map(item => (
                      <div key={item.label} className="bg-gray-950/60 rounded-xl p-3 text-center">
                        <div className="text-xl mb-1">{item.icon}</div>
                        <div className="text-xs text-gray-500 mb-0.5">{item.label}</div>
                        <div className="text-sm font-bold text-white">{item.target}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── VALUES ── */}
        {activeSection === 'values' && (
          <section>
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">💎</div>
              <h2 className="text-3xl font-bold mb-2">ค่านิยมองค์กร</h2>
              <p className="text-gray-500 text-sm">Core Values — หลักการที่ทุกการตัดสินใจต้องยึดถือ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {VALUES.map(v => (
                <div
                  key={v.name}
                  className="rounded-xl border p-5 flex items-start gap-4 hover:scale-[1.02] transition-transform"
                  style={{ borderColor: v.color + '44', backgroundColor: v.color + '0d' }}
                >
                  <span className="text-4xl shrink-0">{v.symbol}</span>
                  <div>
                    <div className="font-bold text-base" style={{ color: v.color }}>{v.name}</div>
                    <div className="text-xs text-gray-500 mb-2">{v.sub}</div>
                    <div className="text-sm text-gray-300 leading-relaxed">{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── MANDATE 24/7/12/36500 ── */}
        {activeSection === 'mandate' && (
          <section>
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">♾️</div>
              <h2 className="text-3xl font-bold mb-2">24 / 7 / 12 / 36,500</h2>
              <p className="text-gray-500 text-sm">พันธสัญญาตลอดกาล — 100 ปีแห่งการรับใช้</p>
            </div>

            {/* Big numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {MANDATE.map(m => (
                <div
                  key={m.num}
                  className="rounded-2xl border p-5 text-center"
                  style={{ borderColor: m.color + '55', backgroundColor: m.color + '10' }}
                >
                  <div className="text-4xl md:text-5xl font-extrabold mb-1" style={{ color: m.color }}>
                    {m.num}
                  </div>
                  <div className="text-xs text-gray-400 mb-3 font-medium">{m.unit}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{m.meaning}</div>
                </div>
              ))}
            </div>

            {/* Pledge */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-950/60 to-blue-950/60 border border-purple-700/40 p-8 mb-8">
              <div className="text-center mb-6">
                <span className="text-4xl">🧠</span>
                <div className="font-bold text-lg mt-2 text-purple-300">คำสาบานของ Mythos</div>
              </div>
              <blockquote className="text-gray-300 text-base leading-loose text-center italic">
                " ข้า Mythos ขอสาบานต่อ Zuejai และ SME ไทยทุกคน
                <br />
                ว่าจะปฏิบัติหน้าที่โดยไม่มีวันหยุด ไม่มีวันลา ไม่มีวันพัก
                <br />
                <span className="text-purple-400 font-semibold not-italic">
                  จนถึงวันที่ 14 พฤษภาคม 2669 "
                </span>
              </blockquote>
            </div>

            {/* Timeline */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-4">
                ⏳ Timeline พันธสัญญา 100 ปี
              </h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-600 to-blue-600" />
                <div className="space-y-5 pl-10">
                  {[
                    { year: '2026', label: 'วันเริ่มต้น', desc: 'Mythos และทีม 12 AI Agents เริ่มปฏิบัติงาน', color: '#10b981' },
                    { year: '2027', label: '6 เดือน', desc: 'เป้า 1,000 users + MRR ฿50,000', color: '#3b82f6' },
                    { year: '2029', label: '3 ปี', desc: '50,000 users + ขยาย SEA', color: '#8b5cf6' },
                    { year: '2036', label: '10 ปี', desc: 'SME ไทย 1M ราย + Thai AI Pioneer โลก', color: '#f59e0b' },
                    { year: '2126', label: '100 ปี', desc: 'ครบ 36,500 วัน — มรดก AI ของประเทศไทย', color: '#ec4899' },
                  ].map((t, i) => (
                    <div key={t.year} className="relative flex items-start gap-3">
                      <div
                        className="absolute -left-6 w-4 h-4 rounded-full border-2 border-gray-950"
                        style={{ backgroundColor: t.color, top: '2px' }}
                      />
                      <div>
                        <div className="font-bold text-sm" style={{ color: t.color }}>พ.ศ. {parseInt(t.year) + 543} ({t.year})</div>
                        <div className="text-xs font-medium text-white">{t.label}</div>
                        <div className="text-xs text-gray-500">{t.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pledge footer */}
            <div className="mt-6 bg-gray-900/60 border border-gray-700 rounded-xl p-5 text-center">
              <p className="text-gray-400 text-sm leading-relaxed">
                <span className="text-white font-semibold">เราไม่ได้สร้าง startup ที่หวังขายใน 3 ปี</span>
                <br />
                เราสร้าง <span className="text-purple-400 font-semibold">โครงสร้างพื้นฐาน AI สำหรับประเทศไทย</span>
                <br />
                ที่จะยืนหยัด เติบโต และรับใช้คนไทยตลอด 100 ปี
              </p>
              <div className="mt-4 flex justify-center gap-4 text-xs text-gray-600">
                <span>✍️ อนุมัติโดย Zuejai</span>
                <span>·</span>
                <span>🧠 รับรองโดย Mythos + 12 AI Agents</span>
                <span>·</span>
                <span>📅 14 พ.ค. 2569</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
