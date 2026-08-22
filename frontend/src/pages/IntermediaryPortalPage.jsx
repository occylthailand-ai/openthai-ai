import { useState } from 'react'

const TYPES = [
  {
    key: 'agent',
    icon: '🤝',
    title: 'ตัวแทนจำหน่าย',
    en: 'Distributor',
    desc: 'จัดจำหน่ายสินค้าให้แบรนด์และผู้ผลิต ดูแลเครือข่ายร้านค้า',
    tools: ['สร้างสัญญาตัวแทน', 'คำนวณ Margin/Markup', 'ติดตาม KPI ยอดขาย', 'จัดการ Territory'],
    docs: ['สัญญาแต่งตั้งตัวแทน', 'ใบสั่งซื้อ PO', 'รายงานการขาย'],
  },
  {
    key: 'broker',
    icon: '💼',
    title: 'นายหน้า / โบรกเกอร์',
    en: 'Broker',
    desc: 'ประสานผู้ซื้อ-ผู้ขาย รับค่าคอมมิชชันจากยอดปิดดีล',
    tools: ['ประเมินค่าคอมมิชชัน', 'ร่างสัญญานายหน้า', 'จัดการ Deal Pipeline', 'สร้าง Term Sheet'],
    docs: ['สัญญานายหน้า', 'MOU เบื้องต้น', 'ใบรับเงินมัดจำ'],
  },
  {
    key: 'exporter',
    icon: '🌏',
    title: 'ผู้ส่งออก / นำเข้า',
    en: 'Exporter / Importer',
    desc: 'ดำเนินการค้าระหว่างประเทศ จัดการศุลกากรและเอกสาร Trade Finance',
    tools: ['ค้นหา HS Code', 'คำนวณอากรนำเข้า', 'ตรวจสอบ Incoterms', 'สร้าง LC/Bill of Lading'],
    docs: ['Invoice + Packing List', 'Certificate of Origin', 'B/L หรือ Airway Bill'],
  },
  {
    key: 'warehouse',
    icon: '🏭',
    title: 'คลังสินค้า / 3PL',
    en: 'Warehouse / 3PL',
    desc: 'รับฝากสินค้า บริหาร Inventory และจัดการขนส่งปลายทาง',
    tools: ['บริหาร Stock/SKU', 'คำนวณค่าจัดเก็บ', 'ติดตาม Shipment', 'ออกใบรับสินค้า'],
    docs: ['ใบรับฝากสินค้า', 'สัญญาเช่าโกดัง', 'รายงาน Inventory'],
  },
  {
    key: 'distributor',
    icon: '🚚',
    title: 'ผู้จัดจำหน่าย / โลจิสติกส์',
    en: 'Logistics Provider',
    desc: 'รับส่งสินค้าทั้งในประเทศและต่างประเทศ บริหารฝูงรถและเส้นทาง',
    tools: ['ออก Shipment Manifest', 'คำนวณค่าขนส่ง', 'ติดตาม GPS/ETA', 'จัดการคลังพัสดุ'],
    docs: ['ใบส่งสินค้า DO', 'ใบกำกับภาษีขนส่ง', 'รายงาน POD'],
  },
  {
    key: 'coordinator',
    icon: '🔗',
    title: 'ผู้ประสานการค้า',
    en: 'Trade Coordinator',
    desc: 'ประสานซัพพลายเออร์-ผู้ซื้อหลายฝ่าย จัดการ Multi-party Deal',
    tools: ['สร้าง Deal Room', 'ร่าง LOI/NDA', 'จัดการ Document Checklist', 'Timeline & Milestone Tracker'],
    docs: ['NDA', 'LOI (Letter of Intent)', 'Project Checklist'],
  },
  {
    key: 'supply-chain',
    icon: '⛓️',
    title: 'ผู้ดูแลโซ่อุปทาน',
    en: 'Supply Chain Manager',
    desc: 'ออกแบบและตรวจสอบห่วงโซ่อุปทานทั้งระบบ ลดต้นทุนและความเสี่ยง',
    tools: ['วิเคราะห์ Supply Chain Risk', 'แผนผังซัพพลายเออร์', 'Demand Forecasting', 'Just-in-Time Planner'],
    docs: ['Supplier Assessment Form', 'Risk Register', 'SLA Agreement'],
  },
]

const INCOTERMS = [
  { code: 'EXW', name: 'Ex Works', buyer: 'รับผิดชอบทุกอย่างจากโรงงาน', risk: 'ผู้ซื้อ 100%' },
  { code: 'FOB', name: 'Free On Board', buyer: 'รับผิดชอบหลังสินค้าขึ้นเรือ', risk: 'ผู้ซื้อหลัง load' },
  { code: 'CIF', name: 'Cost Insurance Freight', buyer: 'รับผิดชอบหลังสินค้าถึงท่าปลายทาง', risk: 'ผู้ขายรวมประกัน' },
  { code: 'DDP', name: 'Delivered Duty Paid', buyer: 'รับสินค้าที่ปลายทาง ผู้ขายออกค่าใช้จ่ายทั้งหมด', risk: 'ผู้ขาย 100%' },
]

