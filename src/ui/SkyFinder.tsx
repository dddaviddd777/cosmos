import { useEffect, useMemo, useRef, useState } from 'react';
import { toBody, withArticle, WithArticle, type BodyInfo } from '../astro/bodies';
import {
  angleDiff, cameraDirection, focalForCover, project, rotationFromEuler, type Mat3, type Projection,
} from '../sky/orientation';
import {
  PLACE_PRESETS, requestOrientationPermission, screenAngle, useCamera, useLocation, useOrientation,
} from '../sky/hooks';
import { cardinal, towardsCardinal, horizontalOf, nextRise, skyTargetOf, visibilityOf, type Horizontal } from '../sky/sky';
import { SkyMap } from './SkyMap';
import { useDialog } from './useDialog';

interface Props {
  body: BodyInfo;
  onClose: () => void;
  night: boolean;
  onNight: (on: boolean) => void;
}

/** Camp de visió típic de la càmera principal d'un mòbil, en el costat llarg */
const CAMERA_FOV_DEG = 65;
const CENTERED_DEG = 3;
const CALIB_KEY = 'cosmos.calibration';

interface Calibration {
  daz: number;
  dalt: number;
}

function loadCalibration(): Calibration {
  try {
    return JSON.parse(sessionStorage.getItem(CALIB_KEY) ?? 'null') ?? { daz: 0, dalt: 0 };
  } catch {
    return { daz: 0, dalt: 0 };
  }
}

/** Suavitza la matriu de rotació (filtre exponencial + reortonormalització) per evitar tremolors. */
function smoothInto(prev: Mat3 | null, next: Mat3, k = 0.25): Mat3 {
  if (!prev) return next;
  const m = prev.map((v, i) => v + (next[i] - v) * k) as Mat3;
  // Gram-Schmidt sobre les columnes
  const c0 = [m[0], m[3], m[6]];
  const n0 = Math.hypot(...c0);
  const a = c0.map((v) => v / n0);
  const c1 = [m[1], m[4], m[7]];
  const d = a[0] * c1[0] + a[1] * c1[1] + a[2] * c1[2];
  const b0 = c1.map((v, i) => v - d * a[i]);
  const n1 = Math.hypot(...b0);
  const b = b0.map((v) => v / n1);
  const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return [a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]];
}

const fmtTime = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });
const fmtDeg = (v: number) => `${Math.round(v)}°`;

/** «avui», «demà» o «demà passat» segons el dia local */
function dayLabel(d: Date, now: Date): string {
  const days = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000,
  );
  return days <= 0 ? 'avui' : days === 1 ? 'demà' : 'demà passat';
}

