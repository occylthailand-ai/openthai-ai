import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SeasonalPage from '../pages/SeasonalPage';

// The public, indexable /seasonal content page. It pulls the FULL deterministic recommendation
// (GET /api/seasonal/recommend, zone=tropical) and must: render the localized season/term + the
// next-term countdown, list every category with its "why", show a play for each group, request the
// endpoint in the current UI language, funnel into /portals + /showcase, and — being a standalone
// page (not the additive panel) — still render meaningful chrome + a graceful message on fetch error.

const PAYLOAD = {
  success: true, date: '2026-07-24', zone: 'tropical', lang: 'th',
  zone_th: 'เขตร้อน', zone_label: 'เขตร้อน (ไทย/อาเซียน/เส้นศูนย์สูตร)',
  solar_term: { cn: '大暑', th: 'ต้าสู่ (ร้อนใหญ่)', en: 'Major Heat', label: 'ต้าสู่ (ร้อนใหญ่)' },
  local_season: { key: 'rainy', th: 'ฤดูฝน (เขตร้อน)', label: 'ฤดูฝน (เขตร้อน)' },
  categories: [
    { key: 'rain_gear', th: 'ร่ม/เสื้อกันฝน', en: 'Rain gear', zh: '雨伞/雨衣', why: 'ฤดูฝน ป้องกันเปียก', why_en: 'Rainy season; stay dry', why_zh: '雨季，防湿' },
    { key: 'quick_dry', th: 'เสื้อผ้าแห้งเร็ว', en: 'Quick-dry', zh: '速干衣', why: 'ผ้าแห้งยาก', why_en: 'Clothes dry slowly', why_zh: '衣物难干' },
  ],
  top_categories: ['rain_gear', 'quick_dry'],
  group_actions: {
    producer: 'เตรียมผลิต/สต๊อกหมวด: ร่ม/เสื้อกันฝน', middleman: 'กระจายเข้าเขตร้อน',
    affiliate: 'ทำคอนเทนต์หน้าฝน', partner_agent: 'เสนอดีล B2B/B2G', consumer: 'ของคุ้มหน้าฝน',
  },
  next_term: { cn: '立秋', th: 'ลี่ชิว (เข้าฤดูใบไม้ร่วง)', en: 'Start of Autumn', approx_start: '8/8', days_until: 15 },
  note: 'เชิงกำหนดได้ ไม่ใช้ LLM ไม่ scrape',
};

function mockFetch(body, ok = true) {
  global.fetch = vi.fn(() => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }));
}
afterEach(() => { vi.restoreAllMocks(); });
const renderPage = () => render(<MemoryRouter><SeasonalPage /></MemoryRouter>);

describe('SeasonalPage', () => {
  it('renders the season + next-term countdown + every category with its why', async () => {
    mockFetch(PAYLOAD);
    renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/สินค้ามาแรงตามฤดูกาล/);
    await waitFor(() => expect(screen.getByText(/ฤดูฝน \(เขตร้อน\)/)).toBeTruthy());
    expect(screen.getByText(/ต้าสู่/)).toBeTruthy();
    expect(screen.getByText(/ลี่ชิว/)).toBeTruthy();          // next term
    expect(screen.getByText(/ในอีก 15 วัน/)).toBeTruthy();     // countdown
    expect(screen.getAllByText(/ร่ม\/เสื้อกันฝน/).length).toBeGreaterThan(0); // category name (also echoed in the producer action)
    expect(screen.getByText(/ป้องกันเปียก/)).toBeTruthy();     // category why
  });

  it('shows a play for each of the five groups', async () => {
    mockFetch(PAYLOAD);
    renderPage();
    await waitFor(() => expect(screen.getByText(/เตรียมผลิต\/สต๊อกหมวด/)).toBeTruthy());
    expect(screen.getByText(/ทำคอนเทนต์หน้าฝน/)).toBeTruthy();  // affiliate
    expect(screen.getByText(/ของคุ้มหน้าฝน/)).toBeTruthy();     // consumer
  });

  it('requests the recommend endpoint in the current UI language', async () => {
    mockFetch(PAYLOAD);
    renderPage();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = String(global.fetch.mock.calls[0][0]);
    expect(url).toMatch(/\/api\/seasonal\/recommend\?zone=tropical/);
    expect(url).toMatch(/[?&]lang=th/);
  });

  it('re-fetches in English and localizes the content when the language switches', async () => {
    // First load (th), then switch to en: the component must refetch with lang=en and render en data.
    const EN = { ...PAYLOAD, lang: 'en', local_season: { key: 'rainy', th: 'ฤดูฝน', label: 'Rainy season (tropical)' },
      solar_term: { ...PAYLOAD.solar_term, label: 'Major Heat' },
      group_actions: { ...PAYLOAD.group_actions, producer: 'Prepare production/stock for: Rain gear' } };
    global.fetch = vi.fn((u) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(String(u).includes('lang=en') ? EN : PAYLOAD) }));
    renderPage();
    await waitFor(() => expect(screen.getByText(/ฤดูฝน \(เขตร้อน\)/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/What sells by season/);
    await waitFor(() => expect(screen.getByText(/Rainy season \(tropical\)/)).toBeTruthy());
    expect(screen.getAllByText(/Rain gear/).length).toBeGreaterThan(0); // localized category (client-side pick)
    expect(screen.getByText(/Prepare production\/stock/)).toBeTruthy(); // localized group action (server)
  });

  it('funnels into /portals and /showcase', async () => {
    mockFetch(PAYLOAD);
    const { container } = renderPage();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const hrefs = [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/portals');
    expect(hrefs).toContain('/showcase');
  });

  it('degrades gracefully on a fetch error — chrome + a helpful message, never a blank page', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network')));
    renderPage();
    // The hero (static chrome) is always there…
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    // …and the offline explanation shows instead of the live block.
    await waitFor(() => expect(screen.getByText(/ยังดึงข้อมูลสดไม่ได้/)).toBeTruthy());
  });
});
