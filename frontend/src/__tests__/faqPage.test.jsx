import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FaqPage from '../pages/FaqPage';

// The public general FAQ. It must: render its questions; emit exactly one valid FAQPage JSON-LD block
// derived from the SAME visible Q&A (so /faq is eligible for Google FAQ rich results and the schema
// can't drift from what users read); expand answers accessibly (role=button + aria-expanded, keyboard);
// funnel into /portals + /privacy; localize; and be honest — no invented features.

afterEach(cleanup);
const renderPage = () => render(<MemoryRouter><FaqPage /></MemoryRouter>);
const faqJsonLd = () => [...document.querySelectorAll('script[type="application/ld+json"]')]
  .map((s) => { try { return JSON.parse(s.textContent); } catch { return null; } })
  .filter((d) => d && d['@type'] === 'FAQPage');

describe('FaqPage', () => {
  it('renders the heading and questions', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/คำถามที่พบบ่อย/);
    expect(screen.getByText('OpenThaiAi คืออะไร?')).toBeTruthy();
    expect(screen.getByText(/ข้อมูลของฉันปลอดภัยไหม/)).toBeTruthy();
  });

  it('emits exactly one valid FAQPage JSON-LD derived from the visible Q&A', () => {
    renderPage();
    const blocks = faqJsonLd();
    expect(blocks.length).toBe(1);
    const qs = blocks[0].mainEntity;
    expect(Array.isArray(qs) && qs.length).toBe(8);
    // every entry is a well-formed Question→acceptedAnswer→Answer with non-empty text
    for (const e of qs) {
      expect(e['@type']).toBe('Question');
      expect(typeof e.name).toBe('string');
      expect(e.acceptedAnswer['@type']).toBe('Answer');
      expect(String(e.acceptedAnswer.text).length).toBeGreaterThan(0);
    }
    // the schema mirrors a visible question
    expect(qs.some((e) => e.name === 'OpenThaiAi คืออะไร?')).toBe(true);
  });

  it('answers are honest — consent/no-scrape/PromptPay/PDPA, no invented features', () => {
    renderPage();
    const text = faqJsonLd()[0].mainEntity.map((e) => e.acceptedAnswer.text).join(' ');
    expect(text).toMatch(/consent|ยินยอม/);
    expect(text).toMatch(/scrape/);
    expect(text).toMatch(/PromptPay|พร้อมเพย์/);
    expect(text).toMatch(/PDPA/);
    // must NOT claim rejected/nonexistent features
    expect(text).not.toMatch(/Neo4j|Stripe|USD|escrow.*USD|blockchain|crypto/i);
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
    expect(faqJsonLd()[0].mainEntity.some((e) => e.name === 'What is OpenThaiAi?')).toBe(true);
  });
});
