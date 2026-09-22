import { useState, useEffect } from 'react'

const PRIVACY_VERSION = '1.0.0'
const STORAGE_KEY = 'openthai_consent_v' + PRIVACY_VERSION

const PURPOSES = [
  { id: 'analytics',   label: 'วิเคราะห์การใช้งาน',  desc: 'ช่วยให้เราปรับปรุงประสบการณ์การใช้งาน', required: false },
  { id: 'marketing',   label: 'ข่าวสารและโปรโมชัน',   desc: 'รับข่าวสาร ฟีเจอร์ใหม่ และโปรโมชัน',    required: false },
  { id: 'ai_training', label: 'ปรับปรุงโมเดล AI',      desc: 'ใช้ข้อมูลการใช้งานเพื่อพัฒนาโมเดล AI',  required: false },
]

function getStoredConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function storeConsent(consents) {
  const record = {
    version: PRIVACY_VERSION,
    timestamp: new Date().toISOString(),
    consents,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch { /* storage full — silent fail */ }
  return record
}

async function recordConsentToServer(consents) {
  try {
    await fetch('/api/consent/consumer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purposes: consents }),
    })
  } catch { /* offline — stored locally only */ }
}

export default function ConsentBanner() {
  const [show, setShow] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [choices, setChoices] = useState({ analytics: false, marketing: false, ai_training: false })

  useEffect(() => {
    const stored = getStoredConsent()
    if (!stored) setShow(true)
  }, [])

  const toggleChoice = id => setChoices(c => ({ ...c, [id]: !c[id] }))

  const acceptAll = async () => {
    const all = Object.fromEntries(PURPOSES.map(p => [p.id, true]))
    all.service = true
    storeConsent(all)
    await recordConsentToServer(all)
    setShow(false)
  }

  const acceptSelected = async () => {
    const final = { ...choices, service: true }
    storeConsent(final)
    await recordConsentToServer(final)
    setShow(false)
  }

  const rejectOptional = async () => {
    const minimal = { service: true, analytics: false, marketing: false, ai_training: false }
    storeConsent(minimal)
    await recordConsentToServer(minimal)
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* Compact view */}
        {!expanded && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                🍪 เราใช้คุกกี้และประมวลผลข้อมูลตาม{' '}
                <a href="/privacy" className="text-orange-500 hover:underline">นโยบายคุ้มครองข้อมูลส่วนบุคคล</a>{' '}
                (PDPA) คุณสามารถเลือกยินยอมแต่ละวัตถุประสงค์ได้
              </p>
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <button onClick={() => setExpanded(true)}
                className="text-xs text-gray-500 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition">
                ปรับแต่ง
              </button>
              <button onClick={rejectOptional}
                className="text-xs text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition">
                ยอมรับเฉพาะที่จำเป็น
              </button>
              <button onClick={acceptAll}
                className="text-xs bg-orange-500 text-white rounded-lg px-4 py-2 hover:bg-orange-600 transition font-medium">
                ยอมรับทั้งหมด
              </button>
            </div>
          </div>
        )}

        {/* Expanded view */}
        {expanded && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm">ตั้งค่าความเป็นส่วนตัว</h3>
              <button onClick={() => setExpanded(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>

            <div className="space-y-2 mb-4">
              {/* บริการหลัก — required */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" checked disabled
                  className="mt-0.5 w-4 h-4 accent-orange-500 cursor-not-allowed" />
                <div>
                  <p className="text-sm font-medium text-gray-700">บริการหลัก <span className="text-gray-400 text-xs">(จำเป็น)</span></p>
                  <p className="text-xs text-gray-500">ประมวลผลบนฐาน "สัญญา" — ปิดไม่ได้</p>
                </div>
              </div>

              {PURPOSES.map(p => (
                <label key={p.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input type="checkbox" checked={choices[p.id]}
                    onChange={() => toggleChoice(p.id)}
                    className="mt-0.5 w-4 h-4 accent-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{p.label}</p>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="text-xs text-gray-400 mb-3">
              คุณสามารถเปลี่ยนการตั้งค่าได้ที่{' '}
              <a href="/privacy" className="text-orange-500 hover:underline">ศูนย์ความเป็นส่วนตัว</a>{' '}
              หรือติดต่อ privacy@openthai-ai.com
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={rejectOptional}
                className="text-xs text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition">
                เฉพาะที่จำเป็น
              </button>
              <button onClick={acceptSelected}
                className="text-xs bg-orange-500 text-white rounded-lg px-4 py-2 hover:bg-orange-600 transition font-medium">
                บันทึกการตั้งค่า
              </button>
              <button onClick={acceptAll}
                className="text-xs bg-gray-800 text-white rounded-lg px-4 py-2 hover:bg-gray-700 transition font-medium">
                ยอมรับทั้งหมด
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Hook สำหรับ component อื่นใช้ตรวจว่ายินยอมแล้วหรือยัง
export function useConsent(purposeId) {
  const [granted, setGranted] = useState(false)
  useEffect(() => {
    const stored = getStoredConsent()
    setGranted(stored?.consents?.[purposeId] === true)
  }, [purposeId])
  return granted
}

// Utility: ล้าง consent เพื่อ test หรือ logout
export function clearConsent() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}
