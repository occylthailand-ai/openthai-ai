import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ToastContext';
import ContactPage from '../pages/ContactPage';

// A11y regression for the public /contact form: every field rendered a visible <label> but none
// were associated with their control (no htmlFor/id), so a screen reader announced the name/email/
// subject/message inputs with no accessible name (WCAG 1.3.1 / 4.1.2). Each must now be reachable
// by its label via getByLabelText.
const renderPage = () => render(<MemoryRouter><ToastProvider><ContactPage /></ToastProvider></MemoryRouter>);

describe('ContactPage form accessibility', () => {
  it('associates every contact-form field with its label', () => {
    renderPage();
    const name = screen.getByLabelText(/ชื่อ/);
    const email = screen.getByLabelText(/อีเมล/);
    const subject = screen.getByLabelText(/หัวข้อ/);
    const message = screen.getByLabelText(/ข้อความ/);
    expect(name.tagName).toBe('INPUT');
    expect(email.getAttribute('type')).toBe('email');
    expect(subject.tagName).toBe('SELECT');
    expect(message.tagName).toBe('TEXTAREA');
  });
});
