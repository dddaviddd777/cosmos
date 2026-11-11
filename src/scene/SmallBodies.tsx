import { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import type { BodyInfo } from '../astro/bodies';
import { elementsAt, keplerOrbit } from '../astro/kepler';
import { length } from '../astro/engine';
import { SMALL_SCENE_BODIES, heliocentricOf, smallBodyData } from '../astro/positions';
import { toScene, type ScaleMode } from './scale';
import { useBodyScale } from './useBodyScale';
import { diameterKm } from '../astro/profile';

/** Mida visual fixa dels cossos petits (a escala serien invisibles). */
export const SMALL_BODY_RADIUS = 0.2;

interface Props {
  date: Date;
  scale: ScaleMode;
  positions: Map<string, [number, number, number]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Mostrar tots els cossos petits (si és fals, només el seleccionat) */
  visible: boolean;
}

/** Asteroides, cometes i planetes nans calculats amb el propagador kepleriè. */
export function SmallBodies({ date, scale, positions, selectedId, onSelect, visible }: Props) {
  // Clau dels trams d'òrbita vigents (Apophis canvia d'òrbita el 2029): només es recalcula si canvien
  const segKey = SMALL_SCENE_BODIES.map((b) => elementsAt(smallBodyData(b)!, date).epochJd).join();
  const orbits = useMemo(
    () =>
      new Map(
        SMALL_SCENE_BODIES.map((b) => [
          b.id,
          keplerOrbit(elementsAt(smallBodyData(b)!, date)).map((p) => toScene(p, scale)),
        ]),
      ),
    // Depèn de `date` només a través de `segKey`: no cal redibuixar les òrbites a cada fotograma
    [scale, segKey],
  );

  return (
    <>
      {SMALL_SCENE_BODIES.filter((b) => visible || b.id === selectedId).map((b) => (
        <SmallBody
          key={b.id}
          info={b}
          orbit={orbits.get(b.id)!}
          position={positions.get(b.id)!}
          sunDistanceAu={b.kind === 'cometa' ? length(heliocentricOf(b, date)!) : Infinity}
          selected={selectedId === b.id}
          onSelect={onSelect}
          scale={scale}
        />
      ))}
    </>
  );
}

interface BodyProps {
  info: BodyInfo;
  orbit: [number, number, number][];
  position: [number, number, number];
  /** Distància real al Sol (UA), per decidir si el cometa té cua */
  sunDistanceAu: number;
  selected: boolean;
  onSelect: (id: string) => void;
  scale: ScaleMode;
}

/** Els cometes desenvolupen cua quan el Sol n'escalfa el gel, aproximadament a menys de 5 UA. */
const TAIL_START_AU = 5;

function SmallBody({ info, orbit, position, sunDistanceAu, selected, onSelect, scale }: BodyProps) {
  // Grup de radi 1 (cos, zona tàctil, anell i etiqueta). A escala real, mida real quan t'hi apropes.
  const sized = useBodyScale(scale, diameterKm(info) / 2, false, SMALL_BODY_RADIUS);
  const isComet = info.kind === 'cometa';
  const showLabel = selected || info.kind === 'planeta nan';

  // Cua del cometa: apunta en sentit contrari al Sol (origen de l'escena) i creix en acostar-s'hi
  const tail = useMemo(() => {
    if (!isComet || sunDistanceAu > TAIL_START_AU) return null;
    const d = Math.hypot(...position) || 1;
    const len = 0.6 + 3 * (1 - sunDistanceAu / TAIL_START_AU);
    const end: [number, number, number] = [
      position[0] + (position[0] / d) * len,
      position[1] + (position[1] / d) * len,
      position[2] + (position[2] / d) * len,
    ];
    return [position, end] as [number, number, number][];
  }, [isComet, position, sunDistanceAu]);

  return (
    <>
      <Line
        points={orbit}
        color={info.color}
        transparent
        opacity={selected ? 0.85 : isComet ? 0.22 : 0.14}
        lineWidth={selected ? 2 : 1}
        dashed={!selected && isComet}
        dashSize={1.2}
        gapSize={0.8}
      />
      {tail && <Line points={tail} color="#cfeaff" transparent opacity={0.6} lineWidth={2.5} />}
      <group position={position}>
       <group ref={sized}>
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={info.color} />
        </mesh>
        {/* Zona tàctil més gran que el cos, per poder-lo tocar amb el dit */}
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onSelect(info.id);
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <sphereGeometry args={[4, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.25, 2.6, 48]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} side={2} />
          </mesh>
        )}
        {showLabel && (
          <Html position={[0, 3.5, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span className={`label label--small ${selected ? 'label--selected' : ''}`}>{info.name}</span>
          </Html>
        )}
       </group>
      </group>
    </>
  );
}
