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
    return { ok: false, code: data?.code || null, error: data?.error || null, status: res.status };
  }
  return { ok: true, id: data.id };
}

// The backend's `error` string is Thai-only, so showing it raw leaked Thai onto the
// international portals (intl-org / gov-intl default to en/zh): an English or Chinese
// applicant who tripped the 10-per-15-min rate limiter, or otherwise got a 4xx, saw a Thai
// error on the signup form. The backend now sends a stable `code` alongside that message
// (see backend/portal-leads.js); we localize by code here so every applicant sees the error
// in their own language. Codes we know are localized below; anything else (or no code at all —
// network failure, unparseable body, a future backend code) falls back to the localized
// generic. We deliberately never surface the raw server string, so no new backend message can
// leak untranslated Thai to a non-Thai visitor.
const ERR = {
  consent_required: {
    th: 'ต้องยินยอมตามนโยบายความเป็นส่วนตัว (PDPA) ก่อนส่งข้อมูล',
    en: 'Please agree to the Privacy Policy (PDPA) before submitting.',
    zh: '提交前请先同意隐私政策（PDPA）。',
  },
  missing_contact: {
    th: 'กรอกข้อมูลอย่างน้อยชื่อหรืออีเมลให้ครบ',
    en: 'Please provide at least a name or an email.',
    zh: '请至少填写姓名或电子邮箱。',
  },
  rate_limited: {
    th: 'ส่งฟอร์มบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
    en: 'Too many submissions. Please wait a few minutes and try again.',
    zh: '提交太频繁，请稍候几分钟后重试。',
  },
};

// Localized fallback used when there is no known code (network failure, unparseable body,
// or an unrecognized/absent backend code).
const GENERIC_ERR = {
  th: 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  en: 'Could not submit. Please try again.',
  zh: '提交失败，请重试。',
};

export function leadError(result, lang) {
  const byCode = result && result.code && ERR[result.code];
  if (byCode) return byCode[lang] || byCode.th;
  return GENERIC_ERR[lang] || GENERIC_ERR.th;
}

