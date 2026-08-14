import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mobile-conversion / a11y guard for the consent-signup funnel. The portal forms are the platform's
// #1 entry point and are used mostly on phones. An email/phone field left as the default type="text"
// makes the phone show a full QWERTY keyboard (no "@" shortcut for email, no numeric keypad for phone)
// and skips native email validation. ConsumerPortalPage/CreatorPortalPage already pass a proper type;
// this pins that EVERY portal's email input is type="email" and every phone input is type="tel", so a
// future edit can't silently regress a field back to type="text".
import ProducerPortalPage from '../pages/portals/ProducerPortalPage';
import ConsumerPortalPage from '../pages/portals/ConsumerPortalPage';
import MiddlemanPortalPage from '../pages/portals/MiddlemanPortalPage';
import AffiliatePortalPage from '../pages/portals/AffiliatePortalPage';
import CreatorPortalPage from '../pages/portals/CreatorPortalPage';
import FoundationPortalPage from '../pages/portals/FoundationPortalPage';
import GovThaiPortalPage from '../pages/portals/GovThaiPortalPage';
import GovIntlPortalPage from '../pages/portals/GovIntlPortalPage';
import IntlOrgPortalPage from '../pages/portals/IntlOrgPortalPage';

function renderPortal(Comp) {
  return render(<MemoryRouter initialEntries={['/portals/x']}><Comp /></MemoryRouter>);
}

// every portal has an email field; a subset also collect a phone
const withPhone = [
  ['ProducerPortalPage', ProducerPortalPage],
  ['MiddlemanPortalPage', MiddlemanPortalPage],
  ['GovThaiPortalPage', GovThaiPortalPage],
  ['GovIntlPortalPage', GovIntlPortalPage],
];
const allPortals = [
  ['ProducerPortalPage', ProducerPortalPage],
  ['ConsumerPortalPage', ConsumerPortalPage],
  ['MiddlemanPortalPage', MiddlemanPortalPage],
  ['AffiliatePortalPage', AffiliatePortalPage],
  ['CreatorPortalPage', CreatorPortalPage],
  ['FoundationPortalPage', FoundationPortalPage],
  ['GovThaiPortalPage', GovThaiPortalPage],
  ['GovIntlPortalPage', GovIntlPortalPage],
  ['IntlOrgPortalPage', IntlOrgPortalPage],
];

describe('portal signup forms use mobile-correct input types', () => {
  it.each(allPortals)('%s email field is type="email"', (_name, Comp) => {
    const { container } = renderPortal(Comp);
    const email = container.querySelector('#email');
    expect(email).toBeTruthy();
    expect(email.getAttribute('type')).toBe('email');
  });

  it.each(withPhone)('%s phone field is type="tel" with inputMode tel', (_name, Comp) => {
    const { container } = renderPortal(Comp);
    const phone = container.querySelector('#phone');
    expect(phone).toBeTruthy();
    expect(phone.getAttribute('type')).toBe('tel');
    expect(phone.getAttribute('inputmode')).toBe('tel');
  });

  it('a non-email/phone field (producer company name) stays type="text"', () => {
    const { container } = renderPortal(ProducerPortalPage);
    const name = container.querySelector('#name');
    expect(name).toBeTruthy();
    expect(name.getAttribute('type')).toBe('text');
  });
});
