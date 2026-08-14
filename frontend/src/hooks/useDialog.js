import { useEffect, useRef } from 'react';

// Shared accessible-dialog behavior for modal dialogs (checkout / order modals).
// Attach the returned ref to the dialog container (which should carry
// role="dialog" aria-modal="true" tabIndex={-1}). It provides the full ARIA
// dialog interaction pattern:
//   - Escape closes the dialog (calls onClose)
//   - focus moves into the dialog when it opens, and returns to the element
//     that opened it when it closes
//   - Tab / Shift+Tab are trapped inside the dialog, so keyboard focus can't
//     wander onto the inert page behind it (WCAG 2.4.3 Focus Order)
//
// Run 83 shipped everything here except the Tab trap; this hook adds the trap
// and de-duplicates the identical effect that lived in both modal components.
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useDialog(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    const prev = document.activeElement;
    node?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll(FOCUSABLE));
      if (items.length === 0) { e.preventDefault(); node.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === node)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prev && prev.focus) prev.focus();
    };
  }, [onClose]);
  return ref;
}
