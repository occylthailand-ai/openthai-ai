import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SeasonalAnglesPanel from '../pages/portals/SeasonalAnglesPanel';

// The seasonal value panel embedded in every /portals/* page. It pulls the deterministic
// GET /api/seasonal/angles and shows THIS group the season + a tailored play + product angles,
// so a first-time visitor sees real value fast. Two invariants matter most: (1) it renders the
// group-specific play and the angles from the real API shape; (2) it is purely additive — on any
// error/empty it renders NOTHING, so it can never break the portal it sits in.

const PAYLOAD = {
  success: true,
  date: '2026-07-24',
  zone: 'tropical',
  zone_th: 'เขตร้อน (ไทย/อาเซียน)',
  solar_term: { cn: '大暑', th: 'ต้าสู่ (ร้อนใหญ่)' },
  local_season: { key: 'rainy', th: 'ฤดูฝน (เขตร้อน)' },
  angles: [
    { category: 'rain_gear', category_th: 'ร่ม/เสื้อกันฝน', trend: 'eco', trend_th: 'ความยั่งยืน/รักษ์โลก', angle: 'ร่ม/เสื้อกันฝน — ใช้ซ้ำได้/รีไซเคิล', why: 'หน้าฝน + กระแสรักษ์โลก' },
    { category: 'rain_gear', category_th: 'ร่ม/เสื้อกันฝน', trend: 'digital', trend_th: 'ดิจิทัล/ไลฟ์สตรีมช้อป', angle: 'ร่ม/เสื้อกันฝน — ขายผ่านไลฟ์', why: 'พฤติกรรมไลฟ์โต' },
  ],
  group_plays: {
    producer: 'ผลิตสินค้าหน้าฝนเข้าเทรนด์',
    affiliate: 'ทำคอนเทนต์ angle หน้าฝน โพสต์ก่อนพีค',
    consumer: 'ของคุ้มหน้าฝน',
  },
  note: 'เชิงกำหนดได้ ไม่ใช้ LLM ไม่ scrape',
};

function mockFetchOnce(body, ok = true) {
  global.fetch = vi.fn(() => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }));
}

afterEach(() => { vi.restoreAllMocks(); });

describe('SeasonalAnglesPanel', () => {
  it('renders the season, the group-specific play, and the angles from the API', async () => {
    mockFetchOnce(PAYLOAD);
    render(<SeasonalAnglesPanel group="affiliate" lang="th" />);
    await waitFor(() => expect(screen.getByTestId('seasonal-angles')).toBeTruthy());
    // season header
    expect(screen.getByText(/ต้าสู่/)).toBeTruthy();
    expect(screen.getByText(/ฤดูฝน/)).toBeTruthy();
    // the AFFILIATE play (not the producer/consumer one)
    expect(screen.getByText(/ทำคอนเทนต์ angle หน้าฝน/)).toBeTruthy();
    // at least one angle + its trend tag
    expect(screen.getByText(/ใช้ซ้ำได้\/รีไซเคิล/)).toBeTruthy();
    expect(screen.getAllByText(/รักษ์โลก/).length).toBeGreaterThan(0); // trend tag + "why" both mention it
  });

  it('shows the play for the requested group (consumer)', async () => {
    mockFetchOnce(PAYLOAD);
    render(<SeasonalAnglesPanel group="consumer" lang="th" />);
    await waitFor(() => expect(screen.getByTestId('seasonal-angles')).toBeTruthy());
    expect(screen.getByText(/ของคุ้มหน้าฝน/)).toBeTruthy();
  });

  it('calls the angles endpoint with the given zone AND the requested language', async () => {
    mockFetchOnce(PAYLOAD);
    render(<SeasonalAnglesPanel group="producer" lang="en" zone="north_temperate" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = String(global.fetch.mock.calls[0][0]);
    expect(url).toMatch(/\/api\/seasonal\/angles\?zone=north_temperate/);
    expect(url).toMatch(/[?&]lang=en/); // language must reach the backend so the content is localized
  });

  it('renders the LOCALIZED labels (en) when the API returns *_label fields', async () => {
    // Real localized shape from GET /api/seasonal/angles?lang=en — the panel must prefer the
    // language-neutral *_label / .label fields over the always-Thai _th fields.
    const EN_PAYLOAD = {
      success: true, date: '2026-07-24', zone: 'tropical', lang: 'en',
      zone_th: 'เขตร้อน', zone_label: 'Tropical zone (Thailand / ASEAN / equatorial)',
      solar_term: { cn: '大暑', th: 'ต้าสู่ (ร้อนใหญ่)', label: 'Major Heat' },
      local_season: { key: 'rainy', th: 'ฤดูฝน (เขตร้อน)', label: 'Rainy season (tropical)' },
      angles: [
        { category: 'rain_gear', category_th: 'ร่ม/เสื้อกันฝน', category_label: 'Rain gear',
          trend: 'eco', trend_th: 'ความยั่งยืน/รักษ์โลก', trend_label: 'Sustainability / eco',
          angle: 'Rain gear — Reusable / recyclable / refillable — less waste', why: 'Rainy season; stay dry + Eco-consciousness drives choices' },
      ],
      group_plays: { producer: 'Make/adapt Rainy season products to fit the trends', affiliate: 'Create content around the angles below' },
      note: 'deterministic, no LLM, no scraping',
    };
    mockFetchOnce(EN_PAYLOAD);
    render(<SeasonalAnglesPanel group="affiliate" lang="en" />);
    await waitFor(() => expect(screen.getByTestId('seasonal-angles')).toBeTruthy());
    expect(screen.getByText(/Major Heat/)).toBeTruthy();          // localized solar term
    expect(screen.getByText(/Rainy season \(tropical\)/)).toBeTruthy(); // localized season
    expect(screen.getByText(/Create content around the angles/)).toBeTruthy(); // localized affiliate play
    expect(screen.getByText(/Sustainability \/ eco/)).toBeTruthy(); // localized trend tag
    expect(screen.getByText(/Rain gear — Reusable/)).toBeTruthy();  // localized angle text
    // and NOT the Thai fallbacks
    expect(screen.queryByText(/ต้าสู่/)).toBeNull();
  });

  it('renders NOTHING when the API returns no angles (purely additive, never breaks the page)', async () => {
    mockFetchOnce({ success: true, angles: [] });
    const { container } = render(<SeasonalAnglesPanel group="producer" lang="th" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('[data-testid="seasonal-angles"]')).toBeNull();
  });

  it('renders NOTHING when the fetch throws (graceful, no crash)', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network')));
    const { container } = render(<SeasonalAnglesPanel group="producer" lang="th" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('[data-testid="seasonal-angles"]')).toBeNull();
  });
});
