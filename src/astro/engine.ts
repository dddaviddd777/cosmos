/**
 * Motor astronòmic: tota la física/astronomia de l'app passa per aquí.
 * Es basa en astronomy-engine (models VSOP87 / ELP truncats, precisió < 1 minut d'arc).
 *
 * Sistema de coordenades de l'escena: eclíptica J2000, centrada al Sol, en UA.
 *   x → punt vernal (equinocci de primavera), y → 90° de longitud eclíptica, z → pol nord de l'eclíptica.
 */
import {
  Body,
  C_AUDAY,
  Equator,
  GeoVector,
  HelioVector,
  Horizon,
  Illumination,
  KM_PER_AU,
  Observer,
  PlanetOrbitalPeriod,
  RotateVector,
  Rotation_EQJ_ECL,
  SearchRiseSet,
  type Vector,
} from 'astronomy-engine';

export { KM_PER_AU };

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const EQJ_TO_ECL = Rotation_EQJ_ECL();
const MINUTES_PER_DAY = 1440;

const toEcliptic = (v: Vector): Vec3 => {
  const e = RotateVector(EQJ_TO_ECL, v);
  return { x: e.x, y: e.y, z: e.z };
};

export const length = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);

/** Posició heliocèntrica (UA, eclíptica J2000) d'un cos en una data. */
export function heliocentricPosition(body: Body, date: Date): Vec3 {
  if (body === Body.Sun) return { x: 0, y: 0, z: 0 };
  return toEcliptic(HelioVector(body, date));
}

/** Vector Terra → cos (UA, eclíptica J2000), corregit pel temps de llum. */
export function geocentricPosition(body: Body, date: Date): Vec3 {
  return toEcliptic(GeoVector(body, date, true));
}

export interface EarthDistance {
  au: number;
  km: number;
  /** Temps que triga la llum del cos a arribar a la Terra (minuts) */
  lightMinutes: number;
}

/** Distància des del centre de la Terra fins al cos. */
export function distanceFromEarth(body: Body, date: Date): EarthDistance {
  if (body === Body.Earth) return { au: 0, km: 0, lightMinutes: 0 };
  const au = length(geocentricPosition(body, date));
  return { au, km: au * KM_PER_AU, lightMinutes: (au / C_AUDAY) * MINUTES_PER_DAY };
}

/** Distància al Sol (UA). */
export function distanceFromSun(body: Body, date: Date): number {
  return length(heliocentricPosition(body, date));
}

/** Període orbital sideri al voltant del Sol (dies). */
export function orbitalPeriodDays(body: Body): number {
  return PlanetOrbitalPeriod(body);
}

/**
 * Mostreja l'òrbita real d'un planeta al llarg d'un període complet
 * a partir de `date`. Retorna punts heliocèntrics (UA, eclíptica).
 */
export function sampleOrbit(body: Body, date: Date, samples = 256): Vec3[] {
  const periodMs = orbitalPeriodDays(body) * 86_400_000;
  const points: Vec3[] = [];
  for (let i = 0; i <= samples; i++) {
    points.push(heliocentricPosition(body, new Date(date.getTime() + (periodMs * i) / samples)));
  }
  return points;
}

export interface SkyPosition {
  /** Azimut en graus: 0 = nord, 90 = est, 180 = sud, 270 = oest */
  azimuth: number;
  /** Altitud sobre l'horitzó en graus (negativa = sota l'horitzó), amb refracció */
  altitude: number;
  /** Ascensió recta (hores) i declinació (graus), equinocci de la data */
  ra: number;
  dec: number;
}

export function makeObserver(latitude: number, longitude: number, heightMeters = 0): Observer {
  return new Observer(latitude, longitude, heightMeters);
}

/** On és el cos al cel vist des d'un punt de la Terra (base de «Troba'l al cel»). */
export function skyPosition(body: Body, date: Date, observer: Observer): SkyPosition {
  const eq = Equator(body, date, observer, true, true);
  const hor = Horizon(date, observer, eq.ra, eq.dec, 'normal');
  return { azimuth: hor.azimuth, altitude: hor.altitude, ra: eq.ra, dec: eq.dec };
}

/** Magnitud aparent (més petit = més brillant; < 6 visible a ull nu). */
export function apparentMagnitude(body: Body, date: Date): number {
  return Illumination(body, date).mag;
}

export interface RiseSet {
  rise: Date | null;
  set: Date | null;
}

/** Propera sortida i posta del cos des de l'observador (dins dels pròxims `days` dies). */
export function nextRiseSet(body: Body, date: Date, observer: Observer, days = 2): RiseSet {
  const rise = SearchRiseSet(body, observer, +1, date, days);
  const set = SearchRiseSet(body, observer, -1, date, days);
  return { rise: rise?.date ?? null, set: set?.date ?? null };
}
