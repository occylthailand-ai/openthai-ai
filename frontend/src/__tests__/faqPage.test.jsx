import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FaqPage from '../pages/FaqPage';

// The public general FAQ. This test covers the COMPONENT's behaviour: it renders its questions,
// expands answers accessibly (role=button + aria-expanded, keyboard), funnels into /portals +
// /privacy, and localizes. The FAQPage JSON-LD is NOT emitted by this component — it is prerendered
// once into /faq/index.html by scripts/route-meta.mjs (see faqContent.test.js, which validates the
// schema's shape + honesty against the shared FAQ_ITEMS source). This component must therefore emit
// NO client-side FAQPage block, so a direct load doesn't end up with two (duplicate structured data).

afterEach(cleanup);
const renderPage = () => render(<MemoryRouter><FaqPage /></MemoryRouter>);
const faqJsonLdBlocks = () => [...document.querySelectorAll('script[type="application/ld+json"]')]
  .map((s) => { try { return JSON.parse(s.textContent); } catch { return null; } })
  .filter((d) => d && d['@type'] === 'FAQPage');

describe('FaqPage', () => {
  it('renders the heading and questions', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/คำถามที่พบบ่อย/);
    expect(screen.getByText('OpenThaiAi คืออะไร?')).toBeTruthy();
    expect(screen.getByText(/ข้อมูลของฉันปลอดภัยไหม/)).toBeTruthy();
  });

  it('emits NO client-side FAQPage block (the schema is prerendered once, not duplicated here)', () => {
    renderPage();
    expect(faqJsonLdBlocks().length).toBe(0);
  });

  it('expands an answer accessibly (role=button + aria-expanded, keyboard-operable)', () => {
    renderPage();
    const disclosures = screen.getAllByRole('button', { expanded: false });
    expect(disclosures.length).toBeGreaterThan(0);
    // the first FAQ is open by default; a collapsed one opens on Enter
    const collapsed = disclosures[0];
    fireEvent.keyDown(collapsed, { key: 'Enter' });
    expect(collapsed.getAttribute('aria-expanded')).toBe('true');
  });

  it('funnels into /portals and /privacy', () => {
    const { container } = renderPage();
    const hrefs = [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/portals');
    expect(hrefs).toContain('/privacy');
  });

  it('switches language to English', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Frequently asked questions/);
    expect(screen.getByText('What is OpenThaiAi?')).toBeTruthy();
  });
});
