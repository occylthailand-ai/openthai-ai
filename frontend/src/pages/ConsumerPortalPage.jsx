import { useState } from 'react'

const WELFARE_QUESTIONS = [
  { key: 'income', label: 'รายได้ต่อเดือน (บาท)', type: 'select', options: ['ไม่มีรายได้', 'น้อยกว่า 3,000', '3,000–10,000', '10,001–30,000', 'มากกว่า 30,000'] },
  { key: 'job', label: 'สถานะอาชีพ', type: 'select', options: ['ว่างงาน', 'ลูกจ้างเอกชน', 'ราชการ/รัฐวิสาหกิจ', 'ประกอบอาชีพอิสระ', 'เกษตรกร', 'ผู้สูงอายุ/เกษียณ', 'ผู้พิการ'] },
  { key: 'age', label: 'อายุ (ปี)', type: 'select', options: ['ต่ำกว่า 18', '18–59', '60 ขึ้นไป'] },
  { key: 'has_disability', label: 'มีบัตรประจำตัวผู้พิการ', type: 'bool' },
  { key: 'has_kids', label: 'มีบุตรอายุต่ำกว่า 6 ปี', type: 'bool' },
]

const WELFARE_DB = [
  {
    name: 'บัตรสวัสดิการแห่งรัฐ',
    icon: '💳',
    cond: f => ['ไม่มีรายได้','น้อยกว่า 3,000','3,000–10,000'].includes(f.income),
    desc: 'รับเงินช่วยเหลือค่าครองชีพรายเดือน',
    url: 'https://welfare.mof.go.th',
    agency: 'กรมบัญชีกลาง',
  },
  {
    name: 'ประกันสังคม (มาตรา 33/39/40)',
    icon: '🛡️',
    cond: f => ['ลูกจ้างเอกชน','ประกอบอาชีพอิสระ','เกษตรกร'].includes(f.job),
    desc: 'รับสิทธิ์รักษาพยาบาล ชราภาพ และประกันการว่างงาน',
    url: 'https://www.sso.go.th',
    agency: 'สำนักงานประกันสังคม',
  },
  {
    name: 'เบี้ยยังชีพผู้สูงอายุ',
    icon: '👴',
    cond: f => f.age === '60 ขึ้นไป',
    desc: 'รับเงินรายเดือน 600–1,000 บาท ตามช่วงอายุ',
    url: 'https://www.dop.go.th',
    agency: 'กรมกิจการผู้สูงอายุ',
  },
  {
    name: 'เบี้ยผู้พิการ',
    icon: '♿',
    cond: f => f.has_disability,
    desc: 'รับเงินช่วยเหลือรายเดือน 800 บาท',
    url: 'https://www.dep.go.th',
    agency: 'กรมส่งเสริมและพัฒนาคุณภาพชีวิตคนพิการ',
  },
  {
    name: 'เงินอุดหนุนบุตร',
    icon: '👶',
    cond: f => f.has_kids && ['ไม่มีรายได้','น้อยกว่า 3,000','3,000–10,000'].includes(f.income),
    desc: 'รับ 600 บาท/เดือน/บุตร สำหรับครอบครัวรายได้น้อย',
    url: 'https://www.dcy.go.th',
    agency: 'กรมกิจการเด็กและเยาวชน',
  },
  {
    name: 'กองทุนการออมแห่งชาติ (กอช.)',
    icon: '🏦',
    cond: f => ['ประกอบอาชีพอิสระ','เกษตรกร','ว่างงาน'].includes(f.job) && f.age === '18–59',
    desc: 'ออมเพื่อเกษียณ รัฐบาลสมทบให้สูงสุด 1,200 บาท/ปี',
    url: 'https://www.nsf.or.th',
    agency: 'กองทุนการออมแห่งชาติ',
  },
]

const CONTRACT_TYPES = ['สัญญาเช่า/เช่าซื้อ', 'ประกันภัย/ประกันชีวิต', 'สัญญาเงินกู้', 'Terms of Service แอป', 'สัญญาจ้างงาน', 'อื่นๆ']

const TABS = ['ตรวจสิทธิ์สวัสดิการ', 'เปรียบเทียบสินค้า', 'ย่อยสัญญา', 'สิทธิผู้บริโภค']

