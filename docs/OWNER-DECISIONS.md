# สิ่งที่รอเจ้าของตัดสินใจ (Owner decisions) — snapshot 2026-08-05

รายการนี้รวม "ทางแยกที่ต้องให้เจ้าของตัดสินใจ" (ตาม standing-order ข้อ 8) ไว้ที่เดียว เพราะใน
`DECISIONS_LOG.md` กระจายอยู่หลายรอบและ **หลายอันถูกแก้ไปแล้ว** — อันนี้ยืนยันสถานะจริงกับโค้ด ณ วันที่ระบุ.
เรียงตามผลกระทบ (เงิน/ข้อมูลหาย ก่อน). แต่ละข้อบอก: ทำไมสำคัญ + ตัวเลือกที่ปลอดภัย + สิ่งที่ผมทำได้ทันทีเมื่อไฟเขียว.

> วิธีตอบ: บอกในลูปว่า "อนุมัติข้อ X" หรือเลือกตัวเลือก (a/b/c) — ผมจะลงมือ + เขียนเทส + verify ให้เลย.

---

## 🔴 เปิดอยู่ — ผลกระทบสูง

### 1. บั๊กเส้นเงิน "จ่ายค่าคอมพันธมิตรซ้ำ" หลัง Vercel redeploy (Part A / Part B)
- **ทำไม:** หลัง redeploy `paid_out` reset เป็น 0 + ไฟล์ withdrawals หาย → พันธมิตรที่เคยถอนแล้วเห็นยอดถอนได้ = รายได้สะสมทั้งหมดอีกครั้ง (เสี่ยงจ่ายซ้ำ เหลือแค่แอดมินอนุมัติเป็นด่านเดียว). รายละเอียด+หลักฐานเต็มใน DECISIONS_LOG หัวข้อ 2026-08-05 "OPEN FINDING (owner-gated…)".
- **Part A (ปลอดภัยมาก ไม่ต้อง migration):** ใน `_affFromRow` เปลี่ยน `paid_out: 0` → `paid_out = max(0, total_earned − pending_payout)` โดยใช้คอลัมน์ `pending_payout` ที่ Supabase เก็บอยู่แล้ว. แถวเก่าที่ไม่มีข้อมูล = fail-closed (โชว์ ฿0 ไม่มีทางจ่ายเกิน).
- **Part B (scope กว้าง ต้อง migration):** ทำ withdrawals + withdraw_confirmations ledger ให้ durable ใน Supabase (ตาราง+migration ใหม่).
- **รอ:** อนุมัติ Part A ทันทีไหม? และ Part B เอาพร้อมกันหรือทีหลัง?

### 2. รัน Supabase migration 8 ไฟล์ (เปิดใช้ระบบกันข้อมูลหาย)
- **ทำไม:** ฟีเจอร์ durability ที่ทำเสร็จแล้ว (waitlist / autopost / scheduler / video_jobs + broadcast/pdpa/ai_usage) จะ "ถาวร" ก็ต่อเมื่อรัน migration — ถ้าไม่รัน โค้ดตกกลับไปเขียน `/tmp` ที่หายทุก deploy.
- **สิ่งที่ต้องทำ (ฝั่งเจ้าของ):** ทำตาม `backend/migrations/README.md` — วาง 8 ไฟล์ใน Supabase SQL Editor ตามลำดับ (idempotent รันซ้ำได้). ต้องตั้ง env `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` ด้วย.

### 3. ตั้ง `JWT_SECRET` ใน Vercel ให้ครบทั้ง 3 โปรเจกต์
- **ทำไม:** `UNSUB_SECRET` ใช้ `JWT_SECRET` เซ็นลิงก์คลิกเดียวที่ทำงานสำคัญ (unsubscribe, ลบข้อมูล PDPA, ยืนยันถอนค่าคอม, ยกเลิกการชำระเงิน). โค้ด **fail-closed อยู่แล้ว**: ถ้าไม่ตั้ง `JWT_SECRET` บน prod มันจะใช้ key สุ่มต่อ process (ปลอมลิงก์ไม่ได้) — แต่ผลข้างเคียงคือ **ลิงก์เหล่านั้นจะ verify ไม่ผ่านสม่ำเสมอ** ข้าม serverless invocation/restart (คนกดลิงก์ในอีเมลอาจเจอ "ลิงก์ไม่ถูกต้อง" ทั้งที่ลิงก์จริง). มี `[SECURITY]` warning ตอน boot บน prod อยู่แล้ว.
- **สิ่งที่ต้องทำ (ฝั่งเจ้าของ):** ตั้ง `JWT_SECRET` (สตริงสุ่มยาว ๆ) ให้เหมือนกันทั้ง 3 โปรเจกต์ Vercel และคงค่าไว้ เพื่อให้ลิงก์ทั้ง **เสถียรและปลอมไม่ได้** (เปลี่ยนค่าแล้วลิงก์เก่าที่ส่งไปจะใช้ไม่ได้).

