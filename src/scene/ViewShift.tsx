import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';

/**
 * Desplaça el centre de la imatge cap amunt una fracció de l'alçada de la pantalla.
 * Al mòbil, el panell inferior tapa el centre: així el cos centrat queda visible a sobre.
 */
export function ViewShift({ fraction }: { fraction: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);

  useEffect(() => {
    if (fraction > 0) {
      camera.setViewOffset(size.width, size.height, 0, size.height * fraction, size.width, size.height);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, fraction]);

  return null;
}
