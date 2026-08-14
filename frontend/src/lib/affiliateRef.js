// Affiliate-attribution linchpin. Every affiliate share link is `…/?ref=<CODE>`; when a visitor lands
// on any page, the ref must be persisted so a LATER purchase (StorePage reads localStorage 'otai_ref',
// QuickPay/shop checkout forward it, the backend credits the sale) attributes the commission to that
// affiliate. This logic used to live inline in main.jsx — un-importable and therefore untested, so a
// refactor that broke it (wrong key, wrong param, overwriting on a ref-less load) would silently kill
// ALL affiliate attribution with nothing to catch it. Extracted here, pure + injectable, and covered by
// src/__tests__/affiliateRef.test.js. Behaviour is byte-for-byte what main.jsx did before.
export const REF_STORAGE_KEY = 'otai_ref';

// Capture an affiliate ref from a URL query string into storage. Only writes when a ref is actually
// present, so a normal (ref-less) page load never wipes a ref captured on an earlier click — last
// non-empty ref wins (standard last-click attribution). Length-capped and error-swallowing like the
// original inline version. `search` is a location.search string; `storage` is a localStorage-like object.
// Returns the captured (capped) ref, or null when there was nothing to capture / on any failure.
export function captureAffiliateRef(search, storage) {
  try {
    const r = new URLSearchParams(search || '').get('ref');
    if (r) {
      const capped = r.slice(0, 20);
      storage.setItem(REF_STORAGE_KEY, capped);
      return capped;
    }
    return null;
  } catch {
    return null;
  }
}

// Resolve the affiliate ref to attribute a purchase to, for a checkout that happens on a page which
// may NOT carry `?ref=` in its own URL. The standard share link is `…/?ref=CODE`, which lands the
// visitor on the homepage (captureAffiliateRef persists it) and they then navigate — via client-side
// routing, so no `?ref=` on the new URL — to a paid page like /quickpay. Reading only the current
// URL's `?ref=` there loses the attribution; the persisted 'otai_ref' is the last-click record that
// must win. Prefer an explicit `?ref=` on THIS page (most immediate intent) and fall back to the
// stored ref — mirroring how StorePage already reads localStorage. Length-capped + error-swallowing
// like captureAffiliateRef. Returns '' when there is nothing to attribute.
export function resolveAffiliateRef(search, storage) {
  try {
    const urlRef = new URLSearchParams(search || '').get('ref');
    if (urlRef) return urlRef.slice(0, 20);
    const stored = storage && storage.getItem(REF_STORAGE_KEY);
    return stored ? String(stored).slice(0, 20) : '';
  } catch {
    return '';
  }
}
