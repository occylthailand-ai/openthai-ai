import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import NotFoundPage from '../pages/NotFoundPage';

// The 404 page's recovery CTAs must lead a LOST ANONYMOUS visitor (the typical 404 hitter —
// mistyped/old/spam-crawled URL) into the PUBLIC funnel, not into a login wall. The secondary
// CTA used to point at /ai-generator, which is auth-gated (App.jsx: isAuthenticated ? … :
// <Navigate to="/login" />), so an anonymous click dead-ended on /login. This test wires up the
// same gate and asserts the CTA lands on a public page instead — it fails if the target regresses
// to a login-gated route.
afterEach(cleanup);

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        {/* public showcase of the AI tools — reachable without login */}
        <Route path="/ai-skills" element={<div>PUBLIC_AI_SKILLS</div>} />
        {/* mirror the real app: the generator is auth-gated → anonymous is bounced to /login */}
        <Route path="/ai-generator" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<div>LOGIN_WALL</div>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('NotFoundPage recovery CTAs (no login dead-ends for anonymous visitors)', () => {
  it('primary CTA returns to the home page', () => {
    renderAt('/some-broken-url');
    fireEvent.click(screen.getByRole('button', { name: /กลับหน้าหลัก/ }));
    expect(screen.getByText('HOME')).toBeTruthy();
  });

  it('secondary CTA leads to a PUBLIC page, not the login wall', () => {
    renderAt('/another-broken-url');
    fireEvent.click(screen.getByRole('button', { name: /เครื่องมือ AI/ }));
    expect(screen.getByText('PUBLIC_AI_SKILLS')).toBeTruthy();
    expect(screen.queryByText('LOGIN_WALL')).toBeNull();
  });
});
