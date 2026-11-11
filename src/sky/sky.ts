/**
 * On és un cos al cel vist des d'un punt de la Terra (azimut i altitud), i si es pot veure.
 * Base de «Troba'l al cel».
 */
import {
  AstroTime, Body, C_AUDAY, EquatorFromVector, HelioVector, Horizon, Illumination, Observer,
  RotateVector, Rotation_ECL_EQJ, Rotation_EQJ_EQD, Vector,
} from 'astronomy-engine';
import { bodyById, toBody, type BodyInfo } from '../astro/bodies';
import { skyPosition } from '../astro/engine';
import { SMALL_BODIES, smallBodyPosition } from '../astro/kepler';

export interface Horizontal {
  /** Graus des del nord, en sentit horari (90 = est) */
  az: number;
  /** Graus sobre l'horitzó (amb refracció atmosfèrica) */
  alt: number;
}

export interface Place {
  lat: number;
  lon: number;
  name?: string;
}

const ECL_TO_EQJ = Rotation_ECL_EQJ();

export const observerOf = (p: Place) => new Observer(p.lat, p.lon, 0);

/** Cos que realment s'ha de buscar: les llunes sense efemèride es busquen al costat del seu planeta. */
export function skyTargetOf(b: BodyInfo): BodyInfo {
  if (b.body || SMALL_BODIES[b.id] || b.sky) return b;
  const parent = b.parent ? bodyById(b.parent) : undefined;
  return parent ?? b;
}

/** Azimut i altitud d'un cos del catàleg (null si no se'n pot calcular la posició). */
export function horizontalOf(b: BodyInfo, date: Date, place: Place): Horizontal | null {
  const target = skyTargetOf(b);
  const obs = observerOf(place);
  if (target.sky) {
    // Coordenades fixes J2000 → equador i equinocci de la data (precessió i nutació)
    const time = new AstroTime(date);
    const ra = (target.sky.ra * 15 * Math.PI) / 180;
    const dec = (target.sky.dec * Math.PI) / 180;
    const v = new Vector(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), time);
    const eq = EquatorFromVector(RotateVector(Rotation_EQJ_EQD(time), v));
    return horizon(date, obs, eq.ra, eq.dec);
  }
  if (target.body) {
    const p = skyPosition(target.body, date, obs);
    return horizon(date, obs, p.ra, p.dec);
  }
  const small = SMALL_BODIES[target.id];
  if (!small) return null;

  // Vector Terra → cos (EQJ), amb correcció pel temps de llum
  const time = new AstroTime(date);
  const earth = HelioVector(Body.Earth, date);
  let geo = new Vector(0, 0, 0, time);
  let au = 0;
  for (let k = 0; k < 2; k++) {
    const p = smallBodyPosition(small, new Date(date.getTime() - (au / C_AUDAY) * 86_400_000));
    const eqj = RotateVector(ECL_TO_EQJ, new Vector(p.x, p.y, p.z, time));
    geo = new Vector(eqj.x - earth.x, eqj.y - earth.y, eqj.z - earth.z, time);
    au = Math.hypot(geo.x, geo.y, geo.z);
  }
  // Equador i equinocci de la data → coordenades horitzontals
  const eq = EquatorFromVector(RotateVector(Rotation_EQJ_EQD(time), geo));
  return horizon(date, obs, eq.ra, eq.dec);
}

/**
 * Coordenades horitzontals amb refracció atmosfèrica, però només a prop o per sobre de l'horitzó:
 * astronomy-engine també l'aplica a sota, on no té sentit físic.
 */
function horizon(date: Date, obs: Observer, ra: number, dec: number): Horizontal {
  const geometric = Horizon(date, obs, ra, dec, '');
  if (geometric.altitude < -1) return { az: geometric.azimuth, alt: geometric.altitude };
  const refracted = Horizon(date, obs, ra, dec, 'normal');
  return { az: refracted.azimuth, alt: refracted.altitude };
}

/**
 * Altura màxima que arriba a tenir un objecte fix des d'un lloc (graus, sense refracció).
 * Negativa: des d'allà no surt mai. Undefined si no és un objecte fix.
 */
export function maxAltitude(b: BodyInfo, place: Place): number | undefined {
  return b.sky ? 90 - Math.abs(place.lat - b.sky.dec) : undefined;
}

/** No es pon mai (sempre per sobre de l'horitzó) */
export const isCircumpolar = (b: BodyInfo, place: Place) =>
  !!b.sky && Math.abs(place.lat) + Math.abs(b.sky.dec) > 90 && Math.sign(place.lat) === Math.sign(b.sky.dec);

/** Angle entre dues direccions del cel (graus). */
export function separation(a: Horizontal, b: Horizontal): number {
  const r = Math.PI / 180;
  const c =
    Math.sin(a.alt * r) * Math.sin(b.alt * r) +
    Math.cos(a.alt * r) * Math.cos(b.alt * r) * Math.cos((a.az - b.az) * r);
  return Math.acos(Math.min(1, Math.max(-1, c))) / r;
}

