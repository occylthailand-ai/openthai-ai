import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import ProducerDirectoryPage from '../pages/ProducerDirectoryPage';

// A11y guard for /find-producers (ProducerDirectoryPage). Its two filter controls — the free-text
// search box and the category <select> — had NO accessible name: the input carried only a
// placeholder (which is not an accessible name — it vanishes on input and isn't reliably announced),
// and the <select> had nothing at all. A screen-reader user tabbing in heard "edit text" / "combo
// box" with no idea what either did (WCAG 4.1.2 Name, Role, Value). The other public lookup forms
// (/track, /dispute) already associate a <label> per input; this brings the directory to parity by
// giving both controls an aria-label. Render-based (getByLabelText resolves the real accessible
// name), so removing either aria-label fails the test.
const th = { getItem: (k) => (k === 'otai_lang' ? 'en' : null) };

function renderPage() {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(th.getItem);
  return render(<LanguageProvider><MemoryRouter><ProducerDirectoryPage /></MemoryRouter></LanguageProvider>);
}

describe('/find-producers filter controls have accessible names', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, categories: ['OTOP', 'อาหาร'], producers: [] }) })));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('the search box has an accessible name (not just a placeholder)', () => {
    const { getByLabelText } = renderPage();
    const search = getByLabelText(/search producers or products/i);
    expect(search.tagName).toBe('INPUT');
  });

  it('the category filter <select> has an accessible name', () => {
    const { getByLabelText } = renderPage();
    const select = getByLabelText(/filter by category/i);
    expect(select.tagName).toBe('SELECT');
  });
});