export default function ConsumerPortalPage() {
  const [tab, setTab] = useState(0)

  // Welfare state
  const [wform, setWform] = useState({ income: '', job: '', age: '', has_disability: false, has_kids: false })
  const [wResult, setWResult] = useState(null)

  // Compare state
  const [products, setProducts] = useState(['', ''])
  const [compareResult, setCompareResult] = useState(null)
  const [cLoading, setCLoading] = useState(false)

  // Contract state
  const [contractText, setContractText] = useState('')
  const [contractType, setContractType] = useState('')
  const [contractResult, setContractResult] = useState(null)
  const [ctLoading, setCtLoading] = useState(false)

  const setW = (k, v) => setWform(f => ({ ...f, [k]: v }))

  const checkWelfare = () => {
    const matched = WELFARE_DB.filter(w => w.cond(wform))
    setWResult(matched)
  }

  const runCompare = async () => {
    setCLoading(true)
    try {
      const res = await fetch('/api/consumer/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products })
      })
      if (res.ok) setCompareResult(await res.json())
      else setCompareResult({ error: 'ไม่สามารถเปรียบเทียบได้ในขณะนี้' })
    } catch {
      setCompareResult({ error: 'เชื่อมต่อ API ไม่ได้ กรุณาลองใหม่' })
    }
    setCLoading(false)
  }

  const runContract = async () => {
    if (!contractText.trim()) return
    setCtLoading(true)
    try {
      const res = await fetch('/api/consumer/summarize-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contractText, type: contractType })
      })
      if (res.ok) setContractResult(await res.json())
      else setContractResult({ error: 'ไม่สามารถประมวลผลได้' })
    } catch {
      setContractResult({ error: 'เชื่อมต่อ API ไม่ได้' })
    }
    setCtLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-10 px-4 text-center">
        <div className="text-5xl mb-3">🛒</div>
        <h1 className="text-3xl font-bold">Consumer Portal</h1>
        <p className="mt-2 text-orange-100">ผู้บริโภคฉลาด — ตรวจสิทธิ์ เปรียบสินค้า ย่อยสัญญา</p>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-4xl mx-auto flex overflow-x-auto">
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`flex-shrink-0 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                tab === i ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Tab 0: Welfare Check */}
        {tab === 0 && (
          <div>
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">ตรวจสิทธิ์สวัสดิการรัฐ</h2>
              <p className="text-gray-500 text-sm mb-6">ตอบคำถาม 5 ข้อ ระบบจะบอกว่าคุณน่าจะมีสิทธิ์อะไรบ้าง</p>

              <div className="space-y-4">
                {WELFARE_QUESTIONS.map(q => (
                  <div key={q.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{q.label}</label>
                    {q.type === 'select' ? (
                      <select
                        value={wform[q.key]}
                        onChange={e => setW(q.key, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      >
                        <option value="">-- เลือก --</option>
                        {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wform[q.key]}
                          onChange={e => setW(q.key, e.target.checked)}
                          className="w-4 h-4 accent-orange-500"
                        />
                        <span className="text-sm text-gray-700">ใช่</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={checkWelfare}
                disabled={!wform.income || !wform.job || !wform.age}
                className="mt-6 w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-40"
              >ตรวจสิทธิ์เลย</button>
            </div>

            {wResult !== null && (
              <div>
                {wResult.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-500">
                    ไม่พบสิทธิ์ที่ตรงกับเงื่อนไขที่กรอก
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 font-medium">พบสิทธิ์ที่น่าจะได้รับ {wResult.length} รายการ</p>
                    {wResult.map((w, i) => (
                      <div key={i} className="bg-white rounded-2xl shadow p-5 border-l-4 border-orange-400">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{w.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800">{w.name}</h3>
                            <p className="text-gray-600 text-sm mt-1">{w.desc}</p>
                            <p className="text-xs text-gray-400 mt-1">หน่วยงาน: {w.agency}</p>
                            <a href={w.url} target="_blank" rel="noopener noreferrer"
                              className="inline-block mt-2 text-orange-600 text-sm font-medium hover:underline">
                              ตรวจสอบที่ {w.url} →
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                      ⚠️ ข้อมูลนี้เป็นแนวทางเบื้องต้นเท่านั้น ควรตรวจสอบสิทธิ์จริงกับหน่วยงานที่ระบุโดยตรง ระบบ AI ไม่สามารถยืนยันสิทธิ์แทนหน่วยงานรัฐได้
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Product Compare */}
        {tab === 1 && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1">เปรียบเทียบสินค้าอัจฉริยะ</h2>
            <p className="text-gray-500 text-sm mb-6">วางลิงก์หรือข้อมูลสเปคสินค้า 2 รายการ AI จะสรุปให้อ่านง่าย</p>

            <div className="space-y-4">
              {products.map((p, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สินค้าที่ {i + 1}</label>
                  <textarea
                    value={p}
                    onChange={e => {
                      const np = [...products]
                      np[i] = e.target.value
                      setProducts(np)
                    }}
                    placeholder={`วางสเปค ลิงก์ หรือรายละเอียดสินค้าที่ ${i + 1}`}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              ))}
              {products.length < 4 && (
                <button
                  onClick={() => setProducts(p => [...p, ''])}
                  className="text-sm text-orange-500 hover:underline"
                >+ เพิ่มสินค้าอีก 1 รายการ</button>
              )}
            </div>

            <button
              onClick={runCompare}
              disabled={cLoading || products.filter(p => p.trim()).length < 2}
              className="mt-6 w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-40"
            >{cLoading ? 'กำลังเปรียบเทียบ…' : 'เปรียบเทียบเลย'}</button>

            {compareResult && (
              <div className="mt-6">
                {compareResult.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{compareResult.error}</div>
                ) : (
                  <div className="bg-orange-50 rounded-xl p-5 text-sm text-gray-700 whitespace-pre-wrap">
                    {compareResult.summary || JSON.stringify(compareResult, null, 2)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Contract Simplifier */}
        {tab === 2 && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1">ย่อยสัญญาให้เข้าใจง่าย</h2>
            <p className="text-gray-500 text-sm mb-6">วางข้อความสัญญา AI จะสรุปจุดสำคัญที่ต้องระวัง</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทเอกสาร (ไม่บังคับ)</label>
              <select
                value={contractType}
                onChange={e => setContractType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">-- เลือกประเภท --</option>
                {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <textarea
              value={contractText}
              onChange={e => setContractText(e.target.value)}
              placeholder="วางข้อความสัญญา หรือข้อกำหนดที่ต้องการย่อย (ภาษาไทยหรืออังกฤษ)"
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />

            <button
              onClick={runContract}
              disabled={ctLoading || !contractText.trim()}
              className="mt-4 w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-40"
            >{ctLoading ? 'กำลังประมวลผล…' : 'ย่อยสัญญาเลย'}</button>

            {contractResult && (
              <div className="mt-6">
                {contractResult.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{contractResult.error}</div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-orange-50 rounded-xl p-5 text-sm text-gray-700 whitespace-pre-wrap">
                      {contractResult.summary || JSON.stringify(contractResult, null, 2)}
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                      ⚠️ การสรุปนี้เป็นเพียงแนวทางเบื้องต้น ไม่ใช่ความเห็นทางกฎหมาย ควรปรึกษาทนายความก่อนลงนามทุกกรณีที่สำคัญ
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Consumer Rights */}
        {tab === 3 && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">สิทธิผู้บริโภคที่ควรรู้</h2>
              {[
                { icon: '🔄', title: 'สิทธิ์คืนสินค้า', desc: 'สินค้าออนไลน์คืนได้ภายใน 7 วัน หากไม่ตรงตามที่โฆษณา (พ.ร.บ. ขายตรงและตลาดแบบตรง)' },
                { icon: '⚖️', title: 'สิทธิ์ร้องเรียน', desc: 'ร้องเรียนได้ที่ สคบ. (1166) หรือ สคส. ทั่วประเทศ ไม่มีค่าใช้จ่าย', link: 'https://www.ocpb.go.th' },
                { icon: '🏥', title: 'สิทธิ์รักษาพยาบาล 30 บาท', desc: 'ผู้มีบัตรทอง (บัตรประชาชน) รักษาได้ฟรีหรือ 30 บาทที่รพ.รัฐในสังกัด สปสช.', link: 'https://www.nhso.go.th' },
                { icon: '💊', title: 'สิทธิ์รับรู้ข้อมูลสุขภาพ', desc: 'ผู้ป่วยมีสิทธิ์รับทราบการวินิจฉัย แผนการรักษา และปฏิเสธการรักษาได้' },
                { icon: '🔒', title: 'สิทธิ์ PDPA', desc: 'ขอเข้าถึง แก้ไข ลบ หรือยกเลิกการประมวลผลข้อมูลส่วนบุคคลของคุณได้ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล 2562' },
                { icon: '📱', title: 'สิทธิ์ยกเลิก E-Commerce', desc: 'ยกเลิกสัญญาออนไลน์ที่เซ็นโดยไม่ได้รับข้อมูลครบถ้วนได้ภายใน 7 วัน' },
              ].map((r, i) => (
                <div key={i} className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
                  <span className="text-2xl flex-shrink-0">{r.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">{r.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{r.desc}</p>
                    {r.link && (
                      <a href={r.link} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-orange-500 hover:underline mt-1 inline-block">ไปที่ {r.link} →</a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-orange-500 rounded-2xl p-6 text-white text-center">
              <div className="text-3xl mb-2">📞</div>
              <h3 className="font-bold text-lg">ช่องทางร้องเรียนด่วน</h3>
              <div className="mt-3 space-y-1 text-orange-100 text-sm">
                <p>สคบ. (สำนักงานคณะกรรมการคุ้มครองผู้บริโภค) — <strong className="text-white">1166</strong></p>
                <p>สปสช. (สิทธิรักษาพยาบาล) — <strong className="text-white">1330</strong></p>
                <p>กรมการค้าภายใน (ราคาสินค้า) — <strong className="text-white">1569</strong></p>
                <p>ETDA (พาณิชย์อิเล็กทรอนิกส์) — <strong className="text-white">1212</strong></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
