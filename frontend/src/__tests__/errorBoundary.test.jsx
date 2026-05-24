import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

// A simple child that renders normally
function GoodChild() {
  return <div data-testid="good-child">All good</div>;
}

// A child that throws during render
function BadChild({ shouldThrow }) {
  if (shouldThrow) throw new Error('Test render error');
  return <div data-testid="bad-child">No error</div>;
}

describe('ErrorBoundary', () => {
  // Suppress the expected React error boundary console output during tests
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('good-child')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <BadChild shouldThrow />
      </ErrorBoundary>
    );
    // The Thai error heading should be visible
    expect(screen.getByText('เกิดข้อผิดพลาดที่ไม่คาดคิด')).toBeInTheDocument();
    // The original child should not be rendered
    expect(screen.queryByTestId('bad-child')).not.toBeInTheDocument();
  });

  it('shows the error message in the details block', () => {
    render(
      <ErrorBoundary>
        <BadChild shouldThrow />
      </ErrorBoundary>
    );
    // The pre tag inside <details> should contain the error string
    expect(screen.getByText(/Test render error/)).toBeInTheDocument();
  });

  it('does not show fallback when child does not throw', () => {
    render(
      <ErrorBoundary>
        <BadChild shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('bad-child')).toBeInTheDocument();
    expect(screen.queryByText('เกิดข้อผิดพลาดที่ไม่คาดคิด')).not.toBeInTheDocument();
  });

  it('renders reload and home buttons in the fallback UI', () => {
    render(
      <ErrorBoundary>
        <BadChild shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText(/โหลดใหม่/)).toBeInTheDocument();
    // "หน้าหลัก" appears in both body text and the button; use getAllByText
    const homeMatches = screen.getAllByText(/หน้าหลัก/);
    expect(homeMatches.length).toBeGreaterThanOrEqual(1);
    // At least one of them should be a button
    const homeButton = homeMatches.find((el) => el.tagName === 'BUTTON');
    expect(homeButton).toBeInTheDocument();
  });
});
