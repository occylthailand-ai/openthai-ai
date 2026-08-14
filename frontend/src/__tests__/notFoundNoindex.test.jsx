import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from '../pages/NotFoundPage';

// Soft-404 SEO guard. This SPA is served from Vercel, so every unknown URL returns
// HTTP 200 with index.html — whose <meta name="robots" content="index, follow">
// (index.html:12) marks it indexable. Without intervention Google renders the JS,
// lands on the 404 page, and indexes junk/mistyped/spam URLs as real thin pages.
// NotFoundPage must flip robots to noindex while mounted and restore the original
// on unmount (SPA nav doesn't reload index.html, so a real page must get index back).
describe('NotFoundPage soft-404 noindex', () => {
  beforeEach(() => {
    // Reproduce the production baseline: index.html ships this exact tag.
    document.head.innerHTML = '<meta name="robots" content="index, follow">';
  });
  afterEach(() => {
    cleanup();
    document.head.innerHTML = '';
  });

  const robots = () => document.querySelector('meta[name="robots"]')?.getAttribute('content');

  it('sets robots to noindex while the 404 page is mounted', () => {
    expect(robots()).toBe('index, follow'); // baseline before mount
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(robots()).toBe('noindex, follow');
  });

  it('restores the original robots value on unmount (real pages stay indexable)', () => {
    const { unmount } = render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(robots()).toBe('noindex, follow');
    unmount();
    expect(robots()).toBe('index, follow');
  });

  it('creates then removes a robots meta if index.html had none', () => {
    document.head.innerHTML = ''; // no robots meta at all
    const { unmount } = render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(robots()).toBe('noindex, follow'); // created
    unmount();
    expect(document.querySelector('meta[name="robots"]')).toBeNull(); // cleaned up
  });
});
