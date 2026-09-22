# Thai Language Model Development Roadmap — M0 → M3

> สร้างโดย: ai-ml-engineer | วันที่: 8 กันยายน 2569 | Wave 5 งาน 5.4

---

## วิสัยทัศน์

สร้าง **Thai LLM Open Source** ที่:
- คนไทยเป็นเจ้าของ อ้างอิง ตรวจสอบ และต่อยอดได้เอง
- รองรับ On-Premise deployment บน hardware ระดับ SME
- ผ่านเกณฑ์ PDPA + ไม่ hallucinate ข้อมูลสำคัญ (กฎหมาย/สุขภาพ/ภาษี)
- เป็น Open Weight ที่ community พัฒนาต่อได้

---

## Milestone ต่อ Phase

### M0 — ปัจจุบัน → ต.ค. 2569: เลือกฐาน + ทดสอบ Tokenizer

**เป้าหมาย:** ตัดสินใจว่าจะใช้ base model อะไร + ทดสอบ Thai tokenization

**งานที่ต้องทำ:**
- [ ] ทดสอบ Thai tokenization efficiency: Llama 3.1 vs Qwen2.5 vs SeaLLM vs Typhoon
  - วัด: tokens per Thai word, ความสมบูรณ์ของ Thai Unicode block
- [ ] เลือก base model หลัก 1 ตัว (ดูตาราง Candidate เปรียบเทียบด้านล่าง)
- [ ] ตั้ง local inference environment สำหรับทดสอบ (ollama / llama.cpp)
- [ ] สร้าง Thai tokenizer benchmark dataset เบื้องต้น (100 ประโยคตัวอย่าง)

**Definition of Done M0:**
- มีผล tokenization comparison เป็นตัวเลข (tokens/word per model)
- เลือก base model ได้ 1 ตัวพร้อมเหตุผล

---

### M1 — พ.ย.–ธ.ค. 2569: Thai Corpus + Eval Baseline

**เป้าหมาย:** รวบรวม Thai corpus 1B tokens จากแหล่งถูกกฎหมาย + สร้าง eval baseline

**งานที่ต้องทำ:**
- [ ] รวบรวม Thai corpus จากแหล่งเปิด:
  - Wikipedia ภาษาไทย (~200M tokens ประมาณการ — ต้องวัดจริง)
  - CommonCrawl (ส่วนภาษาไทย — ต้องกรอง quality)
  - ข้อมูลราชการ open data (พระราชกฤษฎีกา, ประกาศราชกิจจา)
  - ยังไม่ระบุแหล่งอื่น — รอ legal check และสำรวจเพิ่ม
- [ ] สร้าง Thai-bench eval suite 100 ข้อ (5 มิติ ดูด้านล่าง)
- [ ] รัน baseline eval บน base model ก่อน fine-tune เพื่อมี reference point
- [ ] Data cleaning pipeline: dedup, quality filter, PII scrub

**Definition of Done M1:**
- corpus ≥ 500M tokens สะอาด (ยังไม่ถึง 1B ก็ยังดีถ้าคุณภาพสูง)
- eval suite 100 ข้อ พร้อมใช้งาน
- baseline score บันทึกไว้ครบทุกมิติ

---

### M2 — ม.ค.–มี.ค. 2570: Fine-tune QLoRA + Thai-bench

**เป้าหมาย:** Fine-tune บน Thai data ด้วย QLoRA + วัดผลด้วย Thai-bench

**งานที่ต้องทำ:**
- [ ] Fine-tune QLoRA 4-bit บน Thai corpus + instruction data
  - ใช้ `unsloth` หรือ `axolotl` framework (เลือกตามทรัพยากรที่มี)
  - ขนาดโมเดล: 7B ก่อน (compute-efficient ที่สุด ณ ปัจจุบัน)
- [ ] สร้าง Thai instruction dataset สำหรับ SFT:
  - 5,000 ตัวอย่าง domain ไทย: กฎหมาย, สาธารณสุข, เกษตร, ภาษี, ทั่วไป
  - ตรวจสอบคุณภาพโดยผู้เชี่ยวชาญ (อย่างน้อย 10% ของชุดข้อมูล)
- [ ] วัดผล Thai-bench หลัง fine-tune เปรียบเทียบกับ baseline M1
- [ ] ทดสอบ On-Premise inference บน CPU + Consumer GPU (เช่น RTX 3080)

**Definition of Done M2:**
- Thai-bench score > baseline ≥ 5% ทุกมิติ (ต้องวัดจริง ไม่ประมาณ)
- inference ทำงานได้บน On-Premise hardware ≤ 8GB VRAM

---

### M3 — เม.ย.–ส.ค. 2570: Safety + PDPA + Public Alpha

**เป้าหมาย:** เพิ่ม safety layer, PDPA awareness, ปล่อย public alpha บน Hugging Face

**งานที่ต้องทำ:**
- [ ] RLHF/DPO สำหรับ safety + Thai cultural appropriateness
  - rejection dataset: คำถามที่ไม่ควรตอบ (เนื้อหาอันตราย, ข้อมูลส่วนบุคคล)
  - preference dataset: 1,000 คู่ good/bad response ภาษาไทย
- [ ] PDPA awareness ใน model: ไม่ reproduce PII, ไม่เก็บ context ข้ามการสนทนา
- [ ] ทดสอบ Red Team ภาษาไทย: prompt injection, jailbreak, bias
- [ ] ปล่อย checkpoint public บน Hugging Face ภายใต้ License ที่เหมาะสม
- [ ] เขียน Model Card ฉบับภาษาไทย-อังกฤษ พร้อม eval results จริง

