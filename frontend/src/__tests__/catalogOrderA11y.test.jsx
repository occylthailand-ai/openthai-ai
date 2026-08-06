import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CatalogPage from '../pages/CatalogPage';

// A11y regression: the catalog order form (the checkout the whole funnel drives to) rendered a
// visible <label> before each <input> but never associated them (no htmlFor/id), so a screen
// reader announced the fields with NO name — the qty <input> had not even a placeholder, so it was
// a nameless spin button (WCAG 1.3.1 Info & Relationships / 4.1.2 Name, Role, Value). Every field
// must now be reachable by its label via getByLabelText.

function mockCatalog(products) {
  global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ products }) }));
}
afterEach(() => { vi.restoreAllMocks(); });
const renderPage = () => render(<MemoryRouter><CatalogPage /></MemoryRouter>);

const PRODUCT = { email: 'a@x.com', producer: 'ร้าน A', product_name: 'สบู่สมุนไพร', price: 120, category: 'สมุนไพร', stock: 8 };

describe('CatalogPage order form accessibility', () => {
  it('associates every order-form field with its label (reachable by getByLabelText)', async () => {
    mockCatalog([PRODUCT]);
    renderPage();
    await waitFor(() => expect(screen.getByText('สบู่สมุนไพร')).toBeTruthy());
    // open the order modal
    fireEvent.click(screen.getByRole('button', { name: 'สั่งซื้อ' }));
    // each control is now findable by its visible label text (fails if htmlFor/id association is missing)
    const name = screen.getByLabelText(/ชื่อผู้สั่ง/);
    const contact = screen.getByLabelText(/ช่องทางติดต่อ/);
    const qty = screen.getByLabelText(/จำนวน/);
    const address = screen.getByLabelText(/ที่อยู่จัดส่ง/);
    const note = screen.getByLabelText(/หมายเหตุ/);
    expect(name.tagName).toBe('INPUT');
    expect(contact.tagName).toBe('INPUT');
    expect(qty.getAttribute('type')).toBe('number');   // the previously-nameless spin button
    expect(address.tagName).toBe('TEXTAREA');
    expect(note.tagName).toBe('TEXTAREA');
    // typing via the accessible label reaches the field (the association is real, not just matching text)
    fireEvent.change(qty, { target: { value: '3' } });
    expect(qty.value).toBe('3');
  });

  // Transparency: place() records the producer's authoritative price (a stale tab can send a wrong
  // one), so the success screen must show the amount the SERVER returned — the same figure on the
  // receipt email — not the client-side price*qty guess.
  it('shows the server-returned order total on success (not the client-side guess)', async () => {
    global.fetch = vi.fn((url, opts) => {
      if (String(url).includes('/api/orders') && opts?.method === 'POST') {
        // server's authoritative amount (600) deliberately differs from the client total (120 × 1)
        return Promise.resolve({ json: () => Promise.resolve({ success: true, id: 'ord_test_1', amount: 600 }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ products: [PRODUCT] }) });
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('สบู่สมุนไพร')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'สั่งซื้อ' }));
    fireEvent.change(screen.getByLabelText(/ชื่อผู้สั่ง/), { target: { value: 'สมชาย' } });
    fireEvent.change(screen.getByLabelText(/ช่องทางติดต่อ/), { target: { value: '0810000000' } });
    fireEvent.click(screen.getByRole('button', { name: /ยืนยันสั่งซื้อ/ }));
    await waitFor(() => expect(screen.getByText('สั่งซื้อสำเร็จ!')).toBeTruthy());
    // the confirmed total on the success screen reflects the SERVER's 600 (would be the client-side
    // 120 × 1 if the page showed its own guess — so ฿600 appearing proves the server amount is used)
    expect(screen.getByText(/รวม\s*฿\s*600/)).toBeTruthy();
  });
});