export interface Visibility {
  pos: Horizontal;
  sun: Horizontal;
  /** Angle fins al Sol (graus) */
  sunSeparation: number;
  /** Magnitud aparent (només planetes, Lluna i Sol) */
  magnitude?: number;
  daylight: 'dia' | 'crepuscle' | 'nit';
  /** Missatges per a l'usuari, en ordre d'importància */
  notes: string[];
  /** Hi ha perill per als ulls (el Sol o massa a prop del Sol) */
  danger: boolean;
}

export function visibilityOf(b: BodyInfo, date: Date, place: Place): Visibility | null {
  const target = skyTargetOf(b);
  const pos = horizontalOf(target, date, place);
  if (!pos) return null;
  const sun = horizontalOf(bodyById('sun')!, date, place)!;
  const sunSeparation = target.id === 'sun' ? 0 : separation(pos, sun);
  const daylight = sun.alt > -0.8 ? 'dia' : sun.alt > -12 ? 'crepuscle' : 'nit';
  const magnitude = target.body ? Illumination(target.body, date).mag : target.sky?.mag;
  const notes: string[] = [];
  const danger = target.id === 'sun' || (sun.alt > -2 && sunSeparation < 15);

  if (target.id === 'sun') {
    notes.push('⚠️ No miris mai el Sol directament ni amb prismàtics o telescopi: pots perdre la vista.');
  } else if (danger) {
    notes.push('⚠️ És molt a prop del Sol: no l’apuntis amb prismàtics ni telescopi, et podries fer mal als ulls.');
  }
  if (target !== b) notes.push(`${b.name} és massa petit per veure’l sol: et guiem fins ${toBody(target)}, al seu costat.`);
  const top = maxAltitude(target, place);
  if (top !== undefined && top < 1) notes.push('Des d’aquí no surt mai per sobre de l’horitzó: només es veu des de més al sud.');
  else if (pos.alt < 0) notes.push('Ara és sota l’horitzó: no es pot veure.');
  else if (pos.alt < 8) notes.push('És molt baix, a prop de l’horitzó: busca un lloc sense edificis ni muntanyes.');

  if (pos.alt >= 0 && target.id !== 'sun') {
    if (magnitude !== undefined) {
      if (target.id === 'moon') {
        // La Lluna es veu fins i tot de dia, excepte quan és molt prima (a prop de la lluna nova)
        const lit = Illumination(Body.Moon, date).phase_fraction;
        if (lit < 0.15 && daylight !== 'nit') notes.push('Ara és una lluna molt prima i hi ha claror: costarà veure-la.');
        else if (daylight === 'dia') notes.push('La Lluna també es veu de dia: busca-la al cel blau.');
      } else if (target.sky && daylight !== 'nit' && daylight !== 'crepuscle') {
        notes.push('És de dia: no es veurà fins que es faci fosc.');
      } else if (target.sky && target.sky.eye !== 'ull nu') {
        notes.push(target.sky.eye === 'cel fosc'
          ? 'Es veu a ull nu com una taca borrosa, però només des d’un lloc fosc, lluny dels llums de ciutat.'
          : 'Amb prismàtics el trobaràs molt millor (i cal un cel fosc).');
        if (daylight === 'crepuscle') notes.push('Espera que sigui ben fosc.');
      } else if (daylight === 'dia') {
        notes.push(magnitude < -3.5 ? 'És de dia: és difícil però possible de veure si saps on mirar.' : 'És de dia: no es veurà fins que es faci fosc.');
      } else if (magnitude < 1) {
        notes.push('Molt brillant: es veu fàcilment a ull nu.');
      } else if (magnitude < 6) {
        notes.push('Visible a ull nu des d’un lloc fosc.');
      } else {
        notes.push('Massa feble per veure’l a ull nu: necessitaràs un telescopi.');
      }
    } else {
      notes.push('Segurament necessitaràs prismàtics o un telescopi per veure’l.');
      if (daylight !== 'nit') notes.push('Espera que sigui ben fosc.');
    }
  }
  return { pos, sun, sunSeparation, magnitude, daylight, notes, danger };
}

/** Propera sortida per l'horitzó en les pròximes 48 h (cerca per passos + bisecció), o null. */
export function nextRise(b: BodyInfo, from: Date, place: Place): Date | null {
  const STEP = 10 * 60_000;
  const alt = (t: number) => horizontalOf(b, new Date(t), place)?.alt ?? -90;
  let t0 = from.getTime();
  let a0 = alt(t0);
  for (let t = t0 + STEP; t <= from.getTime() + 48 * 3_600_000; t += STEP) {
    const a = alt(t);
    if (a0 < 0 && a >= 0) {
      let [lo, hi] = [t - STEP, t];
      for (let k = 0; k < 12; k++) {
        const mid = (lo + hi) / 2;
        if (alt(mid) < 0) lo = mid;
        else hi = mid;
      }
      return new Date(hi);
    }
    [t0, a0] = [t, a];
  }
  return null;
}

/** «cap al nord», «cap a l’est»: direcció amb la preposició correcta */
export function towardsCardinal(az: number): string {
  const c = cardinal(az);
  return /^[eo]/.test(c) ? `cap a l’${c}` : `cap al ${c}`;
}

/** Nom del punt cardinal per a un azimut: «nord-est», «sud»… */
export function cardinal(az: number): string {
  const names = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-oest', 'oest', 'nord-oest'];
  return names[Math.round((((az % 360) + 360) % 360) / 45) % 8];
}
