# 🚀 Deployment & Backup Channels — คู่มือช่องทางสำรอง

ระบบออกแบบให้ **deploy ได้หลายช่องทางพร้อมกัน** เพื่อไม่ให้ติดเพดานของเจ้าใดเจ้าหนึ่ง
(เช่น Vercel free plan จำกัดจำนวน deployment/วัน — ทุก push สร้าง preview build)

```
                ┌──────────────── Frontend (static SPA) ────────────────┐
   ผู้ใช้  ───▶  │  Vercel (หลัก) · Cloudflare Pages · Netlify · GH Pages │
                └───────────────────────┬───────────────────────────────┘
                                        │  เรียก API ผ่าน VITE_API_URL (CORS เปิด)
                ┌───────────────────────▼───────────────────────────────┐
                │   Backend (Express)  ·  Vercel Functions / Render      │
                └────────────────────────────────────────────────────────┘
```

- **Frontend** = static (Vite) → โฮสต์ที่ไหนก็ได้
- **Backend** = `backend/server.js` → รันบน Vercel (serverless) **หรือ** Render/Railway/Fly (server เต็มตัว)
- สลับปลายทาง API ด้วย env เดียว: **`VITE_API_URL`** (เว้นว่าง = same-origin)

---

## ⚡ แก้เฉพาะหน้าเมื่อ Vercel ติด rate limit
ลิมิตเป็นรายวัน (retry ใน 24 ชม.) — ระหว่างนั้นใช้ช่องทางสำรองด้านล่างได้ทันที
หรือ trigger มิเรอร์เอง: **Actions → "🌐 Deploy Mirror" → Run workflow**

> ทุก push เข้า `main` จะ build frontend เก็บเป็น artifact `frontend-dist` เสมอ
> (Actions → run → Artifacts) ดาวน์โหลดไปวางโฮสต์ไหนก็ได้แม้ทุกแพลตฟอร์มล่ม

---

## 1) ☁️ Cloudflare Pages — มิเรอร์ frontend (แนะนำ: ฟรีปริมาณสูงสุด)
บ/วิดธ์ + request ไม่จำกัด, 500 builds/เดือน, CDN ทั่วโลก

**ต่อแบบอัตโนมัติ (ผ่าน GitHub Actions):**
1. สร้าง project ใน Cloudflare Pages ชื่อ `openthai-ai` (ครั้งแรกอาจ deploy เปล่า ๆ ก่อน)
2. ไป repo **Settings → Secrets and variables → Actions** เพิ่ม:
   - Secret `CLOUDFLARE_API_TOKEN` (token สิทธิ์ *Cloudflare Pages: Edit*)
   - Secret `CLOUDFLARE_ACCOUNT_ID`
   - (ถ้าชื่อ project ไม่ใช่ `openthai-ai`) Variable `CF_PAGES_PROJECT`
3. push เข้า `main` หรือกด Run workflow → ขึ้นเองทุกครั้ง

**หรือต่อแบบ dashboard:** Cloudflare Pages → Connect repo → Build command `cd frontend && npm install && npm run build` · Output `frontend/dist` · ตั้ง env `VITE_API_URL=https://www.openthai-ai.com`

---

## 2) 🟢 Render — backend สำรองทั้งตัว (รัน Express จริง)
ไฟล์ **`render.yaml`** เป็น Blueprint พร้อมใช้

1. Render → **New → Blueprint** → เลือก repo นี้ → กด Apply
2. ตั้ง env (Render dashboard):
   - **`ADMIN_KEY`** ⚠️ *ต้องตั้ง* — บนโฮสต์ที่ไม่ใช่ Vercel ถ้าไม่ตั้งจะใช้ค่า default ที่เดาได้
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — ให้ข้อมูลถาวร (ดิสก์ฟรี Render รีเซ็ตตอน redeploy)
   - คีย์ AI/อีเมล/ชำระเงินตามต้องการ (ดูรายการใน `render.yaml`)
3. ได้ URL เช่น `https://openthai-ai-backend.onrender.com`
4. ชี้ frontend มาที่นี่: ตั้ง `VITE_API_URL` = URL ข้างบน (ใน Cloudflare/Netlify/Vercel)
   แล้วเพิ่ม origin นี้ใน `connect-src` ของ CSP (`frontend/public/_headers` + `vercel.json`)

> Render free จะ "หลับ" หลังไม่มีทราฟฟิก 15 นาที (ตื่นใน ~30 วิ) — เหมาะเป็น backup/standby

---

## 3) 🔷 Netlify — มิเรอร์ frontend อีกทาง
ไฟล์ **`netlify.toml`** + `public/_redirects` + `public/_headers` พร้อมแล้ว

- **Dashboard:** Add new site → Import repo → ค่าถูกอ่านจาก `netlify.toml` อัตโนมัติ
- **หรือ Actions:** เพิ่ม secret `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID` → ขึ้นเองทุก push main

---

## 4) 📄 GitHub Pages — ฟรีถาวร ไม่ต้องบัญชีนอก (fallback ฉุกเฉิน)
1. repo **Settings → Pages → Source = GitHub Actions**
2. **Settings → Secrets and variables → Actions → Variables** ตั้ง `ENABLE_GH_PAGES=true`
3. (ถ้าใช้ path `/openthai-ai/`) ค่า default มีให้แล้ว · ถ้าใช้ **custom domain** ตั้ง `GH_PAGES_BASE=/`
4. push main → ขึ้นที่ `https://<org>.github.io/openthai-ai/`

> SPA routing บน GH Pages ใช้ทริก `404.html` (workflow ก็อปจาก index.html ให้แล้ว)

---

## 🔀 สลับปลายทาง API (split deploy)
`frontend/src/apiBase.js` อ่าน `VITE_API_URL`:
- **เว้นว่าง** → เรียก `/api` same-origin (เหมาะกับ Vercel unified)
- **ตั้งค่า** เช่น `https://openthai-ai-backend.onrender.com` → เรียก backend ข้ามโฮสต์
  (backend เปิด CORS ทุก origin แล้ว — ใช้ได้ทันที)

## ✅ เช็คลิสต์ก่อนเปิดตัวจริง
- [ ] ตั้ง `ADMIN_KEY` ทุกโฮสต์ที่รัน backend (Vercel + Render)
- [ ] ตั้ง `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` ให้ข้อมูลถาวรข้ามโฮสต์
- [ ] เลือก frontend หลัก 1 ตัว + สำรองอย่างน้อย 1 ตัว (คนละผู้ให้บริการ)
- [ ] ทดสอบ `VITE_API_URL` ชี้ถูก backend ที่ยังมีโควต้า
