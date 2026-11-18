/**
 * L'Estació Espacial Internacional (ISS): on és i quan passarà per sobre.
 *
 * La posició es calcula al dispositiu amb SGP4 (satellite.js) a partir dels «elements orbitals» (TLE)
 * que publica CelesTrak. Com que l'estació frena amb el fregament de l'aire i fa maniobres, aquestes
 * dades caduquen: es renoven cada 12 h i, si fan més de dues setmanes, la posició ja no és de fiar.
 *
 * Es veu quan és de nit a terra però l'estació, a 400 km d'altura, encara rep la llum del Sol:
 * sobretot la primera i l'última hora i mitja de la nit.
 */
import { useSyncExternalStore } from 'react';
import {
  degreesToRadians, ecfToLookAngles, eciToEcf, eciToGeodetic, gstime, jday, propagate, shadowFraction, sunPos, twoline2satrec,
  type SatRec,
} from './sgp4';
import type { Horizontal, Place } from './sky';

export const ISS_ID = 'iss';

const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';
const TLE_KEY = 'cosmos.iss.tle';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const R2D = 180 / Math.PI;

export interface Tle {
  l1: string;
  l2: string;
  /** Quan es va baixar (ms) */
  fetched: number;
}

// ── Dades orbitals ────────────────────────────────────────

let tle: Tle | null = null;
let satrec: SatRec | null = null;
const listeners = new Set<() => void>();

function setTle(t: Tle | null): void {
  tle = t;
  try {
    satrec = t ? twoline2satrec(t.l1, t.l2) : null;
  } catch {
    satrec = null;
  }
  listeners.forEach((f) => f());
}

try {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(TLE_KEY) : null;
  if (raw) setTle(JSON.parse(raw));
} catch {
  /* sense emmagatzematge */
}

/** Per a les proves i per si es vol fixar a mà */
export const setIssTle = (t: Tle | null) => setTle(t);

/** Època de les dades (quan eren exactes) */
export function tleEpoch(t: Tle): Date {
  const yy = Number(t.l1.slice(18, 20));
  const doy = Number(t.l1.slice(20, 32));
  return new Date(Date.UTC(yy < 57 ? 2000 + yy : 1900 + yy, 0, 1) + (doy - 1) * DAY);
}

/** Les dades valen si són de fa menys de 14 dies respecte de la data que es calcula */
export const tleUsable = (date: Date) => !!tle && !!satrec && Math.abs(date.getTime() - tleEpoch(tle).getTime()) < 14 * DAY;

export function parseTle(text: string): { l1: string; l2: string } | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const l1 = lines.find((l) => l.startsWith('1 25544'));
  const l2 = lines.find((l) => l.startsWith('2 25544'));
  return l1 && l2 && l1.length >= 68 && l2.length >= 68 ? { l1, l2 } : null;
}

let pending: Promise<void> | null = null;