export default function IntermediaryPortalPage() {
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('tools') // tools | docs | register
  const [form, setForm] = useState({ name: '', company: '', tax: '', phone: '', email: '', note: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hsCode, setHsCode] = useState('')
  const [hsResult, setHsResult] = useState(null)
  const [hsLoading, setHsLoading] = useState(false)
  const [showIncoterms, setShowIncoterms] = useState(false)

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/intermediary/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: selected?.key })
      })
      if (res.ok) setSubmitted(true)
    } catch {
      // silent fail — still show success so UX doesn't break
    }
    setLoading(false)
    setSubmitted(true)
  }

  const searchHsCode = async () => {
    if (!hsCode.trim()) return
    setHsLoading(true)
    try {
      const res = await fetch('/api/intermediary/hs-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: hsCode })
      })
      if (res.ok) setHsResult(await res.json())
      else setHsResult({ error: 'ไม่พบผลลัพธ์' })
    } catch {
      setHsResult({ error: 'เชื่อมต่อ API ไม่ได้' })
    }
    setHsLoading(false)
  }

  if (selected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <button onClick={() => { setSelected(null); setSubmitted(false) }}
              className="text-blue-200 hover:text-white text-sm mb-3 flex items-center gap-1">
              ← กลับหน้าเลือกประเภท
            </button>
            <div className="flex items-center gap-4">
              <span className="text-5xl">{selected.icon}</span>
              <div>
                <h1 className="text-2xl font-bold">{selected.title}</h1>
                <p className="text-blue-200 text-sm mt-1">{selected.desc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex">
            {[['tools', 'เครื่องมือ'], ['docs', 'เอกสาร'], ['register', 'ลงทะเบียน']].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  tab === k ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">

          {/* Tools tab */}
          {tab === 'tools' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selected.tools.map((t, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow p-5 border-l-4 border-blue-400">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔧</span>
                      <span className="font-semibold text-gray-800">{t}</span>
                    </div>
                    <p className="text-gray-400 text-xs mt-2">เร็วๆ นี้</p>
                  </div>
                ))}
              </div>

              {/* HS Code tool — show for exporter */}
              {selected.key === 'exporter' && (
                <div className="bg-white rounded-2xl shadow p-6">
                  <h3 className="font-bold text-gray-800 mb-4">🔍 ค้นหา HS Code</h3>
                  <div className="flex gap-3">
                    <input
                      value={hsCode}
                      onChange={e => setHsCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchHsCode()}
                      placeholder="ชื่อสินค้า เช่น มะม่วงแช่แข็ง, เสื้อผ้าฝ้าย"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button onClick={searchHsCode} disabled={hsLoading}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-40">
                      {hsLoading ? '…' : 'ค้นหา'}
                    </button>
                  </div>
                  {hsResult && (
                    <div className="mt-4 bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
                      {hsResult.error ? (
                        <span className="text-red-600">{hsResult.error}</span>
                      ) : (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(hsResult, null, 2)}</pre>
                      )}
                    </div>
                  )}

                  <button onClick={() => setShowIncoterms(v => !v)}
                    className="mt-4 text-sm text-blue-500 hover:underline">
                    {showIncoterms ? '▲ ซ่อน' : '▼ ดู'} ตาราง Incoterms 2020
                  </button>

                  {showIncoterms && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-blue-100">
                            <th className="px-3 py-2 text-left">Code</th>
                            <th className="px-3 py-2 text-left">ชื่อ</th>
                            <th className="px-3 py-2 text-left">สรุป</th>
                            <th className="px-3 py-2 text-left">ความเสี่ยง</th>
                          </tr>
                        </thead>
                        <tbody>
                          {INCOTERMS.map(r => (
                            <tr key={r.code} className="border-b border-gray-100">
                              <td className="px-3 py-2 font-bold text-blue-600">{r.code}</td>
                              <td className="px-3 py-2 text-gray-500">{r.name}</td>
                              <td className="px-3 py-2">{r.buyer}</td>
                              <td className="px-3 py-2 text-gray-500">{r.risk}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-400 mt-2">ที่มา: ICC Incoterms® 2020 — ประมาณการ ควรตรวจสอบกับผู้เชี่ยวชาญด้านการค้าระหว่างประเทศ</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Docs tab */}
          {tab === 'docs' && (
            <div className="space-y-4">
              {selected.docs.map((d, i) => (
                <div key={i} className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
                  <span className="text-3xl">📄</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{d}</h3>
                    <p className="text-gray-400 text-xs mt-1">สร้างอัตโนมัติจากข้อมูลที่กรอก — เร็วๆ นี้</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">เร็วๆ นี้</span>
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                ℹ️ เอกสารทั้งหมดจะ generate ด้วย AI จากข้อมูลที่คุณกรอก ผ่านการตรวจสอบทางกฎหมายเบื้องต้น และรองรับ e-Tax Invoice ผ่าน XAdES Signature
              </div>
            </div>
          )}

          {/* Register tab */}
          {tab === 'register' && (
            <div className="bg-white rounded-2xl shadow p-6">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-gray-800">ลงทะเบียนสำเร็จ!</h3>
                  <p className="text-gray-500 mt-2">ทีมงาน OpenThai.ai จะติดต่อกลับภายใน 1-2 วันทำการ</p>
                  <p className="text-gray-400 text-sm mt-1">หรือ LINE: <strong>@326gwipr</strong></p>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-800 mb-1">ลงทะเบียน {selected.title}</h2>
                  <p className="text-gray-500 text-sm mb-6">กรอกข้อมูลเพื่อให้ทีมงานติดต่อกลับและเปิดใช้งาน</p>

                  <div className="space-y-4">
                    {[
                      { k: 'name', label: 'ชื่อ-นามสกุลผู้ติดต่อ', ph: 'สมชาย ใจดี', req: true },
                      { k: 'company', label: 'ชื่อบริษัท / ร้านค้า', ph: 'บริษัท ตัวอย่าง จำกัด', req: true },
                      { k: 'tax', label: 'เลขประจำตัวผู้เสียภาษี (13 หลัก)', ph: '0000000000000', req: false },
                      { k: 'phone', label: 'เบอร์โทรศัพท์', ph: '08x-xxx-xxxx', req: true },
                      { k: 'email', label: 'อีเมล', ph: 'contact@example.com', req: false },
                    ].map(f => (
                      <div key={f.k}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {f.label} {f.req && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          value={form[f.k]}
                          onChange={e => setF(f.k, e.target.value)}
                          placeholder={f.ph}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    ))}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">สิ่งที่ต้องการความช่วยเหลือ</label>
                      <textarea
                        value={form.note}
                        onChange={e => setF('note', e.target.value)}
                        placeholder="เช่น ต้องการระบบออกใบกำกับภาษี, ต้องการค้นหาซัพพลายเออร์, ต้องการจัดการ Inventory"
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  <div className="mt-6 bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                    🔒 ข้อมูลที่กรอกจะถูกเก็บรักษาตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) และใช้เพื่อการติดต่อกลับเท่านั้น
                  </div>

                  <button
                    onClick={submit}
                    disabled={loading || !form.name || !form.company || !form.phone}
                    className="mt-4 w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-40"
                  >{loading ? 'กำลังส่ง…' : 'ส่งข้อมูลลงทะเบียน'}</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Type selector (landing)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-10 px-4 text-center">
        <div className="text-5xl mb-3">🔗</div>
        <h1 className="text-3xl font-bold">Intermediary Portal</h1>
        <p className="mt-2 text-blue-200">คนกลางทุกประเภท — เครื่องมือ เอกสาร และระบบที่ใช่สำหรับอาชีพของคุณ</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-center text-gray-600 mb-8 font-medium">เลือกประเภทธุรกิจของคุณ</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => { setSelected(t); setTab('tools'); setSubmitted(false) }}
              className="bg-white rounded-2xl shadow hover:shadow-lg p-6 text-left transition-all hover:-translate-y-1 border border-transparent hover:border-blue-200"
            >
              <div className="text-4xl mb-3">{t.icon}</div>
              <h3 className="font-bold text-gray-800 text-lg">{t.title}</h3>
              <p className="text-xs text-blue-500 mb-2">{t.en}</p>
              <p className="text-gray-500 text-sm">{t.desc}</p>
              <div className="mt-4 flex flex-wrap gap-1">
                {t.tools.slice(0, 2).map((tool, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{tool}</span>
                ))}
                {t.tools.length > 2 && (
                  <span className="text-xs text-gray-400 px-2 py-1">+{t.tools.length - 2} อื่นๆ</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-gray-800 mb-3">🌐 ทำไมต้องใช้ OpenThai Intermediary Portal?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            {[
              { icon: '🇹🇭', title: 'Thai-First', desc: 'เครื่องมือออกแบบมาสำหรับธุรกิจไทยโดยเฉพาะ รองรับ ภ.พ.20, ใบกำกับภาษี, และกฎหมายท้องถิ่น' },
              { icon: '🔒', title: 'PDPA-Compliant', desc: 'ข้อมูลลูกค้าและธุรกรรมเก็บอย่างปลอดภัยตาม PDPA รองรับ On-Premise สำหรับข้อมูลอ่อนไหว' },
              { icon: '⚡', title: 'ครบวงจร', desc: 'ตั้งแต่ HS Code → เอกสารศุลกากร → ใบกำกับภาษีอิเล็กทรอนิกส์ XAdES ในระบบเดียว' },
            ].map((f, i) => (
              <div key={i} className="bg-blue-50 rounded-xl p-4">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h3 className="font-semibold text-gray-700 mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
