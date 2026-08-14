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
import { OrderModal } from '../pages/CatalogPage';

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

  // Browser-autofill hints (distinct from input type): let a phone's password manager / autofill fill
  // email, phone, and country so a returning user barely types. Pins the unambiguous tokens.
  it.each(allPortals)('%s email field has autoComplete="email"', (_name, Comp) => {
    const { container } = renderPortal(Comp);
    expect(container.querySelector('#email').getAttribute('autocomplete')).toBe('email');
  });

  it.each(withPhone)('%s phone field has autoComplete="tel"', (_name, Comp) => {
    const { container } = renderPortal(Comp);
    expect(container.querySelector('#phone').getAttribute('autocomplete')).toBe('tel');
  });

  it.each(allPortals)('%s country field, when present, has autoComplete="country-name"', (_name, Comp) => {
    const { container } = renderPortal(Comp);
    const country = container.querySelector('#country');
    if (country) expect(country.getAttribute('autocomplete')).toBe('country-name');
  });
});

describe('buyer order form (CatalogPage OrderModal) has autofill hints', () => {
  it('name is autoComplete="name" and address is autoComplete="street-address"', () => {
    const { container } = render(
      <OrderModal product={{ product_name: 'สบู่', price: 100, producer: 'ร้าน', ref: 'r1' }} onClose={() => {}} t={(k) => k} />,
    );
    expect(container.querySelector('#ord-name').getAttribute('autocomplete')).toBe('name');
    expect(container.querySelector('#ord-address').getAttribute('autocomplete')).toBe('street-address');
  });
});
