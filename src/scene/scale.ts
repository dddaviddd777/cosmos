import type { Vec3 } from '../astro/engine';

export type ScaleMode = 'didactica' | 'real';

/**
 * Converteix una posició heliocèntrica (UA, eclíptica) a coordenades de l'escena Three.js.
 *  - 'didactica': distància comprimida logarítmicament perquè tot el sistema càpiga a la pantalla
 *  - 'real': distàncies proporcionals (10 unitats = 1 UA)
 * Three.js té l'eix Y cap amunt, per tant el pol nord de l'eclíptica (z) passa a ser Y.
 */
export function toScene(p: Vec3, mode: ScaleMode): [number, number, number] {
  const r = Math.hypot(p.x, p.y, p.z);
  if (r === 0) return [0, 0, 0];
  const k = mode === 'real' ? 10 : (12 * Math.log2(1 + r / 0.25)) / r;
  return [p.x * k, p.z * k, -p.y * k];
}

/** Radi visual del cos a l'escena (exagerat: a escala real serien punts invisibles). */
export function visualRadius(radiusKm: number, isSun: boolean, mode: ScaleMode): number {
  const base = Math.cbrt(radiusKm / 6371) * (mode === 'real' ? 0.35 : 0.8);
  return isSun ? base * (mode === 'real' ? 0.6 : 0.8) : Math.max(base, 0.25);
}
