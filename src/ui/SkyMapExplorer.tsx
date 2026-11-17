import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { bodyById } from '../astro/bodies';
import { horizontalOf, type Place } from '../sky/sky';
import { SkyMap } from './SkyMap';
import { Icon } from './Icon';

const STEP_MIN = 10;
/** Fins on es pot avançar: 24 hores */
const MAX_MIN = 24 * 60;

const hm = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });

function dayWord(d: Date, from: Date): string {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const n = Math.round((day(d) - day(from)) / 86_400_000);
  return n <= 0 ? 'avui' : n === 1 ? 'demà' : 'demà passat';
}

interface Props {
  place: Place;
  /** Hora inicial del mapa (ara o quan es faci fosc) */
  start: Date;
  /** Hora real d'ara, per al botó «Ara» */
  now: Date;
}

/**
 * Mapa del cel amb una barra per moure l'hora: per veure com gira el cel, quan surt una
 * constel·lació o on serà un planeta més tard. Es pot obrir a pantalla completa.
 */
export function SkyMapExplorer({ place, start, now }: Props) {
  const [offset, setOffset] = useState(0);
  const [full, setFull] = useState(false);
  const base = useMemo(() => new Date(Math.floor(start.getTime() / 60_000) * 60_000), [start]);
  const when = new Date(base.getTime() + offset * 60_000);
  const whenMs = when.getTime();
  const sunAlt = useMemo(() => horizontalOf(bodyById('sun')!, new Date(whenMs), place)!.alt, [whenMs, place]);
  const light = sunAlt > -0.8 ? 'dia' : sunAlt > -12 ? 'crepuscle' : 'nit';

  // A pantalla completa: Esc tanca i la pàgina de sota no es desplaça
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [full]);

  const controls = (
    <div className="sky-time">
      <div className="sky-time__row">
        <strong className="sky-time__label">
          {offset === 0 && Math.abs(base.getTime() - now.getTime()) < 120_000 ? 'Ara' : `${dayWord(when, now).replace(/^./, (c) => c.toUpperCase())} a les ${hm(when)}`}
        </strong>
        <span className={`sky-time__light sky-time__light--${light}`}>
          {light === 'dia' ? '☀ De dia: no es veuen les estrelles' : light === 'crepuscle' ? 'Capvespre o albada: només les més brillants' : '🌙 Nit fosca'}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={MAX_MIN}
        step={STEP_MIN}
        value={offset}
        onChange={(e) => setOffset(Number(e.target.value))}
        aria-label="Hora del mapa"
        aria-valuetext={`${dayWord(when, now)} a les ${hm(when)}`}
      />
      <div className="sky-time__buttons">
        <button onClick={() => setOffset((o) => Math.max(0, o - 60))} aria-label="Una hora abans">−1 h</button>
        <button onClick={() => setOffset(0)}>Torna a l’inici</button>
        <button onClick={() => setOffset((o) => Math.min(MAX_MIN, o + 60))} aria-label="Una hora després">+1 h</button>
        {!full && (
          <button className="sky-time__full" onClick={() => setFull(true)}>
            <Icon name="expand" /> Pantalla completa
          </button>
        )}
      </div>
    </div>
  );

  if (full) {
    return createPortal(
      <div
        className="sky-full"
        role="dialog"
        aria-modal="true"
        aria-label="Mapa del cel a pantalla completa"
        // Si es toca el nom d'una constel·lació, es tanca per mostrar-ne la fitxa
        onClick={(e) => (e.target as Element).closest('a') && setFull(false)}
      >
        <header className="sky-full__top">
          <strong>Mapa del cel</strong>
          <button onClick={() => setFull(false)} aria-label="Tanca la pantalla completa"><Icon name="close" /></button>
        </header>
        <div className="sky-full__map">
          <SkyMap place={place} now={when} links />
        </div>
        {controls}
      </div>,
      document.body,
    );
  }

  return (
    <>
      <SkyMap place={place} now={when} links />
      {controls}
    </>
  );
}
