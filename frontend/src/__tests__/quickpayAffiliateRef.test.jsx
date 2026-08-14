import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuickPayPage from '../pages/QuickPayPage';
import { REF_STORAGE_KEY } from '../lib/affiliateRef';

// Regression: a visitor arrives via an affiliate share link (…/?ref=CODE → homepage, ref persisted to
// localStorage 'otai_ref' by main.jsx) and then navigates client-side to /quickpay, whose URL no
// longer carries ?ref=. QuickPay used to read ONLY its own URL's ?ref=, so the /api/quickpay/create
// payload sent ref:'' and the affiliate got NO commission on the sale. The fix resolves the ref from
// the persisted otai_ref when the page URL has none. This asserts the real POST body on that path.
describe('QuickPay attributes to the persisted affiliate ref when the URL has none', () => {
  let fetchMock;
  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/api/quickpay/create')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, charge_id: 'mock_qp_1', amount_thb: 1000, qr_image_url: null, expires_at: new Date(Date.now() + 9e5).toISOString() }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); });

  function bodyOfCreateCall() {
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/quickpay/create'));
    return call ? JSON.parse(call[1].body) : null;
  }

  it('sends the stored otai_ref (no ?ref= on the /quickpay URL)', async () => {
    localStorage.setItem(REF_STORAGE_KEY, 'AFF999');
    const { getByText } = render(<MemoryRouter initialEntries={['/quickpay']}><QuickPayPage /></MemoryRouter>);
    fireEvent.click(getByText(/สร้าง QR รับเงิน/));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/quickpay/create'))).toBe(true));
    expect(bodyOfCreateCall().ref).toBe('AFF999');
  });

  it('sends empty ref when neither the URL nor storage has one (credits nobody)', async () => {
    const { getByText } = render(<MemoryRouter initialEntries={['/quickpay']}><QuickPayPage /></MemoryRouter>);
    fireEvent.click(getByText(/สร้าง QR รับเงิน/));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/quickpay/create'))).toBe(true));
    expect(bodyOfCreateCall().ref).toBe('');
  });
});
