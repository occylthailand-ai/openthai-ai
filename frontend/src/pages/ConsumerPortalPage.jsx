/**
 * ConsumerPortalPage — กลุ่ม 4: ผู้บริโภค
 * Wave 9, Task 9.2 — API Wiring
 *
 * เชื่อม UI กับ backend endpoints จริง:
 *   - POST /api/consumer/welfare/check
 *   - POST /api/consumer/product/compare
 *   - POST /api/consumer/contract/summarize
 *
 * PDPA: ผู้ใช้ต้องกด "ยินยอม" ก่อน submit ข้อมูลส่วนตัวใดๆ
 * เสิร์ฟกลุ่ม: กลุ่ม 4 ผู้บริโภค
 */

import { useState } from 'react'
import AppShell from '../components/AppShell'

// ── Mapping helpers ────────────────────────────────────────────────────────────

// แปลงช่วงอายุ → ตัวเลขตัวแทน (ใช้ส่ง API)
const AGE_MAP = {
  'ต่ำกว่า 18': 15,
  '18–59': 35,
  '60 ขึ้นไป': 65,
}

// แปลงรายได้/เดือน → รายได้ต่อปี (บาท)
const INCOME_MAP = {
  'ไม่มีรายได้': 0,
  'น้อยกว่า 3,000': 30_000,
  '3,000–10,000': 78_000,
  '10,001–30,000': 240_000,
  'มากกว่า 30,000': 480_000,
}

// แปลงอาชีพ → status enum ของ backend
const JOB_STATUS_MAP = {
  'ว่างงาน': 'unemployed',
  'ลูกจ้างเอกชน': 'employed',
  'ราชการ/รัฐวิสาหกิจ': 'employed',
  'ประกอบอาชีพอิสระ': 'self_employed',
  'เกษตรกร': 'self_employed',
  'ผู้สูงอายุ/เกษียณ': 'retired',
  'ผู้พิการ': 'disabled',
}

