import { useEffect, useRef } from 'react';
export function useFlyoutFocus(isOpen, ref, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const controls = () => [
      ...(ref.current?.querySelectorAll(
        'button:not(:disabled), input, select, [tabindex="0"]',
      ) || []),
    ];
    controls()[0]?.focus();
    const key = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === 'Tab') {
        const items = controls(),
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const outside = (e) => {
      if (previous?.contains(e.target)) return;
      if (ref.current && !ref.current.contains(e.target)) closeRef.current();
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', outside);
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen, ref]);
}
