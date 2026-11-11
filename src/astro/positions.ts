/**
 * Punt únic per saber on és qualsevol cos del catàleg (posició heliocèntrica, UA, eclíptica J2000).
 *  - Planetes, Plutó, Lluna, Sol: astronomy-engine.
 *  - Asteroides, cometes i planetes nans amb dades JPL: propagador kepleriè.
 */
import { CATALOG, type BodyInfo } from './bodies';
import { heliocentricPosition, type Vec3 } from './engine';
import { SMALL_BODIES, smallBodyPosition, type SmallBodyData } from './kepler';

export const smallBodyData = (b: BodyInfo): SmallBodyData | undefined => SMALL_BODIES[b.id];

/** Cossos petits amb òrbita calculable (es dibuixen al 3D amb la seva òrbita) */
export const SMALL_SCENE_BODIES: BodyInfo[] = CATALOG.filter((b) => !b.body && SMALL_BODIES[b.id]);

export function heliocentricOf(b: BodyInfo, date: Date): Vec3 | null {
  if (b.body) return heliocentricPosition(b.body, date);
  const s = SMALL_BODIES[b.id];
  return s ? smallBodyPosition(s, date) : null;
}
