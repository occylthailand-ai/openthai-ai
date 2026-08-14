import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ToastContext';
import AdminPage from '../pages/AdminPage';

// The Admin OPS tab now surfaces the per-endpoint AI cost breakdown from
// /api/ai-usage/admin/summary (#11). This pins that the panel renders the
// endpoint rows from the summary shape the backend actually returns, and that
// it degrades to the "run migration 003" note when logging isn't enabled.
const OPS = {
  success: true,
  cost_outbound: { ai_spent_today_usd: 0, ai_budget_usd: 1, ai_budget_used_pct: 0, ai_eco_mode: false, note: 'note' },
  revenue_inbound: { total_thb: 0 },
  negligence_signals: { dispute_overdue_count: 0, producer_pending_over_sla_count: 0, producer_pending_over_sla: [], dispute_sla_hours: 48 },
};

function mockFetch(aiUsage) {
  return vi.fn((url) => {
    const u = String(url);
    // Everything else returns success:false so those admin states stay null and
    // render their "—" fallbacks — we only care about the OPS tab here.
    let body = { success: false };
    if (u.includes('/api/admin/ops-summary')) body = OPS;
    else if (u.includes('/api/ai-usage/admin/summary')) body = aiUsage;
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  });
}

function renderAdmin() {
  return render(<MemoryRouter><ToastProvider><AdminPage /></ToastProvider></MemoryRouter>);
}

beforeEach(() => { sessionStorage.setItem('admin_ok', '1'); sessionStorage.setItem('admin_key', 'k'); });
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });

describe('Admin OPS tab — AI usage breakdown', () => {
  it('renders per-endpoint rows from the summary', async () => {
    global.fetch = mockFetch({
      success: true, enabled: true, sample_rows: 3, total_tokens: 1400, total_cost_usd: 0.0012, total_cost_thb: 0.04,
      by_endpoint: {
        '/api/generate-ab': { requests: 2, input_tokens: 1000, output_tokens: 300, cost_usd: 0.001, cost_thb: 0.03 },
        '/api/generate/stream': { requests: 1, input_tokens: 80, output_tokens: 20, cost_usd: 0.0002, cost_thb: 0.01 },
      },
      by_source: {},
    });
    renderAdmin();
    fireEvent.click(screen.getByRole('button', { name: /ต้นทุน\/คุณภาพ/ }));
    await waitFor(() => expect(screen.getByText('🧮 ต้นทุน AI แยกตาม endpoint')).toBeTruthy());
    expect(screen.getByText('/api/generate-ab')).toBeTruthy();
    expect(screen.getByText('/api/generate/stream')).toBeTruthy();
  });

  it('shows the migration note when logging is not enabled', async () => {
    global.fetch = mockFetch({ success: true, enabled: false, note: 'ตาราง ai_usage_log ยังไม่มี — รัน migration 003 ก่อน แล้วจึงเริ่มเก็บ log', rows: 0 });
    renderAdmin();
    fireEvent.click(screen.getByRole('button', { name: /ต้นทุน\/คุณภาพ/ }));
    await waitFor(() => expect(screen.getByText(/รัน migration 003/)).toBeTruthy());
  });
});