/** Baixa dades noves si les que hi ha tenen més de 12 h (o no n'hi ha) */
export function refreshTle(force = false): Promise<void> {
  if (!force && tle && Date.now() - tle.fetched < 12 * HOUR) return Promise.resolve();
  pending ??= fetch(TLE_URL)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
    .then((text) => {
      const p = parseTle(text);
      if (!p) return;
      const t = { ...p, fetched: Date.now() };
      try {
        localStorage.setItem(TLE_KEY, JSON.stringify(t));
      } catch {
        /* sense emmagatzematge */
      }
      setTle(t);
    })
    .catch(() => {})
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Estat de les dades, per redibuixar quan arriben */
export function useIssData(fetchNow = true): { ready: boolean; tle: Tle | null } {
  const t = useSyncExternalStore(
    (f) => {
      listeners.add(f);
      if (fetchNow) refreshTle();
      return () => listeners.delete(f);
    },
    () => tle,
    () => tle,
  );
  return { ready: !!t && tleUsable(new Date()), tle: t };
}

// ── Posició ───────────────────────────────────────────────

export interface IssState {
  pos: Horizontal;
  /** Distància des de l'observador (km) */
  rangeKm: number;
  /** Altura sobre el terra (km) */
  heightKm: number;
  /** Il·luminada pel Sol (no és a l'ombra de la Terra) */
  sunlit: boolean;
}

export function issState(date: Date, place: Place): IssState | null {
  if (!satrec || !tleUsable(date)) return null;
  const pv = propagate(satrec, date);
  if (!pv || typeof pv.position === 'boolean') return null;
  const gmst = gstime(date);
  const obs = { latitude: degreesToRadians(place.lat), longitude: degreesToRadians(place.lon), height: 0 };
  const look = ecfToLookAngles(obs, eciToEcf(pv.position, gmst));
  const sunlit = shadowFraction(sunPos(jday(date)).rsun, pv.position) < 0.5;
  return {
    pos: { az: ((look.azimuth * R2D) % 360 + 360) % 360, alt: look.elevation * R2D },
    rangeKm: look.rangeSat,
    heightKm: eciToGeodetic(pv.position, gmst).height,
    sunlit,
  };
}

export const issHorizontal = (date: Date, place: Place): Horizontal | null => issState(date, place)?.pos ?? null;

/** Altura aproximada del Sol (graus) des d'un lloc: n'hi ha prou per saber si és fosc */
function sunAltitude(date: Date, place: Place): number {
  const sun = sunPos(jday(date));
  const gmst = gstime(date);
  // Ascensió recta i declinació del Sol → angle horari local
  const ha = gmst + degreesToRadians(place.lon) - sun.rtasc;
  const lat = degreesToRadians(place.lat);
  return Math.asin(Math.sin(lat) * Math.sin(sun.decl) + Math.cos(lat) * Math.cos(sun.decl) * Math.cos(ha)) * R2D;
}

// ── Passos per sobre ──────────────────────────────────────

export interface IssPass {
  /** Surt per l'horitzó (o comença a veure's, si es veu) */
  start: Date;
  startAz: number;
  /** Punt més alt */
  peak: Date;
  peakAlt: number;
  peakAz: number;
  end: Date;
  endAz: number;
  /** Es veu a ull nu: estació il·luminada i cel prou fosc en algun moment del pas */
  visible: boolean;
  /** Minuts visibles */
  minutes: number;
}

/** Un pas val la pena si arriba com a mínim a 10° d'altura (més avall, edificis i boira) */
const MIN_ALT = 10;
const STEP = 20_000;

/**
 * Passos de l'ISS per sobre d'un lloc. Si l'estació es veu, l'inici i el final són el tram visible
 * (pot sortir o entrar a l'ombra de la Terra a mig camí).
 */
export function issPasses(place: Place, from: Date, days = 5, onlyVisible = true): IssPass[] {
  const out: IssPass[] = [];
  if (!tleUsable(from)) return out;
  const end = from.getTime() + days * DAY;
  let t = from.getTime();
  while (t < end) {
    const s = issState(new Date(t), place);
    if (!s) break;
    if (s.pos.alt < 0) {
      // Lluny de l'horitzó es pot avançar de pressa: l'estació puja com a molt ~1°/20 s
      t += s.pos.alt < -40 ? 5 * 60_000 : s.pos.alt < -15 ? 2 * 60_000 : STEP;
      continue;
    }
    // Dins d'un pas: es recorre fins que torna a baixar
    const samples: { t: number; s: IssState; dark: boolean }[] = [];
    let u = t;
    for (; u < end + HOUR; u += STEP) {
      const x = issState(new Date(u), place);
      if (!x || x.pos.alt < 0) break;
      samples.push({ t: u, s: x, dark: sunAltitude(new Date(u), place) < -6 });
    }
    t = u + STEP;
    const peak = samples.reduce((a, b) => (b.s.pos.alt > a.s.pos.alt ? b : a), samples[0]);
    if (!peak || peak.s.pos.alt < MIN_ALT) continue;
    const seen = samples.filter((x) => x.dark && x.s.sunlit && x.s.pos.alt >= MIN_ALT / 2);
    const visible = seen.length >= 3;
    if (onlyVisible && !visible) continue;
    const span = visible ? seen : samples;
    const first = span[0];
    const last = span[span.length - 1];
    const top = visible ? seen.reduce((a, b) => (b.s.pos.alt > a.s.pos.alt ? b : a)) : peak;
    out.push({
      start: new Date(first.t), startAz: first.s.pos.az,
      peak: new Date(top.t), peakAlt: top.s.pos.alt, peakAz: top.s.pos.az,
      end: new Date(last.t), endAz: last.s.pos.az,
      visible,
      minutes: Math.max(1, Math.round((last.t - first.t) / 60_000)),
    });
  }
  return out;
}

/** Propera vegada que es podrà veure (inici del tram visible), en els pròxims 5 dies */
export function nextIssSighting(place: Place, from: Date): IssPass | null {
  return issPasses(place, from, 5, true).find((p) => p.end.getTime() > from.getTime()) ?? null;
}

export interface PassTrack {
  pass: IssPass;
  /** Punts del recorregut visible, cada 20 s */
  points: Horizontal[];
  /** On és ara, si ja ha començat i encara es veu */
  now: Horizontal | null;
}

/** Recorregut d'un pas (només el tram visible) */
export function passTrack(pass: IssPass, place: Place, now: Date): PassTrack {
  const points: Horizontal[] = [];
  for (let t = pass.start.getTime(); t <= pass.end.getTime(); t += STEP) {
    const s = issState(new Date(t), place);
    if (s) points.push(s.pos);
  }
  const live = now >= pass.start && now <= pass.end ? issState(now, place)?.pos ?? null : null;
  return { pass, points, now: live };
}

/** El pas visible en curs o el pròxim que comenci abans de `withinMin` minuts (null si no n'hi ha) */
export function upcomingPass(place: Place, now: Date, withinMin = 60): IssPass | null {
  if (!tleUsable(now)) return null;
  const p = issPasses(place, new Date(now.getTime() - 15 * 60_000), (withinMin + 30) / 1440)
    .find((x) => x.end > now && x.start.getTime() - now.getTime() <= withinMin * 60_000);
  return p ?? null;
}
