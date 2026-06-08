-- เพิ่มคอลัมน์แพลตฟอร์ม (ที่มาของยอดขาย) ถ้าเคยสร้างตารางก่อนหน้า
alter table public.stock_movements add column if not exists platform text;
alter table public.products add column if not exists low_alerted boolean default false;
