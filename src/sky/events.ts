/**
 * Calendari d'esdeveniments del cel: fases de la Lluna, pluges d'estels, eclipsis, la Lluna a prop
 * d'un planeta, trobades entre planetes, oposicions, Venus i Mercuri al seu millor moment i les
 * estacions. Tot es calcula al dispositiu amb astronomy-engine.
 */
import {
  AngleBetween, Body, Elongation, GeoVector, Illumination, SearchLocalSolarEclipse, SearchLunarEclipse,
  SearchMaxElongation, SearchMoonQuarter, NextMoonQuarter, SearchRelativeLongitude, Seasons,
  NextLunarEclipse, NextLocalSolarEclipse,
} from 'astronomy-engine';
import { bodyById } from '../astro/bodies';
import { horizontalOf, observerOf, towardsCardinal, type Place } from './sky';

export type EventKind = 'lluna' | 'pluja' | 'eclipsi' | 'trobada' | 'oposicio' | 'elongacio' | 'estacio';

export interface SkyEvent {
  id: string;
  date: Date;
  kind: EventKind;
  title: string;
  text: string;
  /** Cossos implicats (per enllaçar-ne la fitxa) */
  bodies: string[];
  /** Es podrà veure des d'aquí (null: no aplica) */
  visible: boolean | null;
  /** Moment i direcció recomanats per mirar-ho */
  look?: { time: Date; where: string };
  /** Molt destacat (eclipsis, grans pluges d'estels) */
  big?: boolean;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const hm = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });
const pct = (x: number) => `${Math.round(x * 100)} %`;
const sunAlt = (t: Date, place: Place) => horizontalOf(bodyById('sun')!, t, place)!.alt;
const altOf = (id: string, t: Date, place: Place) => horizontalOf(bodyById(id)!, t, place)!.alt;

/** Primer moment de foscor, a prop de `t` (±14 h), en què tots els cossos són prou amunt */
function bestLook(ids: string[], t: Date, place: Place, minAlt = 8): { time: Date; where: string } | undefined {
  let best: Date | undefined;
  for (let k = -14; k <= 14; k++) {
    const time = new Date(Math.round(t.getTime() / HOUR) * HOUR + k * HOUR);
    if (sunAlt(time, place) > -7) continue;
    if (ids.every((id) => altOf(id, time, place) >= minAlt) && (!best || Math.abs(time.getTime() - t.getTime()) < Math.abs(best.getTime() - t.getTime()))) {
      best = time;
    }
  }
  if (!best) return undefined;
  const az = horizontalOf(bodyById(ids[0])!, best, place)!.az;
  return { time: best, where: towardsCardinal(az) };
}

// ── Fases de la Lluna ──────────────────────────────────────

function moonPhases(from: Date, to: Date): SkyEvent[] {
  const out: SkyEvent[] = [];
  for (let q = SearchMoonQuarter(from); q.time.date < to; q = NextMoonQuarter(q)) {
    if (q.quarter === 0) {
      out.push({
        id: `lluna-nova-${q.time.date.getTime()}`, date: q.time.date, kind: 'lluna', title: 'Lluna nova', bodies: ['moon'], visible: null,
        text: 'La Lluna no fa claror: són les millors nits per veure estrelles febles, galàxies i la Via Làctia des d’un lloc fosc.',
      });
    } else if (q.quarter === 2) {
      out.push({
        id: `lluna-plena-${q.time.date.getTime()}`, date: q.time.date, kind: 'lluna', title: 'Lluna plena', bodies: ['moon'], visible: null,
        text: 'La Lluna surt quan es pon el Sol i és al cel tota la nit. Fa tanta claror que amaga els estels més febles.',
      });
    }
  }
  return out;
}

// ── Pluges d'estels ────────────────────────────────────────

interface Shower {
  name: string;
  /** Mes (1–12) i dia del màxim (nit del dia indicat cap al següent) */
  month: number;
  day: number;
  /** Estels per hora en condicions ideals (THZ) */
  rate: number;
  /** Constel·lació d'on sembla que surten */
  radiant: string;
  note: string;
}

