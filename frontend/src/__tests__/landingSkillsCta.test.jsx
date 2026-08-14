import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';

// The homepage's AI-skills showcase has a "ดูทักษะทั้งหมด →" (See all skills) button. Its intent is
// EXPLORE, not sign-up — so it must land an anonymous visitor on the PUBLIC skills list (/ai-skills,
// "ดูรายการทั้งหมดก่อนสมัคร"), not on the login-gated /skills-catalog which bounces them to /login.
// This mirrors the real auth gate and fails if the CTA regresses to the gated route.

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockSkills() {
  global.fetch = vi.fn((u) => {
    if (String(u).includes('/api/skills')) {
      return Promise.resolve({ json: () => Promise.resolve({
        success: true, total: 35, active: 35, categories: ['content', 'sales'],
        skills: [{ id: 'S1', name: 'สคริปต์ TikTok' }, { id: 'S2', name: 'แคปชั่นขายของ' }],
      }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
}

const renderApp = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/ai-skills" element={<div>PUBLIC_SKILLS_LIST</div>} />
      {/* mirror the real app: /skills-catalog is auth-gated → anonymous is bounced to /login */}
      <Route path="/skills-catalog" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<div>LOGIN_WALL</div>} />
    </Routes>
  </MemoryRouter>
);

describe('LandingPage "ดูทักษะทั้งหมด" CTA', () => {
  it('sends an anonymous visitor to the PUBLIC skills list, not the login wall', async () => {
    mockSkills();
    renderApp();
    const cta = await waitFor(() => screen.getByRole('button', { name: /ดูทักษะทั้งหมด/ }));
    fireEvent.click(cta);
    await waitFor(() => expect(screen.getByText('PUBLIC_SKILLS_LIST')).toBeTruthy());
    expect(screen.queryByText('LOGIN_WALL')).toBeNull();
  });
});
