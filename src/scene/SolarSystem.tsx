import { useMemo } from 'react';
import { Html, Line, OrbitControls, Stars } from '@react-three/drei';
import { Body } from 'astronomy-engine';
import { BODIES, HELIO_ORBITERS, bodyById, type BodyInfo } from '../astro/bodies';
import { SMALL_SCENE_BODIES, heliocentricOf } from '../astro/positions';
import { CameraRig } from './CameraRig';
import { SMALL_BODY_RADIUS, SmallBodies } from './SmallBodies';
import { geocentricPosition, heliocentricPosition, sampleOrbit } from '../astro/engine';
import { toScene, visualRadius, type ScaleMode } from './scale';

interface Props {
  date: Date;
  scale: ScaleMode;
  /** Cos ressaltat a l'escena */
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Cos que la càmera segueix (null = càmera lliure) */
  focusId: string | null;
  focusNonce: number;
  /** Mostrar asteroides, cometes i planetes nans */
  showSmall: boolean;
}

const radiusOf = (b: BodyInfo, scale: ScaleMode) =>
  !b.body
    ? SMALL_BODY_RADIUS
    : visualRadius(b.radiusKm, b.body === Body.Sun, scale) * (b.body === Body.Moon ? 0.8 : 1);

/** Separació visual Terra–Lluna a l'escena (a escala real quedarien superposades). */
const MOON_OFFSET = 1.6;

export function SolarSystem({ date, scale, selectedId, onSelect, focusId, focusNonce, showSmall }: Props) {
  // Les òrbites gairebé no canvien en segles: es calculen un cop per escala.
  const orbits = useMemo(() => {
    const ref = new Date();
    return HELIO_ORBITERS.map((b) => ({
      id: b.id,
      color: b.color,
      points: sampleOrbit(b.body, ref, b.body === Body.Pluto ? 512 : 256).map((p) => toScene(p, scale)),
    }));
  }, [scale]);

  const positions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const b of BODIES) {
      if (b.body === Body.Moon) continue;
      map.set(b.id, toScene(heliocentricPosition(b.body, date), scale));
    }
    const earth = map.get('earth')!;
    const m = geocentricPosition(Body.Moon, date);
    const ml = Math.hypot(m.x, m.y, m.z);
    const earthR = visualRadius(6371, false, scale);
    const off = MOON_OFFSET * earthR;
    map.set('moon', [earth[0] + (m.x / ml) * off, earth[1] + (m.z / ml) * off, earth[2] - (m.y / ml) * off]);
    // Cossos petits. Si un passa molt a prop de la Terra (Apophis el 2029), a l'escena quedaria
    // dins de la seva esfera exagerada: el separem en la direcció real on és, com la Lluna.
    const earthHelio = heliocentricPosition(Body.Earth, date);
    const minGap = 2.4 * earthR;
    for (const b of SMALL_SCENE_BODIES) {
      const h = heliocentricOf(b, date)!;
      let p = toScene(h, scale);
      const gap = Math.hypot(p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]);
      if (gap < minGap) {
        const g = { x: h.x - earthHelio.x, y: h.y - earthHelio.y, z: h.z - earthHelio.z };
        const gl = Math.hypot(g.x, g.y, g.z) || 1;
        p = [earth[0] + (g.x / gl) * minGap, earth[1] + (g.z / gl) * minGap, earth[2] - (g.y / gl) * minGap];
      }
      map.set(b.id, p);
    }
    return map;
  }, [date, scale]);

  return (
    <>
      <color attach="background" args={['#05070f']} />
      <Stars radius={600} depth={200} count={6000} factor={6} fade speed={0} />
      <ambientLight intensity={0.12} />
      <pointLight position={[0, 0, 0]} intensity={3} decay={0} />

      {orbits.map((o) => (
        <Line
          key={o.id}
          points={o.points}
          color={o.color}
          transparent
          opacity={selectedId === o.id ? 0.9 : 0.3}
          lineWidth={selectedId === o.id ? 2 : 1}
        />
      ))}

      {BODIES.map((b) => (
        <CelestialBody
          key={b.id}
          info={b}
          position={positions.get(b.id)!}
          radius={radiusOf(b, scale)}
          selected={selectedId === b.id}
          onSelect={onSelect}
        />
      ))}

      <SmallBodies
        date={date}
        scale={scale}
        positions={positions}
        selectedId={selectedId}
        onSelect={onSelect}
        visible={showSmall}
      />

      <CameraRig
        target={focusId ? (positions.get(focusId) ?? null) : null}
        radius={focusId && bodyById(focusId) ? radiusOf(bodyById(focusId)!, scale) : 1}
        nonce={focusNonce}
      />

      <OrbitControls enablePan enableDamping makeDefault minDistance={2} maxDistance={scale === 'real' ? 1500 : 320} />
    </>
  );
}

interface BodyProps {
  info: BodyInfo;
  position: [number, number, number];
  radius: number;
  selected: boolean;
  onSelect: (id: string) => void;
}

function CelestialBody({ info, position, radius, selected, onSelect }: BodyProps) {
  const isSun = info.body === Body.Sun;
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(info.id);
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        {isSun ? (
          <meshBasicMaterial color={info.color} />
        ) : (
          <meshStandardMaterial color={info.color} roughness={0.9} metalness={0} />
        )}
      </mesh>
      {info.body === Body.Saturn && (
        <mesh rotation={[Math.PI / 2 - 0.47, 0, 0]}>
          <ringGeometry args={[radius * 1.3, radius * 2.2, 64]} />
          <meshBasicMaterial color="#d8c58a" transparent opacity={0.55} side={2} />
        </mesh>
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.6, radius * 1.75, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} side={2} />
        </mesh>
      )}
      {/* La Lluna és massa a prop de la Terra: només s'etiqueta quan està seleccionada */}
      {(info.body !== Body.Moon || selected) && (
        <Html position={[0, radius + 0.5, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className={`label ${selected ? 'label--selected' : ''}`}>{info.name}</span>
        </Html>
      )}
    </group>
  );
}
