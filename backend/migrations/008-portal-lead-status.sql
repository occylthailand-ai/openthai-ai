-- Openthai.ai — Portal lead pipeline status (Supabase / Postgres)
-- รันใน Supabase SQL editor — เพิ่มคอลัมน์สถานะการติดตามให้ portal_leads (007)
-- สำหรับไล่ warm lead ในแผนขายแพ็กเกจบริการ: ใครทักแล้ว ใครรอ follow-up ใครปิดได้
-- backend อัปเดตผ่าน PATCH /api/leads/admin/status (Admin Key) — ถ้ายังไม่รัน
-- migration นี้ โหมด Supabase จะอัปเดตสถานะไม่ผ่านและ log เตือน (โหมดไฟล์ไม่กระทบ)

alter table public.portal_leads add column if not exists status text not null default 'new';
alter table public.portal_leads add column if not exists status_note text;
alter table public.portal_leads add column if not exists status_updated_at timestamptz;

create index if not exists portal_leads_status_idx on public.portal_leads (status);
