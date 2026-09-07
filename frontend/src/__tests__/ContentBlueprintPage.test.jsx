import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import ContentBlueprintPage from '../pages/ContentBlueprintPage';

// ── mock ผลลัพธ์ API ให้ตรง shape จริงของ /api/blueprint/tree และ /coverage ─────
const TREE = {
  success: true,
  meta: { title_en: 'OpenThaiAi Content Blueprint', version: 1, description_th: 'พิมพ์เขียวทดสอบ' },
  maslow_levels: [
    { id: 'L1', name_th: 'กายภาพ', name_en: 'Physiological', items_th: ['อาหาร'], digital_th: ['Food Delivery'] },
  ],
  maslow_notes: [{ id: 'N1', name_th: 'ความยืดหยุ่น', text_th: 'ข้ามขั้นได้' }],
  domains: [
    {
      id: 'D2', icon: '🌾', name_th: 'ระบบอาหารและนวัตกรรมเกษตร', name_en: 'Food Systems & AgTech', maslow: ['L1'],
      sections: [{ id: 'D2.1', name_th: 'ต้นน้ำ', name_en: 'AgTech & Sourcing', items: [{ th: 'เกษตรแม่นยำ' }] }],
    },
  ],
};
const COVERAGE = {
  success: true,
  summary: { covered: 1, partial: 0, gap: 0 },
  domains: [
    {
      id: 'D2', status: 'covered', active_skills: 4,
      skills: [{ id: 'S19', name: 'Supply Chain AI', status: 'active', found: true }],
      routes: ['/catalog'],
      next_steps_th: ['เพิ่มหมวดสินค้าเกษตร'],
    },
  ],
};

function mockFetch(url) {
  const body = String(url).includes('/coverage') ? COVERAGE
    : String(url).includes('/develop') ? { success: true, source: 'mock', content_ideas: ['ไอเดีย 1'], skill_suggestions: ['สกิล 1'], catalog_categories: ['หมวด 1'], first_action: 'เริ่มเลย' }
      : TREE;
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(mockFetch)); });
afterEach(() => { vi.unstubAllGlobals(); });

const renderPage = () => render(<MemoryRouter><ContentBlueprintPage /></MemoryRouter>);

describe('ContentBlueprintPage', () => {
  it('renders maslow level and domain card from the API', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/กายภาพ/)).toBeTruthy());
    expect(screen.getByText(/ระบบอาหารและนวัตกรรมเกษตร/)).toBeTruthy();
    expect(screen.getByText(/มีสกิลรองรับแล้ว/)).toBeTruthy();
  });

  it('expands a domain to show sections, skills, and next steps', async () => {
    renderPage();
    await waitFor(() => screen.getByText(/ระบบอาหารและนวัตกรรมเกษตร/));
    fireEvent.click(screen.getByText(/ระบบอาหารและนวัตกรรมเกษตร/));
    expect(screen.getByText(/เกษตรแม่นยำ/)).toBeTruthy();
    expect(screen.getByText(/S19 Supply Chain AI/)).toBeTruthy();
    expect(screen.getByText(/เพิ่มหมวดสินค้าเกษตร/)).toBeTruthy();
  });

  it('requests a development brief and renders it', async () => {
    renderPage();
    await waitFor(() => screen.getByText(/ระบบอาหารและนวัตกรรมเกษตร/));
    fireEvent.click(screen.getByText(/ระบบอาหารและนวัตกรรมเกษตร/));
    fireEvent.click(screen.getByText(/สร้างแผนพัฒนาต่อยอด/));
    await waitFor(() => expect(screen.getByText(/เริ่มเลย/)).toBeTruthy());
    expect(screen.getByText(/ไอเดีย 1/)).toBeTruthy();
  });

  it('shows an error message when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('down'))));
    renderPage();
    await waitFor(() => expect(screen.getByText(/โหลดพิมพ์เขียวไม่สำเร็จ/)).toBeTruthy());
  });
});
