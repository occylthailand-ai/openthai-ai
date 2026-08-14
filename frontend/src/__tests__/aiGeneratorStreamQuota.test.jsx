import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ToastContext';

// The live-stream ("เขียนสด") path calls /api/generate/stream. Two regressions were
// possible once the backend started enforcing the daily quota on that endpoint:
//   1) it sent no auth headers, so a PAID user was treated as anonymous and wrongly
//      quota-limited (and bonus credits were ignored) on the stream path only;
//   2) a 429 (quota exhausted) showed a generic "stream failed" toast instead of the
//      same upgrade CTA the non-stream path gives, killing the upsell.
// These tests pin both: the stream request carries x-user-email + x-device-id, and a
// 429 routes the user to the upgrade page.
const navigateMock = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => navigateMock,
}));

import AIGeneratorPage from '../pages/AIGeneratorPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AIGeneratorPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

const streamCalls = [];

beforeEach(() => {
  streamCalls.length = 0;
  navigateMock.mockClear();
  localStorage.setItem('user_email', 'paid@example.com');
  global.fetch = vi.fn((url, opts = {}) => {
    const u = String(url);
    if (u.includes('/api/generate/stream')) {
      streamCalls.push(opts);
      return Promise.resolve({
        ok: false,
        status: 429,
        body: null,
        json: () => Promise.resolve({
          error: 'ใช้สิทธิ์ฟรีครบ 3 ชิ้นแล้ววันนี้ — อัพเกรดเป็น Pro',
          code: 'QUOTA_EXCEEDED', upgrade_url: '/payment?plan=pro',
        }),
      });
    }
    // /api/usage and any other GETs
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, plan: 'free', used: 3, limit: 3, remaining: 0 }) });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('AIGeneratorPage live-stream quota handling', () => {
  it('sends auth identity headers and routes a 429 to the upgrade page', async () => {
    const { container } = renderPage();

    // fill the product field (first .gen-input) so the stream button enables
    const productInput = container.querySelector('.gen-input');
    expect(productInput).toBeTruthy();
    fireEvent.change(productInput, { target: { value: 'น้ำพริกปลาย่าง' } });

    const streamBtn = screen.getByRole('button', { name: /เขียนแคปชั่นสด/ });
    fireEvent.click(streamBtn);

    await waitFor(() => expect(streamCalls.length).toBe(1));

    // (1) identity headers must be present so paid plans / bonus credits are honored
    const headers = streamCalls[0].headers || {};
    expect(headers['x-user-email']).toBe('paid@example.com');
    expect(headers['x-device-id']).toBeTruthy();

    // (2) 429 must send the user to the upgrade page (after the ~1.2s toast delay)
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/payment?plan=pro'), { timeout: 2500 });
  });
});