---

## 🟡 เปิดอยู่ — ต้องการข้อมูลจากเจ้าของก่อน

### 4. โดเมนจริงของ otop-ai-landing (ปลด SEO ที่เหลือ)
- **ทำไม:** `vercel.json` route ทุก path → index.html ดังนั้นถ้าไม่มี `<link rel=canonical>` ทุก URL ใต้โดเมนกลายเป็นหน้าซ้ำในสายตา Google. ต้องใส่ canonical + `og:url` absolute + sitemap — แต่ทั้งหมดต้องรู้ **โดเมน production จริง** ของ landing นี้ ซึ่งไม่มีในรีโป (เดาไม่ได้ เดาผิดแย่กว่าเดิม).
- **รอ:** โดเมน production ของ otop-ai-landing คืออะไร? (บอกมาแล้วผมใส่ให้ครบ)

### 5. OpenThai-AI-v9.0 — จะ build ให้ deploy ได้ไหม
- **ทำไม:** รีโป v9.0 ไม่มี `package.json`/`next.config`/`tsconfig` เลย (เป็น `app/`-dir scaffold 2 ไฟล์) → Vercel build fail ทุกครั้ง. การทำให้ deploy ได้ = ตั้ง Next.js stack ทั้งชุด + สร้าง backend route ที่ขาด — เกินกว่าการแก้เล็ก ๆ.
- **รอ:** ให้ผม build v9.0 ให้ deploy ได้จริง หรือ v9.0 ตั้งใจพักไว้ก่อน? (และ ~10 Vercel projects ที่ชี้มารีโปเล็กนี้น่าจะ prune ในแดชบอร์ด Vercel ของเจ้าของ)

---

## 🟢 แก้ไปแล้ว (บันทึกไว้กันเข้าใจผิดว่ายังค้าง)
- **#9 คอมมิชชัน affiliate จากการขายสินค้าในร้าน** — ทำแล้ว: `/api/shop/checkout` เรียก `creditAffiliateSale(ref, amount, …)` (server.js:728).
- **#10 ปุ่ม "แบ่งครึ่ง" ข้อพิพาทที่ไม่แบ่งจริง** — ทำแล้ว: ถอดปุ่มออก + `disputes.resolve()` ปฏิเสธ `split` (escrow ยังไม่มีฟิลด์จำนวนเงิน partial).
- **โดเมน `openthaiai.com` (ไม่มีขีด) ใน all-platform-files 231 หน้า** — ทำแล้ว: normalize เป็น `openthai-ai.com` ครบ (0 ไฟล์ที่ยังผิด).

---

## 🔵 หมายเหตุเล็ก (ไม่บล็อก — เลือกจัดการเมื่อสะดวก)
- ~~`index.html` `twitter:site` เป็น `@Openthai.ai` ซึ่งไม่ใช่ handle X ที่ถูกต้อง (มีจุดไม่ได้)~~ — **แก้แล้ว 2026-08-06:** ลบ tag ที่ไม่ถูกต้องออก (card ยังแสดงจาก card/title/description/image ครบ). ถ้ามี X @handle จริงในอนาคต ใส่กลับได้ที่เดิม.
- ยืนยันชำระเงินไม่ได้ auto-เลื่อนสถานะ order ที่ผูกอยู่ (ยังเป็น pending) — เป็น product decision ว่าควร auto-advance ไหม.
- Dashboard affiliate แบบ "กรอก ref code ดูสถิติ" ไม่มี auth จริง (ตั้งใจให้ login-less) — ถ้าจะเพิ่ม auth เป็น architecture decision (ตอนนี้มี rate limiter กัน enumeration แล้ว).
