/**
 * Resum d'un article de la Viquipèdia (API REST pública de Wikimedia, permet CORS).
 * Primer en català; si no hi ha article o falla, en anglès.
 * Els resultats es guarden en memòria i el service worker els desa per a ús fora de línia.
 */
import { useEffect, useState } from 'react';
import { wikipediaUrl, type BodyInfo } from '../astro/bodies';

export interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: string;
  url: string;
  lang: 'ca' | 'en';
}

const cache = new Map<string, Promise<WikiSummary | null>>();

async function fetchSummary(b: BodyInfo, lang: 'ca' | 'en'): Promise<WikiSummary | null> {
  const title = (lang === 'ca' ? b.wikiCa : b.wikiEn).replace(/ /g, '_');
  const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  if (!res.ok) return null;
  const j = await res.json();
  if (j.type !== 'standard' || !j.extract) return null;
  return {
    title: j.title,
    extract: j.extract,
    thumbnail: j.thumbnail?.source,
    url: j.content_urls?.desktop?.page ?? wikipediaUrl(b, lang),
    lang,
  };
}

export function getWikiSummary(b: BodyInfo): Promise<WikiSummary | null> {
  let p = cache.get(b.id);
  if (!p) {
    p = fetchSummary(b, 'ca')
      .catch(() => null)
      .then((r) => r ?? fetchSummary(b, 'en').catch(() => null));
    // Si falla tot (p. ex. sense connexió), no ho deixem en memòria per poder reintentar
    p.then((r) => r ?? cache.delete(b.id));
    cache.set(b.id, p);
  }
  return p;
}

export type WikiState = { status: 'loading' } | { status: 'ok'; data: WikiSummary } | { status: 'error' };

export function useWikiSummary(b: BodyInfo | undefined): WikiState {
  const [state, setState] = useState<WikiState>({ status: 'loading' });
  useEffect(() => {
    if (!b) return;
    let alive = true;
    setState({ status: 'loading' });
    getWikiSummary(b).then((data) => {
      if (alive) setState(data ? { status: 'ok', data } : { status: 'error' });
    });
    return () => {
      alive = false;
    };
  }, [b]);
  return state;
}
