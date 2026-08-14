import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ToastContext';
import AffiliatePage from '../pages/AffiliatePage';
import PricingPage from '../pages/PricingPage';

// Regression test for the FAQ-accordion accessibility fix: the disclosures on
// the two public funnel pages (/affiliate, /pricing) were bare <div onClick>
// elements — operable only with a mouse. They must now be keyboard- and
// screen-reader-operable (role="button", tabIndex, aria-expanded, Enter/Space).
function renderPage(Page) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Page />
      </ToastProvider>
    </MemoryRouter>,
  );
}

// FAQ disclosures are the only role="button" elements carrying aria-expanded,
// so { expanded: false } selects exactly them (real <button>s have no aria-expanded).
function faqDisclosures() {
  return screen.getAllByRole('button', { expanded: false });
}

describe.each([
  ['/affiliate', AffiliatePage],
  ['/pricing', PricingPage],
])('FAQ accordion keyboard accessibility (%s)', (route, Page) => {
  it('renders FAQ disclosures that are focusable and expose collapsed state', () => {
    renderPage(Page);
    const items = faqDisclosures();
    expect(items.length).toBeGreaterThan(0);
    for (const el of items) {
      expect(el).toHaveAttribute('tabindex', '0');
      expect(el).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('toggles a disclosure open/closed with the Enter key', () => {
    renderPage(Page);
    const first = faqDisclosures()[0];
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(first).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles a disclosure open with the Space key (and prevents page scroll)', () => {
    renderPage(Page);
    const first = faqDisclosures()[0];
    // fireEvent.keyDown returns false when the handler called preventDefault
    // (Space must not scroll the page), and drives React's synthetic onKeyDown.
    const notPrevented = fireEvent.keyDown(first, { key: ' ' });
    expect(notPrevented).toBe(false);
    expect(first).toHaveAttribute('aria-expanded', 'true');
  });

  it('reveals answer text only after the question is activated', () => {
    renderPage(Page);
    const first = faqDisclosures()[0];
    // Before opening, the row shows the collapsed marker ▼; after Enter, ▲.
    expect(within(first).queryByText('▼')).toBeTruthy();
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(within(first).queryByText('▲')).toBeTruthy();
  });
});