const SHOWERS: Shower[] = [
  { name: 'Quadràntides', month: 1, day: 3, rate: 110, radiant: 'cst-boo', note: 'El màxim és molt curt, d’unes hores. Millor de matinada.' },
  { name: 'Lírides', month: 4, day: 22, rate: 18, radiant: 'cst-lyr', note: 'Una pluja modesta però antiga: se’n tenen registres de fa 2.700 anys.' },
  { name: 'Eta Aquàrides', month: 5, day: 6, rate: 50, radiant: 'cst-peg', note: 'Restes del cometa Halley. Des d’aquí surten baixes: millor just abans de l’alba.' },
  { name: 'Perseides', month: 8, day: 12, rate: 100, radiant: 'cst-per', note: 'Les «llàgrimes de Sant Llorenç»: la pluja més popular, amb nits càlides. Millor després de mitjanit.' },
  { name: 'Dracònides', month: 10, day: 8, rate: 10, radiant: 'cst-dra', note: 'Normalment fluixa, però alguns anys sorprèn. Millor al vespre.' },
  { name: 'Oriònides', month: 10, day: 21, rate: 20, radiant: 'cst-ori', note: 'També són restes del cometa Halley. Millor de matinada.' },
  { name: 'Leònides', month: 11, day: 17, rate: 15, radiant: 'cst-leo', note: 'Cada 33 anys n’hi ha tempestes espectaculars; ara som en anys tranquils. Millor de matinada.' },
  { name: 'Gemínides', month: 12, day: 14, rate: 150, radiant: 'cst-gem', note: 'La pluja més abundant de l’any, i es veu ja des del vespre.' },
  { name: 'Úrsides', month: 12, day: 22, rate: 10, radiant: 'cst-umi', note: 'Una pluja petita al voltant del solstici d’hivern.' },
];

function meteorShowers(from: Date, to: Date): SkyEvent[] {
  const out: SkyEvent[] = [];
  for (let y = from.getFullYear(); y <= to.getFullYear(); y++) {
    for (const s of SHOWERS) {
      // Cap a les 2 de la matinada (hora d'aquí) de la nit del màxim
      const date = new Date(Date.UTC(y, s.month - 1, s.day + 1, 1));
      if (date < from || date > to) continue;
      const lit = Illumination(Body.Moon, date).phase_fraction;
      const moon =
        lit < 0.25 ? 'Aquest any la Lluna gairebé no molestarà: bona ocasió.'
          : lit < 0.65 ? `La Lluna (il·luminada al ${pct(lit)}) en taparà una part.`
            : `Aquest any la Lluna (il·luminada al ${pct(lit)}) farà molta claror i se’n veuran pocs.`;
      out.push({
        id: `pluja-${s.name}-${y}`, date, kind: 'pluja', title: `Pluja d’estels: ${s.name}`, bodies: [s.radiant], visible: null,
        big: s.rate >= 80 && lit < 0.65,
        text: `Fins a ${s.rate} estels per hora en un cel perfecte (des d’un lloc fosc se’n solen veure moltes menys). ${s.note} ${moon}`,
      });
    }
  }
  return out;
}

// ── Eclipsis ───────────────────────────────────────────────

const LUNAR_KIND: Record<string, string> = { total: 'total', partial: 'parcial', penumbral: 'penombral' };
const SOLAR_KIND: Record<string, string> = { total: 'total', annular: 'anular', partial: 'parcial' };

function eclipses(from: Date, to: Date, place: Place): SkyEvent[] {
  const out: SkyEvent[] = [];
  for (let e = SearchLunarEclipse(from); e.peak.date < to; e = NextLunarEclipse(e.peak)) {
    // Els penombrals gairebé no es noten
    if (e.kind === 'penumbral') continue;
    const visible = altOf('moon', e.peak.date, place) > 0;
    out.push({
      id: `eclipsi-lluna-${e.peak.date.getTime()}`, date: e.peak.date, kind: 'eclipsi', bodies: ['moon'], visible, big: visible,
      title: `Eclipsi ${LUNAR_KIND[e.kind]} de Lluna`,
      text: (e.kind === 'total'
        ? 'La Lluna entra del tot a l’ombra de la Terra i es torna vermellosa durant una estona. Es pot mirar sense cap perill.'
        : 'L’ombra de la Terra mossega una part de la Lluna. Es pot mirar sense cap perill.')
        + (visible ? ` Des d’aquí es veurà: el moment central és a les ${hm(e.peak.date)}.` : ' Des d’aquí no es veurà: la Lluna serà sota l’horitzó.'),
    });
  }
  const obs = observerOf(place);
  for (let e = SearchLocalSolarEclipse(from, obs); e.peak.time.date < to; e = NextLocalSolarEclipse(e.peak.time, obs)) {
    const visible = e.peak.altitude > 0;
    if (!visible) continue;
    out.push({
      id: `eclipsi-sol-${e.peak.time.date.getTime()}`, date: e.peak.time.date, kind: 'eclipsi', bodies: ['sun'], visible, big: true,
      title: `Eclipsi ${SOLAR_KIND[e.kind] ?? ''} de Sol`.replace('  ', ' '),
      text: `Des d’aquí la Lluna taparà el ${pct(e.obscuration)} del Sol; el moment central és a les ${hm(e.peak.time.date)}`
        + `${e.kind === 'total' ? ' i es farà fosc com de nit uns instants' : ''}. ⚠️ Mai no el miris directament: calen ulleres d’eclipsi homologades.`,
    });
  }
  return out;
}

