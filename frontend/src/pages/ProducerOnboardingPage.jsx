import { useState } from 'react'

const CATEGORIES = [
  'อาหาร & เครื่องดื่ม', 'สมุนไพร & สุขภาพ', 'ความงาม & สกินแคร์',
  'เสื้อผ้า & แฟชั่น', 'อิเล็กทรอนิกส์', 'เกษตร & ออร์แกนิก',
  'ของใช้ในบ้าน', 'ของที่ระลึก & หัตถกรรม', 'อื่นๆ'
]

const STEPS = ['ข้อมูลบริษัท', 'ข้อมูลสินค้า', 'ช่องทางขาย', 'ยืนยัน']

export default function ProducerOnboardingPage() {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    // ข้อมูลบริษัท
    company_name: '', company_name_en: '', company_name_zh: '',
    contact_name: '', contact_phone: '', contact_email: '',
    province: '', website: '', line_id: '',
    // ข้อมูลสินค้า
    category: '', product_count: '', flagship_product: '',
    description_th: '', description_en: '', description_zh: '',
    min_order: '', price_range: '', has_certificate: false,
    // ช่องทางขาย
    sell_online: false, sell_offline: false, export_ready: false,
    target_market: [], social_channels: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/producers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) setSubmitted(true)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-700 mb-2">ลงทะเบียนสำเร็จ!</h2>
        <p className="text-gray-600 mb-2">ทีมงาน OpenThai.ai จะติดต่อกลับภายใน 24 ชั่วโมง</p>
        <p className="text-sm text-gray-400">เพื่อช่วยนำข้อมูลสินค้าของท่านเข้าสู่แพลตฟอร์ม</p>
        <div className="mt-6 p-4 bg-green-50 rounded-xl text-sm text-green-700">
          📱 LINE: <strong>@326gwipr</strong><br/>
          📧 {form.contact_email}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="text-4xl mb-2">🏭</div>
          <h1 className="text-3xl font-bold text-gray-800">ลงทะเบียนผู้ผลิต</h1>
          <p className="text-gray-500 mt-1">นำสินค้าของคุณเข้าสู่แพลตฟอร์ม AI Commerce ระดับนานาชาติ</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{i < step ? '✓' : i + 1}</div>
              {i < STEPS.length - 1 && <div className={`w-8 h-1 mx-1 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mb-6">{STEPS[step]}</p>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Step 0: ข้อมูลบริษัท */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-700 mb-4">🏢 ข้อมูลบริษัท / ผู้ผลิต</h3>
              <div className="grid grid-cols-1 gap-3">
                <input className="input" placeholder="ชื่อบริษัท / แบรนด์ (ภาษาไทย) *" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
                <input className="input" placeholder="Company Name (English)" value={form.company_name_en} onChange={e => set('company_name_en', e.target.value)} />
                <input className="input" placeholder="公司名称 (中文)" value={form.company_name_zh} onChange={e => set('company_name_zh', e.target.value)} />
                <input className="input" placeholder="ชื่อผู้ติดต่อ *" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
                <input className="input" placeholder="เบอร์โทรศัพท์ *" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                <input className="input" type="email" placeholder="อีเมล *" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
                <input className="input" placeholder="จังหวัด" value={form.province} onChange={e => set('province', e.target.value)} />
                <input className="input" placeholder="Website (ถ้ามี)" value={form.website} onChange={e => set('website', e.target.value)} />
                <input className="input" placeholder="LINE ID (ถ้ามี)" value={form.line_id} onChange={e => set('line_id', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 1: ข้อมูลสินค้า */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-700 mb-4">📦 ข้อมูลสินค้า</h3>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">-- เลือกหมวดหมู่สินค้า *</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className="input" placeholder="จำนวนสินค้าทั้งหมด (โดยประมาณ)" value={form.product_count} onChange={e => set('product_count', e.target.value)} />
              <input className="input" placeholder="สินค้าเด่น / Flagship Product *" value={form.flagship_product} onChange={e => set('flagship_product', e.target.value)} />
              <textarea className="input h-24 resize-none" placeholder="คำอธิบายสินค้าโดยรวม (ภาษาไทย) *" value={form.description_th} onChange={e => set('description_th', e.target.value)} />
              <textarea className="input h-20 resize-none" placeholder="Product Description (English)" value={form.description_en} onChange={e => set('description_en', e.target.value)} />
              <textarea className="input h-20 resize-none" placeholder="产品描述 (中文)" value={form.description_zh} onChange={e => set('description_zh', e.target.value)} />
              <input className="input" placeholder="Minimum Order (MOQ) เช่น 10 ชิ้น / 500 บาท" value={form.min_order} onChange={e => set('min_order', e.target.value)} />
              <input className="input" placeholder="ช่วงราคา เช่น 50-500 บาท" value={form.price_range} onChange={e => set('price_range', e.target.value)} />
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.has_certificate} onChange={e => set('has_certificate', e.target.checked)} className="w-4 h-4" />
                มีใบรับรองมาตรฐาน (อย., GMP, Halal, ฯลฯ)
              </label>
            </div>
          )}

          {/* Step 2: ช่องทางขาย */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-700 mb-4">🌐 ช่องทางและตลาด</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.sell_online} onChange={e => set('sell_online', e.target.checked)} className="w-4 h-4" />
                  <span>ขายออนไลน์อยู่แล้ว (Shopee / Lazada / TikTok Shop)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.sell_offline} onChange={e => set('sell_offline', e.target.checked)} className="w-4 h-4" />
                  <span>ขายหน้าร้าน / ออฟไลน์</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.export_ready} onChange={e => set('export_ready', e.target.checked)} className="w-4 h-4" />
                  <span>พร้อมส่งออกต่างประเทศ (จีน / ASEAN)</span>
                </label>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">ตลาดเป้าหมาย (เลือกได้หลายข้อ)</p>
                {['ไทย', 'จีน', 'ASEAN', 'ยุโรป', 'อเมริกา', 'ตะวันออกกลาง'].map(m => (
                  <label key={m} className="inline-flex items-center gap-1 mr-4 text-sm cursor-pointer">
                    <input type="checkbox"
                      checked={form.target_market.includes(m)}
                      onChange={e => set('target_market', e.target.checked
                        ? [...form.target_market, m]
                        : form.target_market.filter(x => x !== m)
                      )} className="w-3 h-3" />
                    {m}
                  </label>
                ))}
              </div>
              <input className="input" placeholder="Social Media ที่ใช้ เช่น FB, IG, TikTok, YouTube" value={form.social_channels} onChange={e => set('social_channels', e.target.value)} />
            </div>
          )}

          {/* Step 3: ยืนยัน */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-700 mb-4">✅ ตรวจสอบข้อมูล</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div><span className="text-gray-500">บริษัท:</span> <strong>{form.company_name}</strong> {form.company_name_en && `/ ${form.company_name_en}`}</div>
                <div><span className="text-gray-500">ผู้ติดต่อ:</span> {form.contact_name} | {form.contact_phone}</div>
                <div><span className="text-gray-500">อีเมล:</span> {form.contact_email}</div>
                <div><span className="text-gray-500">หมวดหมู่:</span> {form.category}</div>
                <div><span className="text-gray-500">สินค้าเด่น:</span> {form.flagship_product}</div>
                <div><span className="text-gray-500">ตลาดเป้าหมาย:</span> {form.target_market.join(', ') || '-'}</div>
                <div><span className="text-gray-500">ส่งออก:</span> {form.export_ready ? '✅ พร้อม' : 'ยังไม่พร้อม'}</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                <strong>ขั้นตอนต่อไป:</strong> ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง เพื่อช่วยนำเข้าข้อมูลสินค้าทั้งหมด พร้อมแปลเป็น 3 ภาษา (ไทย / จีน / อังกฤษ) โดยไม่มีค่าใช้จ่ายเพิ่มเติม
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-30 hover:bg-gray-50 transition"
            >← ก่อนหน้า</button>
            {step < 3
              ? <button onClick={() => setStep(s => s + 1)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                  ถัดไป →
                </button>
              : <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-60">
                  {loading ? 'กำลังส่ง...' : '✅ ยืนยันลงทะเบียน'}
                </button>
            }
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          OpenThai.ai © 2026 | ข้อมูลของท่านปลอดภัยตาม PDPA
        </p>
      </div>

      <style>{`
        .input { width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 14px; outline: none; transition: border 0.2s; }
        .input:focus { border-color: #3b82f6; }
      `}</style>
    </div>
  )
}
