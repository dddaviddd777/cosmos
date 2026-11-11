import { Canvas } from '@react-three/fiber';
import { SolarSystem } from './SolarSystem';
import type { ScaleMode } from './scale';
import { ViewShift } from './ViewShift';

export interface SceneProps {
  date: Date;
  scale: ScaleMode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  focusId: string | null;
  focusNonce: number;
  showSmall: boolean;
  /** Desplaçament vertical de la vista (mòbil amb el panell obert) */
  viewShift: number;
  /** Atura el dibuix (p. ex. mentre «Troba'l al cel» ocupa tota la pantalla): estalvia bateria */
  paused: boolean;
}

/**
 * Escena 3D completa. Es carrega a part (import dinàmic): Three.js és la part més pesada de l'app
 * i així la interfície apareix abans.
 */
export default function Scene({ date, scale, selectedId, onSelect, focusId, focusNonce, showSmall, viewShift, paused }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 55, 75], fov: 50, near: 0.1, far: 5000 }}
      dpr={[1, 2]}
      frameloop={paused ? 'never' : 'always'}
      onPointerMissed={() => onSelect(null)}
      aria-label="Esquema 3D del sistema solar. Arrossega per girar-lo, pessiga o fes servir la roda per apropar-te i toca un cos per veure'n la fitxa."
    >
      <SolarSystem
        date={date}
        scale={scale}
        selectedId={selectedId}
        onSelect={onSelect}
        focusId={focusId}
        focusNonce={focusNonce}
        showSmall={showSmall}
      />
      <ViewShift fraction={viewShift} />
    </Canvas>
  );
}
