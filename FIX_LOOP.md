# FIX_LOOP — OpenThai Unified v10 (Next.js 14)

ภารกิจ: รัน → เทส → เจอ error → แก้ → รันซ้ำ วนจนผ่าน 100% โดยอัตโนมัติ ไม่ต้องถามกลับระหว่างทาง (นอกจากเจอเคสที่กฎข้อ "ห้ามทำ" บังคับให้หยุด)

## วิธีเริ่ม
```
cd "C:\OPENTHAI AI"
claude
```
แล้ววางข้อความนี้:
> อ่านไฟล์ FIX_LOOP.md ในโฟลเดอร์นี้ แล้วทำตามจนครบทุก gate ผ่านเป็นสีเขียว วนแก้เองอัตโนมัติ ไม่ต้องถามผมระหว่างทาง

---

## ขั้นตอน (ทำตามลำดับ วนซ้ำจนผ่าน)

1. **ตรวจ environment**
   - ดูว่าใช้ package manager ตัวไหน (มี `pnpm-lock.yaml` / `yarn.lock` / `package-lock.json`)
   - ติดตั้ง dependencies ด้วยตัวที่ตรงกับ lockfile
   - ถ้าไม่มี `.env` หรือ `.env.local` ให้ดูจาก `.env.example` แล้วเติม placeholder เฉพาะที่จำเป็นต่อการ build (ห้ามใส่ secret จริง)

2. **GATE 1 — Type check**
   - `npx tsc --noEmit`
   - แก้ type error ทุกตัวจนผ่าน

3. **GATE 2 — Lint**
   - `npm run lint` (หรือ `next lint`)
   - แก้จน 0 error (warning เก็บไว้ในสรุปได้)

4. **GATE 3 — Build**
   - `npm run build`
   - แก้จน build ผ่านสะอาด

5. **GATE 4 — Tests**
   - ถ้ามี test script: `npm test` (หรือ vitest/jest/playwright ตามที่ตั้งไว้)
   - แก้จนผ่านทั้งหมด ถ้าไม่มี test เลย ให้ข้าม gate นี้และระบุไว้ในสรุป

6. **GATE 5 — Runtime smoke test**
   - `npm run start` (หรือ `npm run dev`) แล้วยิง health check ไปที่ route หลัก
   - ถ้า route ไหนต้องต่อ PostgreSQL/Qdrant/external API ที่ไม่มี credential ในเครื่อง ให้ "ระบุไว้ในสรุป" ว่าต้องรันตอนมี DB ห้ามแก้ business logic เพื่อหลบ

## หลังผ่านทุก gate
- รัน gate 1–4 ซ้ำอีกหนึ่งรอบเพื่อยืนยันไม่มี regression
- เขียนสรุป `FIX_LOOP_REPORT.md`: แก้อะไรไปบ้าง (ไฟล์ + เหตุผลสั้นๆ), gate ไหนผ่าน, อะไรที่ค้างต้องให้คน/DB จริงมายืนยัน

---

## กฎห้ามทำ (หยุดและรายงาน ห้ามตัดสินใจเอง)
- **ห้ามแตะ MLM / referral logic ให้ผิดไปจาก Non-MLM** — แพลตฟอร์มนี้ Non-MLM ถาวร ไม่มีเงื่อนไขจำนวน referral
- **ห้ามเขียนคำต้องห้าม 2 คำนี้ลงโค้ดเด็ดขาด:** "สร้างรายได้เสริม" และ "ด้วยระบบแนะนำสมาชิก"
- ห้าม commit/print secret หรือ API key จริง ห้ามแก้ค่าใน `.env` จริง
- ห้ามลบหรือ migrate ข้อมูลใน database จริง
- ห้ามแก้ business logic เพื่อให้ test ผ่านแบบหลอกๆ — แก้ที่ต้นเหตุจริง
- ถ้าจะ "ปิด" หรือ "ลบ" feature เพื่อให้ build ผ่าน → หยุด แล้วรายงานก่อน

## หลักการแก้
- แก้ให้น้อยและตรงจุดที่สุด (minimal diff)
- ทุกครั้งที่แก้ ต้องรัน gate นั้นซ้ำเพื่อยืนยันก่อนไป gate ถัดไป
- ถ้าวนแก้ error เดิม 3 รอบแล้วไม่ขยับ → หยุด สรุปสาเหตุที่เป็นไปได้ แล้วรายงาน
