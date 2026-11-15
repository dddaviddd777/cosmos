import { useMemo } from 'react';
import { bodyById, type BodyInfo } from '../astro/bodies';
import type { Constel } from '../astro/constellations';

const D = Math.PI / 180;
const W = 240;
const PAD = 18;

/**
 * Projecció gnòmica al voltant del centre de la figura, tal com es veu mirant amunt:
 * el nord a dalt i l'est a l'esquerra.
 */
function projector(c: Constel) {
  const ra0 = c.ra * 15 * D, d0 = c.dec * D;
  return (raH: number, decDeg: number): [number, number] => {
    const ra = raH * 15 * D, d = decDeg * D;
    const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(ra - ra0);
    const x = (Math.cos(d) * Math.sin(ra - ra0)) / cosc;
    const y = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(ra - ra0)) / cosc;
    return [-x, -y];
  };
}

/** Mida del punt segons la magnitud: com més brillant, més gran */
const starR = (mag: number) => Math.max(1.1, 4.6 - 0.75 * mag);

/** Dibuix de la figura d'una constel·lació, amb les estrelles i objectes del catàleg que hi ha. */
export function ConstellationFigure({ body }: { body: BodyInfo }) {
  const c = body.constel!;
  const view = useMemo(() => {
    const proj = projector(c);
    const raw = c.figure.stars.map((s) => proj(s.ra, s.dec));
    const objs = c.objects
      .map((id) => bodyById(id))
      .filter((b): b is BodyInfo => !!b?.sky)
      .map((b) => ({ b, p: proj(b.sky!.ra, b.sky!.dec) }));
    const all = [...raw, ...objs.map((o) => o.p)];
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = (W - 2 * PAD) / Math.max(x1 - x0, y1 - y0);
    const h = Math.max(120, (y1 - y0) * k + 2 * PAD);
    // Centrat dins del requadre
    const ox = (W - (x1 - x0) * k) / 2, oy = (h - (y1 - y0) * k) / 2;
    const fit = ([x, y]: [number, number]): [number, number] => [ox + (x - x0) * k, oy + (y - y0) * k];
    return { stars: raw.map(fit), objs: objs.map((o) => ({ ...o, p: fit(o.p) })), h };
  }, [c]);

  return (
    <svg className="cst-figure" viewBox={`0 0 ${W} ${view.h}`} role="img" aria-label={`Figura de la constel·lació ${c.of}`}>
      <rect width={W} height={view.h} rx="10" fill="#0a1029" />
      {c.figure.lines.map(([a, b], i) => (
        <line
          key={i}
          x1={view.stars[a][0]} y1={view.stars[a][1]} x2={view.stars[b][0]} y2={view.stars[b][1]}
          stroke="#5a72c0" strokeWidth="0.9" strokeOpacity="0.8"
        />
      ))}
      {c.figure.stars.map((s, i) => (
        <circle key={i} cx={view.stars[i][0]} cy={view.stars[i][1]} r={starR(s.mag)} fill="#f4f6ff" />
      ))}
      {view.objs.map(({ b, p }) => (
        <g key={b.id} transform={`translate(${p[0]} ${p[1]})`}>
          {b.kind === 'cel profund' && <circle r="4" fill="#bcd3ff" fillOpacity="0.35" stroke="#bcd3ff" strokeWidth="0.6" />}
          {b.kind === 'estel' && <circle r={starR(b.sky!.mag) + 1.6} fill="none" stroke={b.color} strokeWidth="0.8" />}
          <text y={-starR(b.sky!.mag) - 4} className="cst-figure__label">{b.name}</text>
        </g>
      ))}
    </svg>
  );
}
