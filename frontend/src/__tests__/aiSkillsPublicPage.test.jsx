import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiSkillsPublicPage from '../pages/AiSkillsPublicPage';

// The public, indexable AI-skills showcase (reads GET /api/skills). It must: render the hero + live
// count, list skill names grouped by localized category, filter by the search box, funnel into
// /portals + /pricing, switch language, and — being a standalone page — degrade gracefully on error.
// It must NOT surface internal endpoint/method details (this is marketing, not the auth-gated catalog).

const PAYLOAD = {
  success: true, total: 35, active: 33, ai_engine: 'mock',
  skills: [
    { id: 'S1', name: 'RCCF Prompt',   category: 'content', endpoint: '/api/generate', method: 'POST', status: 'active' },
    { id: 'S7', name: 'SEO Optimizer', category: 'seo',     endpoint: '/api/seo',      method: 'POST', status: 'active' },
    { id: 'S9', name: 'Price Advisor',  category: 'pricing', endpoint: '/api/price',    method: 'POST', status: 'needs_key' },
  ],
};
function mockSkills(body, ok = true) {
  global.fetch = vi.fn(() => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }));
}
afterEach(() => { vi.restoreAllMocks(); });
const renderPage = () => render(<MemoryRouter><AiSkillsPublicPage /></MemoryRouter>);

describe('AiSkillsPublicPage', () => {
  it('renders the hero, the live count, and skill names grouped by category', async () => {
    mockSkills(PAYLOAD);
    renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/เครื่องมือ AI เพื่อการค้า/);
    await waitFor(() => expect(screen.getByText('RCCF Prompt')).toBeTruthy());
    expect(screen.getByText('SEO Optimizer')).toBeTruthy();
    expect(screen.getByText(/33\/35/)).toBeTruthy();                 // live active/total badge
    expect(screen.getAllByText(/คอนเทนต์/).length).toBeGreaterThan(0); // localized category label (content → th; also in the sub)
  });

  it('does NOT leak internal endpoint/method (marketing page, not the internal catalog)', async () => {
    mockSkills(PAYLOAD);
    renderPage();
    await waitFor(() => expect(screen.getByText('RCCF Prompt')).toBeTruthy());
    expect(screen.queryByText('/api/generate')).toBeNull();
    expect(screen.queryByText(/POST/)).toBeNull();
  });

  it('filters skills by the search box', async () => {
    mockSkills(PAYLOAD);
    renderPage();
    await waitFor(() => expect(screen.getByText('RCCF Prompt')).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/ค้นหา/), { target: { value: 'SEO' } });
    expect(screen.getByText('SEO Optimizer')).toBeTruthy();
    expect(screen.queryByText('RCCF Prompt')).toBeNull();           // filtered out
  });

  it('funnels into /portals and /pricing', async () => {
    mockSkills(PAYLOAD);
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByText('RCCF Prompt')).toBeTruthy());
    const hrefs = [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/portals');
    expect(hrefs).toContain('/pricing');
  });

  it('switches language to English (category labels + hero localize)', async () => {
    mockSkills(PAYLOAD);
    renderPage();
    await waitFor(() => expect(screen.getByText('RCCF Prompt')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/AI tools for commerce/);
    expect(screen.getByText(/Content/)).toBeTruthy();               // content → en label
  });

  it('degrades gracefully on a fetch error (hero + message, never blank)', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network')));
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/ยังโหลดรายการสดไม่ได้/)).toBeTruthy());
  });
});
