import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import AffiliatePortalPage from '../pages/portals/AffiliatePortalPage';
import ConsumerPortalPage from '../pages/portals/ConsumerPortalPage';
import CreatorPortalPage from '../pages/portals/CreatorPortalPage';
import FoundationPortalPage from '../pages/portals/FoundationPortalPage';
import GovIntlPortalPage from '../pages/portals/GovIntlPortalPage';
import GovThaiPortalPage from '../pages/portals/GovThaiPortalPage';
import IntlOrgPortalPage from '../pages/portals/IntlOrgPortalPage';
import MiddlemanPortalPage from '../pages/portals/MiddlemanPortalPage';
import ProducerPortalPage from '../pages/portals/ProducerPortalPage';

// Regression test: keep <html lang> in sync with the language a /portals/* page is showing
// (WCAG 3.1.1 Language of Page / 3.1.2 Language of Parts).
//
// Each portal manages its OWN local `lang` state (it does not use the global i18n useLang()).
// The global i18n already sets `document.documentElement.lang` when its language changes
// (i18n/index.jsx), but these inline portals only set document.title — so a visitor who opened
// /portals/producer and switched to English/中文 saw English/Chinese copy under a stale
// <html lang="th">, and a screen reader applied Thai pronunciation rules to it. The English-default
// portals (gov-intl, intl-org) were even wrong on first paint. Fixed: each portal's title effect
// also sets `document.documentElement.lang = lang` (keyed on lang), matching the global pattern.
//
// This is a real render test (mounts the component, fires the switch, reads the live attribute) —
// not a source scan — so it fails if the effect stops running or drops the lang dependency.
afterEach(() => { cleanup(); document.documentElement.lang = ''; });

const renderPortal = (Comp) => render(<MemoryRouter><Comp /></MemoryRouter>);

describe.each([
  ['ProducerPortalPage', ProducerPortalPage, 'th'],
  ['AffiliatePortalPage', AffiliatePortalPage, 'th'],
  ['CreatorPortalPage', CreatorPortalPage, 'th'],
  ['ConsumerPortalPage', ConsumerPortalPage, 'th'],
  ['MiddlemanPortalPage', MiddlemanPortalPage, 'th'],
  ['GovThaiPortalPage', GovThaiPortalPage, 'th'],
  ['FoundationPortalPage', FoundationPortalPage, 'th'],
  ['GovIntlPortalPage', GovIntlPortalPage, 'en'],
  ['IntlOrgPortalPage', IntlOrgPortalPage, 'en'],
])('%s keeps <html lang> in sync with the shown language', (name, Comp, defaultLang) => {
  it(`sets <html lang> to its default language (${defaultLang}) on mount`, () => {
    renderPortal(Comp);
    expect(document.documentElement.lang).toBe(defaultLang);
  });

  it('updates <html lang> to en when the English button is pressed', () => {
    renderPortal(Comp);
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(document.documentElement.lang).toBe('en');
  });

  it('updates <html lang> to th when the ไทย button is pressed', () => {
    renderPortal(Comp);
    fireEvent.click(screen.getByRole('button', { name: 'ไทย' }));
    expect(document.documentElement.lang).toBe('th');
  });
});
