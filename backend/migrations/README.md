# Supabase migrations — run these to make the platform durable

**ทำไมต้องรัน:** backend ทำงานได้ทั้งแบบมี Supabase (ถาวร) และไม่มี (เขียนไฟล์ใน `/tmp`).
บน Vercel `/tmp` ถูกล้างทุกครั้งที่ deploy **และแยกตาม lambda แต่ละตัว** ดังนั้นถ้ายังไม่รัน
migration พวกนี้ ฟีเจอร์ด้านล่างจะ "ดูเหมือนทำงาน" แต่ **ข้อมูลหายทุกครั้งที่ deploy** (อีเมล
waitlist หาย, โพสต์ตั้งเวลาไม่ยิง, งานสร้างวิดีโอดึงผลไม่ได้, บันทึกความยินยอม PDPA หาย ฯลฯ).
รันครั้งเดียวแล้วโค้ดจะใช้ Supabase อัตโนมัติ — ไม่ต้องแก้โค้ด.

**วิธีรัน:** เปิด Supabase → **SQL Editor** → วางเนื้อหาของแต่ละไฟล์แล้วกด Run **ตามลำดับด้านล่าง**.
ทุกไฟล์เป็น idempotent (`create table if not exists` / `create index if not exists`) — รันซ้ำได้ปลอดภัย.

> ต้องตั้ง env `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` ด้วย ไม่งั้น backend จะ fall back เป็นไฟล์เหมือนเดิม.

## ลำดับการรัน (8 ไฟล์)

1. **`FULL-MIGRATION.sql`** — schema หลัก (producers / products / orders / order_items / payments / entitlements / stock_movements / order_disputes / user_sync ฯลฯ). รันไฟล์นี้ก่อนเสมอ.
2. **`003_ai_usage_log.sql`** — ตาราง `ai_usage_log` (สถิติ token/ต้นทุน AI ต่อ endpoint). ถ้าไม่รัน การ log จะปิดตัวเองเงียบ ๆ.
3. **`008_broadcast_unsubscribes.sql`** — `broadcast_unsubscribes` (รายชื่อยกเลิกรับ newsletter — PDPA: ต้องคงอยู่ข้าม deploy).
4. **`009_pdpa_consents.sql`** — `pdpa_consents` (หลักฐานการยินยอม PDPA — ต้องถาวร มิฉะนั้นพิสูจน์ความยินยอมไม่ได้).
5. **`010_waitlist.sql`** — `waitlist` (อีเมลที่กรอกบนหน้า Landing — ต้นทางสุดของ funnel การตลาด).
6. **`011_autopost_queue.sql`** — `autopost_queue` (คิวโพสต์โซเชียลอัตโนมัติ — ถ้าไม่รัน โพสต์ตั้งเวลาจะไม่ยิงบน Vercel).
7. **`012_scheduler_posts.sql`** — `scheduler_posts` (คิวโพสต์ตั้งเวลาของหน้า Scheduler — รวม LINE OA broadcast เมื่อถึงเวลา).
8. **`013_video_jobs.sql`** — `video_jobs` (งานสร้างวิดีโอที่จ่ายเงินจริงต่อคลิป — ถ้าไม่รัน จะดึงผลไม่ได้หลัง deploy).

> **หมายเหตุ:** `FULL-MIGRATION.sql` โดยตั้งใจ **ไม่รวม** ตารางของไฟล์ 003/008/009/010/011/012/013
> (แต่ละอันเพิ่มมาทีหลังพร้อมเหตุผลเฉพาะ) — จึงต้องรันไฟล์เสริมทั้ง 7 ด้วย ไม่ใช่แค่ FULL-MIGRATION.
> ไฟล์อื่นใน `migrations/` (เช่น `001_*`, `002_*`, `004_*`–`007_*`, `credits-schema.sql`) เป็นสคีมาเก่า/ทับซ้อน
> ที่ FULL-MIGRATION ครอบคลุมแล้ว — **ไม่ต้องรันซ้ำ** เว้นแต่รู้ว่าต้องการเจาะจง.

รายการ 8 ไฟล์นี้เป็น single source of truth เดียวกับที่ `scripts/test-migration-coverage.mjs`
บังคับไว้ (CI จะ fail ถ้าโค้ด upsert ไปตารางที่ไม่มีไฟล์ใดสร้าง หรือถ้า README นี้หลุดจากลิสต์นั้น).
