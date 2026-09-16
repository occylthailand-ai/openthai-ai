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
    {
      id: 'finance',
      name_th: 'ฝ่ายการเงินและบัญชี',
      name_en: 'Finance and Accounting',
      icon: '💰',
      cluster: 'finance',
      summary_th: 'วิเคราะห์การเงิน',
      request_count: 2,
      requests: [{ index: 15, label_th: 'ฝ่ายการเงิน' }],
      status: 'partial',
      skills: [{ id: 'S23', name: 'Break-even Planner', status: 'active' }],
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

function failingFetch(kind) {
  return (url) => {
    const target = String(url);
    if (target.includes('/develop-all') && kind === 'all') {
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ success: false }) });
    }
    if (target.includes('/develop') && kind === 'single') {
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ success: false }) });
    }
    return mockFetch(url);
  };
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
    fireEvent.click(screen.getAllByText(/สร้าง brief รายฝ่าย/)[0]);
    await waitFor(() => expect(screen.getByText(/เริ่มจาก campaign backlog/)).toBeTruthy());
    expect(screen.getByText(/ตัววิเคราะห์แคมเปญและเทรนด์/)).toBeTruthy();
  });

  it('filters departments and runs all briefs', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/ฝ่ายการตลาด/).length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText(/ค้นหาฝ่าย/), { target: { value: 'การตลาด' } });
    expect(screen.getAllByText(/ฝ่ายการตลาด/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/ฝ่ายการเงินและบัญชี/)).toBeNull();
    fireEvent.click(screen.getByText(/สร้าง brief อัตโนมัติทั้งชุด/));
    await waitFor(() => expect(screen.getByText(/เริ่มจาก campaign backlog/)).toBeTruthy());
  });

  it('shows an error message when single brief generation fails', async () => {
    vi.stubGlobal('fetch', vi.fn(failingFetch('single')));
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/ฝ่ายการตลาด/).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText(/สร้าง brief รายฝ่าย/)[0]);
    await waitFor(() => expect(screen.getByText(/สร้าง brief รายฝ่ายไม่สำเร็จ/)).toBeTruthy());
  });

  it('shows an error message when batch brief generation fails', async () => {
    vi.stubGlobal('fetch', vi.fn(failingFetch('all')));
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/ฝ่ายการตลาด/).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText(/สร้าง brief อัตโนมัติทั้งชุด/));
    await waitFor(() => expect(screen.getByText(/สร้าง brief อัตโนมัติทั้งชุดไม่สำเร็จ/)).toBeTruthy());
  });

  it('shows an error message when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('down'))));
    renderPage();
    await waitFor(() => expect(screen.getByText(/โหลดข้อมูลเครื่องมือรายฝ่ายไม่สำเร็จ/)).toBeTruthy());
  });
});
