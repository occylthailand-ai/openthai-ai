import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CatalogPage from '../pages/CatalogPage';

// As the buyer catalog (/api/catalog) grows, a shopper needs to find things: this covers the
// free-text search + category-chip filter added to CatalogPage. The search matches product name,
// producer, category and description; the chips filter by the categories actually present in the
// live catalog; a non-matching query shows a helpful "no results" message (never a blank list),
// and clearing the filters brings everything back — the whole point being a usable storefront.

function mockCatalog(products) {
  global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ products }) }));
}
afterEach(() => { vi.restoreAllMocks(); });
const renderPage = () => render(<MemoryRouter><CatalogPage /></MemoryRouter>);

const PRODUCTS = [
  { ref: 'ref-a@x.com', producer: 'ร้านสมุนไพรไทย', product_name: 'สบู่สมุนไพร', description: 'สบู่ก้อนจากธรรมชาติ', price: 120, category: 'สมุนไพร', stock: 8 },
  { ref: 'ref-b@x.com', producer: 'สวนชาดอย',        product_name: 'ชาใบหม่อน',   description: 'ชาอบแห้ง',          price: 90,  category: 'เครื่องดื่ม', stock: null },
  { ref: 'ref-c@x.com', producer: 'ฟาร์มผึ้งเหนือ',  product_name: 'น้ำผึ้งป่า',   description: 'น้ำผึ้งแท้ 100%',  price: 250, category: 'อาหาร', stock: 5 },
];

describe('CatalogPage search + category filter', () => {
  it('renders the search box and one chip per category plus an "all" chip', async () => {
    mockCatalog(PRODUCTS);
    renderPage();
    await waitFor(() => expect(screen.getByText('สบู่สมุนไพร')).toBeTruthy());
    expect(screen.getByRole('searchbox')).toBeTruthy();
    // "ทั้งหมด" + the three distinct categories
    expect(screen.getByRole('button', { name: 'ทั้งหมด' })).toBeTruthy();
    for (const c of ['สมุนไพร', 'เครื่องดื่ม', 'อาหาร']) {
      expect(screen.getByRole('button', { name: c })).toBeTruthy();
    }
  });

  it('filters by free-text query across name / producer / description', async () => {
    mockCatalog(PRODUCTS);
    renderPage();
    await waitFor(() => expect(screen.getByText('น้ำผึ้งป่า')).toBeTruthy());
    // by producer
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ผึ้ง' } });
    await waitFor(() => expect(screen.queryByText('สบู่สมุนไพร')).toBeNull());
    expect(screen.getByText('น้ำผึ้งป่า')).toBeTruthy();
    // clearing the query brings everything back
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    await waitFor(() => expect(screen.getByText('สบู่สมุนไพร')).toBeTruthy());
  });

  it('filters to a single category when its chip is selected', async () => {
    mockCatalog(PRODUCTS);
    renderPage();
    await waitFor(() => expect(screen.getByText('ชาใบหม่อน')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'เครื่องดื่ม' }));
    await waitFor(() => expect(screen.queryByText('สบู่สมุนไพร')).toBeNull());
    expect(screen.getByText('ชาใบหม่อน')).toBeTruthy();
    expect(screen.queryByText('น้ำผึ้งป่า')).toBeNull();
    // the active chip is announced as pressed (a11y)
    expect(screen.getByRole('button', { name: 'เครื่องดื่ม' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('shows a helpful no-results message (never a blank list) when nothing matches', async () => {
    mockCatalog(PRODUCTS);
    renderPage();
    await waitFor(() => expect(screen.getByText('สบู่สมุนไพร')).toBeTruthy());
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ไม่มีทางเจอสินค้านี้' } });
    await waitFor(() => expect(screen.getByText(/ไม่พบสินค้า/)).toBeTruthy());
    // every product card is gone
    for (const p of PRODUCTS) expect(screen.queryByText(p.product_name)).toBeNull();
  });

  it('does not render the filter UI when the catalog is empty', async () => {
    mockCatalog([]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/ยังไม่มีสินค้า/)).toBeTruthy());
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'ทั้งหมด' })).toBeNull();
  });
});
