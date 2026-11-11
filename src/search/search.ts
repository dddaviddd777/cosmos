/**
 * Cerca de cossos tolerant a accents, majúscules i petites faltes d'ortografia.
 * Ordre de rellevància: coincidència exacta > comença per > conté > semblant (Levenshtein).
 */
import { CATALOG, type BodyInfo, type BodyKind } from '../astro/bodies';

/** «Júpiter» → «jupiter», «Cal·listo» → «callisto» */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[·•.'’]/g, '')
    .replace(/[^a-z0-9/ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

interface Indexed {
  body: BodyInfo;
  terms: string[];
}

const INDEX: Indexed[] = CATALOG.map((body) => ({
  body,
  terms: [...new Set([body.name, ...body.aliases].map(normalize))],
}));

function score(q: string, term: string): number {
  if (term === q) return 100;
  if (term.startsWith(q)) return 80 - Math.min(term.length - q.length, 20) / 2;
  // Cada paraula del terme («cometa halley» → «halley»)
  if (term.split(/[ /-]/).some((w) => w.startsWith(q))) return 70;
  if (term.includes(q)) return 60;
  if (q.length >= 3) {
    const maxDist = q.length <= 4 ? 1 : 2;
    const head = term.slice(0, q.length);
    const d = Math.min(levenshtein(q, term), levenshtein(q, head));
    if (d <= maxDist) return 40 - d * 10;
  }
  return 0;
}

export function searchBodies(query: string, kinds?: ReadonlySet<BodyKind>): BodyInfo[] {
  const q = normalize(query);
  const pool = kinds && kinds.size ? INDEX.filter((i) => kinds.has(i.body.kind)) : INDEX;
  if (!q) return pool.map((i) => i.body);
  return pool
    .map((i, order) => ({ body: i.body, order, s: Math.max(...i.terms.map((t) => score(q, t))) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.order - b.order)
    .map((r) => r.body);
}
