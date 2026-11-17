/**
 * La Via Làctia al cel: una franja al voltant de l'equador galàctic, més ampla i brillant cap al
 * centre de la galàxia (al Sagitari) i més estreta i feble a l'altra banda (al Cotxer i Orió).
 * És una aproximació suau, prou bona per saber per on passa i cap on mirar.
 */
import { AstroTime, HorizonFromVector, RotateVector, Rotation_EQJ_HOR, Vector } from 'astronomy-engine';
import { observerOf, type Horizontal, type Place } from './sky';

export const MILKY_WAY_ID = 'milky-way';

const D = Math.PI / 180;

/** Matriu de coordenades equatorials J2000 → galàctiques (files) */
const G: number[][] = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.44482963, 0.7469822445],
  [-0.867666149, -0.1980763734, 0.4559837762],
];

/** Vector unitari equatorial J2000 d'un punt en coordenades galàctiques (graus) */
export function galToEq(l: number, b: number): [number, number, number] {
  const g = [Math.cos(b * D) * Math.cos(l * D), Math.cos(b * D) * Math.sin(l * D), Math.sin(b * D)];
  // Inversa = transposada
  return [0, 1, 2].map((k) => G[0][k] * g[0] + G[1][k] * g[1] + G[2][k] * g[2]) as [number, number, number];
}

/** Ascensió recta (h) i declinació (graus) */
export function galToRaDec(l: number, b: number): { ra: number; dec: number } {
  const [x, y, z] = galToEq(l, b);
  return { ra: ((Math.atan2(y, x) / D + 360) % 360) / 15, dec: Math.asin(z) / D };
}

/** Mitja amplada de la franja (graus) segons la longitud galàctica: més ampla cap al centre */
export const halfWidth = (l: number) => 6 + 8 * ((1 + Math.cos(l * D)) / 2) ** 2;
/** Brillantor relativa (0–1): màxima al centre de la galàxia */
export const brightness = (l: number) => 0.55 + 0.45 * ((1 + Math.cos(l * D)) / 2) ** 1.5;

function toHorizontal(rot: ReturnType<typeof Rotation_EQJ_HOR>, time: AstroTime, v: [number, number, number]): Horizontal {
  const h = HorizonFromVector(RotateVector(rot, new Vector(v[0], v[1], v[2], time)), 'normal');
  return { az: h.lon, alt: h.lat };
}

export interface MilkyWaySky {
  /** Vores de la franja (l de 0 a 360 en passos de 5°) per a cada capa: [nord, sud] */
  layers: { scale: number; north: Horizontal[]; south: Horizontal[] }[];
  /** Línia central amb la mitja amplada i la brillantor de cada punt */
  center: { h: Horizontal; w: number; bright: number }[];
}

const STEP = 5;

export function milkyWayInSky(date: Date, place: Place): MilkyWaySky {
  const time = new AstroTime(date);
  const rot = Rotation_EQJ_HOR(time, observerOf(place));
  const ls = Array.from({ length: 360 / STEP + 1 }, (_, i) => i * STEP);
  const layers = [1, 0.55].map((scale) => ({
    scale,
    north: ls.map((l) => toHorizontal(rot, time, galToEq(l, halfWidth(l) * scale))),
    south: ls.map((l) => toHorizontal(rot, time, galToEq(l, -halfWidth(l) * scale))),
  }));
  const center = ls.map((l) => ({ h: toHorizontal(rot, time, galToEq(l, 0)), w: halfWidth(l), bright: brightness(l) }));
  return { layers, center };
}

/**
 * Cap on mirar per veure la Via Làctia ara: el punt de la línia central més lluminós entre els que
 * són prou amunt (l'atmosfera apaga la llum baixa). Si cap no és amunt, el més alt.
 */
export function milkyWayBest(date: Date, place: Place): Horizontal {
  const time = new AstroTime(date);
  const rot = Rotation_EQJ_HOR(time, observerOf(place));
  let best: Horizontal | null = null;
  let score = -Infinity;
  for (let l = 0; l < 360; l += 5) {
    const h = toHorizontal(rot, time, galToEq(l, 0));
    const s = h.alt < 15 ? h.alt - 100 : brightness(l) * Math.sin(Math.min(h.alt, 60) * D);
    if (s > score) [best, score] = [h, s];
  }
  return best!;
}

export interface BandQuad {
  pts: [Horizontal, Horizontal, Horizontal, Horizontal];
  /** Opacitat suggerida (0–1) */
  alpha: number;
}

/** La franja trossejada en quadrilàters (ignorant els que queden del tot sota l'horitzó) */
export function bandQuads(mw: MilkyWaySky): BandQuad[] {
  const out: BandQuad[] = [];
  for (const layer of mw.layers) {
    for (let i = 0; i < layer.north.length - 1; i++) {
      const pts: BandQuad['pts'] = [layer.north[i], layer.north[i + 1], layer.south[i + 1], layer.south[i]];
      if (pts.every((p) => p.alt < -2)) continue;
      const bright = (mw.center[i].bright + mw.center[i + 1].bright) / 2;
      out.push({ pts, alpha: layer.scale === 1 ? 0.07 + 0.16 * bright : 0.05 + 0.2 * bright ** 2 });
    }
  }
  return out;
}
