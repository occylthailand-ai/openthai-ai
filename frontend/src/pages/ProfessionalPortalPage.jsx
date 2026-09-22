import { useState } from 'react'

const TRACKS = {
  legal: {
    label: 'ทนายความ / นิติกร',
    icon: '🏛️',
    color: '#1a4f9d',
    tools: [
      { id: 'precedent', label: 'ค้นหา Precedent / Case Summary', icon: '🔍', placeholder: 'เช่น "คดีละเมิดสัญญาจ้าง" หรือ "มาตรา 420 ป.พ.พ."' },
      { id: 'draft', label: 'ร่างเอกสาร / สัญญา', icon: '📝', placeholder: 'เช่น "สัญญาเช่า 1 ปี ระหว่างบุคคลธรรมดา"' },
      { id: 'summarize', label: 'สรุปเอกสารยาว (คำฟ้อง/คำร้อง)', icon: '📄', placeholder: 'วางข้อความเอกสารที่ต้องการสรุป...' },
      { id: 'law', label: 'ค้นประกาศ/กฎกระทรวง/พ.ร.บ.', icon: '⚖️', placeholder: 'เช่น "พ.ร.บ. คุ้มครองแรงงาน ล่าสุด"' },
    ],
    canDo: [
      'ค้นหา precedent และ case summary',
      'ร่างหนังสือ/สัญญา draft เบื้องต้น',
      'สรุปเอกสารยาว (คำฟ้อง, คำร้อง)',
      'แปล/ย่อกฎหมายเป็นภาษาที่เข้าใจง่าย',
      'ค้นหาประกาศ/กฎกระทรวงล่าสุด',
    ],
    cannotDo: [
      'ให้ความเห็นทางกฎหมายแทนทนาย',
      'ลงนามเอกสารกฎหมายใด ๆ',
      'ตัดสินชี้ขาดข้อพิพาท',
      'เป็นที่ปรึกษาเดี่ยว (ต้องมีทนายตรวจ)',
    ],
    disclaimer: 'ข้อมูลนี้จัดทำโดย AI เพื่อช่วยเหลือทนายความ ไม่ใช่คำแนะนำทางกฎหมายอย่างเป็นทางการ กรุณาตรวจสอบโดยทนายความผู้มีใบอนุญาตก่อนดำเนินการ',
  },
  medical: {
    label: 'แพทย์ / พยาบาล / เภสัชกร',
    icon: '🏥',
    color: '#1a7d4f',
    tools: [
      { id: 'research', label: 'สรุปงานวิจัย / Systematic Review', icon: '🔬', placeholder: 'เช่น "meta-analysis เรื่องยา metformin กับ PCOS"' },
      { id: 'drug', label: 'ค้นข้อมูลยาอันตรกิริยา', icon: '💊', placeholder: 'เช่น "Warfarin ร่วมกับ Aspirin"' },
      { id: 'patient', label: 'เตรียม Patient Education Materials', icon: '📋', placeholder: 'เช่น "คำแนะนำผู้ป่วยเบาหวานชนิดที่ 2 ภาษาไทยง่าย ๆ"' },
      { id: 'discharge', label: 'ร่าง Discharge Summary', icon: '📑', placeholder: 'กรอกข้อมูลผู้ป่วย (ไม่ระบุชื่อจริง) เพื่อสร้าง template...' },
    ],
    canDo: [
      'สรุปงานวิจัย/systematic review เป็นภาษาไทย',
      'ค้นข้อมูลยาอันตรกิริยา (Drug Interaction)',
      'เตรียม patient education materials',
      'สรุป CPG (Clinical Practice Guideline)',
      'ช่วยเขียน Discharge Summary draft',
    ],
    cannotDo: [
      'วินิจฉัยโรค',
      'สั่งจ่ายยา',
      'แทนที่การประเมินทางคลินิก',
      'ตีความผล lab/imaging',
      'ลงนาม Medical Certificate',
    ],
    disclaimer: 'ข้อมูลนี้จัดทำโดย AI เพื่อช่วยเหลือบุคลากรทางการแพทย์ ไม่ใช่คำแนะนำทางการแพทย์อย่างเป็นทางการ กรุณาตรวจสอบโดยแพทย์ผู้มีใบอนุญาตก่อนดำเนินการ',
  },
  accounting: {
    label: 'นักบัญชี / ผู้สอบบัญชี (CPA)',
    icon: '📊',
    color: '#7d4f1a',
    tools: [
      { id: 'verify', label: 'ตรวจสอบความสมเหตุสมผลรายการบัญชี', icon: '✅', placeholder: 'เช่น "ค่าใช้จ่ายประเภทนี้ตั้งเป็น asset หรือ expense ?"' },
      { id: 'tax', label: 'คำนวณ/ตรวจภาษีเบื้องต้น', icon: '🧮', placeholder: 'เช่น "ค่าเสื่อมราคาคอมพิวเตอร์ 50,000 บาท อายุการใช้งาน 3 ปี"' },
      { id: 'tfrs', label: 'ค้นประกาศ กรมสรรพากร / มาตรฐาน TFRS', icon: '📖', placeholder: 'เช่น "TFRS 16 การบัญชีสัญญาเช่า"' },
      { id: 'ratio', label: 'วิเคราะห์ Variance / Ratio เบื้องต้น', icon: '📈', placeholder: 'เช่น "รายได้ Q3 ต่ำกว่าเป้า 15% สาเหตุที่เป็นไปได้คืออะไร"' },
    ],
    canDo: [
      'ตรวจสอบความสมเหตุสมผลรายการบัญชี',
      'คำนวณภาษีเบื้องต้น + ตรวจคำนวณ',
      'สรุปงบการเงินภาษาง่าย',
      'ค้นหาประกาศกรมสรรพากร/มาตรฐาน TFRS',
      'วิเคราะห์ variance/ratio เบื้องต้น',
    ],
    cannotDo: [
      'ลงนามรับรองงบการเงิน',
      'ยื่นแบบภาษีแทนผู้เสียภาษี',
      'ออกความเห็น Audit อย่างเป็นทางการ',
      'ให้คำแนะนำภาษีโดยไม่มีนักบัญชีตรวจ',
      'รับรองเอกสารทางการเงินใด ๆ',
    ],
    disclaimer: 'ข้อมูลนี้จัดทำโดย AI เพื่อช่วยเหลือนักบัญชี ไม่ใช่คำแนะนำทางการบัญชีหรือภาษีอย่างเป็นทางการ กรุณาตรวจสอบโดยนักบัญชีผู้มีใบอนุญาตก่อนดำเนินการ',
  },
}