// ── Trobades: la Lluna a prop d'un planeta, o dos planetes junts ──

const PLANETS: [Body, string][] = [[Body.Venus, 'venus'], [Body.Mars, 'mars'], [Body.Jupiter, 'jupiter'], [Body.Saturn, 'saturn'], [Body.Mercury, 'mercury']];

/** Separació aparent (graus) vista des del centre de la Terra */
const sepAt = (a: Body, b: Body, t: Date) => AngleBetween(GeoVector(a, t, true), GeoVector(b, t, true));

/** Mínims de separació per sota de `limit` entre dues dates, mostrejant cada `step` ms */
function closeApproaches(a: Body, b: Body, from: Date, to: Date, step: number, limit: number): { time: Date; sep: number }[] {
  const out: { time: Date; sep: number }[] = [];
  let [t0, s0] = [from.getTime(), sepAt(a, b, from)];
  let [t1, s1] = [t0 + step, sepAt(a, b, new Date(t0 + step))];
  for (let t2 = t1 + step; t2 <= to.getTime(); t2 += step) {
    const s2 = sepAt(a, b, new Date(t2));
    if (s1 < s0 && s1 <= s2 && s1 < limit + 1) {
      // Afinem el mínim (cerca ternària)
      let [lo, hi] = [t0, t2];
      for (let k = 0; k < 30; k++) {
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        if (sepAt(a, b, new Date(m1)) < sepAt(a, b, new Date(m2))) hi = m2;
        else lo = m1;
      }
      const time = new Date((lo + hi) / 2);
      const sep = sepAt(a, b, time);
      if (sep < limit) out.push({ time, sep });
    }
    [t0, s0, t1, s1] = [t1, s1, t2, s2];
  }
  return out;
}

const deg = (x: number) => `${x.toLocaleString('ca', { maximumFractionDigits: x < 2 ? 1 : 0 })}°`;
const fist = (x: number) => (x < 1.2 ? 'tan junts que gairebé es toquen' : x < 3 ? 'a menys de dos dits amb el braç estès' : 'a menys d’un puny amb el braç estès');

function conjunctions(from: Date, to: Date, place: Place): SkyEvent[] {
  const out: SkyEvent[] = [];
  for (const [p, id] of PLANETS) {
    const name = bodyById(id)!.name;
    // La Lluna a prop d'un planeta (no Mercuri: sempre és massa a prop del Sol)
    if (p !== Body.Mercury) {
      for (const c of closeApproaches(Body.Moon, p, from, to, 3 * HOUR, 5)) {
        const look = bestLook(['moon', id], c.time, place);
        out.push({
          id: `trobada-lluna-${id}-${c.time.getTime()}`, date: c.time, kind: 'trobada', bodies: ['moon', id], visible: !!look, look,
          title: `La Lluna a prop de ${name}`,
          text: `La Lluna i ${name} es veuran junts al cel (${deg(c.sep)}, ${fist(c.sep)}). És una bona manera de trobar ${name} per primer cop.`,
        });
      }
    }
  }
  // Dos planetes junts
  for (let i = 0; i < PLANETS.length; i++) {
    for (let j = i + 1; j < PLANETS.length; j++) {
      const [[a, ida], [b, idb]] = [PLANETS[i], PLANETS[j]];
      for (const c of closeApproaches(a, b, from, to, DAY, 2.5)) {
        // Massa a prop del Sol: no es veuria
        if (Math.abs(Elongation(a, c.time).elongation) < 15) continue;
        const look = bestLook([ida, idb], c.time, place, 5);
        const [na, nb] = [bodyById(ida)!.name, bodyById(idb)!.name];
        out.push({
          id: `trobada-${ida}-${idb}-${c.time.getTime()}`, date: c.time, kind: 'trobada', bodies: [ida, idb], visible: !!look, look, big: c.sep < 1,
          title: `${na} i ${nb}, junts`,
          text: `Dos planetes molt a prop al cel (${deg(c.sep)}, ${fist(c.sep)}). Només ho semblen: en realitat són a milions de km l’un de l’altre.`,
        });
      }
    }
  }
  return out;
}

