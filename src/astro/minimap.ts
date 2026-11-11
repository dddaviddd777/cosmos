/**
 * Geometria del mapa 2D petit: el sistema solar vist des de dalt (nord de l'eclíptica),
 * amb una escala comprimida perquè hi càpiguen alhora Mercuri i Neptú.
 */
import { bodyById, type BodyInfo } from './bodies';
import { sampleOrbit, type Vec3 } from './engine';
import { elementsAt, keplerOrbit, SMALL_BODIES } from './kepler';
import { heliocentricOf } from './positions';

/** Planetes (i Plutó) que es dibuixen sempre de fons */
export const MAP_PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
  .map((id) => bodyById(id)!)
  .filter(Boolean);

/** UA a partir de les quals l'escala deixa de ser gairebé lineal */
const K = 0.3;

/**
 * Distància al Sol (UA) → radi en píxels. Logarítmica suau: lineal a prop del Sol,
 * comprimida lluny. `extent` UA queden a `radius` px.
 */
export function scaleRadius(au: number, extent: number, radius: number): number {
  return (radius * Math.log1p(Math.max(au, 0) / K)) / Math.log1p(extent / K);
}

/** Punt heliocèntric (UA) → coordenades SVG centrades al Sol (y cap amunt = nord… de l'eclíptica) */
export function project(v: Vec3, extent: number, radius: number): [number, number] {
  const d = Math.hypot(v.x, v.y);
  if (d === 0) return [0, 0];
  const r = scaleRadius(d, extent, radius);
  return [(v.x / d) * r, (-v.y / d) * r];
}

/** El cos que realment es dibuixa: les llunes, al lloc del seu planeta */
export const mapAnchor = (b: BodyInfo): BodyInfo => (b.parent ? bodyById(b.parent)! : b);

const orbitCache = new Map<string, Vec3[]>();

/** Punts de l'òrbita d'un cos (UA). Es calcula un cop: la forma no canvia en anys. */
export function orbitOf(b: BodyInfo, date: Date): Vec3[] | null {
  if (b.id === 'sun' || b.parent) return null;
  const cached = orbitCache.get(b.id);
  if (cached) return cached;
  let pts: Vec3[] | null = null;
  const small = SMALL_BODIES[b.id];
  if (small) pts = keplerOrbit(elementsAt(small, date), 180);
  else if (b.body !== undefined) pts = sampleOrbit(b.body, date, 120);
  if (pts) orbitCache.set(b.id, pts);
  return pts;
}

/** Distància màxima al Sol (UA) de l'òrbita d'un cos */
export function aphelionOf(b: BodyInfo, date: Date): number {
  const pts = orbitOf(mapAnchor(b), date);
  return pts ? Math.max(...pts.map((p) => Math.hypot(p.x, p.y))) : 0;
}

/**
 * Fins on arriba el mapa (UA). A l'inici, fins a Plutó. A una fitxa, prou per veure
 * l'òrbita sencera del cos i la Terra, sense que els planetes interiors quedin aixafats.
 */
export function extentFor(b: BodyInfo | undefined, date: Date): number {
  if (!b || b.id === 'sun') return 40;
  const anchor = mapAnchor(b);
  const now = heliocentricOf(anchor, date);
  const far = Math.max(aphelionOf(anchor, date), now ? Math.hypot(now.x, now.y) : 0, 1.02);
  return far * 1.12;
}

/** Cossos amb posició al mapa (per a proves i per saber si una fitxa en pot tenir) */
export const hasMapPosition = (b: BodyInfo) => b.id === 'sun' || heliocentricOf(mapAnchor(b), new Date()) !== null;


export interface LabelIn {
  id: string;
  x: number;
  y: number;
  text: string;
  font: number;
}
export interface LabelOut {
  id: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
}
type Box = [number, number, number, number]; // x0, y0, x1, y1

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

/**
 * Col·loca les etiquetes evitant que se solapin entre elles o amb els punts:
 * prova a la dreta, a l'esquerra, a sobre i a sota de cada punt i es queda amb la primera lliure.
 * Les etiquetes es col·loquen en l'ordre donat (les importants primer).
 */
export function placeLabels(labels: LabelIn[], dots: { x: number; y: number; r: number }[], bound: number): LabelOut[] {
  const taken: Box[] = dots.map((d) => [d.x - d.r, d.y - d.r, d.x + d.r, d.y + d.r]);
  return labels.map((l) => {
    const w = l.text.length * l.font * 0.56;
    const h = l.font * 1.05;
    const gap = 7;
    const outward = l.x >= 0 ? 1 : -1;
    const side = (dir: number, dy = 0): LabelOut & { box: Box } => {
      const x = l.x + dir * gap;
      const x0 = dir > 0 ? x : x - w;
      return { id: l.id, x, y: l.y + dy, anchor: dir > 0 ? 'start' : 'end', box: [x0, l.y + dy - h / 2, x0 + w, l.y + dy + h / 2] };
    };
    const vert = (dir: number): LabelOut & { box: Box } => {
      const y = l.y + dir * (gap + h / 2);
      return { id: l.id, x: l.x, y, anchor: 'middle', box: [l.x - w / 2, y - h / 2, l.x + w / 2, y + h / 2] };
    };
    const candidates = [
      side(outward), side(-outward), vert(-1), vert(1),
      side(outward, -h), side(outward, h), side(-outward, -h), side(-outward, h),
    ];
    const cost = (c: { box: Box }) => {
      const out = c.box[0] < -bound || c.box[2] > bound || c.box[1] < -bound || c.box[3] > bound ? 1e6 : 0;
      return out + taken.reduce((s, t) => s + overlap(c.box, t), 0);
    };
    let best = candidates[0];
    let bestCost = cost(best);
    for (const c of candidates.slice(1)) {
      if (bestCost === 0) break;
      const k = cost(c);
      if (k < bestCost) [best, bestCost] = [c, k];
    }
    taken.push(best.box);
    return { id: best.id, x: best.x, y: best.y, anchor: best.anchor };
  });
}
