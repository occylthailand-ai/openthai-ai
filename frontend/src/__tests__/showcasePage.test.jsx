import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShowcasePage from '../pages/ShowcasePage';

// The public /showcase tour. Asserts the honest, load-bearing pieces render: the hero, the four
// trust differentiators, the explore links (SPA vs backend routes), and — crucially — the honest
// "ready now vs in progress" roadmap (transparency is the point, so it must actually show).

// Stub the seasonal panel's fetch so the embedded live block resolves deterministically.
function mockSeasonal() {
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({
    success: true, date: '2026-07-24', zone: 'tropical', zone_th: 'เขตร้อน',
    solar_term: { cn: '大暑', th: 'ต้าสู่' }, local_season: { key: 'rainy', th: 'ฤดูฝน' },
    angles: [{ category: 'rain_gear', category_th: 'ร่ม', trend: 'eco', trend_th: 'รักษ์โลก', angle: 'ร่มใช้ซ้ำ', why: 'หน้าฝน' }],
    group_plays: { producer: 'ผลิตของหน้าฝน' },
  }) }));
}
afterEach(() => { vi.restoreAllMocks(); });
const renderPage = () => render(<MemoryRouter><ShowcasePage /></MemoryRouter>);

describe('ShowcasePage', () => {
  it('renders the hero + the four trust differentiators', () => {
    mockSeasonal();
    renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/มาชมสิ่งที่เราสร้างจริง/);
    expect(screen.getByText(/ขอความยินยอมก่อนเสมอ/)).toBeTruthy();
    expect(screen.getByText(/ไม่ scrape/)).toBeTruthy();
    expect(screen.getByText(/ทำงานได้แม้ AI ล่ม/)).toBeTruthy();
    expect(screen.getByText(/เปิดสมุดบันทึก/)).toBeTruthy();
  });

  it('links to the real routes — SPA (/portals, /privacy) and backend (/tool, /api-docs)', () => {
    mockSeasonal();
    const { container } = renderPage();
    const hrefs = [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    for (const r of ['/tool', '/api-docs']) expect(hrefs).toContain(r); // backend pages → real <a>
    // SPA routes rendered by react-router <Link> also become anchors in the DOM
    for (const r of ['/portals', '/privacy']) expect(hrefs).toContain(r);
  });

  it('shows the honest "ready now vs in progress" roadmap (transparency is the point)', () => {
    mockSeasonal();
    renderPage();
    expect(screen.getByText(/พร้อมใช้แล้ว/)).toBeTruthy();
    expect(screen.getByText(/กำลังทำต่อ/)).toBeTruthy();
    expect(screen.getByText(/v9.0/)).toBeTruthy();            // honest about the scaffold
    expect(screen.getByText(/migration/)).toBeTruthy();        // honest about pending durability
  });

  it('embeds the live seasonal block (fetches /api/seasonal/angles)', async () => {
    mockSeasonal();
    renderPage();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(String(global.fetch.mock.calls[0][0])).toMatch(/\/api\/seasonal\/angles/);
  });

  it('switches language to English', () => {
    mockSeasonal();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Come see what we actually built/);
  });
});