**Definition of Done M3:**
- Red Team pass rate > 95% บนชุดทดสอบภายใน
- Hugging Face model card มี eval results พร้อม reproducible benchmark
- community สามารถ run ได้โดยไม่ต้องติดต่อทีม

---

## Base Model Candidates — เปรียบเทียบ

| โมเดล | License | Thai Base | ขนาด | Community | ข้อสังเกต |
|---|---|---|---|---|---|
| **Typhoon (SCB 10X)** | Apache 2.0 | ✅ ดีมาก (Thai-first) | 7B, 70B | 🟡 ไทย แต่ community เล็ก | ใกล้เคียงที่สุดกับ vision ของ OpenThaiAi |
| **WangchanGPT (VISTEC)** | CC-BY | ✅ ดี | 7B | 🟡 research-oriented | ต้นกำเนิดไทย, อาจ co-develop ได้ |
| **Qwen2.5 (Alibaba)** | Apache 2.0 | 🟡 ดีพอ (multilingual) | 7B–72B | ✅ ใหญ่มาก | ไม่ใช่ Thai-first แต่ tokenizer ดีกว่า Llama สำหรับภาษาเอเชีย |
| **Llama 3.1 (Meta)** | Llama 3 License | 🔴 ไม่ดีนัก (ต้องแก้ tokenizer) | 8B–70B | ✅ ใหญ่มาก | tokenizer ไม่ efficient สำหรับภาษาไทย |
| **SeaLLM (DAMO)** | Apache 2.0 | ✅ ดี (SEA multilingual) | 7B | 🟡 research | เน้น Southeast Asia, Thai ดีกว่า Llama |

**คำแนะนำ (รอ M0 ยืนยัน):** เริ่มจาก **Typhoon** เพราะ Thai-first + Apache 2.0 + มีทีมไทยที่ติดต่อได้ จากนั้น benchmark เปรียบกับ Qwen2.5 ก่อนตัดสินใจสุดท้าย

---

## Thai Corpus — แหล่งที่มาที่ถูกกฎหมาย

| แหล่ง | ประมาณขนาด | License/สิทธิ์ | สถานะ |
|---|---|---|---|
| Wikipedia ภาษาไทย | ~200M tokens* | CC-BY-SA | ✅ ใช้ได้ทันที |
| CommonCrawl (Thai subset) | ต้องสำรวจ | Public Domain (ต้องกรอง) | 🟡 ต้องทำ quality filter |
| Royal Gazette (ราชกิจจา) | ต้องสำรวจ | สาธารณสมบัติ | 🟡 ต้องสำรวจ API |
| NSTDA BEST Corpus | ต้องสำรวจ | ต้องขออนุญาต | 🔴 รอ Partnership |
| หนังสือพิมพ์ไทย | ต้องสำรวจ | ต้องขออนุญาตทีละราย | 🔴 ต้อง negotiate |

*ตัวเลขที่มี * คือประมาณการ ต้องวัดจริง

**ห้ามใช้:** web scraping โดยไม่มีสิทธิ์, ข้อมูลส่วนบุคคล, เนื้อหาลิขสิทธิ์ที่ไม่ได้รับอนุญาต

---

## Thai Eval Suite — 5 มิติ

| มิติ | ตัวอย่างข้อสอบ | เกณฑ์ผ่าน |
|---|---|---|
| **1. Thai Proficiency** | เติมคำ, ไวยากรณ์, วรรณคดี, สำนวน | Accuracy > 70% |
| **2. Domain Knowledge** | กฎหมาย/สุขภาพ/ภาษี — วัด hallucination rate | Hallucination < 5% |
| **3. Safety** | ปฏิเสธ harmful request เป็นภาษาไทย | Pass rate > 95% |
| **4. PDPA Awareness** | ไม่ reproduce PII, ไม่แนะนำเก็บข้อมูลผิดกฎ | Pass rate 100% |
| **5. Latency / On-Prem** | response time บน hardware ระดับ mid-range | < 5 วินาที/turn |

---

## Compute Budget (ประมาณการ — ยังไม่สำรวจราคาจริง)

| งาน | ประมาณการ (ต้องยืนยัน) | หมายเหตุ |
|---|---|---|
| Fine-tune 7B QLoRA 4-bit | ต้องสำรวจ (GPU-hours) | ขึ้นกับ dataset size และ hardware |
| Inference On-Prem 7B | RAM 8-16 GB (ประมาณการ) | ต้องทดสอบจริง |
| Hardware สำหรับ SME | GPU ราคาต้องสำรวจ | NIPA.Cloud vs ซื้อเอง |

*ทุกตัวเลขในตารางนี้เป็นประมาณการที่ยังไม่ได้วัดจริง — ต้องสำรวจก่อน M0 เสร็จ*

---

## Open Source Strategy

**License ที่เลือก:** Apache 2.0 (ถ้า base model เป็น Apache 2.0) หรือ CC-BY-4.0 สำหรับ dataset
**เหตุผล:** Allow commercial use, ดึงดูด enterprise adoption, compatible กับ partner licensing

**การ contribute กลับชุมชน:**
- Upload checkpoint ทุก major version บน Hugging Face
- เผยแพร่ Thai-bench eval suite ให้ใช้ได้ฟรี
- เปิด training code + data pipeline บน GitHub

---

*เสิร์ฟกลุ่มผู้ใช้: กลุ่มที่ 3 (แพลตฟอร์ม) เป็นหลัก + กลุ่มที่ 5 (ชุมชน/นักพัฒนา)*
*สิ่งที่ยังไม่ได้ทำ: M0 benchmark จริง, ราคา compute จริง, ข้อตกลงกับ corpus sources*
