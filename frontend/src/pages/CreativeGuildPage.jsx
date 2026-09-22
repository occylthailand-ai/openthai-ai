import { useState } from 'react'
import { apiUrl } from '../apiBase'

const ROLES = [
  {
    id: 'video',
    emoji: '🎬',
    title: 'Video Creator',
    titleTH: 'นักสร้างคลิปวีดีโอ',
    titleZH: '视频创作者',
    color: 'from-purple-900/60 to-purple-800/30',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300',
    glow: 'shadow-purple-500/20',
    desc: 'สร้างคลิป TikTok/Reels สินค้าไทยไตรภาษา ด้วย AI-assisted editing ให้คนจีน-ASEAN หลงรัก',
    tools: ['TikTok', 'CapCut AI', 'Sora', 'Premiere', 'Reels'],
    kpi: 'คลิปที่สร้าง ≥10/เดือน · View ≥10,000',
    pay: 'ค่าจ้าง + Revenue share ต่อ view',
  },
  {
    id: 'music',
    emoji: '🎵',
    title: 'Music Producer',
    titleTH: 'นักสร้างเสียงดนตรี',
    titleZH: '音乐制作人',
    color: 'from-blue-900/60 to-blue-800/30',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300',
    glow: 'shadow-blue-500/20',
    desc: 'แต่งเพลง Jingle สินค้า BGM คลิปโปรโมท และ Sound Branding ให้ OpenThai.ai ด้วย Suno AI',
    tools: ['Suno AI', 'Udio', 'FL Studio', 'ElevenLabs', 'Audacity'],
    kpi: 'เพลง ≥5/เดือน · ใช้งานจริง ≥3 ชิ้น',
    pay: 'ค่าจ้าง + Royalty ทุกครั้งที่ใช้งาน',
  },
  {
    id: 'motion',
    emoji: '✨',
    title: 'Motion Typography Artist',
    titleTH: 'อักษรวิ้งขับเคลื่อน',
    titleZH: '动态字体艺术家',
    color: 'from-yellow-900/60 to-amber-800/30',
    border: 'border-yellow-500/30',
    badge: 'bg-yellow-500/20 text-yellow-300',
    glow: 'shadow-yellow-500/20',
    desc: 'ออกแบบตัวอักษรเคลื่อนไหว TH/ZH/EN ให้คลิปสินค้ามีชีวิต สะดุดตา จำได้ทันที',
    tools: ['After Effects', 'Motion', 'Lottie', 'Figma', 'Canva Pro'],
    kpi: 'งาน Motion ≥8/เดือน · ใช้ใน production',
    pay: 'ค่าจ้าง + Bonus ตาม engagement',
  },
  {
    id: 'storyteller',
    emoji: '🎙️',
    title: 'Storyteller / Voice Actor',
    titleTH: 'นักเล่าตำนาน · นักพากย์',
    titleZH: '故事讲述者 / 配音演员',
    color: 'from-green-900/60 to-emerald-800/30',
    border: 'border-green-500/30',
    badge: 'bg-green-500/20 text-green-300',
    glow: 'shadow-green-500/20',
    desc: 'เล่าเรื่องราวเบื้องหลังสินค้าไทย พากย์เสียง 3 ภาษา ให้ผู้ฟังรู้สึกเชื่อมโยงและอยากซื้อ',
    tools: ['ElevenLabs', 'Descript', 'Audition', 'Script AI', 'Podcast'],
    kpi: 'Script/Voice-over ≥10/เดือน',
    pay: 'ค่าจ้างต่อชิ้น + Revenue share',
  },
  {
    id: 'copywriter',
    emoji: '😂',
    title: 'Viral Copywriter',
    titleTH: 'นักเขียน Caption ขำ-เข้าใจ',
    titleZH: '爆款文案写手',
    color: 'from-pink-900/60 to-rose-800/30',
    border: 'border-pink-500/30',
    badge: 'bg-pink-500/20 text-pink-300',
    glow: 'shadow-pink-500/20',
    desc: 'เขียน Caption ฮาแบบไทยๆ ที่คนแชร์กระจาย Meme marketing เข้าถึงคนทุกเจเนอเรชั่น',
    tools: ['Claude AI', 'Twitter/X', 'TikTok', 'Pantip', 'Meme formats'],
    kpi: 'Caption ≥30/เดือน · Share rate ≥5%',
    pay: 'ค่าจ้าง + Viral bonus',
  },
]