const MOCK_RESPONSES = {
  legal: {
    precedent: `**ผลการค้นหา Precedent (ตัวอย่าง — ต้องตรวจสอบจากฐานข้อมูลกฎหมายจริง)**\n\n**คำพิพากษาที่เกี่ยวข้อง:**\n• ฎีกาที่ XXXX/XXXX — ประเด็น: [ต้องใส่ฐานข้อมูลจริง]\n• ฎีกาที่ XXXX/XXXX — ประเด็น: [ต้องใส่ฐานข้อมูลจริง]\n\n⚠️ ระบบนี้ยังไม่มีฐานข้อมูลฎีกาจริง — กรุณาค้นจาก deka.supremecourt.or.th`,
    draft: `**ร่างเอกสารเบื้องต้น (Draft — ต้องให้ทนายตรวจก่อนใช้)**\n\nสัญญาฉบับนี้ทำขึ้น ณ วันที่ ____\nระหว่าง [ชื่อผู้เช่า] และ [ชื่อผู้ให้เช่า]\n\n**ข้อ 1. วัตถุประสงค์:** ...\n**ข้อ 2. ระยะเวลา:** ...\n\n⚠️ นี่คือ draft template เท่านั้น ต้องให้ทนายความตรวจสอบและปรับแก้ก่อนลงนาม`,
  },
  medical: {
    drug: `**ข้อมูลอันตรกิริยาเบื้องต้น (ต้องตรวจสอบจาก clinical database จริง)**\n\n**คู่ยาที่ค้นหา:** [รายการยา]\n\n**ระดับความรุนแรง:** ต้องระบุจากแหล่งข้อมูล เช่น Drugs.com หรือ Thai FDA\n\n⚠️ ข้อมูลนี้เพื่อการศึกษาเท่านั้น กรุณาตรวจสอบกับฐานข้อมูล drug interaction จริงก่อนใช้กับผู้ป่วย`,
    patient: `**Patient Education Material Draft**\n\n**หัวข้อ:** [หัวข้อที่ระบุ]\n\n**ภาษาที่เข้าใจง่าย:**\n• จุดที่ 1: ...\n• จุดที่ 2: ...\n• จุดที่ 3: ...\n\n**สิ่งที่ต้องทำ / หลีกเลี่ยง:**\n✅ ...\n❌ ...\n\n⚠️ Draft นี้ต้องให้แพทย์/เภสัชกรตรวจก่อนแจกให้ผู้ป่วย`,
  },
  accounting: {
    tax: `**การคำนวณค่าเสื่อมราคาเบื้องต้น**\n\n**วิธีเส้นตรง (Straight-Line):**\n• มูลค่าต้นทุน: [X] บาท\n• อายุการใช้งาน: [Y] ปี\n• ค่าเสื่อมต่อปี: [X/Y] บาท\n\n**ตามประมวลรัษฎากร:** สินทรัพย์ประเภทนี้ใช้อัตรา [X%] ตามพระราชกฤษฎีกา\n\n⚠️ ต้องตรวจสอบกับประมวลรัษฎากรฉบับล่าสุดและให้นักบัญชียืนยัน`,
    tfrs: `**มาตรฐานการบัญชีที่เกี่ยวข้อง (ต้องตรวจสอบกับ FAP จริง)**\n\n**TFRS [หมายเลข]:** [ชื่อมาตรฐาน]\n\n**สาระสำคัญ:**\n• ...\n\n**ผลกระทบต่อองค์กร:**\n• ...\n\n⚠️ กรุณาดาวน์โหลดมาตรฐานฉบับล่าสุดจาก fap.or.th`,
  },
}

