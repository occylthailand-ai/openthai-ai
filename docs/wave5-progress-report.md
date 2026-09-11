# Wave 5 Progress Report — OpenThai.ai

> สร้างโดย: chief-of-staff | วันที่: 8 กันยายน 2569 | Wave 5 งาน 5.3

---

## Executive Summary

OpenThai.ai ผ่านช่วง documentation phase มาถึงระดับที่โครงสร้างและแนวคิดพร้อมสมบูรณ์ ณ กันยายน 2569 โครงการมีเอกสารครอบคลุมครบ 6 กลุ่มผู้ใช้ มีทีม AI Agents 19 ตัวพร้อมทำงาน และมี Wave 1–5 ปิดครบด้านสเปกและนโยบาย

สิ่งที่ยังขาดคือ **โมเดลจริง รายได้จริง และนิติบุคคล** — สามสิ่งนี้ต้องการการตัดสินใจของ Mythos และทรัพยากรจากภายนอก ไม่ใช่งานที่ AI Agents ทำแทนได้ การพัฒนาต่อจากนี้จึงต้องเดินสองรางขนานกัน: ทีม AI เดินต่อในส่วนที่ทำได้ ขณะที่ Mythos ปลดล็อก blockers หลักทั้ง 4 ข้อ

ในช่วง 30 วันข้างหน้า งานที่มีผลกระทบสูงสุดคือการนำ Professional Portal จาก spec ไปสู่ prototype ทำงานได้ และเริ่มต้นหาพันธมิตรมหาวิทยาลัยตาม Partnership Strategy

---

## สถานะ 6 กลุ่มผู้ใช้

| # | กลุ่ม | Portal/Module | สเปก | Code | ทดสอบ | พร้อม Launch |
|---|---|---|---|---|---|---|
| 1 | ผู้ผลิต | Producer Portal | ✅ | ✅ (MVP) | 🟡 UAT รอ | 🔴 ยังไม่ผ่าน |
| 2 | คนกลาง | Intermediary Portal | ✅ | ✅ (MVP) | 🟡 API ยังไม่เชื่อม | 🔴 ยังไม่ผ่าน |
| 3 | แพลตฟอร์ม | 7 Portal | ✅ | ✅ | 🟡 staging | 🔴 ยังไม่ผ่าน |
| 4 | ผู้บริโภค | Consumer Portal | ✅ | ✅ (MVP) | 🟡 API ยังไม่เชื่อม | 🔴 ยังไม่ผ่าน |
| 5 | ชุมชน/นักพัฒนา | Gov Portal | ✅ | 🟡 บางส่วน | 🔴 ยังไม่ทดสอบ | 🔴 ยังไม่ผ่าน |
| 6 | วิชาชีพ | Professional Portal | ✅ (8 ก.ย.) | 🔴 ยังไม่มี | 🔴 ยังไม่มี | 🔴 ยังไม่ผ่าน |

**หมายเหตุ:** ทุกกลุ่มมีสเปกแล้ว ยังไม่มีกลุ่มใดพร้อม launch จริง — เหตุผลหลักคือยังไม่มีโมเดล AI จริงที่รันได้

---

## งานที่เสร็จ Wave 1–5 (สรุปย่อ)

**Wave 1–2 (ก.ค.–ส.ค. 69):** ปิดช่องว่าง 6 กลุ่มผู้ใช้, สเปกวิชาชีพ, RAG guardrails, Thai Eval Suite, staging environment, blockchain-web3 agent

**Wave 3 (ส.ค. 69):** Tech Radar, Innovation Brief 3 ฉบับ, Sales Playbook, B2G Proposal Template, Innovation Board Charter, Competitive Positioning, PDPA Signoff draft, Developer Onboarding, Investor One-Pager

**Wave 4 (ส.ค.–ก.ย. 69):** Innovation Board Appointment (รอลงนาม), Flash Brief RegTech, Flash Brief BoT Sandbox, Product Roadmap, Thai Corpus Strategy, Flash Brief Partnerships (8 ก.ย.)

**Wave 5 (ก.ย. 69):** Dev-Loop Tool, Professional Portal Spec, API Stub Spec, Wave 5 Report (ฉบับนี้), Thai Model Roadmap, Affiliate Technical Spec

---

## Blockers ที่รอ Mythos

