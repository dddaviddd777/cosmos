/**
 * Distància en directe a la Terra per a qualsevol cos del catàleg.
 *  - Cossos amb efemèride (planetes, Plutó, Lluna) i llunes galileanes: astronomy-engine.
 *  - Asteroides, cometes i planetes nans: propagador kepleriè amb dades de NASA/JPL.
 *  - Altres llunes: distància del planeta al voltant del qual giren (aproximació molt bona,
 *    la diferència és inferior a l'1 %).
 */
import { Body, C_AUDAY, GeoVector, JupiterMoons, KM_PER_AU } from 'astronomy-engine';
import { bodyById, type BodyInfo } from './bodies';
import { distanceFromEarth, heliocentricPosition, type EarthDistance } from './engine';
import { SMALL_BODIES, closeApproachVector, smallBodyPosition } from './kepler';

export interface LiveDistance extends EarthDistance {
  /** true si és la distància del planeta pare (aproximada) */
  approx: boolean;
}

const GALILEAN = { io: 'io', europa: 'europa', ganymede: 'ganymede', callisto: 'callisto' } as const;
const MIN_PER_DAY = 1440;

const fromAu = (au: number): EarthDistance => ({ au, km: au * KM_PER_AU, lightMinutes: (au / C_AUDAY) * MIN_PER_DAY });

/** UA en un any llum */
export const AU_PER_LY = 63_241.077;

export function liveDistance(b: BodyInfo, date: Date): LiveDistance | null {
  if (b.sky) return { ...fromAu(b.sky.ly * AU_PER_LY), approx: false };
  if (b.body) return { ...distanceFromEarth(b.body, date), approx: false };

  const small = SMALL_BODIES[b.id];
  if (small) {
    // Pas proper a la Terra (p. ex. Apophis 2029): efemèride oficial de JPL
    const ca = closeApproachVector(small, date);
    if (ca) return { ...fromAu(Math.hypot(ca.x, ca.y, ca.z)), approx: false };

    const earth = heliocentricPosition(Body.Earth, date);
    // Correcció pel temps de llum: veiem el cos on era quan va sortir la llum
    let au = 0;
    for (let k = 0; k < 2; k++) {
      const emitted = new Date(date.getTime() - (au / C_AUDAY) * 86_400_000);
      const p = smallBodyPosition(small, emitted);
      au = Math.hypot(p.x - earth.x, p.y - earth.y, p.z - earth.z);
    }
    return { ...fromAu(au), approx: false };
  }

  if (b.parent === 'jupiter' && b.id in GALILEAN) {
    const jup = GeoVector(Body.Jupiter, date, true);
    const m = JupiterMoons(date)[GALILEAN[b.id as keyof typeof GALILEAN]];
    // Tots dos vectors en EQJ: la distància no depèn del sistema de referència
    return { ...fromAu(Math.hypot(jup.x + m.x, jup.y + m.y, jup.z + m.z)), approx: false };
  }

  const parent = b.parent ? bodyById(b.parent) : undefined;
  if (parent?.body) return { ...distanceFromEarth(parent.body, date), approx: true };

  return null;
}
