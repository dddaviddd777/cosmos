import { useMemo } from 'react';
import { BODIES, type BodyInfo } from '../astro/bodies';
import { constellationByOf } from '../astro/constellations';
import { hrefFor } from '../router';
import { constellationsInSky } from '../sky/constelSky';
import { horizontalOf, type Horizontal, type Place } from '../sky/sky';
import { useStoredFlag } from './prefs';

interface Props {
  /** Objecte a ressaltar (opcional: sense, és un mapa general del cel) */
  target?: BodyInfo;
  place: Place;
  now: Date;
  /** Els noms de les constel·lacions porten a la seva fitxa */
  links?: boolean;
}

const R = 100;
/** Projecció polar: zenit al centre, horitzó a la vora; nord a dalt i est a l'esquerra (mirant amunt). */
const xy = (h: Horizontal): [number, number] => {
  const r = ((90 - h.alt) / 90) * R;
  const a = (h.az * Math.PI) / 180;
  return [-r * Math.sin(a), -r * Math.cos(a)];
};

/** Mida del punt d'una estrella segons la magnitud */
const starR = (mag: number) => Math.max(0.5, 2.1 - 0.4 * mag);

/** Segment entre dues estrelles, retallat a l'horitzó; null si queda tot a sota */
function segment(a: Horizontal, b: Horizontal): [number, number, number, number] | null {
  if (a.alt < 0 && b.alt < 0) return null;
  let [p, q] = [xy(a), xy(b)];
  if (a.alt < 0 || b.alt < 0) {
    // Punt aproximat on la línia creua l'horitzó
    const t = a.alt / (a.alt - b.alt);
    const cut: [number, number] = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    if (a.alt < 0) p = cut;
    else q = cut;
  }
  return [p[0], p[1], q[0], q[1]];
}

/** Mapa del cel ara mateix des de la ubicació de l'usuari, amb les constel·lacions i l'objectiu ressaltat. */
export function SkyMap({ target, place, now, links = false }: Props) {
  const [showCst, setShowCst] = useStoredFlag('cosmos.skymap.constellations', true);
  const minute = Math.floor(now.getTime() / 60_000);

  const items = useMemo(() => {
    const d = new Date(minute * 60_000);
    const list: { b: BodyInfo; h: Horizontal }[] = BODIES.filter((b) => b.id !== 'earth').map((b) => ({ b, h: horizontalOf(b, d, place)! }));
    if (target && !list.some((i) => i.b.id === target.id)) {
      const h = horizontalOf(target, d, place);
      if (h) list.push({ b: target, h });
    }
    return list;
  }, [minute, place, target]);

  const figures = useMemo(() => (showCst ? constellationsInSky(new Date(minute * 60_000), place) : []), [minute, place, showCst]);

  // La constel·lació a ressaltar: l'objectiu mateix o la de l'estrella que es busca
  const highlight = target?.constel ? target.id : target?.sky ? constellationByOf(target.sky.constellation)?.id : undefined;
  const tgt = target && items.find((i) => i.b.id === target.id);

  return (
    <div className="skymap-wrap">
      <svg className="skymap" viewBox="-118 -118 236 236" role="img" aria-label={target ? `Mapa del cel amb ${target.name}` : 'Mapa del cel'}>
        <defs>
          <radialGradient id="sky-bg">
            <stop offset="0%" stopColor="#14204a" />
            <stop offset="100%" stopColor="#070b1c" />
          </radialGradient>
          <clipPath id="sky-clip">
            <circle r={R} />
          </clipPath>
        </defs>
        <circle r={R} fill="url(#sky-bg)" stroke="#5a72c0" strokeWidth="1" />
        {[30, 60].map((alt) => (
          <circle key={alt} r={((90 - alt) / 90) * R} fill="none" stroke="#2a3a6e" strokeWidth="0.5" strokeDasharray="2 2" />
        ))}
        <line x1={-R} y1={0} x2={R} y2={0} stroke="#2a3a6e" strokeWidth="0.4" />
        <line x1={0} y1={-R} x2={0} y2={R} stroke="#2a3a6e" strokeWidth="0.4" />
        <text x="0" y={-R - 6} className="skymap__card">N</text>
        <text x="0" y={R + 12} className="skymap__card">S</text>
        <text x={-R - 9} y="3" className="skymap__card">E</text>
        <text x={R + 9} y="3" className="skymap__card">O</text>
        <text x="3" y={-((90 - 60) / 90) * R - 1} className="skymap__alt">60°</text>
        <text x="3" y={-((90 - 30) / 90) * R - 1} className="skymap__alt">30°</text>

        {/* Constel·lacions: línies i estrelles; la ressaltada, a sobre de les altres */}
        <g clipPath="url(#sky-clip)">
          {[...figures].sort((a, b) => Number(a.body.id === highlight) - Number(b.body.id === highlight)).map((f) => {
            const hi = f.body.id === highlight;
            return (
              <g key={f.body.id} className={hi ? 'skymap__cst skymap__cst--hi' : 'skymap__cst'}>
                {f.lines.map(([i, j], k) => {
                  const s = segment(f.stars[i], f.stars[j]);
                  return s && <line key={k} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />;
                })}
                {f.stars.map((s, k) => {
                  if (s.alt < 0) return null;
                  const [x, y] = xy(s);
                  return <circle key={k} cx={x} cy={y} r={starR(s.mag)} />;
                })}
              </g>
            );
          })}
        </g>
        {figures
          .filter((f) => f.center.alt > 4)
          .map((f) => {
            const [x, y] = xy(f.center);
            const hi = f.body.id === highlight;
            const label = (
              <text x={x} y={y} className={hi ? 'skymap__cst-name skymap__cst-name--hi' : 'skymap__cst-name'}>{f.body.name}</text>
            );
            return links ? <a key={f.body.id} href={hrefFor.body(f.body.id)}>{label}</a> : <g key={f.body.id}>{label}</g>;
          })}

        {items
          .filter((i) => i.h.alt > 0 && i.b.id !== target?.id)
          .map(({ b, h }) => {
            const [x, y] = xy(h);
            return (
              <g key={b.id} transform={`translate(${x} ${y})`}>
                <circle r={b.id === 'sun' || b.id === 'moon' ? 4 : 2.2} fill={b.color} />
                <text y="-4" className="skymap__label">{b.name}</text>
              </g>
            );
          })}

        {target && tgt && tgt.h.alt > 0 && (
          <g transform={`translate(${xy(tgt.h)[0]} ${xy(tgt.h)[1]})`}>
            <circle r={target.constel ? 14 : 9} fill="none" stroke="#ffc94a" strokeWidth="1.5" className="skymap__pulse" />
            {!target.constel && <circle r="3.2" fill={target.color} stroke="#fff" strokeWidth="0.6" />}
            {(!target.constel || !showCst) && <text y="-12" className="skymap__label skymap__label--target">{target.name}</text>}
          </g>
        )}
      </svg>
      <label className="skymap__toggle">
        <input type="checkbox" checked={showCst} onChange={(e) => setShowCst(e.target.checked)} /> Mostra les constel·lacions
      </label>
    </div>
  );
}
