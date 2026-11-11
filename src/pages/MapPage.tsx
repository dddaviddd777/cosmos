import { lazy, Suspense, useEffect, useRef } from 'react';
import { BODIES, bodyById } from '../astro/bodies';
import { formatKm } from '../astro/format';
import { liveDistance } from '../astro/live';
import { SMALL_SCENE_BODIES } from '../astro/positions';
import { taglineOf } from '../astro/profile';
import type { ScaleMode } from '../scene/scale';
import { hrefFor } from '../router';
import { SceneBoundary, SceneFallback } from '../ui/SceneBoundary';
import { SPEEDS, TimeBar } from '../ui/TimeBar';
import { Icon } from '../ui/Icon';

// Three.js només es baixa quan s'obre el mapa
const Scene = lazy(() => import('../scene/Scene'));

const MS_PER_DAY = 86_400_000;
const SCENE_IDS = new Set([...BODIES, ...SMALL_SCENE_BODIES].map((b) => b.id));

/** Cos de l'escena 3D que representa `id`: ell mateix o, per a una lluna sense model, el seu planeta. */
export function sceneIdFor(id: string | null | undefined): string | null {
  if (!id) return null;
  if (SCENE_IDS.has(id)) return id;
  const parent = bodyById(id)?.parent;
  return parent && SCENE_IDS.has(parent) ? parent : null;
}

export interface MapState {
  date: Date;
  direction: -1 | 0 | 1;
  speedIndex: number;
  scale: ScaleMode;
  showSmall: boolean;
  selectedId: string | null;
  /** Cos que la càmera segueix; el nonce canvia a cada nou centrat */
  focus: { id: string | null; nonce: number };
}

export const initialMapState = (): MapState => ({
  date: new Date(),
  direction: 1,
  speedIndex: 0,
  scale: 'didactica',
  showSmall: true,
  selectedId: null,
  focus: { id: null, nonce: 0 },
});

interface Props {
  state: MapState;
  setState: React.Dispatch<React.SetStateAction<MapState>>;
  /** Atura el dibuix quan una altra pantalla tapa el mapa */
  paused: boolean;
}

/** Mapa del sistema solar: la vista 3D amb el viatge en el temps. */
export function MapPage({ state, setState, paused }: Props) {
  const { date, direction, speedIndex, scale, showSmall, selectedId, focus } = state;
  const patch = (p: Partial<MapState>) => setState((s) => ({ ...s, ...p }));
  const sceneId = sceneIdFor(selectedId);

  const select = (id: string | null) =>
    setState((s) => ({
      ...s,
      selectedId: id,
      // Si se selecciona un altre cos, la càmera deixa de seguir l'anterior
      focus: sceneIdFor(id) !== s.focus.id ? { id: null, nonce: s.focus.nonce } : s.focus,
    }));
  const center = (id: string) => setState((s) => ({ ...s, focus: { id, nonce: s.focus.nonce + 1 } }));

  // Rellotge de simulació: avança la data segons direcció × velocitat
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (direction === 0 || paused) return;
    let raf = 0;
    const tick = (t: number) => {
      if (last.current !== null) {
        // Límit de 0,25 s: si la pestanya estava en segon pla, evitem un salt brusc de temps
        const dtSec = Math.min((t - last.current) / 1000, 0.25);
        const deltaMs = direction * SPEEDS[speedIndex].daysPerSec * MS_PER_DAY * dtSec;
        setState((s) => ({ ...s, date: new Date(s.date.getTime() + deltaMs) }));
      }
      last.current = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [direction, speedIndex, paused, setState]);

  const sel = selectedId ? bodyById(selectedId) : undefined;
  const dist = sel && sel.id !== 'earth' ? liveDistance(sel, date) : null;

  return (
    <div className="map-page">
      <div className="map-page__tools">
        <div className="scale-toggle" role="radiogroup" aria-label="Escala">
          <button role="radio" aria-checked={scale === 'didactica'} className={scale === 'didactica' ? 'active' : ''} onClick={() => patch({ scale: 'didactica' })}>
            <span className="long">Escala didàctica</span><span className="short">Didàctica</span>
          </button>
          <button role="radio" aria-checked={scale === 'real'} className={scale === 'real' ? 'active' : ''} onClick={() => patch({ scale: 'real' })}>
            <span className="long">Distàncies reals</span><span className="short">Real</span>
          </button>
        </div>
        <button
          className={`toggle-small ${showSmall ? 'active' : ''}`}
          aria-pressed={showSmall}
          onClick={() => patch({ showSmall: !showSmall })}
          title="Mostra o amaga asteroides, cometes i planetes nans"
        >
          ☄ <span>Cossos petits</span>
        </button>
      </div>

      <SceneBoundary>
        <Suspense fallback={<SceneFallback />}>
          <Scene
            date={date}
            scale={scale}
            selectedId={sceneId}
            onSelect={select}
            focusId={focus.id}
            focusNonce={focus.nonce}
            showSmall={showSmall}
            viewShift={0}
            paused={paused}
          />
        </Suspense>
      </SceneBoundary>

      <div className="map-page__bottom">
        {sel ? (
          <div className="map-sheet" role="region" aria-label={`${sel.name} seleccionat`}>
            <span className="body-row__dot" style={{ background: sel.color }} aria-hidden="true" />
            <div className="map-sheet__text">
              <strong>{sel.name}</strong>
              <span className="muted">{dist ? `${dist.approx ? '≈ ' : ''}${formatKm(dist.km)} de la Terra` : taglineOf(sel)}</span>
            </div>
            {sceneId && <button onClick={() => center(sceneId)}>Centra</button>}
            <a className="btn primary" href={hrefFor.body(sel.id)}>Fitxa</a>
            <button className="map-sheet__close" onClick={() => select(null)} aria-label="Treu la selecció"><Icon name="close" /></button>
          </div>
        ) : (
          <p className="map-page__hint muted">
            {scale === 'real'
              ? 'Mides i distàncies reals: de lluny els planetes són punts. Toca la Terra i «Centra» per veure-hi la Lluna.'
              : 'Toca un planeta per veure’n el nom i obrir-ne la fitxa.'}
          </p>
        )}
        <TimeBar
          date={date}
          direction={direction}
          speedIndex={speedIndex}
          onDirection={(d) => patch({ direction: d })}
          onSpeed={(i) => patch({ speedIndex: i })}
          onNow={() => patch({ date: new Date(), speedIndex: 0, direction: 1 })}
          onDate={(d) => patch({ date: d, direction: 0 })}
        />
      </div>
    </div>
  );
}
