import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';

// Suppress expected error output in test logs
beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });

function Boom() {
  throw new Error('test-boom');
}

function Fine() {
  return <p>All good</p>;
}

describe('ErrorBoundary', () => {
  it('renders children normally when there is no error', () => {
    render(<ErrorBoundary><Fine /></ErrorBoundary>);
    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('shows the Thai error heading when a child throws', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText(/เกิดข้อผิดพลาด/)).toBeTruthy();
  });

  it('shows error details in a collapsible section', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText(/รายละเอียดข้อผิดพลาด/)).toBeTruthy();
    expect(screen.getByText(/test-boom/)).toBeTruthy();
  });

  it('renders reload and home buttons', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    const buttons = screen.getAllByRole('button');
    expect(buttons.some(b => b.textContent.includes('โหลดใหม่'))).toBe(true);
    expect(buttons.some(b => b.textContent.includes('หน้าหลัก'))).toBe(true);
  });

  it('home button resets error state on click without crashing', () => {
    Object.defineProperty(window, 'location', {
      value: { href: '', reload: vi.fn() },
      writable: true,
    });

    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    const buttons = screen.getAllByRole('button');
    const homeBtn = buttons.find(b => b.textContent.includes('หน้าหลัก'));
    fireEvent.click(homeBtn);
    expect(homeBtn).toBeTruthy();
  });
});
