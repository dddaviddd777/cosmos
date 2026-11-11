import type { Vec3 } from '../astro/engine';

export type ScaleMode = 'didactica' | 'real';

/** A escala real, unitats de l'escena per UA */
export const UNITS_PER_AU = 10;
const KM_PER_AU = 149_597_870.7;

/**
 * Converteix una posició heliocèntrica (UA, eclíptica) a coordenades de l'escena Three.js.
 *  - 'didactica': distància comprimida logarítmicament perquè tot el sistema càpiga a la pantalla
 *  - 'real': distàncies proporcionals (10 unitats = 1 UA)
 * Three.js té l'eix Y cap amunt, per tant el pol nord de l'eclíptica (z) passa a ser Y.
 */
export function toScene(p: Vec3, mode: ScaleMode): [number, number, number] {
  const r = Math.hypot(p.x, p.y, p.z);
  if (r === 0) return [0, 0, 0];
  const k = mode === 'real' ? UNITS_PER_AU : (12 * Math.log2(1 + r / 0.25)) / r;
  return [p.x * k, p.z * k, -p.y * k];
}

/** Vector relatiu (UA, eclíptica) a l'escena real, sense compressió: per a la Lluna i els passos propers */
export const relToScene = (v: Vec3): [number, number, number] => [v.x * UNITS_PER_AU, v.z * UNITS_PER_AU, -v.y * UNITS_PER_AU];

/** Radi visual del cos a l'escala didàctica (exagerat: a escala real serien punts invisibles). */
export function visualRadius(radiusKm: number, isSun: boolean, mode: ScaleMode): number {
  const base = Math.cbrt(radiusKm / 6371) * (mode === 'real' ? 0.35 : 0.8);
  return isSun ? base * (mode === 'real' ? 0.6 : 0.8) : Math.max(base, 0.25);
}

/** Radi real del cos en unitats de l'escena real */
export const trueRadius = (radiusKm: number): number => (radiusKm / KM_PER_AU) * UNITS_PER_AU;

/**
 * A escala real, de lluny els cossos serien invisibles: es dibuixen com a mínim d'aquesta mida
 * aparent (radi = distància a la càmera × factor; ~0,4° de diàmetre). Quan t'hi apropes prou,
 * la mida real ja és més gran i es veuen tal com són.
 */
export function dotFactor(radiusKm: number, isSun: boolean): number {
  if (isSun) return 0.012;
  return 0.0045 * Math.min(2, Math.max(1, Math.cbrt(radiusKm / 6371)));
}

/** Radi a dibuixar a escala real, segons la distància de la càmera */
export const realDisplayRadius = (radiusKm: number, isSun: boolean, camDist: number): number =>
  Math.max(trueRadius(radiusKm), camDist * dotFactor(radiusKm, isSun));
