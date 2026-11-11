import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { glossaryEntry } from '../content/glossary';
import { hrefFor } from '../router';

interface Props {
  /** Id de l'entrada del glossari */
  id: string;
  children: ReactNode;
}

/**
 * Paraula subratllada que, en tocar-la, mostra la definició del glossari en una bafarada
 * (i un enllaç a l'explicació llarga d'«Entendre», si n'hi ha).
 */
export function Term({ id, children }: Props) {
  const entry = glossaryEntry(id);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const popId = useId();

  // Posició: sota la paraula (o a sobre si no hi cap), sense sortir de la pantalla
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const w = Math.min(300, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 12));
    const above = r.bottom + 200 > window.innerHeight;
    setPos({ left, top: above ? r.top - 8 : r.bottom + 8, above });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      if (e.type === 'pointerdown' && (pop.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', close, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', close, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (!entry) return <>{children}</>;
  return (
    <>
      <button
        ref={btn}
        type="button"
        className="term"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {children}
      </button>
      {open && pos && (
        <div
          ref={pop}
          id={popId}
          role="dialog"
          aria-label={entry.term}
          className={`term-pop ${pos.above ? 'term-pop--above' : ''}`}
          style={{ left: pos.left, top: pos.top }}
        >
          <strong>{entry.term}</strong>
          <p>{entry.text}</p>
          {entry.more && (
            <a href={hrefFor.entendre + '/' + entry.more} onClick={() => setOpen(false)}>
              Entén-ho millor →
            </a>
          )}
        </div>
      )}
    </>
  );
}
