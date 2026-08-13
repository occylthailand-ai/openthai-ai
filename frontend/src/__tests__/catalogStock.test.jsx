import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CatalogPage from '../pages/CatalogPage';

// The public buyer catalog (/api/catalog) returns each product's `stock`. A product that is
// explicitly sold out (stock <= 0) must NOT show an active "order" button — otherwise a buyer
// places an order the producer can't fulfil (the buyer-facing twin of the consumer-digest
// sold-out fix). stock == null means the producer doesn't track stock → always orderable.

function mockCatalog(products) {
  global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ products }) }));
}
afterEach(() => { vi.restoreAllMocks(); });
const renderPage = () => render(<MemoryRouter><CatalogPage /></MemoryRouter>);

const PRODUCTS = [
  { ref: 'ref-a@x.com', producer: 'ร้าน A', product_name: 'สบู่สมุนไพร',  price: 120, category: 'สมุนไพร', stock: 8 },    // in stock
  { ref: 'ref-b@x.com', producer: 'ร้าน B', product_name: 'ชาใบหม่อน',   price: 90,  category: 'เครื่องดื่ม', stock: null }, // untracked
  { ref: 'ref-c@x.com', producer: 'ร้าน C', product_name: 'น้ำผึ้งป่า',   price: 250, category: 'อาหาร', stock: 0 },      // SOLD OUT
];

describe('CatalogPage stock handling', () => {
  it('shows an order button for in-stock and untracked products', async () => {
    mockCatalog(PRODUCTS);
    renderPage();
    await waitFor(() => expect(screen.getByText('สบู่สมุนไพร')).toBeTruthy());
    // Two orderable products → two "สั่งซื้อ" buttons; the sold-out one is not a button.
    const orderButtons = screen.getAllByRole('button', { name: 'สั่งซื้อ' });
    expect(orderButtons.length).toBe(2);
  });

  it('marks a sold-out product (stock 0) as สินค้าหมด with no order button', async () => {
    mockCatalog(PRODUCTS);
    renderPage();
    await waitFor(() => expect(screen.getByText('น้ำผึ้งป่า')).toBeTruthy());
    // The sold-out label is shown…
    expect(screen.getByText('สินค้าหมด')).toBeTruthy();
    // …and it is NOT a clickable button (so it can't open the order modal).
    expect(screen.queryByRole('button', { name: 'สินค้าหมด' })).toBeNull();
  });

  it('treats negative/garbage stock as sold out too', async () => {
    mockCatalog([{ ref: 'ref-d@x.com', producer: 'ร้าน D', product_name: 'ของแปลก', price: 10, category: 'อื่นๆ', stock: -2 }]);
    renderPage();
    await waitFor(() => expect(screen.getByText('ของแปลก')).toBeTruthy());
    expect(screen.getByText('สินค้าหมด')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'สั่งซื้อ' })).toBeNull();
  });

  it('keeps every product orderable when none carry stock info (all untracked)', async () => {
    mockCatalog(PRODUCTS.map((p) => ({ ...p, stock: null })));
    renderPage();
    await waitFor(() => expect(screen.getByText('สบู่สมุนไพร')).toBeTruthy());
    expect(screen.getAllByRole('button', { name: 'สั่งซื้อ' }).length).toBe(3);
    expect(screen.queryByText('สินค้าหมด')).toBeNull();
  });
});
