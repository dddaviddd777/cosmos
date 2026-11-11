import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import { Html, Line, OrbitControls, Stars } from '@react-three/drei';
import { Body } from 'astronomy-engine';
import { BODIES, HELIO_ORBITERS, bodyById, type BodyInfo } from '../astro/bodies';
import { SMALL_SCENE_BODIES, heliocentricOf } from '../astro/positions';
import { CameraRig } from './CameraRig';
import { SMALL_BODY_RADIUS, SmallBodies } from './SmallBodies';
import { useBodyScale } from './useBodyScale';
import { geocentricPosition, heliocentricPosition, sampleOrbit } from '../astro/engine';
import { relToScene, toScene, trueRadius, visualRadius, type ScaleMode } from './scale';

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

/**
 * Escala didàctica: separació Terra–Lluna en radis de la Terra dibuixada. És exagerada com tot en aquesta
 * escala (de debò són 60 radis), però deixa espai perquè no semblin enganxades.
 */
const MOON_OFFSET_DIDACTIC = 2.6;

/** Distància a què es posa la càmera en centrar un cos */
function focusDistance(b: BodyInfo, scale: ScaleMode): number {
  if (scale === 'didactica') return Math.max(radiusOf(b, scale) * 10, 5);
  // A escala real: la Terra i la Lluna, prou lluny per veure-les totes dues (són a 0,026 unitats)
  if (b.id === 'earth' || b.id === 'moon') return 0.09;
  if (b.id === 'sun') return 0.7;
  return Math.max(trueRadius(b.radiusKm) * 14, 0.03);
}

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
    // Vector Terra → Lluna (UA, eclíptica)
    const m = geocentricPosition(Body.Moon, date);
    if (scale === 'real') {
      // A escala real, la Lluna és on és de debò: a uns 384.000 km, 60 vegades el radi de la Terra
      const r = relToScene(m);
      map.set('moon', [earth[0] + r[0], earth[1] + r[1], earth[2] + r[2]]);
    } else {
      const ml = Math.hypot(m.x, m.y, m.z);
      const off = MOON_OFFSET_DIDACTIC * visualRadius(6371, false, scale);
      map.set('moon', [earth[0] + (m.x / ml) * off, earth[1] + (m.z / ml) * off, earth[2] - (m.y / ml) * off]);
    }
    // Cossos petits. A l'escala didàctica, si un passa molt a prop de la Terra (Apophis el 2029) quedaria
    // dins de la seva esfera exagerada: el separem en la direcció real on és. A escala real no cal.
    const earthHelio = heliocentricPosition(Body.Earth, date);
    const minGap = 2.4 * visualRadius(6371, false, scale);
    for (const b of SMALL_SCENE_BODIES) {
      const h = heliocentricOf(b, date)!;
      let p = toScene(h, scale);
      const gap = Math.hypot(p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]);
      if (scale === 'didactica' && gap < minGap) {
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
          scale={scale}
          selected={selectedId === b.id}
          onSelect={onSelect}
          earth={b.id === 'moon' && scale === 'real' ? positions.get('earth') : undefined}
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
        distance={focusId && bodyById(focusId) ? focusDistance(bodyById(focusId)!, scale) : 5}
        nonce={focusNonce}
      />

      <OrbitControls
        enablePan
        enableDamping
        makeDefault
        // A escala real cal poder-se apropar molt: la Terra fa 0,0004 unitats de radi
        minDistance={scale === 'real' ? 0.0008 : 2}
        maxDistance={scale === 'real' ? 1500 : 320}
        zoomSpeed={scale === 'real' ? 2 : 1}
      />
      <DynamicNear />
    </>
  );
}

interface BodyProps {
  info: BodyInfo;
  position: [number, number, number];
  /** Radi a l'escala didàctica */
  radius: number;
  scale: ScaleMode;
  selected: boolean;
  onSelect: (id: string) => void;
  /** Només per a la Lluna a escala real: posició de la Terra, per amagar-la quan de lluny s'hi superposaria */
  earth?: [number, number, number];
}

const tmpEarth = new Vector3();

function CelestialBody({ info, position, radius, scale, selected, onSelect, earth }: BodyProps) {
  const isSun = info.body === Body.Sun;
  // Grup de radi 1: l'esfera, els anells i l'etiqueta s'escalen junts
  const sized = useBodyScale(scale, info.radiusKm, isSun, radius);
  const outer = useRef<Group>(null);

  // De lluny, a escala real, la Lluna i la Terra cauen al mateix punt de la pantalla: s'amaga la Lluna
  // fins que t'apropes prou per veure-les separades (de debò, a 30 diàmetres terrestres)
  useFrame(({ camera }) => {
    if (!outer.current) return;
    if (!earth) {
      outer.current.visible = true;
      return;
    }
    const sep = Math.hypot(position[0] - earth[0], position[1] - earth[1], position[2] - earth[2]);
    const d = camera.position.distanceTo(tmpEarth.set(...earth));
    outer.current.visible = selected || sep > d * 0.02;
  });

  return (
    <group position={position} ref={outer}>
      <group ref={sized}>
        <mesh
          onClick={(e) => {
            if (!outer.current?.visible) return;
            e.stopPropagation();
            onSelect(info.id);
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <sphereGeometry args={[1, 48, 48]} />
          {isSun ? (
            <meshBasicMaterial color={info.color} />
          ) : (
            <meshStandardMaterial color={info.color} roughness={0.9} metalness={0} />
          )}
        </mesh>
        {info.body === Body.Saturn && (
          <mesh rotation={[Math.PI / 2 - 0.47, 0, 0]}>
            <ringGeometry args={[1.3, 2.2, 64]} />
            <meshBasicMaterial color="#d8c58a" transparent opacity={0.55} side={2} />
          </mesh>
        )}
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.6, 1.75, 64]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} side={2} />
          </mesh>
        )}
        {/* La Lluna és massa a prop de la Terra: només s'etiqueta quan està seleccionada */}
        {(info.body !== Body.Moon || selected || earth) && (
          <Html position={[0, 1.7, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span className={`label ${selected ? 'label--selected' : ''}`}>{info.name}</span>
          </Html>
        )}
      </group>
    </group>
  );
}

/**
 * Pla de tall proper de la càmera segons com n'és a prop: a escala real cal poder veure objectes
 * de 0,0004 unitats sense que desapareguin, i de lluny no cal tanta precisió.
 */
function DynamicNear() {
  const controls = useThree((st) => st.controls) as unknown as { target: Vector3 } | null;
  useFrame(({ camera }) => {
    if (!controls || !('isPerspectiveCamera' in camera)) return;
    const d = camera.position.distanceTo(controls.target);
    const near = Math.min(0.1, Math.max(1e-6, d * 0.01));
    if (Math.abs(camera.near - near) / camera.near > 0.1) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
