/**
 * Tot el que es pot reconèixer al cel en un moment donat, per posar-hi nom sobre la càmera:
 * el Sol, la Lluna, els planetes, les estrelles brillants (amb fitxa o només amb nom), els objectes
 * del cel profund que es veuen a ull nu i l'Estació Espacial quan passa.
 */
import { Body, Illumination } from 'astronomy-engine';
import { BODIES, CATALOG } from '../astro/bodies';
import { ISS_ID, issState } from './iss';
import { MILKY_WAY_ID } from './milkyway';
import { horizontalOf, horizontalOfRaDec, type Horizontal, type Place } from './sky';

export type SkyObjectKind = 'sol' | 'lluna' | 'planeta' | 'estel' | 'cel profund' | 'iss';

export interface SkyObject {
  /** Id del catàleg (si té fitxa i es pot buscar) */
  id?: string;
  name: string;
  kind: SkyObjectKind;
  pos: Horizontal;
  mag: number;
  color: string;
}

/**
 * Altres estrelles brillants conegudes, només per posar-los nom (no tenen fitxa).
 * Coordenades J2000 (ascensió recta en hores, declinació en graus).
 */
const NAMED_STARS: { name: string; ra: number; dec: number; mag: number }[] = [
  { name: 'Fomalhaut', ra: 22.961, dec: -29.622, mag: 1.16 },
  { name: 'Règul', ra: 10.139, dec: 11.967, mag: 1.35 },
  { name: 'Càstor', ra: 7.577, dec: 31.888, mag: 1.58 },
  { name: 'Bellatrix', ra: 5.419, dec: 6.35, mag: 1.64 },
  { name: 'Elnath', ra: 5.438, dec: 28.608, mag: 1.65 },
  { name: 'Alnilam', ra: 5.603, dec: -1.202, mag: 1.69 },
  { name: 'Alnitak', ra: 5.679, dec: -1.943, mag: 1.77 },
  { name: 'Mintaka', ra: 5.533, dec: -0.299, mag: 2.23 },
  { name: 'Saiph', ra: 5.796, dec: -9.67, mag: 2.06 },
  { name: 'Alioth', ra: 12.9, dec: 55.96, mag: 1.76 },
  { name: 'Dubhe', ra: 11.062, dec: 61.751, mag: 1.79 },
  { name: 'Mizar', ra: 13.399, dec: 54.925, mag: 2.23 },
  { name: 'Alkaid', ra: 13.792, dec: 49.313, mag: 1.85 },
  { name: 'Mirfak', ra: 3.405, dec: 49.861, mag: 1.79 },
  { name: 'Algol', ra: 3.136, dec: 40.956, mag: 2.1 },
  { name: 'Alhena', ra: 6.629, dec: 16.399, mag: 1.92 },
  { name: 'Hamal', ra: 2.12, dec: 23.462, mag: 2.0 },
  { name: 'Denebola', ra: 11.818, dec: 14.572, mag: 2.13 },
  { name: 'Rasalhague', ra: 17.582, dec: 12.56, mag: 2.07 },
  { name: 'Alphecca', ra: 15.578, dec: 26.715, mag: 2.22 },
  { name: 'Schedar', ra: 0.675, dec: 56.537, mag: 2.24 },
  { name: 'Caph', ra: 0.153, dec: 59.15, mag: 2.27 },
  { name: 'Enif', ra: 21.736, dec: 9.875, mag: 2.38 },
  { name: 'Markab', ra: 23.079, dec: 15.205, mag: 2.49 },
];

/** Planetes i Plutó massa febles per veure'ls a ull nu no s'hi posen */
const MAX_PLANET_MAG = 6.5;

const SKIP = new Set(['earth', MILKY_WAY_ID]);

/** Objectes per sobre de l'horitzó (o una mica per sota, perquè es vegin arribar), dels més brillants als més febles */
export function skyObjects(date: Date, place: Place, minAlt = -3): SkyObject[] {
  const out: SkyObject[] = [];
  const add = (o: SkyObject) => {
    if (o.pos.alt >= minAlt) out.push(o);
  };

  for (const b of BODIES) {
    if (SKIP.has(b.id)) continue;
    const pos = horizontalOf(b, date, place);
    if (!pos) continue;
    if (b.body === Body.Sun) add({ id: b.id, name: b.name, kind: 'sol', pos, mag: -26.7, color: b.color });
    else if (b.body === Body.Moon) add({ id: b.id, name: b.name, kind: 'lluna', pos, mag: Illumination(Body.Moon, date).mag, color: b.color });
    else {
      const mag = Illumination(b.body, date).mag;
      if (mag <= MAX_PLANET_MAG) add({ id: b.id, name: b.name, kind: 'planeta', pos, mag, color: b.color });
    }
  }

  for (const b of CATALOG) {
    if (!b.sky || SKIP.has(b.id)) continue;
    // Del cel profund, només el que es veu a ull nu
    if (b.kind === 'cel profund' && b.sky.eye !== 'ull nu') continue;
    add({
      id: b.id, name: b.name, kind: b.kind === 'estel' ? 'estel' : 'cel profund',
      pos: horizontalOfRaDec(b.sky.ra, b.sky.dec, date, place), mag: b.sky.mag, color: b.color,
    });
  }

  for (const s of NAMED_STARS) {
    add({ name: s.name, kind: 'estel', pos: horizontalOfRaDec(s.ra, s.dec, date, place), mag: s.mag, color: '#e6ecff' });
  }

  // L'Estació Espacial, només si és il·luminada i per sobre de l'horitzó
  const iss = issState(date, place);
  if (iss && iss.sunlit && iss.pos.alt > 0) add({ id: ISS_ID, name: 'Estació Espacial', kind: 'iss', pos: iss.pos, mag: -2.5, color: '#9ff0ff' });

  return out.sort((a, b) => a.mag - b.mag);
}
