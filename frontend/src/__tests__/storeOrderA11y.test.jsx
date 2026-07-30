import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
});