| Blocker | ผลกระทบถ้ารอนาน | ความเร่งด่วน |
|---|---|---|
| แต่งตั้ง Innovation Board 5 ที่นั่ง | Board ไม่มีอำนาจตัดสินใจ product แรก → delay ทุก commercial step | 🔴 สูงมาก |
| ตัดสินใจ product แรก (PDPA Assistant หรืออื่น) | ทีมพัฒนาไม่รู้จะ build อะไร → งาน Wave 6 ทำไม่ได้ | 🔴 สูงมาก |
| ตั้งนิติบุคคล | ทำสัญญา B2G ไม่ได้, เปิดบัญชีธุรกิจไม่ได้, จ้างคนอย่างเป็นทางการไม่ได้ | 🔴 สูง |
| จ้าง AI Engineer คนแรก + Legal ภายนอก | ไม่มีคนรัน fine-tuning จริง, PDPA signoff ยังเป็น draft | 🟡 ปานกลาง-สูง |

---

## Next Actions — 30 วันข้างหน้า

### ทีม AI ทำได้เอง (ไม่รอ Mythos)
- [ ] สร้าง Professional Portal React Component (3 สายวิชาชีพ)
- [ ] implement API stubs จาก `docs/api-stub-spec.md` ใน Express/FastAPI
- [ ] สร้าง Thai Eval Suite test cases จริง 50 ข้อ
- [ ] ตั้ง monitoring + alerting สำหรับ staging environment
- [ ] รัน `python tools/openthai_dev_loop.py --wave 6` เมื่อ Wave 6 catalog พร้อม

### ต้องมี Mythos ตัดสินใจ
- [ ] กำหนดชื่อ 5 ที่นั่ง Innovation Board + ลงนาม
- [ ] เลือก product แรกจาก Flash Brief RegTech
- [ ] ดำเนินการตั้งนิติบุคคล (บริษัท vs มูลนิธิ vs สหกรณ์)
- [ ] ติดต่อ VISTEC + NSTDA ตาม Partnership Strategy

---

## ความเสี่ยงหลัก 3 ข้อ

**ความเสี่ยง 1: ไม่มีโมเดลไทยจริง**
- สถานะ: 🔴 สูง
- สาเหตุ: ยังไม่มีทีม ML, ไม่มี compute budget ยืนยัน
- Mitigation: เริ่มจาก fine-tune base model (Typhoon/WangchanGPT) บน free tier ก่อน, หา GPU partner จากมหาวิทยาลัย

**ความเสี่ยง 2: Legal gap ก่อน launch**
- สถานะ: 🟡 ปานกลาง
- สาเหตุ: PDPA Signoff ยังไม่มีที่ปรึกษากฎหมายภายนอกรับรอง
- Mitigation: ใช้ checklist ใน `docs/pdpa-compliance-signoff.md` เป็นเกณฑ์ soft launch, หา legal partner โดยเร็ว

**ความเสี่ยง 3: Innovation Board ไม่มีอำนาจ**
- สถานะ: 🔴 สูง
- สาเหตุ: ยังไม่ได้แต่งตั้งอย่างเป็นทางการ
- Mitigation: ให้ Mythos ลงนาม `docs/innovation-board-appointment.md` — ใช้เวลา <1 ชั่วโมง

---

## KPI Dashboard (ประมาณการ — ยังไม่ได้วัดจริง)

| KPI | เป้าหมาย | สถานะปัจจุบัน | วิธีวัด |
|---|---|---|---|
| Portals ที่พร้อม launch | 6/6 | 0/6 (มีแต่ MVP code) | UAT pass + legal sign-off |
| นักพัฒนาใน community | 50 คน | 0 (ยังไม่ open) | GitHub stars/contributors |
| B2G pilot signed | 1 สัญญา | 0 | executed MOU |
| Revenue | > 0 บาท | 0 บาท | บัญชีธุรกิจ |
| Thai model v0.1 | 1 โมเดล | 0 | Hugging Face upload |

*หมายเหตุ: ตัวเลขเป้าหมายทั้งหมดเป็นประมาณการ รอ Innovation Board กำหนด KPI อย่างเป็นทางการ*

---

*เสิร์ฟกลุ่มผู้ใช้: ทั้ง 6 กลุ่ม (รายงานภาพรวม)*
*สิ่งที่ยังไม่ได้ทำ: ตัวเลข KPI จริง, เอกสารการเปิดตัวสาธารณะ, Mythos decision log*
