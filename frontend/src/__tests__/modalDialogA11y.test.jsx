import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BuyModal } from '../pages/StorePage';
import { OrderModal } from '../pages/CatalogPage';

// Regression test for the checkout-modal accessibility fix: the Store/Catalog
// order dialogs had a close button but no dialog semantics, no Escape-to-close,
// and no focus management (WCAG 4.1.2 + ARIA dialog pattern). Real buyers on
// keyboard/screen-reader were stranded in the modal.
const t = (k) => k; // i18n stub: return the key as the label text

describe.each([
  ['StorePage BuyModal', BuyModal, { id: 'p1', name: 'สินค้าทดสอบ', price: 100 }],
  ['CatalogPage OrderModal', OrderModal, { product_name: 'สินค้าทดสอบ', price: 100, email: 'x@y.com', producer: 'ผู้ผลิต' }],
])('checkout modal accessibility (%s)', (label, Modal, product) => {
  it('is announced as a modal dialog with an accessible name', () => {
    render(<Modal product={product} t={t} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.getAttribute('aria-label')).toBeTruthy();
  });

  it('moves focus into the dialog when it opens', () => {
    render(<Modal product={product} t={t} onClose={() => {}} />);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('closes on the Escape key', () => {
    const onClose = vi.fn();
    render(<Modal product={product} t={t} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click but NOT on a click inside the dialog', () => {
    const onClose = vi.fn();
    render(<Modal product={product} t={t} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog); // content click — stopPropagation, must not close
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(dialog.parentElement); // the backdrop overlay
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
