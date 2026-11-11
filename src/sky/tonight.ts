/**
 * «Aquesta nit»: quins planetes i la Lluna es poden veure des d'un lloc, ara o quan es faci fosc.
 */
import { Body, Illumination, MoonPhase, SearchRiseSet } from 'astronomy-engine';
import { bodyById, CATALOG, type BodyInfo } from '../astro/bodies';
import { horizontalOf, maxAltitude, nextRise, observerOf, visibilityOf, type Horizontal, type Place } from './sky';

/** Cossos que es poden veure sense telescopi (o gairebé) */
export const TONIGHT_IDS = ['moon', 'venus', 'jupiter', 'mars', 'saturn', 'mercury', 'uranus', 'neptune'];

/** Altura del Sol sota l'horitzó a partir de la qual ja es veuen bé els planetes */
const DARK_SUN_ALT = -8;

export type SkyStatus = 'visible' | 'baix' | 'dia' | 'sol' | 'sota';
export type Eye = 'ull nu' | 'prismàtics' | 'telescopi';

export interface SkyEntry {
  body: BodyInfo;
  pos: Horizontal;
  magnitude: number;
  status: SkyStatus;
  eye: Eye;
  /** Propera sortida (si és sota l'horitzó) */
  rise: Date | null;
  /** Azimut per on sortirà */
  riseAz: number | null;
  /** Propera posta (si és sobre l'horitzó) */
  set: Date | null;
}

const sunAlt = (t: Date, place: Place) => horizontalOf(bodyById('sun')!, t, place)!.alt;

/** Primer moment, a partir de `from`, en què és prou fosc (dins de les 24 h següents). */
export function darkStart(from: Date, place: Place): Date | null {
  if (sunAlt(from, place) < DARK_SUN_ALT) return from;
  const STEP = 10 * 60_000;
  for (let t = from.getTime() + STEP; t <= from.getTime() + 24 * 3_600_000; t += STEP) {
    if (sunAlt(new Date(t), place) < DARK_SUN_ALT) {
      let [lo, hi] = [t - STEP, t];
      for (let k = 0; k < 10; k++) {
        const mid = (lo + hi) / 2;
        if (sunAlt(new Date(mid), place) < DARK_SUN_ALT) hi = mid;
        else lo = mid;
      }
      // Arrodonit al quart d'hora següent: «a les 18:45» és més fàcil de recordar
      return new Date(Math.ceil(hi / 900_000) * 900_000);
    }
  }
  return null;
}

export function isDark(t: Date, place: Place): boolean {
  return sunAlt(t, place) < DARK_SUN_ALT;
}

const eyeFor = (mag: number): Eye => (mag < 5.5 ? 'ull nu' : mag < 9 ? 'prismàtics' : 'telescopi');

/** Estat de cada cos a l'hora `t`, ordenats: primer els visibles, de més a menys brillant. */
export function skyTonight(t: Date, place: Place): SkyEntry[] {
  const obs = observerOf(place);
  const dark = isDark(t, place);
  const entries = TONIGHT_IDS.map((id) => {
    const body = bodyById(id)!;
    const v = visibilityOf(body, t, place)!;
    const magnitude = v.magnitude ?? 99;
    let status: SkyStatus;
    if (v.pos.alt < 0) status = 'sota';
    else if (v.danger) status = 'sol';
    else if (!dark && id !== 'moon' && !(id === 'venus' && v.sun.alt < -2)) status = 'dia';
    else status = v.pos.alt < 10 ? 'baix' : 'visible';
    const above = v.pos.alt >= 0;
    const set = above ? SearchRiseSet(body.body!, obs, -1, t, 1.2)?.date ?? null : null;
    const rise = above ? null : nextRise(body, t, place);
    const riseAz = rise ? horizontalOf(body, rise, place)!.az : null;
    return { body, pos: v.pos, magnitude, status, eye: eyeFor(magnitude), rise, riseAz, set };
  });
  // Primer el que es veu a ull nu i ben alt; després el que és baix; després el que necessita prismàtics
  const rank = (e: SkyEntry) => {
    const r: Record<SkyStatus, number> = { visible: 0, baix: 1, dia: 4, sol: 5, sota: 6 };
    return r[e.status] + (r[e.status] < 2 && e.eye !== 'ull nu' ? 2 : 0);
  };
  return entries.sort((a, b) => rank(a) - rank(b) || a.magnitude - b.magnitude);
}

export interface MoonInfo {
  name: string;
  emoji: string;
  /** Fracció il·luminada (0–1) */
  lit: number;
}

const PHASES: [string, string][] = [
  ['Lluna nova', '🌑'], ['Lluna creixent', '🌒'], ['Quart creixent', '🌓'], ['Gibosa creixent', '🌔'],
  ['Lluna plena', '🌕'], ['Gibosa minvant', '🌖'], ['Quart minvant', '🌗'], ['Lluna minvant', '🌘'],
];

export function moonInfo(t: Date): MoonInfo {
  const angle = MoonPhase(t); // 0 = nova, 90 = quart creixent, 180 = plena, 270 = quart minvant
  const [name, emoji] = PHASES[Math.round(angle / 45) % 8];
  return { name, emoji, lit: Illumination(Body.Moon, t).phase_fraction };
}

/** Propera posta i sortida del Sol a partir de `t` */
export function sunTimes(t: Date, place: Place) {
  const obs = observerOf(place);
  return {
    set: SearchRiseSet(Body.Sun, obs, -1, t, 1.2)?.date ?? null,
    rise: SearchRiseSet(Body.Sun, obs, +1, t, 1.2)?.date ?? null,
  };
}

/** Estrelles i objectes de fora del sistema solar */
export const FAR_BODIES = CATALOG.filter((b) => b.sky);

export interface FarEntry {
  body: BodyInfo;
  pos: Horizontal;
  /** Propera sortida (si ara és sota l'horitzó) */
  rise: Date | null;
}

export interface FarSky {
  /** Prou alts per veure'ls, de més a menys brillant */
  up: FarEntry[];
  /** Ara sota l'horitzó (o massa baixos), per ordre de sortida */
  down: FarEntry[];
  /** Des d'aquest lloc no surten mai */
  never: FarEntry[];
}

/** Altura mínima perquè valgui la pena buscar-los (l'atmosfera apaga els objectes baixos) */
const FAR_MIN_ALT = 8;

export function farTonight(t: Date, place: Place): FarSky {
  const out: FarSky = { up: [], down: [], never: [] };
  for (const body of FAR_BODIES) {
    const pos = horizontalOf(body, t, place)!;
    const entry: FarEntry = { body, pos, rise: null };
    if ((maxAltitude(body, place) ?? 90) < 3) out.never.push(entry);
    else if (pos.alt >= FAR_MIN_ALT) out.up.push(entry);
    else {
      entry.rise = pos.alt < 0 ? nextRise(body, t, place) : null;
      out.down.push(entry);
    }
  }
  out.up.sort((a, b) => a.body.sky!.mag - b.body.sky!.mag);
  out.down.sort((a, b) => (a.rise?.getTime() ?? Infinity) - (b.rise?.getTime() ?? Infinity));
  return out;
}
