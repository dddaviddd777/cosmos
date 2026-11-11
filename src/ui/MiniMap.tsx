import { useId, useMemo } from 'react';
import type { BodyInfo } from '../astro/bodies';
import { extentFor, MAP_PLANETS, mapAnchor, orbitOf, placeLabels, project } from '../astro/minimap';
import { heliocentricOf } from '../astro/positions';
import { hrefFor } from '../router';

interface Props {
  now: Date;
  /** Cos destacat (fitxa). Sense, és el mapa de l'inici: tots els planetes amb enllaç. */
  highlight?: BodyInfo;
  /** Mida del costat en px (el dibuix és responsive: s'adapta a l'amplada) */
  size?: number;
}

const R = 140; // radi útil del dibuix, en unitats del viewBox
const PAD = 22;

/** Sistema solar vist des de dalt, amb posicions reals i escala comprimida. */
export function MiniMap({ now, highlight, size = 320 }: Props) {
  // Les posicions canvien a poc a poc: n'hi ha prou de recalcular-les cada hora
  const hour = Math.floor(now.getTime() / 3_600_000);

  const scene = useMemo(() => {
    const t = new Date(hour * 3_600_000);
    const anchor = highlight ? mapAnchor(highlight) : undefined;
    const extent = extentFor(highlight, t);
    const pos = (b: BodyInfo) => {
      const v = heliocentricOf(b, t);
      return v ? { d: Math.hypot(v.x, v.y), xy: project(v, extent, R) } : null;
    };
    const path = (b: BodyInfo) => {
      const pts = orbitOf(b, t);
      return pts ? 'M' + pts.map((p) => project(p, extent, R).map((n) => n.toFixed(1)).join(',')).join('L') + 'Z' : null;
    };
    const bodies = [...MAP_PLANETS];
    if (anchor && anchor.id !== 'sun' && !bodies.includes(anchor)) bodies.push(anchor);
    const items = bodies
      .map((b) => ({ b, p: pos(b), orbit: path(b) }))
      .filter((it) => it.p && it.p.d <= extent * 1.02) as { b: BodyInfo; p: { d: number; xy: [number, number] }; orbit: string | null }[];
    return { anchor, items };
  }, [hour, highlight]);

  const { anchor, items } = scene;
  const home = !highlight;
  const earth = items.find((it) => it.b.id === 'earth');
  const target = anchor && items.find((it) => it.b.id === anchor.id);
  const label = highlight?.parent ? `${anchor!.name} i ${highlight.name}` : highlight?.name;

  const V = R + PAD;
  const clipId = useId();
  const dotR = (b: BodyInfo) => (b.id === anchor?.id ? 5 : b.id === 'earth' && !home ? 4 : 3.5);

  // Totes les etiquetes, sense solapar-se: primer el destacat, després la Terra, i de dins cap a fora
  const order = (b: BodyInfo) => (b.id === anchor?.id ? 0 : b.id === 'earth' ? 1 : 2);
  const labels = placeLabels(
    items
      .sort((a, b) => order(a.b) - order(b.b) || a.p.d - b.p.d)
      .map((it) => {
        const hl = it.b.id === anchor?.id;
        return { id: it.b.id, x: it.p.xy[0], y: it.p.xy[1], text: (hl ? label : it.b.name) ?? '', font: hl ? 12.5 : 11.5 };
      }),
    [{ x: 0, y: 0, r: anchor?.id === 'sun' ? 13 : 6 }, ...items.map((it) => ({ x: it.p.xy[0], y: it.p.xy[1], r: dotR(it.b) + (it.b.id === anchor?.id ? 4 : 1) }))],
    R + PAD,
  );
  const labelOf = new Map(labels.map((l) => [l.id, l]));

  return (
    <svg
      className="minimap"
      viewBox={`${-V} ${-V} ${2 * V} ${2 * V}`}
      style={{ maxWidth: size }}
      role="img"
      aria-label={
        home
          ? 'Mapa del sistema solar vist des de dalt, amb la posició actual de cada planeta'
          : `Mapa del sistema solar vist des de dalt: on és ${label} ara mateix respecte del Sol i de la Terra`
      }
    >
      <defs>
        <clipPath id={clipId}>
          <circle r={R + 8} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {items.map(({ b, orbit }) =>
          orbit ? (
            <path key={b.id} d={orbit} className={`minimap__orbit ${b.id === anchor?.id ? 'minimap__orbit--hl' : ''}`} />
          ) : null,
        )}
        {earth && target && target !== earth && (
          <line
            x1={earth.p.xy[0]} y1={earth.p.xy[1]} x2={target.p.xy[0]} y2={target.p.xy[1]}
            className="minimap__ray"
          />
        )}
      </g>

      <circle r={anchor?.id === 'sun' ? 8 : 5.5} className="minimap__sun" />
      {anchor?.id === 'sun' && (
        <>
          <circle r={13} className="minimap__ring" />
          <text y={24} dy="0.35em" textAnchor="middle" className="minimap__label minimap__label--hl">Sol</text>
        </>
      )}

      {items.map(({ b, p }) => {
        const [x, y] = p.xy;
        const hl = b.id === anchor?.id;
        const l = labelOf.get(b.id);
        const dot = (
          <>
            {hl && <circle cx={x} cy={y} r={9} className="minimap__ring" />}
            <circle cx={x} cy={y} r={dotR(b)} fill={b.color} className="minimap__dot" />
            {l && (
              <text
                x={l.x} y={l.y} dy="0.35em"
                textAnchor={l.anchor}
                className={`minimap__label ${hl ? 'minimap__label--hl' : ''}`}
              >
                {hl ? label : b.name}
              </text>
            )}
          </>
        );
        return home ? (
          <a key={b.id} href={hrefFor.body(b.id)} aria-label={b.name} className="minimap__link">
            <circle cx={x} cy={y} r={11} className="minimap__hit" />
            {dot}
          </a>
        ) : (
          <g key={b.id}>{dot}</g>
        );
      })}
    </svg>
  );
}
