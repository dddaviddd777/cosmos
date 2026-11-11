/**
 * Navegació mínima amb el hash de l'adreça (#/cos/mart): funciona en qualsevol hosting estàtic,
 * el botó «enrere» del mòbil torna a la pantalla anterior i cada fitxa es pot compartir.
 */
import { useEffect, useState } from 'react';

export type Tab = 'explora' | 'nit' | 'entendre' | 'mapa';

export interface Route {
  tab: Tab;
  /** Cos obert a la fitxa (Explora) o secció d'«Entendre» */
  id?: string;
}

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'cos':
      return { tab: 'explora', id: parts[1] };
    case 'aquesta-nit':
      return { tab: 'nit' };
    case 'entendre':
      return { tab: 'entendre', id: parts[1] };
    case 'mapa':
      return { tab: 'mapa' };
    default:
      return { tab: 'explora' };
  }
}

export const hrefFor = {
  explora: '#/',
  body: (id: string) => `#/cos/${encodeURIComponent(id)}`,
  nit: '#/aquesta-nit',
  entendre: '#/entendre',
  mapa: '#/mapa',
} as const;

export function navigate(href: string) {
  if (location.hash !== href) location.hash = href;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Hora actual que s'actualitza cada `ms` mil·lisegons */
export function useNow(ms: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
