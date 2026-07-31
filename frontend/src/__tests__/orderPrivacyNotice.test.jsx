import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CatalogPage from '../pages/CatalogPage';
import StorePage from '../pages/StorePage';

// PDPA transparency: the /store and /catalog order modals collect name/contact/address to fulfil the
// order. Every other PII-collection point in the app now shows a privacy notice at the point of
// collection (portal signups, /contact, affiliate, the homepage newsletter). These pin that both
// order forms carry the same notice with a working /privacy link.
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockList(url, products) {
  global.fetch = vi.fn((u) => String(u).includes(url)
    ? Promise.resolve({ json: () => Promise.resolve({ products }) })
    : Promise.resolve({ json: () => Promise.resolve({}) }));
}
const privacyLink = () => screen.getByRole('link', { name: /นโยบายความเป็นส่วนตัว/ });

describe('order-form PDPA privacy notice', () => {
  it('/catalog order modal shows the notice with a /privacy link', async () => {
    mockList('/api/catalog', [{ email: 'a@x.com', producer: 'ร้าน A', product_name: 'สบู่สมุนไพร', price: 120, category: 'สมุนไพร', stock: 8 }]);
    render(<MemoryRouter><CatalogPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('สบู่สมุนไพร')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'สั่งซื้อ' }));
    expect(screen.getByText(/ข้อมูลของคุณใช้เพื่อดำเนินการ/)).toBeTruthy();
    expect(privacyLink().getAttribute('href')).toBe('/privacy');
  });

  it('/store buy modal shows the notice with a /privacy link', async () => {
    mockList('/api/shop/products', [{ id: 'p1', name: 'ผ้าไหมทอมือ', price: 890, category: 'งานฝีมือ', in_stock: true }]);
    render(<MemoryRouter><StorePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('ผ้าไหมทอมือ')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'ซื้อเลย' }));
    expect(screen.getByText(/ข้อมูลของคุณใช้เพื่อดำเนินการ/)).toBeTruthy();
    expect(privacyLink().getAttribute('href')).toBe('/privacy');
  });
});
