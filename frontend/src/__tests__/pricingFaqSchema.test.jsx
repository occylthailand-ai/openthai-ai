import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ToastContext';
import PricingPage from '../pages/PricingPage';

// /pricing has a visible FAQ but carried no FAQPage structured data, so Google
// couldn't surface it as an FAQ rich result. PricingPage now emits FAQPage JSON-LD
// derived from the SAME `t('pp.faq')` array it renders. This test pins that the
// emitted schema stays valid and in sync with the visible Q&A (can't silently drift).
function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <PricingPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('/pricing FAQPage structured data', () => {
  it('emits one valid FAQPage JSON-LD block', () => {
    const { container } = renderPage();
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    const faqBlocks = [...scripts]
      .map((s) => JSON.parse(s.textContent))
      .filter((d) => d['@type'] === 'FAQPage');
    expect(faqBlocks).toHaveLength(1);
    const data = faqBlocks[0];
    expect(data['@context']).toBe('https://schema.org');
    expect(Array.isArray(data.mainEntity)).toBe(true);
    expect(data.mainEntity.length).toBeGreaterThan(0);
    for (const q of data.mainEntity) {
      expect(q['@type']).toBe('Question');
      expect(typeof q.name).toBe('string');
      expect(q.name.length).toBeGreaterThan(0);
      expect(q.acceptedAnswer['@type']).toBe('Answer');
      expect(q.acceptedAnswer.text.length).toBeGreaterThan(0);
    }
  });

  it('has exactly one Question per rendered FAQ disclosure (schema mirrors the visible FAQ)', () => {
    const { container } = renderPage();
    const faqDisclosures = screen.getAllByRole('button', { expanded: false });
    const data = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => JSON.parse(s.textContent))
      .find((d) => d['@type'] === 'FAQPage');
    expect(data.mainEntity).toHaveLength(faqDisclosures.length);
  });
});