// ── Oposicions i elongacions ───────────────────────────────

function oppositions(from: Date, to: Date): SkyEvent[] {
  const out: SkyEvent[] = [];
  for (const [p, id] of [[Body.Mars, 'mars'], [Body.Jupiter, 'jupiter'], [Body.Saturn, 'saturn']] as [Body, string][]) {
    const t = SearchRelativeLongitude(p, 0, from).date;
    if (t > to) continue;
    const name = bodyById(id)!.name;
    out.push({
      id: `oposicio-${id}-${t.getTime()}`, date: t, kind: 'oposicio', bodies: [id], visible: null, big: p === Body.Mars,
      title: `${name} en oposició`,
      text: `La Terra passa entre el Sol i ${name}: és el millor moment de l’any per veure’l. Surt quan es pon el Sol, és al cel tota la nit i brilla més que mai.`,
    });
  }
  return out;
}

function elongations(from: Date, to: Date): SkyEvent[] {
  const out: SkyEvent[] = [];
  for (const [p, id] of [[Body.Venus, 'venus'], [Body.Mercury, 'mercury']] as [Body, string][]) {
    let start = from;
    for (let k = 0; k < 6; k++) {
      const e = SearchMaxElongation(p, start);
      if (e.time.date > to) break;
      start = new Date(e.time.date.getTime() + DAY);
      const name = bodyById(id)!.name;
      const evening = e.visibility === 'evening';
      out.push({
        id: `elongacio-${id}-${e.time.date.getTime()}`, date: e.time.date, kind: 'elongacio', bodies: [id], visible: null,
        title: `${name}, ${evening ? 'estel del vespre' : 'estel del matí'}`,
        text: `${name} és al punt més allunyat del Sol (${deg(e.elongation)}): és quan millor es veu, ${evening ? 'cap a l’oest just després de la posta de Sol' : 'cap a l’est just abans de l’alba'}.`
          + (p === Body.Mercury ? ' Mercuri sempre és baix i esquiu: busca un horitzó ben net.' : ''),
      });
    }
  }
  return out;
}

// ── Estacions ──────────────────────────────────────────────

function seasons(from: Date, to: Date): SkyEvent[] {
  const out: SkyEvent[] = [];
  for (let y = from.getFullYear(); y <= to.getFullYear(); y++) {
    const s = Seasons(y);
    const list: [Date, string, string][] = [
      [s.mar_equinox.date, 'Equinocci de primavera', 'Comença la primavera: el dia i la nit duren gairebé el mateix.'],
      [s.jun_solstice.date, 'Solstici d’estiu', 'Comença l’estiu: el dia més llarg de l’any i la nit més curta.'],
      [s.sep_equinox.date, 'Equinocci de tardor', 'Comença la tardor: el dia i la nit tornen a durar gairebé el mateix.'],
      [s.dec_solstice.date, 'Solstici d’hivern', 'Comença l’hivern: la nit més llarga de l’any, ideal per mirar el cel.'],
    ];
    for (const [date, title, text] of list) {
      if (date >= from && date <= to) out.push({ id: `estacio-${date.getTime()}`, date, kind: 'estacio', title, text, bodies: ['sun'], visible: null });
    }
  }
  return out;
}

// ── Tot junt ───────────────────────────────────────────────

/**
 * Esdeveniments entre `from` i `from + days`, per ordre de data. Els eclipsis es busquen més enllà
 * (`eclipseDays`), perquè són rars i val la pena saber-los amb temps.
 */
export function skyEvents(from: Date, place: Place, days = 90, eclipseDays = 730): SkyEvent[] {
  const to = new Date(from.getTime() + days * DAY);
  const events = [
    ...moonPhases(from, to),
    ...meteorShowers(from, to),
    ...eclipses(from, new Date(from.getTime() + eclipseDays * DAY), place),
    ...conjunctions(from, to, place),
    ...oppositions(from, to),
    ...elongations(from, to),
    ...seasons(from, to),
  ];
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}
