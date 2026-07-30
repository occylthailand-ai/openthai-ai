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
});
