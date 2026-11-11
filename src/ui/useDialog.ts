import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Comportament comú dels diàlegs: Esc tanca, el focus del teclat no en surt (Tab hi dona la volta)
 * i en tancar torna on era.
 */
export function useDialog<T extends HTMLElement>(onClose: () => void, autoFocus = true) {
  const ref = useRef<T>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    if (autoFocus && el && !el.contains(document.activeElement)) {
      (el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el).focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (!el) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close.current();
      } else if (e.key === 'Tab') {
        const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => !n.hasAttribute('disabled') && n.offsetParent !== null);
        if (items.length === 0) return;
        const [first, last] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      // Després de l'esdeveniment en curs: així la tecla que ha tancat el diàleg no actua sobre l'element
      // (si el diàleg encara hi és, p. ex. pel doble muntatge de React en desenvolupament, no es toca)
      setTimeout(() => {
        if (previous && document.contains(previous) && !el?.isConnected) previous.focus();
      }, 0);
    };
  }, [autoFocus]);

  return ref;
}
