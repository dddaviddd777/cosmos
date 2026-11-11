import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { prefersReducedMotion } from '../ui/prefs';

interface Controls {
  target: Vector3;
  update: () => void;
}

interface Props {
  /** Posició actual a l'escena del cos a seguir, o null per alliberar la càmera */
  target: [number, number, number] | null;
  /** Radi visual del cos (per decidir a quina distància posar-se) */
  radius: number;
  /** Canvia cada cop que es demana un nou centrat (inicia l'animació de vol) */
  nonce: number;
}

const FLIGHT_SECONDS = 1.2;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Vola fins al cos seleccionat i després el segueix mentre es mou (el temps avança),
 * deixant que l'usuari continuï girant i fent zoom al seu voltant.
 */
export function CameraRig({ target, radius, nonce }: Props) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const flight = useRef<{ t: number; fromCam: Vector3; fromTarget: Vector3; dir: Vector3 } | null>(null);
  const last = useRef<Vector3 | null>(null);

  useEffect(() => {
    if (!controls || !target) return;
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.6, 1);
    flight.current = {
      // Amb «reduir el moviment» activat al sistema, salt directe sense animació
      t: prefersReducedMotion() ? 0.999 : 0,
      fromCam: camera.position.clone(),
      fromTarget: controls.target.clone(),
      dir: dir.normalize(),
    };
    // Només en demanar un nou centrat: no volem reiniciar el vol cada cop que el cos es mou
  }, [nonce, controls]);

  useFrame((_, dt) => {
    if (!controls || !target) {
      last.current = null;
      flight.current = null;
      return;
    }
    const tgt = new Vector3(...target);
    const f = flight.current;
    if (f) {
      f.t = Math.min(1, f.t + dt / FLIGHT_SECONDS);
      const k = ease(f.t);
      const endCam = tgt.clone().addScaledVector(f.dir, Math.max(radius * 10, 5));
      controls.target.lerpVectors(f.fromTarget, tgt, k);
      camera.position.lerpVectors(f.fromCam, endCam, k);
      if (f.t >= 1) flight.current = null;
    } else if (last.current) {
      const delta = tgt.clone().sub(last.current);
      controls.target.add(delta);
      camera.position.add(delta);
    }
    last.current = tgt;
    controls.update();
  });

  return null;
}
