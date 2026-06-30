# Cloud Sync & Drive Backup — ซิงค์ข้อมูลผู้ใช้ทุกอุปกรณ์

ระบบซิงค์ข้อมูลผู้ใช้ในแอป OpenThai AI ให้ตรงกันทุกที่ และสำรองขึ้นคลาวด์ไดรฟ์ส่วนตัว

> หมายเหตุ: เอกสารนี้คือ **การซิงค์ข้อมูลผู้ใช้ในแอป** (ภาษา ค่าตั้ง ฯลฯ)
> ไม่ใช่การซิงค์ไฟล์ repo — สำหรับ repo file-sync ดู `SYNC-GUIDE.md`

---

## 6 ปลายทางที่ซิงค์/สำรอง

| ปลายทาง | กลไก | สถานะ |
|---------|------|-------|
| 💻 คอมพิวเตอร์ | เบราว์เซอร์ + cloud sync | อัตโนมัติ |
| 📱 มือถือ | ล็อกอินบัญชีเดียวกัน → ดึงจาก cloud | อัตโนมัติ |
| 🧠 เมมโมรี่ (เครื่อง) | `localStorage` — cache เร็ว/ออฟไลน์ | อัตโนมัติ |
| ☁️ คลาวด์ (บัญชี) | `/api/sync` → Supabase (หรือไฟล์ fallback) | อัตโนมัติ |
| 🟢 Google Drive | `appDataFolder` (โฟลเดอร์แอป) | เชื่อมเอง |
| 🔵 OneDrive | `special/approot` (โฟลเดอร์แอป) | เชื่อมเอง |

หน้าจัดการ: **`/sync`** (เมนู Dashboard → "ศูนย์ซิงค์ข้อมูล")

---

## ทำงานอย่างไร

1. **memory ↔ cloud** — เปิดแอป → `hydrateSync()` ดึงข้อมูลจาก cloud มาทับ local
   แล้วทุกครั้งที่เปลี่ยนค่า → `pushSync()` เขียนกลับขึ้น cloud (debounce 800ms)
2. **cloud → drive** — กดปุ่ม "สำรองตอนนี้" หรือเรียก `POST /api/sync/drive/:provider/backup`
   จะเขียนไฟล์ `openthai-ai-sync.json` ลงโฟลเดอร์แอปของไดรฟ์นั้น
3. **drive → cloud** — กด "กู้คืน" → ดึงไฟล์จากไดรฟ์ merge กลับเข้า cloud → กระจายสู่ทุกอุปกรณ์

ไฟล์สำรองเก็บใน **โฟลเดอร์แอปเฉพาะ** (ผู้ใช้มองไม่เห็นปะปนกับไฟล์ส่วนตัว) และ
**refresh token เก็บฝั่ง server แยก** (key `drive::<user>`) — ไม่หลุดออกทาง `GET /api/sync`

---

## API

| Method | Path | ใช้ทำอะไร |
|--------|------|-----------|
| GET  | `/api/sync` | ดึงข้อมูล sync (hydrate) |
| PUT  | `/api/sync` | บันทึก (merge กันชนข้ามอุปกรณ์) |
| GET  | `/api/sync/drive/status` | provider ไหน config/connect แล้ว + สำรองล่าสุด |
| GET  | `/api/sync/drive/:provider/connect` | คืน OAuth consent URL |
| GET  | `/api/sync/drive/:provider/callback` | OAuth callback (เก็บ refresh token) |
| POST | `/api/sync/drive/:provider/backup` | สำรองขึ้นไดรฟ์ |
| POST | `/api/sync/drive/:provider/restore` | กู้คืนจากไดรฟ์ |
| POST | `/api/sync/drive/:provider/disconnect` | ถอนการเชื่อมต่อ |

`:provider` = `google` หรือ `onedrive` · ทุก endpoint (ยกเว้น callback) ต้องมี JWT

---

## ตั้งค่า (ENV)

### Google Drive
1. [Google Cloud Console](https://console.cloud.google.com) → เปิด **Google Drive API**
2. OAuth client เพิ่ม scope `.../auth/drive.appdata` และ redirect URI:
   `https://YOUR-API-HOST/api/sync/drive/google/callback`
3. ตั้ง env:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_DRIVE_REDIRECT_URI=https://YOUR-API-HOST/api/sync/drive/google/callback
   ```

### OneDrive (Microsoft Graph)
1. [Azure Portal](https://portal.azure.com) → **App registrations** → New
2. API permissions (delegated): `Files.ReadWrite.AppFolder`, `offline_access`, `User.Read`
3. เพิ่ม redirect URI: `https://YOUR-API-HOST/api/sync/drive/onedrive/callback`
4. ตั้ง env:
   ```
   MS_CLIENT_ID=...
   MS_CLIENT_SECRET=...
   MS_REDIRECT_URI=https://YOUR-API-HOST/api/sync/drive/onedrive/callback
   # MS_TENANT=common   (ค่าเริ่มต้น)
   ```

ตรวจสถานะ config ได้ที่ `GET /api/health` → `drive_google`, `drive_onedrive`

> ถ้ายังไม่ตั้ง env: หน้า `/sync` จะแสดง "ผู้ดูแลยังไม่ได้ตั้งค่า API" และปิดปุ่มเชื่อมต่อ
> — ส่วนซิงค์ memory/cloud ยังทำงานปกติ
