import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

// The three consent-signup portals that now have a dashboard (producer / consumer / middleman) must,
// after a successful signup, show a button that takes the new member straight to THEIR dashboard with
// their email pre-filled (?email=...). Without this the dashboards are unreachable from the funnel.
// This mocks submitLead to succeed, fills the form, submits, and asserts (1) the success button carries
// no un-localized Thai in en, and (2) clicking it navigates to the correct /<role>/dashboard?email=<email>.
vi.mock('../pages/portals/submitLead', () => ({
  submitLead: vi.fn(async () => ({ ok: true })),
  leadError: () => 'err',
}));

import ConsumerPortalPage from '../pages/portals/ConsumerPortalPage';
import ProducerPortalPage from '../pages/portals/ProducerPortalPage';
import MiddlemanPortalPage from '../pages/portals/MiddlemanPortalPage';

function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname + loc.search}</div>;
}

function renderPortal(Comp, path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<Comp />} />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

const EMAIL = 'newmember@test.com';

// Fill every visible text/email input + check the consent box, then submit.
function fillAndSubmit(container, getByText) {
  const inputs = container.querySelectorAll('input');
  for (const el of inputs) {
    if (el.type === 'checkbox') { fireEvent.click(el); continue; }
    // the email field is keyed id="email" on every portal (its input type varies: email vs text)
    const isEmail = el.type === 'email' || el.id === 'email';
    fireEvent.change(el, { target: { value: isEmail ? EMAIL : 'x' } });
  }
  fireEvent.click(getByText(/Join as|Register as|Join as Distributor/i));
}

const THAI = /[฀-๿]+/;

describe('portal success state links the new member to their dashboard (email pre-filled)', () => {
  beforeEach(() => vi.clearAllMocks());

  const cases = [
    { name: 'consumer', Comp: ConsumerPortalPage, path: '/portals/consumer', dash: '/consumer/dashboard' },
    { name: 'producer', Comp: ProducerPortalPage, path: '/portals/producer', dash: '/producer/dashboard' },
    { name: 'middleman', Comp: MiddlemanPortalPage, path: '/portals/middleman', dash: '/middleman/dashboard' },
  ];

  for (const c of cases) {
    it(`${c.name}: shows a localized (en) dashboard button that navigates to ${c.dash}?email=`, async () => {
      const { container, getByText, getAllByText } = renderPortal(c.Comp, c.path);
      // switch to English so we also assert the label is localized (no stray Thai)
      fireEvent.click(getAllByText('English')[0]);
      fillAndSubmit(container, getByText);

      // success state renders the dashboard button
      const btn = await waitFor(() => {
        const b = [...container.querySelectorAll('button')].find((el) => /dashboard/i.test(el.textContent));
        expect(b, 'a dashboard button appears after signup').toBeTruthy();
        return b;
      });
      expect(btn.textContent, `${c.name} dashboard button has no stray Thai in en`).not.toMatch(THAI);

      fireEvent.click(btn);
      await waitFor(() => {
        const loc = container.ownerDocument.querySelector('[data-testid="loc"]');
        expect(loc, 'navigation happened').toBeTruthy();
        expect(loc.textContent).toBe(`${c.dash}?email=${encodeURIComponent(EMAIL)}`);
      });
    });
  }
});
