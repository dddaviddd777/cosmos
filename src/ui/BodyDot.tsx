import type { BodyInfo } from '../astro/bodies';
import type { Constel } from '../astro/constellations';
import { projector } from './ConstellationFigure';
import { DeepIcon } from './DeepIcon';

/** Miniatura de la figura d'una constel·lació, dins d'un quadre de 100 × 100 */
interface Mini {
  stars: { x: number; y: number; r: number }[];
  lines: [number, number][];
}
const cache = new Map<string, Mini>();

function miniFigure(c: Constel): Mini {
  const hit = cache.get(c.abbr);
  if (hit) return hit;
  const proj = projector(c);
  const raw = c.figure.stars.map((s) => proj(s.ra, s.dec));
  const xs = raw.map((p) => p[0]), ys = raw.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const PAD = 16;
  const k = (100 - 2 * PAD) / Math.max(x1 - x0, y1 - y0);
  const ox = (100 - (x1 - x0) * k) / 2, oy = (100 - (y1 - y0) * k) / 2;
  const mini: Mini = {
    stars: raw.map(([x, y], i) => ({ x: ox + (x - x0) * k, y: oy + (y - y0) * k, r: Math.max(3.5, 8.5 - 1.5 * c.figure.stars[i].mag) })),
    lines: c.figure.lines,
  };
  cache.set(c.abbr, mini);
  return mini;
}

/**
 * Icona d'un cos a les llistes i a la capçalera de la fitxa: una bola del seu color o,
 * per a les constel·lacions, el dibuix de la seva figura i, per a galàxies, cúmuls i nebuloses,
 * una icona del seu tipus.
 */
export function BodyDot({ body, size = 'row' }: { body: BodyInfo; size?: 'row' | 'page' }) {
  if (body.kind === 'cel profund' && body.sky) {
    return (
      <span className={`deep-avatar deep-avatar--${size}`} aria-hidden="true">
        <DeepIcon body={body} />
      </span>
    );
  }
  if (!body.constel) {
    return <span className={size === 'page' ? 'body-page__swatch' : 'body-row__dot'} style={{ background: body.color }} aria-hidden="true" />;
  }
  const m = miniFigure(body.constel);
  return (
    <span className={`cst-avatar cst-avatar--${size}`} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        {m.lines.map(([a, b], i) => (
          <line key={i} x1={m.stars[a].x} y1={m.stars[a].y} x2={m.stars[b].x} y2={m.stars[b].y} />
        ))}
        {m.stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} />)}
      </svg>
    </span>
  );
}
