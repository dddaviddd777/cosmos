/**
 * Propagador kepleriè (problema de dos cossos) per a asteroides, cometes i planetes nans.
 * Parteix dels elements osculadors de JPL Horizons (eclíptica J2000) i calcula la posició
 * heliocèntrica en qualsevol data. És molt precís a prop de l'època dels elements i perd
 * precisió lentament amb els anys, perquè no té en compte l'atracció dels planetes.
 */
import data from '../data/small-bodies.json';
import type { Vec3 } from './engine';

export interface OrbitalElements {
  /** Època dels elements (dia julià, TDB) */
  epochJd: number;
  /** Excentricitat */
  e: number;
  /** Semieix major (UA) */
  a: number;
  /** Periheli i afeli (UA) */
  q: number;
  ad: number;
  /** Inclinació, longitud del node ascendent, argument del periheli, anomalia mitjana (graus) */
  i: number;
  om: number;
  w: number;
  ma: number;
  /** Moviment mitjà (graus/dia) */
  n: number;
  /** Període (dies) */
  per: number;
  /** Data del pas pel periheli (dia julià, TDB) */
  tp: number;
}

export interface OrbitSegment extends OrbitalElements {
  /** Data (ISO) a partir de la qual s'usa aquest tram; el primer tram no en té */
  validFrom?: string;
}

export interface SmallBodyData {
  fullname: string;
  orbitClass: string;
  diameterKm?: number;
  extent?: string;
  /** Trams d'òrbita ordenats (p. ex. Apophis canvia d'òrbita el 2029 pel pas proper a la Terra) */
  orbits: OrbitSegment[];
  /**
   * Efemèride oficial de JPL al voltant d'un pas molt proper a la Terra, on el model de dos cossos
   * no serveix: files [dia julià TDB, x, y, z] del vector Terra → cos (UA, eclíptica J2000).
   */
  closeApproach?: [number, number, number, number][];
}

// El JSON el genera scripts/fetch-small-bodies.mjs amb aquesta forma exacta
export const SMALL_BODIES = data.bodies as unknown as Record<string, SmallBodyData>;
export const SMALL_BODIES_META = data.meta;

/** Elements orbitals vàlids en una data. */
export function elementsAt(b: SmallBodyData, date: Date): OrbitSegment {
  let seg = b.orbits[0];
  for (const o of b.orbits) if (o.validFrom && Date.parse(o.validFrom) <= date.getTime()) seg = o;
  return seg;
}

/**
 * Vector Terra → cos segons l'efemèride de pas proper de JPL (interpolació lineal),
 * o null si la data és fora de la taula.
 */
export function closeApproachVector(b: SmallBodyData, date: Date): Vec3 | null {
  const t = b.closeApproach;
  if (!t?.length) return null;
  const jd = dateToJd(date);
  if (jd < t[0][0] || jd > t[t.length - 1][0]) return null;
  const step = t[1][0] - t[0][0];
  const i = Math.min(Math.floor((jd - t[0][0]) / step), t.length - 2);
  const [a, c] = [t[i], t[i + 1]];
  const f = (jd - a[0]) / (c[0] - a[0]);
  return { x: a[1] + (c[1] - a[1]) * f, y: a[2] + (c[2] - a[2]) * f, z: a[3] + (c[3] - a[3]) * f };
}

/** Posició heliocèntrica d'un cos petit en una data (UA, eclíptica J2000). */
export function smallBodyPosition(b: SmallBodyData, date: Date): Vec3 {
  return keplerPosition(elementsAt(b, date), date);
}

const DEG = Math.PI / 180;
/** TDB − UTC ≈ 69,18 s (32,184 s + 37 segons intercalars des del 2017) */
const TDB_MINUS_UTC_DAYS = 69.184 / 86_400;

export const dateToJd = (d: Date): number => d.getTime() / 86_400_000 + 2_440_587.5 + TDB_MINUS_UTC_DAYS;
export const jdToDate = (jd: number): Date => new Date((jd - 2_440_587.5 - TDB_MINUS_UTC_DAYS) * 86_400_000);

/** Resol l'equació de Kepler M = E − e·sin E (Newton-Raphson). */
export function solveKepler(M: number, e: number): number {
  // Anomalia mitjana a [−π, π]
  M = Math.atan2(Math.sin(M), Math.cos(M));
  let E = e < 0.8 ? M : Math.PI * Math.sign(M || 1);
  for (let k = 0; k < 60; k++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-13) break;
  }
  return E;
}

/** Posició a partir de l'anomalia excèntrica E (UA, eclíptica J2000). */
function positionFromE(el: OrbitalElements, E: number): Vec3 {
  const xp = el.a * (Math.cos(E) - el.e);
  const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  const [cO, sO] = [Math.cos(el.om * DEG), Math.sin(el.om * DEG)];
  const [cw, sw] = [Math.cos(el.w * DEG), Math.sin(el.w * DEG)];
  const [ci, si] = [Math.cos(el.i * DEG), Math.sin(el.i * DEG)];
  return {
    x: xp * (cO * cw - sO * sw * ci) + yp * (-cO * sw - sO * cw * ci),
    y: xp * (sO * cw + cO * sw * ci) + yp * (-sO * sw + cO * cw * ci),
    z: xp * (sw * si) + yp * (cw * si),
  };
}

/** Posició heliocèntrica (UA, eclíptica J2000) en una data. */
export function keplerPosition(el: OrbitalElements, date: Date): Vec3 {
  const M = (el.ma + el.n * (dateToJd(date) - el.epochJd)) * DEG;
  return positionFromE(el, solveKepler(M, el.e));
}

/**
 * Punts de l'òrbita completa. Combina mostres uniformes en anomalia excèntrica i en anomalia
 * vertadera perquè les òrbites molt allargades (cometes) quedin ben dibuixades a prop del Sol.
 */
export function keplerOrbit(el: OrbitalElements, samples = 360): Vec3[] {
  const k = Math.sqrt((1 - el.e) / (1 + el.e));
  const Es: number[] = [];
  for (let s = 0; s < samples; s++) {
    Es.push(-Math.PI + (2 * Math.PI * s) / samples);
    const nu = -Math.PI + (2 * Math.PI * (s + 0.5)) / samples;
    Es.push(2 * Math.atan(k * Math.tan(nu / 2)));
  }
  Es.sort((a, b) => a - b);
  Es.push(Es[0] + 2 * Math.PI);
  return Es.map((E) => positionFromE(el, E));
}
