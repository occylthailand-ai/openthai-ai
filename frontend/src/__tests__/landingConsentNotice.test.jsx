import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';

// PDPA: the homepage email capture is a weekly marketing newsletter ("ส่งทุกอาทิตย์"). Collecting an
// email for marketing must inform the subscriber and reference the privacy policy at the point of
// collection — every other PII capture already does (portal signups gate on a consent checkbox, the
// /contact form carries the same microtext). This pins that the notice exists and its link works.
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockFetch() {
  global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: false }) }));
}

const renderApp = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<div>PRIVACY_POLICY_PAGE</div>} />
    </Routes>
  </MemoryRouter>
);

describe('LandingPage newsletter consent notice (PDPA)', () => {
  it('shows a consent notice at the email-capture point', () => {
    mockFetch();
    renderApp();
    expect(screen.getByText(/ยอมรับ/)).toBeTruthy();
    // the privacy link is present and reachable by its label
    expect(screen.getByRole('button', { name: /นโยบายความเป็นส่วนตัว/ })).toBeTruthy();
  });

  it('the privacy link navigates to the privacy policy page', () => {
    mockFetch();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /นโยบายความเป็นส่วนตัว/ }));
    expect(screen.getByText('PRIVACY_POLICY_PAGE')).toBeTruthy();
  });
});
