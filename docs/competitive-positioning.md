# OpenThaiAI — Competitive Positioning
**จัดทำโดย:** tech-scout + chief-of-staff | **อัปเดต:** 23 ส.ค. 2569
**สถานะ:** ใช้งานภายในและสำหรับ Media/Investor briefing

---

## คำถามที่จะถูกถามแน่นอน: "คุณต่างจาก Typhoon / WangchanBERTa / NECTEC อย่างไร?"

---

## 1. แผนที่ผู้เล่นในตลาด AI ภาษาไทย

| โครงการ | เจ้าของ | จุดแข็ง | จุดอ่อน / ช่องว่าง |
|---|---|---|---|
| **Typhoon** | SCB 10X | ทุนสูง อยู่ใน ecosystem ธนาคาร | ผูกกับ SCB / ไม่ Open Source เต็มรูปแบบ |
| **WangchanBERTa** | VISTEC + NECTEC | งานวิชาการชั้นนำ benchmarks แน่น | เน้นวิจัย ไม่ได้ focus deployment เชิงพาณิชย์ |
| **OpenThai (NECTEC)** | รัฐ/NECTEC | ทรัพยากรรัฐ corpus ภาษาไทยดี | เดินช้า bureaucratic ไม่ได้ serve SME โดยตรง |
| **Pathumma / iApp** | เอกชน | production-ready บางส่วน | เน้น enterprise ไม่ใช่ Open Source สำหรับทุกคน |
| **OpenThaiAI** | AIEAT + AIAT + ชุมชน | **ดูข้อ 2** | ยังไม่มี benchmark สาธารณะ (กำลังสร้าง) |

---

## 2. จุดต่างของ OpenThaiAI (Differentiation Matrix)

| มิติ | คู่แข่ง | OpenThaiAI |
|---|---|---|
| **เจ้าของ** | บริษัทเดียว / รัฐ | ชุมชน (AIEAT + AIAT + ภาคี) — ไม่มีใครผูกขาด |
| **License** | ปิด หรือ academic-only | Open Source — ใช้ได้เชิงพาณิชย์ |
| **Deployment** | Cloud เท่านั้น | On-Premise / Air-gapped รองรับ PDPA |
| **กลุ่มเป้าหมาย** | Enterprise / งานวิชาการ | 6 กลุ่มห่วงโซ่มูลค่า รวมเกษตรกรและ SME |
| **Tokenizer** | Generic multilingual | Custom Thai Tokenizer (อยู่ระหว่างวัด) |
| **Value Chain** | ขาย API หรือโมเดล | สร้างสะพาน ผู้ผลิต → คนกลาง → ผู้บริโภค |
| **Business model** | Subscription / license fee | Open core + On-Premise service + community |

---

## 3. เรื่องราวที่แข็งที่สุด (สำหรับ Media Pitch)

> "ขณะที่ Typhoon รับใช้ธนาคาร และ NECTEC รับใช้นักวิจัย  
> OpenThaiAI สร้างมาเพื่อเกษตรกร ช่างซ่อม พ่อค้า และทนายความที่อยู่ตามหัวเมือง  
> เป็นครั้งแรกที่ AI ภาษาไทยระดับสูงสุดเปิดให้ทุกคนใช้ได้ฟรี ตรวจสอบได้ และต่อยอดได้เอง"

---

## 4. คำตอบสำนักพิมพ์/สื่อ (Media Q&A)

**Q: เอา LLaMA หรือ Mistral มา fine-tune ไม่ใช่หรือ? ต่างอะไร?**
A: ใช่ เราใช้ base model ที่ดีที่สุดที่มีอยู่ แต่ความแตกต่างอยู่ที่ (1) Thai Tokenizer ที่ลดต้นทุนการใช้งาน (2) ข้อมูล Thai corpus ที่ถูกกฎหมายและทำความสะอาดแล้ว (3) Guardrails ที่เข้าใจบริบทไทย กฎหมายไทย วัฒนธรรมไทย (4) deployment ที่ไม่ต้องส่งข้อมูลออกนอกประเทศ

**Q: Typhoon ทำได้แล้ว ทำไมต้องมี OpenThaiAI อีก?**
A: Typhoon เป็นของ SCB — เกษตรกรในจังหวัดอุดรธานีไม่ได้ต้องการ AI ของธนาคาร เขาต้องการ AI ที่เป็นของตัวเอง รันบนเครื่องตัวเองได้ และไม่มีใครเป็นเจ้าของ

