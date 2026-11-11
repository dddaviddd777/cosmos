import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import { realDisplayRadius, type ScaleMode } from './scale';

const tmp = new Vector3();

/**
 * Escala d'un grup de radi 1 (esfera, anells, etiqueta) perquè el cos tingui la mida que toca:
 *  - didàctica: una mida fixa exagerada;
 *  - real: la mida real, però mai més petita que un puntet visible des d'on és la càmera.
 */
export function useBodyScale(mode: ScaleMode, radiusKm: number, isSun: boolean, didacticRadius: number) {
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => {
    const g = ref.current;
    if (!g) return;
    if (mode === 'didactica') {
      g.scale.setScalar(didacticRadius);
      return;
    }
    const d = camera.position.distanceTo(g.getWorldPosition(tmp));
    g.scale.setScalar(realDisplayRadius(radiusKm, isSun, d));
  });
  return ref;
}
