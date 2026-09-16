import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import DepartmentToolsPage from '../pages/corporate/DepartmentToolsPage';

const OVERVIEW = {
  success: true,
  stats: { requested_headings: 33, canonical_departments: 28, duplicate_headings: 4 },
  coverage_summary: { covered: 20, partial: 9, gap: 0 },
  policy_defaults: {
    record_guardrails_th: ['ไม่แก้บันทึกเดิมโดยไม่จำเป็น'],
  },
  departments: [
    {
      id: 'marketing',
      name_th: 'ฝ่ายการตลาด',
      name_en: 'Marketing',
      icon: '📣',
      cluster: 'growth',
      summary_th: 'วิเคราะห์ตลาดและแคมเปญ',
      request_count: 1,
      requests: [{ index: 2, label_th: 'ฝ่ายการตลาด' }],
      status: 'covered',
      skills: [{ id: 'S10', name: 'Trend Analyzer', status: 'active' }],
    },
  ],
};

const BRIEF = {
  success: true,
  source: 'registry',
  department_id: 'marketing',
  mission_th: 'วิเคราะห์ตลาดและแคมเปญ',
  suggested_tools: ['ตัววิเคราะห์แคมเปญและเทรนด์'],
  automation_flow: ['ค้นหาโจทย์จริง'],
  record_guardrails: ['ไม่แก้บันทึกเดิมโดยไม่จำเป็น'],
  first_action: 'เริ่มจาก campaign backlog',
};

function mockFetch(url) {
  const target = String(url);
  const body = target.includes('/develop-all')
    ? { success: true, briefs: [BRIEF] }
    : target.includes('/develop')
      ? BRIEF
      : OVERVIEW;
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(mockFetch)); });
afterEach(() => { vi.unstubAllGlobals(); });

const renderPage = () => render(<MemoryRouter><DepartmentToolsPage /></MemoryRouter>);

describe('DepartmentToolsPage', () => {
  it('renders overview stats and department card from the API', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/ฝ่ายการตลาด/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/33/).length).toBeGreaterThan(0);
    expect(screen.getByText(/ไม่แก้บันทึกเดิมโดยไม่จำเป็น/)).toBeTruthy();
  });

  it('generates a single department brief', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/ฝ่ายการตลาด/).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText(/สร้าง brief รายฝ่าย/));
    await waitFor(() => expect(screen.getByText(/เริ่มจาก campaign backlog/)).toBeTruthy());
    expect(screen.getByText(/ตัววิเคราะห์แคมเปญและเทรนด์/)).toBeTruthy();
  });

  it('filters departments and runs all briefs', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/ฝ่ายการตลาด/).length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText(/ค้นหาฝ่าย/), { target: { value: 'การตลาด' } });
    expect(screen.getAllByText(/ฝ่ายการตลาด/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText(/สร้าง brief อัตโนมัติทั้งชุด/));
    await waitFor(() => expect(screen.getByText(/เริ่มจาก campaign backlog/)).toBeTruthy());
  });

  it('shows an error message when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('down'))));
    renderPage();
    await waitFor(() => expect(screen.getByText(/โหลดข้อมูลเครื่องมือรายฝ่ายไม่สำเร็จ/)).toBeTruthy());
  });
});