**Q: ตัวเลข benchmark ที่อ้างในหนังสือมาจากไหน?**
A: ตัวเลขในหนังสือฉบับปัจจุบันเป็นประมาณการจากการใช้งานนำร่อง Thai Eval Suite สาธารณะกำลังอยู่ระหว่างจัดทำและจะเผยแพร่เมื่อตรวจสอบครบถ้วน (ไม่มีการอ้างตัวเลขที่ไม่มีที่มาในสื่อสาธารณะ)

---

## 5. ตำแหน่งที่ไม่ควรแข่ง (Avoid Fighting Here)

- ❌ แข่งด้าน benchmark ดิบกับ Typhoon หรือ GPT-4 — ยังสู้ไม่ได้ในระยะนี้
- ❌ อ้างว่า "ดีที่สุดในโลก" หรือ "แม่นที่สุด" โดยไม่มีหลักฐาน
- ✅ แข่งด้าน **ความเป็นเจ้าของ / อธิปไตย / ต้นทุนระยะยาว / On-Premise**
- ✅ แข่งด้าน **ชุมชน / ecosystem / value chain** ที่คนอื่นไม่สร้าง

---

## 6. สรุปในหนึ่งบรรทัด (Elevator Pitch)

> "OpenThaiAI คือ AI โครงสร้างพื้นฐานที่คนไทยเป็นเจ้าของร่วมกัน — เหมือนถนน ไม่ใช่เหมือนรถยนต์แบรนด์ใดแบรนด์หนึ่ง"

---

## 7. ช่องว่างที่พิสูจน์จากประสบการณ์จริง — Thai Payment Barrier

> หลักฐานนี้มาจากประสบการณ์ตรงของผู้ก่อตั้งในการพยายามอัพเกรด claude.ai
> รายละเอียดเต็มอยู่ใน `docs/why-openthai-ai.md`

คนไทยที่ต้องการใช้ AI ระดับโลก (Claude / GPT / Gemini) ต้องผ่านจุดล้มเหลว 7 จุด:
`Mobile → Internet → Thai ISP/DNS → claude.ai → Stripe → Thai BIN blocked → ธนาคารไทย`

**นี่คือ competitive advantage ที่ไม่มีผู้เล่นรายใดในตาราง section 1 แก้ได้:**

| ผู้เล่น | แก้ปัญหา Thai Payment ได้หรือไม่ |
|---|---|
| Claude / GPT / Gemini | ❌ Thai BIN blocked, USD card required |
| Typhoon (SCB 10X) | ⚠️ ชำระผ่านธนาคาร SCB ได้ แต่ผูกกับ ecosystem เดียว |
| WangchanBERTa / NECTEC | ❌ ไม่มีบริการ commercial ที่ชำระเงินได้ |
| **OpenThaiAI** | ✅ PromptPay / QR / บาท / ไม่มี BIN issue |

**เพิ่มใน Differentiation Matrix (section 2):**

| มิติ | คู่แข่ง | OpenThaiAI |
|---|---|---|
| **การชำระเงิน** | USD/บัตรเครดิต Visa/Mastercard ต่างประเทศ | PromptPay / QR Code / บัตรเดบิตไทยทุกธนาคาร |
| **ต้นทุนโทเคน** | ภาษาไทยกินโทเคน 3-5x ของภาษาอังกฤษ | Custom Thai Tokenizer ลดต้นทุนต่อคำ |

---

## 8. สื่อไทยกำลังเซต Expectation ของผู้ใช้

สื่อเศรษฐกิจไทย (Thairath Money, ส.ค. 2569) เริ่มเปรียบเทียบ AI tools เป็นภาษาไทย
พบตารางเปรียบเทียบ **Claude Cowork vs Gemini CLI** ที่เผยแพร่กว้างขวาง

**ข้อสังเกต:** ตารางนั้นยังไม่มีตัวเลือกที่เป็นของไทยเลย — OpenThaiAI ต้องเข้าไปอยู่ในตารางนั้นในรอบถัดไป

**Action:** `growth-community` ควรทำ comparison page ไทย ๆ ที่วาง OpenThaiAI เทียบกับ Claude/Gemini
พร้อม call-to-action "ชำระเป็นบาท ใช้ได้เลย ไม่ต้องบัตรต่างประเทศ"
