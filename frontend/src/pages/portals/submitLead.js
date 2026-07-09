import { apiUrl } from '../../apiBase';

// Shared submit for every /portals/* consent funnel — they all POST the same
// shape to /api/leads/submit. Previously each page did
//   try { await fetch(...) } catch {}; setSent(true)
// which showed the ✅ "we'll email you" success screen even when the backend
// rejected the lead (400 = missing consent / invalid email, 429 = rate limit
// 10/15min, 500 = server error). fetch() does NOT throw on a 4xx/5xx, so the
// empty catch never fired and a consenting applicant was told they were signed
// up while no lead was actually saved. This helper reports real success/failure
// so the caller can show an honest error instead of a fake success.
//
// Returns { ok: true, id } on a genuinely saved lead, or
// { ok: false, error, status, network } on any failure. `error` is the
// backend's own (Thai) message when available; the caller falls back to a
// localized generic message when it isn't (network failure, unparseable body).
export async function submitLead(payload) {
  let res;
  try {
    res = await fetch(apiUrl('/api/leads/submit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: null, network: true };
  }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok || !data || data.success !== true) {
    return { ok: false, error: data?.error || null, status: res.status };
  }
  return { ok: true, id: data.id };
}

// Localized fallback used when the backend didn't send its own message
// (network failure or unparseable body). Prefer the server's Thai message.
const GENERIC_ERR = {
  th: 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  en: 'Could not submit. Please try again.',
  zh: '提交失败，请重试。',
};
export function leadError(result, lang) {
  return result.error || GENERIC_ERR[lang] || GENERIC_ERR.th;
}

