import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';

// Regression test for the footer navigation accessibility fix: the homepage
// footer's service/info links were bare <div onClick={navigate}> — not
// keyboard-focusable and not announced as links (WCAG 2.1.1 Keyboard,
// 4.1.2 Name/Role/Value). They must now be real <a href> links.
describe('LandingPage footer navigation accessibility', () => {
  beforeEach(() => {
    // LandingPage fetches /api/skills on mount; keep it from throwing in jsdom.
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: false }) })));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  function renderPage() {
    return render(<MemoryRouter><LandingPage /></MemoryRouter>);
  }

  // These are the internal footer route targets (mailto is a separate <a> already).
  const ROUTE_TARGETS = ['/ai-generator', '/pricing', '/store', '/catalog', '/find-producers', '/affiliate', '/join', '/showcase', '/seasonal', '/ai-skills', '/faq', '/about', '/privacy', '/terms'];

  it('renders footer internal nav items as real links with correct href', () => {
    renderPage();
    for (const target of ROUTE_TARGETS) {
      // getByRole('link') requires an <a> with href — a <div onClick> would not match.
      const link = document.querySelector(`a[href="${target}"]`);
      expect(link, `footer link for ${target}`).toBeTruthy();
      expect(link.tagName).toBe('A');
    }
  });

  it('makes footer links keyboard-focusable and SR-announced (role=link)', () => {
    renderPage();
    const links = screen.getAllByRole('link');
    // Every footer internal target is present among the accessible links.
    const hrefs = links.map((a) => a.getAttribute('href'));
    for (const target of ROUTE_TARGETS) {
      expect(hrefs).toContain(target);
    }
  });

  it('intercepts click for SPA navigation (preventDefault, no full reload)', () => {
    renderPage();
    const link = document.querySelector('a[href="/pricing"]');
    // fireEvent.click returns false when the handler called preventDefault.
    const notPrevented = fireEvent.click(link);
    expect(notPrevented).toBe(false);
  });
});
