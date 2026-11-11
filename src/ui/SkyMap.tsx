import { useMemo } from 'react';
import { BODIES, type BodyInfo } from '../astro/bodies';
import { horizontalOf, type Horizontal, type Place } from '../sky/sky';

interface Props {
  target: BodyInfo;
  place: Place;
  now: Date;
}

const R = 100;
/** Projecció polar: zenit al centre, horitzó a la vora; nord a dalt i est a l'esquerra (mirant amunt). */
const xy = (h: Horizontal): [number, number] => {
  const r = ((90 - h.alt) / 90) * R;
  const a = (h.az * Math.PI) / 180;
  return [-r * Math.sin(a), -r * Math.cos(a)];
};

/** Mapa del cel ara mateix des de la ubicació de l'usuari, amb l'objectiu ressaltat. */
export function SkyMap({ target, place, now }: Props) {
  const minute = Math.floor(now.getTime() / 60_000);
  const items = useMemo(() => {
    const d = new Date(minute * 60_000);
    const list: { b: BodyInfo; h: Horizontal }[] = BODIES.filter((b) => b.id !== 'earth').map((b) => ({ b, h: horizontalOf(b, d, place)! }));
    if (!list.some((i) => i.b.id === target.id)) {
      const h = horizontalOf(target, d, place);
      if (h) list.push({ b: target, h });
    }
    return list;
  }, [minute, place, target]);

  const tgt = items.find((i) => i.b.id === target.id);

  return (
    <svg className="skymap" viewBox="-118 -118 236 236" role="img" aria-label={`Mapa del cel amb ${target.name}`}>
      <defs>
        <radialGradient id="sky-bg">
          <stop offset="0%" stopColor="#14204a" />
          <stop offset="100%" stopColor="#070b1c" />
        </radialGradient>
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

      {items
        .filter((i) => i.h.alt > 0 && i.b.id !== target.id)
        .map(({ b, h }) => {
          const [x, y] = xy(h);
          return (
            <g key={b.id} transform={`translate(${x} ${y})`}>
              <circle r={b.id === 'sun' || b.id === 'moon' ? 4 : 2.2} fill={b.color} />
              <text y="-4" className="skymap__label">{b.name}</text>
            </g>
          );
        })}

      {tgt && tgt.h.alt > 0 && (
        <g transform={`translate(${xy(tgt.h)[0]} ${xy(tgt.h)[1]})`}>
          <circle r="9" fill="none" stroke="#ffc94a" strokeWidth="1.5" className="skymap__pulse" />
          <circle r="3.2" fill={target.color} stroke="#fff" strokeWidth="0.6" />
          <text y="-12" className="skymap__label skymap__label--target">{target.name}</text>
        </g>
      )}
    </svg>
  );
}