export default function ProfessionalPortalPage() {
  const [activeTrack, setActiveTrack] = useState(null)
  const [activeTool, setActiveTool] = useState(null)
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showGuardrails, setShowGuardrails] = useState(false)

  const track = activeTrack ? TRACKS[activeTrack] : null

  function handleRun() {
    if (!inputText.trim()) return
    setIsLoading(true)
    setResult(null)
    setTimeout(() => {
      const mockKey = Object.keys(MOCK_RESPONSES[activeTrack] || {})[0]
      const mockResult = MOCK_RESPONSES[activeTrack]?.[activeTool]
        || MOCK_RESPONSES[activeTrack]?.[mockKey]
        || `**ผลลัพธ์สำหรับ:** ${inputText}\n\n[ระบบ AI กำลังพัฒนา — ต้องเชื่อมต่อ Thai LLM จริงก่อนใช้งาน]\n\n⚠️ กรุณาตรวจสอบโดยผู้เชี่ยวชาญก่อนดำเนินการ`
      setResult(mockResult)
      setIsLoading(false)
    }, 1200)
  }

  function resetTool() {
    setActiveTool(null)
    setInputText('')
    setResult(null)
  }

  function resetTrack() {
    setActiveTrack(null)
    resetTool()
  }

  if (!activeTrack) {
    return (
      <div className="professional-portal">
        <div className="portal-header">
          <h1>🎓 Professional Portal</h1>
          <p className="subtitle">เครื่องมือ AI สำหรับผู้ประกอบวิชาชีพ — ออกแบบตามกรอบกฎหมายของสภาวิชาชีพ</p>
          <div className="on-premise-badge">
            🔒 On-Premise Required — ข้อมูลไม่ออกนอกองค์กร
          </div>
        </div>

        <div className="track-grid">
          {Object.entries(TRACKS).map(([key, t]) => (
            <button
              key={key}
              className="track-card"
              style={{ '--track-color': t.color }}
              onClick={() => setActiveTrack(key)}
            >
              <span className="track-icon">{t.icon}</span>
              <span className="track-label">{t.label}</span>
              <span className="track-count">{t.tools.length} เครื่องมือ</span>
            </button>
          ))}
        </div>

        <div className="portal-footer-note">
          <p>⚠️ เครื่องมือเหล่านี้ช่วยเสริมการทำงาน ไม่ใช่ทดแทนดุลยพินิจของผู้เชี่ยวชาญ</p>
          <p>ทุก output ต้องผ่านการตรวจสอบโดยผู้ที่มีใบอนุญาตประกอบวิชาชีพก่อนดำเนินการ</p>
        </div>
      </div>
    )
  }

  return (
    <div className="professional-portal">
      <div className="portal-header" style={{ '--track-color': track.color }}>
        <button className="back-btn" onClick={resetTrack}>← กลับ</button>
        <h1>{track.icon} {track.label}</h1>
        <div className="on-premise-badge">🔒 On-Premise Mode</div>
      </div>

      <div className="portal-body">
        {!activeTool ? (
          <>
            <div className="tool-grid">
              {track.tools.map(tool => (
                <button
                  key={tool.id}
                  className="tool-card"
                  onClick={() => setActiveTool(tool.id)}
                >
                  <span className="tool-icon">{tool.icon}</span>
                  <span className="tool-label">{tool.label}</span>
                </button>
              ))}
            </div>

            <div className="capabilities-grid">
              <div className="can-do">
                <h3>✅ ทำได้</h3>
                <ul>
                  {track.canDo.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div className="cannot-do">
                <h3>❌ ทำไม่ได้</h3>
                <ul>
                  {track.cannotDo.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            </div>

            <button
              className="guardrails-toggle"
              onClick={() => setShowGuardrails(!showGuardrails)}
            >
              {showGuardrails ? '▲' : '▼'} ดู Guardrails ของระบบ
            </button>
            {showGuardrails && (
              <div className="guardrails-box">
                <p>INPUT → [Content Filter] → [Domain Check] → ตรวจว่า "advice territory" หรือไม่</p>
                <p>→ ถ้าใช่: เพิ่ม Disclaimer + แนะนำปรึกษาผู้เชี่ยวชาญ</p>
                <p>OUTPUT → [PII Scrub] → [Hallucination Flag] → [Legal Disclaimer Footer] → ผู้ใช้</p>
              </div>
            )}
          </>
        ) : (
          <div className="tool-workspace">
            <div className="tool-header">
              <button className="back-btn" onClick={resetTool}>← กลับ</button>
              <h2>
                {track.tools.find(t => t.id === activeTool)?.icon}{' '}
                {track.tools.find(t => t.id === activeTool)?.label}
              </h2>
            </div>

            <textarea
              className="tool-input"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={track.tools.find(t => t.id === activeTool)?.placeholder}
              rows={5}
            />

            <button
              className="run-btn"
              onClick={handleRun}
              disabled={isLoading || !inputText.trim()}
              style={{ backgroundColor: track.color }}
            >
              {isLoading ? '⏳ กำลังประมวลผล...' : '▶ ประมวลผล'}
            </button>

            {result && (
              <div className="result-box">
                <div className="result-content">
                  {result.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <h4 key={i}>{line.replace(/\*\*/g, '')}</h4>
                    }
                    if (line.startsWith('• ')) {
                      return <p key={i} className="bullet">{line}</p>
                    }
                    if (line.startsWith('⚠️')) {
                      return <p key={i} className="warning">{line}</p>
                    }
                    return line ? <p key={i}>{line}</p> : <br key={i} />
                  })}
                </div>
                <div className="disclaimer-footer">
                  <strong>⚠️ คำเตือนสำคัญ:</strong> {track.disclaimer}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .professional-portal {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Noto Sans Thai', sans-serif;
        }
        .portal-header {
          background: linear-gradient(135deg, var(--track-color, #1a4f9d) 0%, #0a2550 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          position: relative;
        }
        .portal-header h1 { margin: 0 0 8px; font-size: 1.6rem; }
        .subtitle { margin: 0 0 12px; opacity: 0.9; }
        .on-premise-badge {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.4);
          padding: 4px 12px;
          border-radius: 20px;
          display: inline-block;
          font-size: 0.85rem;
        }
        .back-btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.4);
          color: white;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          margin-bottom: 12px;
        }
        .track-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .track-card {
          background: white;
          border: 2px solid var(--track-color);
          border-radius: 12px;
          padding: 24px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .track-card:hover {
          background: var(--track-color);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .track-icon { font-size: 2.5rem; }
        .track-label { font-size: 1rem; font-weight: 600; text-align: center; }
        .track-count { font-size: 0.8rem; opacity: 0.7; }
        .tool-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .tool-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.15s;
          text-align: left;
        }
        .tool-card:hover {
          border-color: var(--track-color, #1a4f9d);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .tool-icon { font-size: 1.4rem; }
        .tool-label { font-size: 0.9rem; font-weight: 500; line-height: 1.3; }
        .capabilities-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .can-do, .cannot-do {
          background: white;
          border-radius: 8px;
          padding: 16px;
        }
        .can-do { border: 1px solid #c3e6cb; }
        .cannot-do { border: 1px solid #f5c6cb; }
        .can-do h3, .cannot-do h3 { margin: 0 0 12px; font-size: 0.95rem; }
        .can-do ul, .cannot-do ul { margin: 0; padding-left: 16px; }
        .can-do li { color: #155724; margin-bottom: 4px; font-size: 0.85rem; }
        .cannot-do li { color: #721c24; margin-bottom: 4px; font-size: 0.85rem; }
        .guardrails-toggle {
          background: none;
          border: 1px solid #ccc;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          color: #666;
        }
        .guardrails-box {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 16px;
          margin-top: 8px;
          font-size: 0.85rem;
          font-family: monospace;
          line-height: 1.8;
        }
        .portal-footer-note {
          text-align: center;
          color: #666;
          font-size: 0.85rem;
          margin-top: 24px;
          border-top: 1px solid #eee;
          padding-top: 16px;
        }
        .tool-workspace { background: white; border-radius: 12px; padding: 24px; }
        .tool-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .tool-header h2 { margin: 0; font-size: 1.2rem; }
        .tool-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 0.95rem;
          font-family: 'Noto Sans Thai', sans-serif;
          resize: vertical;
          box-sizing: border-box;
        }
        .run-btn {
          margin-top: 12px;
          padding: 10px 24px;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          font-family: 'Noto Sans Thai', sans-serif;
        }
        .run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .result-box {
          margin-top: 20px;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          overflow: hidden;
        }
        .result-content { padding: 20px; line-height: 1.7; }
        .result-content h4 { color: #333; margin: 12px 0 4px; }
        .result-content .bullet { margin: 4px 0; }
        .result-content .warning { color: #856404; background: #fff3cd; padding: 8px; border-radius: 4px; margin: 8px 0; }
        .disclaimer-footer {
          background: #fff3cd;
          border-top: 1px solid #ffc107;
          padding: 12px 20px;
          font-size: 0.85rem;
          color: #533f03;
        }
        @media (max-width: 600px) {
          .capabilities-grid { grid-template-columns: 1fr; }
          .track-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
