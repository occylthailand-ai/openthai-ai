import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ToastContext';
import PricingPage from '../pages/PricingPage';
import AffiliatePage from '../pages/AffiliatePage';

// /pricing and /affiliate both render a visible FAQ but carried no FAQPage
// structured data, so Google couldn't surface them as FAQ rich results. Each page
// now emits FAQPage JSON-LD derived from the SAME faq array it renders. These tests
// pin that the emitted schema stays valid and in sync with the visible Q&A on both
// core conversion pages (so it can't silently drift).
function renderPage(Page) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Page />
      </ToastProvider>
    </MemoryRouter>,
  );
}

function faqBlocks(container) {
  return [...container.querySelectorAll('script[type="application/ld+json"]')]
    .map((s) => JSON.parse(s.textContent))
    .filter((d) => d['@type'] === 'FAQPage');
}

describe.each([
  ['/pricing', PricingPage],
  ['/affiliate', AffiliatePage],
])('FAQPage structured data (%s)', (route, Page) => {
  it('emits exactly one valid FAQPage JSON-LD block', () => {
    const { container } = renderPage(Page);
    const blocks = faqBlocks(container);
    expect(blocks).toHaveLength(1);
    const data = blocks[0];
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
    const { container } = renderPage(Page);
    const disclosures = screen.getAllByRole('button', { expanded: false });
    expect(faqBlocks(container)[0].mainEntity).toHaveLength(disclosures.length);
  });
});