export function SkyFinder({ body, onClose, night, onNight }: Props) {
  const dialog = useDialog<HTMLDivElement>(onClose);
  const target = skyTargetOf(body);
  const [phase, setPhase] = useState<'intro' | 'running'>('intro');
  const [mode, setMode] = useState<'camera' | 'map'>('camera');
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [calib, setCalib] = useState<Calibration>(loadCalibration);
  const location = useLocation();
  const place = location.place;

  // Rellotge real (no el de la simulació): el cel d'ara mateix
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const vis = useMemo(() => (place ? visibilityOf(body, now, place) : null), [body, now, place]);
  const danger = vis?.danger ?? body.id === 'sun';
  // Propera sortida (si ara és sota l'horitzó): es recalcula com a molt un cop per minut
  const minute = Math.floor(now.getTime() / 60_000);
  const below = !!vis && vis.pos.alt < 0;
  const rise = useMemo(() => {
    if (!place || !below) return null;
    const time = nextRise(target, new Date(minute * 60_000), place);
    return time ? { time, az: horizontalOf(target, time, place)!.az } : null;
  }, [place, target, below, minute]);

  const cameraMode = phase === 'running' && mode === 'camera' && !danger;
  const video = useRef<HTMLVideoElement>(null);
  const camera = useCamera(cameraMode, video);
  const orientation = useOrientation(cameraMode);

  // Sense sensors (p. ex. a l'ordinador) → mapa del cel
  useEffect(() => {
    if (orientation.status === 'none') {
      setMode('map');
      setNotice('Aquest dispositiu no té brúixola ni sensors de moviment: et mostrem el mapa del cel.');
    }
  }, [orientation.status]);

  // Bucle de la vista de càmera
  const targetRef = useRef<Horizontal | null>(null);
  targetRef.current = vis ? { az: vis.pos.az + calib.daz, alt: vis.pos.alt + calib.dalt } : null;
  const smoothR = useRef<Mat3 | null>(null);
  const [view, setView] = useState<{ cam: Horizontal; proj: Projection; absolute: boolean } | null>(null);
  useEffect(() => {
    if (!cameraMode || orientation.status !== 'on') return;
    let raf = 0;
    const loop = () => {
      const r = orientation.reading.current;
      const tgt = targetRef.current;
      if (r && tgt) {
        smoothR.current = smoothInto(smoothR.current, rotationFromEuler(r.alpha, r.beta, r.gamma));
        const R = smoothR.current;
        const [w, h] = [window.innerWidth, window.innerHeight];
        const f = focalForCover(camera.size.w, camera.size.h, w, h, CAMERA_FOV_DEG);
        setView({ cam: cameraDirection(R), proj: project(tgt, R, screenAngle(), f, w, h), absolute: r.absolute });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cameraMode, orientation.status, orientation.reading, camera.size]);

  // Vibració quan s'encerta l'objectiu
  const centered = !!view && view.proj.offAngle < CENTERED_DEG;
  const wasCentered = useRef(false);
  useEffect(() => {
    if (centered && !wasCentered.current) navigator.vibrate?.(80);
    if (centered) wasCentered.current = true;
    else if (view && view.proj.offAngle > CENTERED_DEG * 2) wasCentered.current = false;
  }, [centered, view]);

  const saveCalib = (c: Calibration) => {
    setCalib(c);
    try {
      sessionStorage.setItem(CALIB_KEY, JSON.stringify(c));
    } catch {
      /* sense emmagatzematge */
    }
  };
  const calibrate = () => {
    if (!view || !vis) return;
    saveCalib({ daz: angleDiff(view.cam.az, vis.pos.az), dalt: view.cam.alt - vis.pos.alt });
  };

  const start = async (wantCamera: boolean) => {
    // A l'iPhone, el permís dels sensors s'ha de demanar dins d'aquest toc
    const sensorsOk = wantCamera && window.isSecureContext ? await requestOrientationPermission() : false;
    if (!place) location.request();
    if (wantCamera && !window.isSecureContext) setNotice('La càmera i la brúixola només funcionen en connexions segures (https).');
    else if (wantCamera && !sensorsOk) setNotice('Sense permís per als sensors de moviment: et mostrem el mapa del cel.');
    setMode(wantCamera && sensorsOk ? 'camera' : 'map');
    setPhase('running');
  };

  // ── Guia en text ──
  let guide = '';
  if (view && vis) {
    const tgt = targetRef.current!;
    const dAz = angleDiff(tgt.az, view.cam.az);
    const dAlt = tgt.alt - view.cam.alt;
    const parts: string[] = [];
    if (Math.abs(dAz) > CENTERED_DEG) parts.push(dAz > 0 ? `gira a la dreta ${fmtDeg(Math.abs(dAz))}` : `gira a l’esquerra ${fmtDeg(Math.abs(dAz))}`);
    if (Math.abs(dAlt) > CENTERED_DEG) parts.push(dAlt > 0 ? `apunta més amunt ${fmtDeg(Math.abs(dAlt))}` : `apunta més avall ${fmtDeg(Math.abs(dAlt))}`);
    guide = centered ? `Hi és! ${WithArticle(target)} és al centre del cercle.` : parts.join(' i ');
    guide = guide.charAt(0).toUpperCase() + guide.slice(1);
  }

  const where = vis
    ? `Mira ${towardsCardinal(vis.pos.az)} (${fmtDeg(vis.pos.az)}) i aixeca la vista ${fmtDeg(Math.max(vis.pos.alt, 0))} sobre l’horitzó.`
    : '';

  const arrowR = Math.min(window.innerWidth, window.innerHeight) * 0.3;

  return (
    <div ref={dialog} className={`finder ${cameraMode ? 'finder--camera' : ''}`} role="dialog" aria-modal="true" aria-label={`Troba ${withArticle(body)} al cel`}>
      {cameraMode && <video ref={video} className="finder__video" playsInline muted autoPlay />}

      <header className="finder__top">
        <button onClick={onClose} aria-label="Tanca">✕</button>
        <div className="finder__title">
          <strong>{body.name}</strong>
          {place && <small>{place.name ?? `${place.lat.toFixed(2)}, ${place.lon.toFixed(2)}`} · {fmtTime(now)}</small>}
        </div>
        {phase === 'running' && !danger && (
          <button onClick={() => setMode(mode === 'camera' ? 'map' : 'camera')}>
            {mode === 'camera' ? '🗺 Mapa' : '📷 Càmera'}
          </button>
        )}
        <button className={night ? 'active' : ''} aria-pressed={night} onClick={() => onNight(!night)} aria-label="Mode nocturn" title="Pantalla vermella per no perdre la visió nocturna">🌙</button>
      </header>

      {phase === 'intro' && (
        <section className="finder__panel finder__intro">
          <h2>{danger ? `On és ${withArticle(body)} ara?` : `Troba ${withArticle(body)} al cel`}</h2>
          {danger ? (
            <p>Per seguretat, no et guiarem amb la càmera: et mostrarem on és en un mapa del cel. Només necessitem la teva ubicació.</p>
          ) : (
          <>
          <p>Apunta el mòbil al cel i et guiarem fins {toBody(target)}. Per fer-ho, l’app et demanarà:</p>
          <ul>
            <li>📍 <strong>La teva ubicació</strong>, per saber quin tros de cel veus.</li>
            <li>📷 <strong>La càmera</strong>, per mostrar-te el cel a la pantalla.</li>
            <li>🧭 <strong>Els sensors de moviment</strong>, per saber cap on apuntes.</li>
          </ul>
          </>
          )}
          <p className="muted">Tot es calcula al teu dispositiu: no s’envia res enlloc.</p>
          {danger && <p className="finder__danger">{vis?.notes[0] ?? '⚠️ No miris mai el Sol directament.'}</p>}
          <div className="finder__buttons">
            {!danger && <button className="primary" onClick={() => start(true)}>Comença amb la càmera</button>}
            <button onClick={() => start(false)}>Mostra’m el mapa del cel</button>
          </div>
          {!danger && <p className="muted finder__tip">Consell: allunya’t d’objectes metàl·lics i, si la brúixola falla, mou el mòbil fent la forma d’un 8.</p>}
        </section>
      )}

      {phase === 'running' && !place && (
        <section className="finder__panel">
          <h2>On ets?</h2>
          {location.status === 'asking' && <p>Esperant la ubicació…</p>}
          {location.status === 'denied' && <p>No tenim permís per a la ubicació. Tria la ciutat més propera:</p>}
          {location.status === 'unavailable' && <p>No s’ha pogut obtenir la ubicació. Tria la ciutat més propera:</p>}
          <div className="finder__buttons">
            <button onClick={location.request}>📍 Utilitza la meva ubicació</button>
            <select defaultValue="" onChange={(e) => e.target.value && location.setPlace(PLACE_PRESETS[Number(e.target.value)])} aria-label="Tria una ciutat">
              <option value="" disabled>Tria una ciutat…</option>
              {PLACE_PRESETS.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
            </select>
          </div>
        </section>
      )}

      {phase === 'running' && place && vis && (
        <>
          {cameraMode && view && (
            <div className="finder__overlay" aria-hidden="true">
              <div className={`finder__cross ${centered ? 'finder__cross--hit' : ''}`} />
              {view.proj.onScreen ? (
                <div className="finder__target" style={{ left: view.proj.x, top: view.proj.y }}>
                  <span>{target.name}</span>
                </div>
              ) : (
                <div
                  className="finder__arrow"
                  style={{ transform: `translate(-50%, -50%) rotate(${view.proj.arrowDeg}deg) translateX(${arrowR}px)` }}
                >
                  ➜
                </div>
              )}
            </div>
          )}
          {cameraMode && orientation.status === 'waiting' && <div className="finder__center-msg">Esperant els sensors…</div>}
          {cameraMode && camera.status === 'denied' && <div className="finder__center-msg">Sense permís per a la càmera: segueix les fletxes igualment.</div>}

          {mode === 'map' || danger ? (
            <section className="finder__panel finder__map">
              <SkyMap target={target} place={place} now={now} />
              <p className="muted finder__map-help">El centre del mapa és just damunt del teu cap i la vora és l’horitzó. Aguanta’l per sobre del cap amb la «N» apuntant cap al nord: així coincideix amb el cel.</p>
            </section>
          ) : null}

          <section className="finder__bottom">
            {notice && <p className="finder__notice">{notice}</p>}
            {vis.notes.map((n) => (
              <p key={n} className={n.startsWith('⚠️') ? 'finder__danger' : ''}>{n}</p>
            ))}
            {rise && (
              <p>
                Sortirà {dayLabel(rise.time, now)} a les <strong>{fmtTime(rise.time)}</strong>,
                {' '}per l’horitzó {cardinal(rise.az)} ({fmtDeg(rise.az)}).
              </p>
            )}
            {cameraMode && view ? (
              <>
                <p className={`finder__guide ${centered ? 'finder__guide--hit' : ''}`}>{guide}</p>
                {!view.absolute && <p className="finder__notice">La brúixola no està disponible: quan tinguis {withArticle(target)} al centre de la pantalla, prem «Calibra».</p>}
                <div className="finder__buttons">
                  <button onClick={calibrate} title="Si veus l’objecte al centre de la pantalla però la marca no hi coincideix">🎯 Calibra: ja el tinc al centre</button>
                  {(calib.daz !== 0 || calib.dalt !== 0) && <button onClick={() => saveCalib({ daz: 0, dalt: 0 })}>Restableix</button>}
                </div>
              </>
            ) : (
              vis.pos.alt >= 0 && <p className="finder__guide">{where}</p>
            )}
            <p className="muted finder__coords">
              Azimut {fmtDeg(vis.pos.az)} ({cardinal(vis.pos.az)}) · Altura {fmtDeg(vis.pos.alt)}
              {vis.magnitude !== undefined && ` · Magnitud ${vis.magnitude.toLocaleString('ca', { maximumFractionDigits: 1 })}`}
              {' · '}Un puny amb el braç estès tapa uns 10°.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
