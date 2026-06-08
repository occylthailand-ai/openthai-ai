# 📤 รายงานเทส & Health → Google Drive (อัตโนมัติ 24/7)

ระบบนี้รันเทส (frontend + backend) และเช็ก production health ทุก **6 ชั่วโมง** แล้วเขียนผลเข้า
**Google Drive ของคุณ** อัตโนมัติ — ทั้งไฟล์รายงาน (`.md`) และสเปรดชีตบันทึกต่อเนื่อง (`Health_Log`)

```
GitHub Actions (drive-report.yml)  ──POST──▶  Apps Script Web App  ──เขียน──▶  Google Drive
   รันเทส + health ทุก 6 ชม.                    (รันด้วยบัญชีคุณ)            📁 OpenThaiAi Reports
```

> ทำไมใช้ Apps Script web app: ไฟล์ที่สร้างเป็น **ของบัญชี Gmail ของคุณเอง** จึงไม่ติดปัญหา
> "storage quota exceeded" แบบ service account บน Gmail ส่วนตัว และไม่ต้องสร้าง OAuth token เอง

---

## สิ่งที่ตั้งให้แล้ว ✅

- 📁 โฟลเดอร์ **`OpenThaiAi Reports`** ใน Google Drive (มีรายงานแรก + `Health_Log` แล้ว)
- ⚙️ Workflow **`.github/workflows/drive-report.yml`** (ตารางทุก 6 ชม. + กดรันเองได้)
- 📜 สคริปต์ **`scripts/openthai-health-to-drive.gs`** (สำหรับวางใน Apps Script)

ระหว่างที่ยังไม่ได้ทำ 2 ขั้นด้านล่าง workflow จะ **ยังรันเทสปกติและเก็บรายงานเป็น artifact**
ใน GitHub Actions ทุกครั้ง (ไม่พัง) — แค่ยังไม่เขียนลง Drive จนกว่าจะตั้ง secret

---

## ขั้นตอนที่ต้องทำเอง (ครั้งเดียว ~2 นาที)

ต้องทำ 2 ขั้นนี้เพราะ Google ไม่อนุญาตให้สร้าง/deploy Apps Script หรือเพิ่ม GitHub secret
แทนเจ้าของบัญชีโดยอัตโนมัติได้ — เป็นเรื่องความปลอดภัยของบัญชี

### 1️⃣ Deploy Apps Script web app
1. เปิด <https://script.google.com> → **New project**
2. ลบโค้ดเดิม แล้ววางเนื้อหาทั้งหมดจาก `scripts/openthai-health-to-drive.gs`
3. กด **Deploy → New deployment**
   - เลือก gear ⚙️ → **Web app**
   - **Execute as:** Me (occylthailand@gmail.com)
   - **Who has access:** Anyone
4. กด **Deploy** → อนุญาตสิทธิ์ → คัดลอก **Web app URL** (ลงท้าย `/exec`)

### 2️⃣ เพิ่ม GitHub secret
1. ไปที่ repo → **Settings → Secrets and variables → Actions → New repository secret**
2. เพิ่ม:
   - **Name:** `DRIVE_WEBHOOK_URL` — **Value:** Web app URL ที่คัดลอกมา
3. (ไม่บังคับ) ถ้าต้องการความปลอดภัยเพิ่ม ให้ตั้งค่าลับร่วม:
   - ใน `.gs` ตั้ง `SHARED_SECRET = 'รหัสลับของคุณ'` แล้ว re-deploy
   - เพิ่ม secret `DRIVE_WEBHOOK_SECRET` = รหัสเดียวกัน

เสร็จแล้ว 🎉 — ทดสอบได้โดยไปที่ **Actions → 📤 Drive Report → Run workflow**
แล้วเปิดดูโฟลเดอร์ `OpenThaiAi Reports` ใน Drive จะเห็นรายงานใหม่โผล่ทันที

---

## ปรับแต่ง
- **ความถี่:** แก้ `cron` ใน `drive-report.yml` (ปัจจุบัน `0 */6 * * *` = ทุก 6 ชม.)
- **ปลายทาง:** แก้ `FOLDER_NAME` ใน `.gs` (ค่าเริ่มต้น `OpenThaiAi Reports`)

## รายงานเก็บที่ไหนบ้าง
| ที่เก็บ | เนื้อหา |
|--------|---------|
| 📁 Google Drive `OpenThaiAi Reports` | ไฟล์ `report-<เวลา>.md` + สเปรดชีต `Health_Log` |
| 📦 GitHub Actions artifact `drive-report` | สำเนา report (เก็บ 30 วัน) — สำรองเสมอแม้ Drive ล่ม |