export default function CreativeGuildPage() {
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ name: '', role: '', portfolio: '', line: '', note: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleApply = (roleId) => {
    setSelected(roleId)
    setForm(f => ({ ...f, role: roleId }))
    setTimeout(() => document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(apiUrl('/api/creative/apply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } catch (_) {}
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-950 to-pink-900/20" />
        <div className="relative max-w-5xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">🎨</div>
          <h1 className="text-3xl md:text-4xl font-black mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
            Creative Strike Force Guild
          </h1>
          <p className="text-gray-400 text-base max-w-xl mx-auto mb-2">
            OpenThai.ai กำลังมองหาคนมีพรสวรรค์ ที่จะช่วยขับเคลื่อนแพลตฟอร์ม AI Commerce ไทย-จีน-ASEAN
          </p>
          <p className="text-gray-500 text-sm mb-8">
            创意精英部队 · Remote-first · AI Tools ครบ · Revenue Share
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <span className="bg-purple-900/40 border border-purple-500/30 rounded-full px-4 py-1 text-xs text-purple-300">🌏 Remote-first</span>
            <span className="bg-blue-900/40 border border-blue-500/30 rounded-full px-4 py-1 text-xs text-blue-300">🤖 AI Tools ครบ</span>
            <span className="bg-green-900/40 border border-green-500/30 rounded-full px-4 py-1 text-xs text-green-300">💰 Revenue Share</span>
            <span className="bg-pink-900/40 border border-pink-500/30 rounded-full px-4 py-1 text-xs text-pink-300">🚀 5 ตำแหน่ง</span>
          </div>
        </div>
      </div>

      {/* Role Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ROLES.map(r => (
            <div key={r.id}
              className={`bg-gradient-to-br ${r.color} border ${r.border} rounded-2xl overflow-hidden shadow-lg ${r.glow} flex flex-col`}>
              <div className="p-5 flex-1">
                <div className="text-4xl mb-3">{r.emoji}</div>
                <h3 className="text-lg font-bold text-white">{r.title}</h3>
                <p className="text-sm text-gray-400">{r.titleTH} · {r.titleZH}</p>
                <p className="text-sm text-gray-300 mt-3 leading-relaxed">{r.desc}</p>

                <div className="flex flex-wrap gap-1.5 mt-4">
                  {r.tools.map(t => (
                    <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${r.badge}`}>{t}</span>
                  ))}
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-gray-400">
                  <div>📊 <span className="text-gray-300">{r.kpi}</span></div>
                  <div>💰 <span className="text-gray-300">{r.pay}</span></div>
                </div>
              </div>
              <div className="p-4 pt-0">
                <button onClick={() => handleApply(r.id)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 transition text-white">
                  ✉️ สมัครตำแหน่งนี้
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* What we offer */}
        <div className="mt-12 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-center mb-6 text-white">🎁 สิ่งที่เราให้ Creative Guild</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            {[
              { e: '🤖', t: 'AI Tools ครบ', d: 'Suno · ElevenLabs · Sora · Claude' },
              { e: '💰', t: 'Revenue Share', d: 'ได้ส่วนแบ่งทุกครั้งที่ content สร้างรายได้' },
              { e: '🌏', t: 'ตลาดจีน-ASEAN', d: 'งานของท่านถึงคนล้านคน' },
              { e: '🚀', t: 'เติบโตไปด้วยกัน', d: 'Startup ที่กำลังไปต่างประเทศ' },
            ].map(x => (
              <div key={x.t} className="bg-gray-800/50 rounded-xl p-4">
                <div className="text-3xl mb-2">{x.e}</div>
                <div className="font-semibold text-white">{x.t}</div>
                <div className="text-gray-400 text-xs mt-1">{x.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Apply Form */}
        <div id="apply-form" className="mt-10 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-center mb-6 text-white">✉️ สมัครเข้าร่วม Creative Guild</h2>
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-green-400">ส่งใบสมัครสำเร็จแล้ว!</h3>
              <p className="text-gray-400 mt-2">ทีมงานจะติดต่อท่านภายใน 24 ชั่วโมงครับ</p>
              <p className="text-gray-500 text-sm mt-1">LINE: @326gwipr</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
              <div>
                <label className="block text-sm text-gray-400 mb-1">ชื่อ-นามสกุล *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                  placeholder="ชื่อของท่าน" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">ตำแหน่งที่สนใจ *</label>
                <select required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
                  <option value="">-- เลือกตำแหน่ง --</option>
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.emoji} {r.title} — {r.titleTH}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Portfolio / ผลงานที่ผ่านมา (URL หรือคำอธิบาย)</label>
                <textarea value={form.portfolio} onChange={e => setForm(f => ({ ...f, portfolio: e.target.value }))}
                  rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                  placeholder="ลิงก์ผลงาน หรืออธิบายประสบการณ์ที่ผ่านมา" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">LINE ID หรือเบอร์โทร *</label>
                <input required value={form.line} onChange={e => setForm(f => ({ ...f, line: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                  placeholder="@yourline หรือ 08X-XXX-XXXX" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">เล่าให้ฟังว่าทำไมอยากร่วมทีม</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                  placeholder="แรงบันดาลใจ สิ่งที่อยากสร้าง..." />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold transition disabled:opacity-50">
                {loading ? '⏳ กำลังส่ง...' : '🚀 ส่งใบสมัคร'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