// แปลงประเภทสัญญา (label) → contract_type enum
const CONTRACT_TYPE_MAP = {
  'สัญญาเช่า/เช่าซื้อ': 'rental',
  'ประกันภัย/ประกันชีวิต': 'insurance',
  'สัญญาเงินกู้': 'loan',
  'Terms of Service แอป': 'service',
  'สัญญาจ้างงาน': 'employment',
  'อื่นๆ': 'other',
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WELFARE_QUESTIONS = [
  { key: 'income', label: 'รายได้ต่อเดือน (บาท)', type: 'select',
    options: ['ไม่มีรายได้', 'น้อยกว่า 3,000', '3,000–10,000', '10,001–30,000', 'มากกว่า 30,000'] },
  { key: 'job', label: 'สถานะอาชีพ', type: 'select',
    options: ['ว่างงาน', 'ลูกจ้างเอกชน', 'ราชการ/รัฐวิสาหกิจ', 'ประกอบอาชีพอิสระ', 'เกษตรกร', 'ผู้สูงอายุ/เกษียณ', 'ผู้พิการ'] },
  { key: 'age', label: 'ช่วงอายุ', type: 'select',
    options: ['ต่ำกว่า 18', '18–59', '60 ขึ้นไป'] },
  { key: 'has_disability', label: 'มีบัตรประจำตัวผู้พิการ', type: 'bool' },
  { key: 'has_kids', label: 'มีบุตรอายุต่ำกว่า 6 ปี', type: 'bool' },
]

const CONTRACT_TYPES = Object.keys(CONTRACT_TYPE_MAP)

const TABS = ['ตรวจสิทธิ์สวัสดิการ', 'เปรียบเทียบสินค้า', 'ย่อยสัญญา', 'สิทธิผู้บริโภค']

const RISK_COLORS = { low: 'green', medium: 'yellow', high: 'red', critical: 'red' }

// ── Sub-components ────────────────────────────────────────────────────────────

function PdpaNote() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 mb-4">
      🔒 <strong>นโยบาย PDPA:</strong> ข้อมูลที่กรอกจะถูกประมวลผลใน memory เท่านั้น ไม่จัดเก็บหรือส่งต่อบุคคลที่สาม
      ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConsumerPortalPage() {
  const [tab, setTab] = useState(0)

  // Welfare state
  const [wform, setWform] = useState({ income: '', job: '', age: '', has_disability: false, has_kids: false })
  const [wConsent, setWConsent] = useState(false)
  const [wResult, setWResult] = useState(null)
  const [wLoading, setWLoading] = useState(false)
  const [wError, setWError] = useState('')

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

  // ── Welfare check (API) ─────────────────────────────────────────────────────
  const checkWelfare = async () => {
    if (!wConsent) return
    setWLoading(true)
    setWError('')
    setWResult(null)

    const body = {
      age: AGE_MAP[wform.age] ?? 35,
      annual_income: INCOME_MAP[wform.income] ?? 0,
      province: 'ไม่ระบุ',
      status: JOB_STATUS_MAP[wform.job] ?? 'unemployed',
      has_disability: wform.has_disability,
      num_dependents: wform.has_kids ? 1 : 0,
      has_pdpa_consent: true,
    }

    try {
      const res = await fetch('/api/consumer/welfare/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setWResult(await res.json())
      } else {
        const err = await res.json().catch(() => ({}))
        setWError(err.detail || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      }
    } catch {
      setWError('เชื่อมต่อ API ไม่ได้ — กรุณาตรวจสอบว่า backend รันอยู่ที่ port 8000')
    }
    setWLoading(false)
  }

  // ── Product compare (API) ───────────────────────────────────────────────────
  const runCompare = async () => {
    setCLoading(true)
    const productList = products
      .filter(p => p.trim())
      .map((p, i) => ({ name: `สินค้า ${i + 1}`, description: p }))

    try {
      const res = await fetch('/api/consumer/product/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productList }),
      })
      if (res.ok) setCompareResult(await res.json())
      else setCompareResult({ error: 'ไม่สามารถเปรียบเทียบได้ในขณะนี้' })
    } catch {
      setCompareResult({ error: 'เชื่อมต่อ API ไม่ได้ กรุณาลองใหม่' })
    }
    setCLoading(false)
  }

  // ── Contract summarize (API) ────────────────────────────────────────────────
  const runContract = async () => {
    if (!contractText.trim()) return
    setCtLoading(true)

    const ctType = CONTRACT_TYPE_MAP[contractType] || 'other'

    try {
      const res = await fetch('/api/consumer/contract/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_type: ctType,
          contract_text: contractText,
          focus_areas: ['ข้อผูกพัน', 'ค่าปรับ', 'การบอกเลิกสัญญา', 'เงื่อนไขพิเศษ'],
          reading_level: 'simple',
        }),
      })
      if (res.ok) setContractResult(await res.json())
      else setContractResult({ error: 'ไม่สามารถประมวลผลได้' })
    } catch {
      setContractResult({ error: 'เชื่อมต่อ API ไม่ได้' })
    }
    setCtLoading(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AppShell portalId="consumer">
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-10 px-4 text-center">
          <div className="text-5xl mb-3">🛒</div>
          <h1 className="text-3xl font-bold">Consumer Portal</h1>
          <p className="mt-2 text-orange-100">ผู้บริโภคฉลาด — ตรวจสิทธิ์ เปรียบสินค้า ย่อยสัญญา</p>
        </div>

        {/* Tabs */}
        <div className="sticky top-14 z-10 bg-white shadow-sm">
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
                <p className="text-gray-500 text-sm mb-4">ตอบคำถาม 5 ข้อ ระบบจะประเมินสิทธิ์เบื้องต้น (ผ่าน AI backend)</p>

                <PdpaNote />

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

                {/* PDPA consent */}
                <label className="flex items-start gap-3 mt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wConsent}
                    onChange={e => setWConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-orange-500"
                  />
                  <span className="text-xs text-gray-600">
                    ฉันยินยอมให้ OpenThai.ai ประมวลผลข้อมูลที่กรอกข้างต้นเพื่อตรวจสอบสิทธิ์สวัสดิการเบื้องต้น
                    และรับทราบว่าข้อมูลจะไม่ถูกจัดเก็บหรือส่งต่อบุคคลที่สาม
                  </span>
                </label>

                <button
                  onClick={checkWelfare}
                  disabled={!wform.income || !wform.job || !wform.age || !wConsent || wLoading}
                  className="mt-4 w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-40"
                >
                  {wLoading ? 'กำลังตรวจสอบ…' : 'ตรวจสิทธิ์เลย'}
                </button>

                {!wConsent && wform.income && wform.job && wform.age && (
                  <p className="text-xs text-orange-600 mt-2 text-center">กรุณากดยินยอมนโยบาย PDPA ก่อนตรวจสิทธิ์</p>
                )}
              </div>

              {wError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">{wError}</div>
              )}

              {wResult && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 font-medium">
                    พบสิทธิ์ที่อาจมีสิทธิ์ {wResult.eligible_rights?.length ?? 0} รายการ
                    {wResult.total_estimated_value > 0 && (
                      <span className="ml-2 text-orange-600">
                        (มูลค่าโดยประมาณ {wResult.total_estimated_value.toLocaleString()} บาท/ปี)
                      </span>
                    )}
                  </p>

                  {(wResult.eligible_rights || []).map((r, i) => (
                    <div key={i} className="bg-white rounded-2xl shadow p-5 border-l-4 border-orange-400">
                      <h3 className="font-bold text-gray-800">{r.program}</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {r.amount_per_month ? `${r.amount_per_month} บาท/เดือน` : ''}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{r.condition}</p>
                      <p className="text-xs text-orange-600 mt-1 font-medium">
                        วิธีลงทะเบียน: {r.registration}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">หน่วยงาน: {r.agency}</p>
                    </div>
                  ))}

                  {wResult.registration_steps?.length > 0 && (
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-orange-800 mb-2">ขั้นตอนการลงทะเบียนทั่วไป</p>
                      {wResult.registration_steps.map((s, i) => (
                        <p key={i} className="text-sm text-orange-700">{s}</p>
                      ))}
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                    ⚠️ {wResult.note || 'ข้อมูลนี้เป็นแนวทางเบื้องต้นเท่านั้น ควรตรวจสอบสิทธิ์จริงกับหน่วยงานที่ระบุโดยตรง'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 1: Product Compare */}
          {tab === 1 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">เปรียบเทียบสินค้าอัจฉริยะ</h2>
              <p className="text-gray-500 text-sm mb-6">วางสเปคหรือลิงก์สินค้า 2 รายการ AI จะสรุปให้อ่านง่าย</p>

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
                    <div className="space-y-4">
                      <div className="bg-orange-50 rounded-xl p-5 text-sm text-gray-700">
                        <p className="font-semibold text-orange-800 mb-2">สรุป</p>
                        <p>{compareResult.summary}</p>
                      </div>
                      {compareResult.winner && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                          <p className="font-semibold text-green-800">สินค้าที่แนะนำ: {compareResult.winner.name}</p>
                          <p className="text-green-700 mt-1">{compareResult.winner.reason}</p>
                        </div>
                      )}
                      {compareResult.consumer_tips?.length > 0 && (
                        <div className="bg-amber-50 rounded-xl p-4">
                          <p className="text-xs font-semibold text-amber-800 mb-1">เคล็ดลับสำหรับผู้บริโภค</p>
                          {compareResult.consumer_tips.map((t, i) => (
                            <p key={i} className="text-xs text-amber-700">• {t}</p>
                          ))}
                        </div>
                      )}
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
              <p className="text-gray-500 text-sm mb-4">วางข้อความสัญญา AI จะสรุปจุดสำคัญที่ต้องระวัง</p>

              <PdpaNote />

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
                placeholder="วางข้อความสัญญา หรือข้อกำหนดที่ต้องการย่อย (ภาษาไทยหรืออังกฤษ, ขั้นต่ำ 50 ตัวอักษร)"
                rows={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />

              <button
                onClick={runContract}
                disabled={ctLoading || contractText.trim().length < 50}
                className="mt-4 w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-40"
              >
                {ctLoading ? 'กำลังประมวลผล…' : `ย่อยสัญญาเลย${contractText.trim().length > 0 && contractText.trim().length < 50 ? ` (ต้องการอีก ${50 - contractText.trim().length} ตัว)` : ''}`}
              </button>

              {contractResult && (
                <div className="mt-6 space-y-4">
                  {contractResult.error ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{contractResult.error}</div>
                  ) : (
                    <>
                      {/* Risk level badge */}
                      {contractResult.overall_risk_level && (
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
                          ${RISK_COLORS[contractResult.overall_risk_level] === 'red' ? 'bg-red-100 text-red-700' :
                            RISK_COLORS[contractResult.overall_risk_level] === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'}`}>
                          ⚠️ ความเสี่ยงรวม: {
                            contractResult.overall_risk_level === 'low' ? 'ต่ำ' :
                            contractResult.overall_risk_level === 'medium' ? 'ปานกลาง' :
                            contractResult.overall_risk_level === 'high' ? 'สูง' : 'วิกฤต'
                          }
                        </div>
                      )}

                      {/* Summary */}
                      <div className="bg-orange-50 rounded-xl p-5 text-sm text-gray-700">
                        <p className="font-semibold text-orange-800 mb-1">สรุปภาพรวม</p>
                        <p>{contractResult.summary}</p>
                      </div>

                      {/* Key obligations */}
                      {contractResult.key_obligations?.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">ข้อผูกพันสำคัญ</p>
                          {contractResult.key_obligations.map((ob, i) => (
                            <div key={i} className="text-xs text-gray-600 mb-2">
                              <span className="font-medium">{ob.party}:</span> {ob.obligation}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Risk clauses */}
                      {contractResult.risk_clauses?.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                          <p className="text-sm font-semibold text-red-700 mb-2">ข้อสัญญาที่ต้องระวัง</p>
                          {contractResult.risk_clauses.map((rc, i) => (
                            <div key={i} className="text-xs text-red-600 mb-1">
                              • {rc.description} ({rc.recommendation})
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Negotiation points */}
                      {contractResult.negotiation_points?.length > 0 && (
                        <div className="bg-blue-50 rounded-xl p-4">
                          <p className="text-xs font-semibold text-blue-800 mb-1">ประเด็นที่ควรเจรจาเพิ่ม</p>
                          {contractResult.negotiation_points.map((np, i) => (
                            <p key={i} className="text-xs text-blue-700">• {np}</p>
                          ))}
                        </div>
                      )}

                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
                        ⚖️ {contractResult.legal_disclaimer || 'การสรุปนี้เป็นเพียงแนวทางเบื้องต้น ไม่ใช่ความเห็นทางกฎหมาย ควรปรึกษาทนายความก่อนลงนามทุกกรณีที่สำคัญ'}
                      </div>
                    </>
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
    </AppShell>
  )
}
