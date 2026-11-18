/**
 * La Lluna en detall: fase, edat, sortida i posta, properes fases i quins llocs s'hi veuen bé.
 */
import { Body, MoonPhase, NextMoonQuarter, SearchMoonQuarter, SearchRiseSet } from 'astronomy-engine';
import { moonInfo } from './tonight';
import { observerOf, type Place } from './sky';

/** Mes sinòdic: de lluna nova a lluna nova (dies) */
export const SYNODIC = 29.530589;
const DAY = 86_400_000;

export interface MoonToday {
  name: string;
  /** Fracció il·luminada (0–1) */
  lit: number;
  /** Angle de fase: 0 nova, 90 quart creixent, 180 plena, 270 quart minvant */
  angle: number;
  /** Dies des de la lluna nova */
  age: number;
  waxing: boolean;
  rise: Date | null;
  set: Date | null;
  quarters: { name: string; date: Date }[];
}

const QUARTER = ['Lluna nova', 'Quart creixent', 'Lluna plena', 'Quart minvant'];

export function moonToday(now: Date, place: Place): MoonToday {
  const angle = MoonPhase(now);
  const info = moonInfo(now);
  const obs = observerOf(place);
  // Sortida i posta d'avui (des de mitjanit local)
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rise = SearchRiseSet(Body.Moon, obs, +1, midnight, 1)?.date ?? null;
  // La posta que ve després de la sortida d'avui (pot ser l'endemà de matinada)
  const set = SearchRiseSet(Body.Moon, obs, -1, rise ?? midnight, 1.2)?.date ?? null;
  const quarters: MoonToday['quarters'] = [];
  for (let q = SearchMoonQuarter(now); quarters.length < 4; q = NextMoonQuarter(q)) {
    quarters.push({ name: QUARTER[q.quarter], date: q.time.date });
  }
  return { name: info.name, lit: info.lit, angle, age: (angle / 360) * SYNODIC, waxing: angle < 180, rise, set, quarters };
}

// ── Què s'hi pot veure ───────────────────────────────────

export interface MoonFeature {
  name: string;
  /** Longitud selenogràfica (graus, positiva cap a l'est lunar, que vist des d'aquí és a la dreta) */
  lon: number;
  text: string;
  /** Es veu millor amb la Lluna gairebé plena (cràters amb rajos brillants) */
  full?: boolean;
  /** Es veu a ull nu (els mars); si no, cal prismàtics */
  eye?: boolean;
}

export const MOON_FEATURES: MoonFeature[] = [
  { name: 'Mar de les Crisis', lon: 59, eye: true, text: 'Una taca fosca i rodona a la vora dreta. És el primer «mar» que es veu després de la lluna nova.' },
  { name: 'Mar de la Tranquil·litat', lon: 31, eye: true, text: 'On va aterrar l’Apol·lo 11 el 1969, amb els primers humans a la Lluna.' },
  { name: 'Mar de la Serenitat', lon: 18, eye: true, text: 'Un mar gran i rodó, a la part de dalt. A la seva vora va aterrar l’Apol·lo 17, l’última missió tripulada.' },
  { name: 'Cràter Plató', lon: -9, text: 'Un cràter de fons pla i fosc, com una taca ovalada a la vora del Mar de les Pluges.' },
  { name: 'Mar de les Pluges', lon: -16, eye: true, text: 'L’«ull dret» de la cara de la Lluna: un impacte enorme envoltat de muntanyes.' },
  { name: 'Cràter Copèrnic', lon: -20, text: 'El «monarca de la Lluna»: 93 km d’ample, amb muntanyes al centre i rajos clars al voltant.' },
  { name: 'Cràter Tycho', lon: -11, full: true, text: 'Un cràter jove a la part de baix, amb rajos brillants que travessen mitja Lluna. Espectacular amb la lluna plena.' },
  { name: 'Oceà de les Tempestes', lon: -57, eye: true, text: 'La taca fosca més gran, a l’esquerra. Hi van aterrar l’Apol·lo 12 i diverses sondes.' },
];

export type FeatureState = 'millor' | 'visible' | 'fosc';

/**
 * El Sol surt sobre un punt de la Lluna quan la «línia del matí» (terminador) hi passa: amb la lluna nova
 * és a la vora est (+90°) i avança 12,2° cada dia. Els relleus es veuen millor els 1–3 dies després,
 * amb ombres llargues; els cràters amb rajos, amb la Lluna plena.
 */
export function featureState(f: MoonFeature, age: number): FeatureState {
  const sunrise = (90 - f.lon) / (360 / SYNODIC);
  const sinceSunrise = (((age - sunrise) % SYNODIC) + SYNODIC) % SYNODIC;
  if (sinceSunrise > SYNODIC / 2) return 'fosc';
  if (f.full) return Math.abs(age - SYNODIC / 2) < 2.5 ? 'millor' : 'visible';
  return sinceSunrise <= 3 || (f.eye && SYNODIC / 2 - sinceSunrise <= 2) ? 'millor' : 'visible';
}

/** Dies que falten per al pròxim «millor moment» d'un lloc (0 si és avui) */
export function daysToBest(f: MoonFeature, age: number): number {
  for (let d = 0; d < 30; d++) if (featureState(f, (age + d) % SYNODIC) === 'millor') return d;
  return 0;
}

export const lunarDay = (age: number) => Math.floor(age) + 1;
export const days = (n: number) => (n === 1 ? '1 dia' : `${n} dies`);
export const dayMs = DAY;
