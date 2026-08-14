import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n';
import StorePage from '../pages/StorePage';

// A11y regression for the public /store checkout (BuyModal): every field rendered a visible <label>
// but none were associated with their control (no htmlFor/id), so a screen reader announced the
// name/contact/qty/address inputs and the payment-method <select> with no accessible name
// (WCAG 1.3.1 / 4.1.2). Each must now be reachable by its label via getByLabelText — mirrors the
// same fix already shipped for /catalog and /contact.

function mockShop(products) {
  global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ products }) }));
}
afterEach(() => { vi.restoreAllMocks(); });
const renderPage = () => render(<MemoryRouter><StorePage /></MemoryRouter>);

const PRODUCT = { id: 'p1', name: 'ผ้าไหมทอมือ', price: 890, category: 'งานฝีมือ', in_stock: true };

describe('StorePage BuyModal accessibility', () => {
  it('associates every checkout field with its label (reachable by getByLabelText)', async () => {
    mockShop([PRODUCT]);
    renderPage();
    await waitFor(() => expect(screen.getByText('ผ้าไหมทอมือ')).toBeTruthy());
    // open the buy modal
    fireEvent.click(screen.getByRole('button', { name: 'ซื้อเลย' }));
    // each control is now findable by its visible label text (fails if htmlFor/id association is missing)
    const name = screen.getByLabelText(/ชื่อผู้สั่ง/);
    const contact = screen.getByLabelText(/ช่องทางติดต่อ/);
    const qty = screen.getByLabelText(/จำนวน/);
    const address = screen.getByLabelText(/ที่อยู่จัดส่ง/);
    const method = screen.getByLabelText(/วิธีชำระเงิน/);
    expect(name.tagName).toBe('INPUT');
    expect(contact.tagName).toBe('INPUT');
    expect(qty.getAttribute('type')).toBe('number');   // the previously-nameless spin button
    expect(address.tagName).toBe('TEXTAREA');
    expect(method.tagName).toBe('SELECT');
    // typing via the accessible label reaches the field (the association is real, not just matching text)
    fireEvent.change(qty, { target: { value: '2' } });
    expect(qty.value).toBe('2');
  });

  // Revenue-path honesty: /api/shop/checkout can return paid:true WITH refund_pending:true (the item
  // sold out in the race between pre-check and stock deduction, so the charge succeeded but the order
  // was cancelled and a refund is coming). That must NOT render as a plain "🎉 ชำระเงินสำเร็จ!" — the
  // customer paid and won't get the product, and the refund notice must be shown.
  it('shows a refund-pending state (not a plain paid success) when the item sold out in the race', async () => {
    global.fetch = vi.fn((url, opts) => {
      if (String(url).includes('/api/shop/checkout') && opts?.method === 'POST') {
        return Promise.resolve({ json: () => Promise.resolve({
          success: true, paid: true, fulfilled: false, refund_pending: true, order_id: 'ord_x', amount: 890,
          message: 'ชำระเงินสำเร็จ แต่สินค้าหมดสต๊อกพอดี ทีมงานจะติดต่อคืนเงินให้โดยเร็ว',
        }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ products: [PRODUCT] }) });
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('ผ้าไหมทอมือ')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'ซื้อเลย' }));
    fireEvent.change(screen.getByLabelText(/ชื่อผู้สั่ง/), { target: { value: 'สมชาย' } });
    fireEvent.change(screen.getByLabelText(/ช่องทางติดต่อ/), { target: { value: '0810000000' } });
    fireEvent.click(screen.getByRole('button', { name: /💳/ }));
    // the refund-pending title shows, and the celebratory "ชำระเงินสำเร็จ!" title does NOT
    await waitFor(() => expect(screen.getByText(/กำลังคืนเงิน/)).toBeTruthy());
    expect(screen.queryByText('ชำระเงินสำเร็จ!')).toBeNull();
    // the backend's refund explanation is surfaced to the customer
    expect(screen.getByText(/ทีมงานจะติดต่อคืนเงิน/)).toBeTruthy();
  });

  // i18n: the checkout payment-method <select> had the card option hardcoded as Thai
  // ("💳 บัตรเครดิต/เดบิต"). The form only appears after picking a product, so the page's Thai-leak
  // probe (which renders with no product) never reached it — an en/zh buyer saw a Thai payment option
  // at the money step. The card option must now follow the page language.
  it('localizes the card payment option (no hardcoded Thai) for a non-Thai buyer', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? 'en' : null));
    global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ products: [PRODUCT] }) }));
    render(<LanguageProvider><MemoryRouter><StorePage /></MemoryRouter></LanguageProvider>);
    await waitFor(() => expect(screen.getByText('ผ้าไหมทอมือ')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Buy now' })); // en label for the card's buy button
    // the card option is the localized label, and the old Thai literal is gone
    expect(screen.getByRole('option', { name: /Credit\/Debit card/ })).toBeTruthy();
    expect(screen.queryByText(/บัตรเครดิต/)).toBeNull();
    // the modal close button has a real localized accessible name — NOT the raw i18n key "mk.close"
    // (mk.close was undefined, so t('mk.close') used to render the literal string "mk.close") and not
    // the old hardcoded Thai "ปิด".
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'mk.close' })).toBeNull();
  });

  it('shows a localized (not Thai) error when the checkout request fails to connect', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => (k === 'otai_lang' ? 'en' : null));
    let call = 0;
    global.fetch = vi.fn((url, opts) => {
      if (String(url).includes('/api/shop/checkout') && opts?.method === 'POST') return Promise.reject(new Error('offline'));
      call++;
      return Promise.resolve({ json: () => Promise.resolve({ products: [PRODUCT] }) });
    });
    render(<LanguageProvider><MemoryRouter><StorePage /></MemoryRouter></LanguageProvider>);
    await waitFor(() => expect(screen.getByText('ผ้าไหมทอมือ')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Buy now' }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/contact/i), { target: { value: 'john@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: /💳/ }));
    await waitFor(() => expect(screen.getByText(/Connection failed/i)).toBeTruthy());
    expect(screen.queryByText(/เชื่อมต่อไม่ได้/)).toBeNull();
  });
});
