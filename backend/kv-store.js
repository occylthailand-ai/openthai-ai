// Openthai.ai — Durable KV store (Supabase) + file fallback
// ─────────────────────────────────────────────────────────────────────────────
// ปัญหา: บน serverless (Vercel) ไฟล์ /tmp หายเมื่อ cold start → ledger สำคัญ
//        (payments, entitlements) สูญหาย
// แก้:    มิเรอร์ JSON blob ไปเก็บใน Supabase ตาราง kv_store (durable) ทุกครั้งที่ save
//        และ "hydrate" กลับเข้าหน่วยความจำตอน boot ถ้าไฟล์ว่าง
//
// เปิดใช้อัตโนมัติเมื่อมี SUPABASE_URL + SUPABASE_SERVICE_KEY; ไม่งั้น = no-op (ใช้ไฟล์ตามเดิม)
// ตาราง: ดู backend/migrations/005_kv_store.sql

const TABLE = 'kv_store';

export function createKVStore() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const useSB = !!(url && key);

  async function sb(method, path, { body, params, prefer } = {}) {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    const res = await fetch(`${url}/rest/v1/${path}${qs}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && (data.message || data.hint)) || `Supabase HTTP ${res.status}`);
    return data;
  }

  // ดึงค่า JSON ของ key (null ถ้าไม่มี หรือไม่ได้เปิดใช้ Supabase)
  async function pull(k) {
    if (!useSB) return null;
    try {
      const r = await sb('GET', TABLE, { params: { key: `eq.${k}`, select: 'value', limit: '1' } });
      return (r && r[0]) ? r[0].value : null;
    } catch (e) {
      console.warn('[kv] pull', k, e.message);
      return null;
    }
  }

  // เขียนค่า JSON (upsert) — best-effort, ไม่โยน error ออกไป (ไม่ให้กระทบ flow หลัก)
  async function push(k, value) {
    if (!useSB) return false;
    try {
      await sb('POST', TABLE, {
        body: [{ key: k, value, updated_at: new Date().toISOString() }],
        params: { on_conflict: 'key' },
        prefer: 'resolution=merge-duplicates,return=minimal',
      });
      return true;
    } catch (e) {
      console.warn('[kv] push', k, e.message);
      return false;
    }
  }

  return { useSB, pull, push };
}
