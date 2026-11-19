/**
 * Dibuix de les figures de les constel·lacions sobre la imatge de la càmera (cercador).
 * Es pinta en un canvas a cada fotograma, sense passar per React.
 */
import { project, type Mat3, type Projection } from '../sky/orientation';
import type { SkyFigure } from '../sky/constelSky';
import type { BandQuad } from '../sky/milkyway';
import type { Horizontal } from '../sky/sky';
import type { SkyObject } from '../sky/skyObjects';

/** Zona tocable d'un nom a la pantalla (per buscar aquell objecte) */
export interface ObjectHit {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ArParams {
  R: Mat3;
  screenAngle: number;
  focal: number;
  w: number;
  h: number;
  /** Correcció de calibratge (graus) */
  daz: number;
  dalt: number;
  /** Constel·lació a ressaltar */
  highlight?: string;
  /** Constel·lació que ja té l'etiqueta de l'objectiu: no se'n repeteix el nom */
  noLabel?: string;
}

/** Més enllà d'aquest angle respecte del centre de la càmera, la projecció es deforma massa */
const MAX_OFF = 75;

const ok = (p: Projection) => p.front && p.offAngle < MAX_OFF;

export function drawFigures(
  canvas: HTMLCanvasElement, figures: SkyFigure[], p: ArParams, band: BandQuad[] = [], track: Horizontal[] = [],
  objects: SkyObject[] = [], skipId?: string,
): ObjectHit[] {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const [cw, ch] = [Math.round(p.w * dpr), Math.round(p.h * dpr)];
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, p.w, p.h);
  ctx.lineCap = 'round';

  // La Via Làctia, difuminada, per sota de les figures
  if (band.length) {
    ctx.filter = 'blur(8px)';
    for (const q of band) {
      const pr = q.pts.map((h) => project({ az: h.az + p.daz, alt: h.alt + p.dalt }, p.R, p.screenAngle, p.focal, p.w, p.h));
      if (!pr.every(ok)) continue;
      ctx.fillStyle = `rgba(201, 212, 255, ${q.alpha})`;
      ctx.beginPath();
      pr.forEach((q2, k) => (k ? ctx.lineTo(q2.x, q2.y) : ctx.moveTo(q2.x, q2.y)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.filter = 'none';
  }

  // Recorregut de l'Estació Espacial: per on passarà
  if (track.length > 1) {
    const pr = track.map((h) => project({ az: h.az + p.daz, alt: h.alt + p.dalt }, p.R, p.screenAngle, p.focal, p.w, p.h));
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(120, 230, 255, 0.85)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 1; i < pr.length; i++) {
      if (!ok(pr[i - 1]) || !ok(pr[i]) || track[i].alt < 0) continue;
      ctx.moveTo(pr[i - 1].x, pr[i - 1].y);
      ctx.lineTo(pr[i].x, pr[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // La ressaltada, l'última: queda per sobre
  const ordered = [...figures].sort((a, b) => Number(a.body.id === p.highlight) - Number(b.body.id === p.highlight));
  for (const f of ordered) {
    const hi = f.body.id === p.highlight;
    const proj = f.stars.map((s) => project({ az: s.az + p.daz, alt: s.alt + p.dalt }, p.R, p.screenAngle, p.focal, p.w, p.h));
    if (!proj.some((q) => q.onScreen)) continue;

    ctx.strokeStyle = hi ? 'rgba(255, 201, 74, 0.95)' : 'rgba(170, 190, 255, 0.5)';
    ctx.lineWidth = hi ? 2.2 : 1.2;
    ctx.beginPath();
    for (const [i, j] of f.lines) {
      const [a, b] = [proj[i], proj[j]];
      // Sota l'horitzó no es dibuixa: hi ha terra
      if (!ok(a) || !ok(b) || (f.stars[i].alt < 0 && f.stars[j].alt < 0)) continue;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    ctx.fillStyle = hi ? '#fff6dc' : 'rgba(225, 232, 255, 0.85)';
    f.stars.forEach((s, k) => {
      const q = proj[k];
      if (!q.onScreen || s.alt < 0) return;
      ctx.beginPath();
      ctx.arc(q.x, q.y, Math.max(1.3, (hi ? 4.2 : 3.4) - 0.6 * s.mag), 0, Math.PI * 2);
      ctx.fill();
    });

    const c = project({ az: f.center.az + p.daz, alt: f.center.alt + p.dalt }, p.R, p.screenAngle, p.focal, p.w, p.h);
    if (c.onScreen && f.center.alt > 0 && f.body.id !== p.noLabel) {
      ctx.font = hi ? '700 16px system-ui, sans-serif' : 'italic 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeText(f.body.name, c.x, c.y);
      ctx.fillStyle = hi ? '#ffc94a' : 'rgba(200, 212, 255, 0.9)';
      ctx.fillText(f.body.name, c.x, c.y);
    }
  }

  return drawObjects(ctx, objects, p, skipId);
}

/** Mida del punt segons la magnitud (com més brillant, més gros) */
const dotR = (mag: number) => Math.min(7, Math.max(2, 4.6 - 0.9 * mag));

/**
 * Els objectes brillants amb el seu nom, per sobre de tot. Es posen nom del més brillant al més feble
 * i se'n salta un si se superposaria a un altre. Retorna on és cada nom per poder-lo tocar.
 */
function drawObjects(ctx: CanvasRenderingContext2D, objects: SkyObject[], p: ArParams, skipId?: string): ObjectHit[] {
  const hits: ObjectHit[] = [];
  const taken: { x: number; y: number; w: number; h: number }[] = [];
  const overlaps = (r: { x: number; y: number; w: number; h: number }) =>
    taken.some((t) => r.x < t.x + t.w && r.x + r.w > t.x && r.y < t.y + t.h && r.y + r.h > t.y);

  for (const o of objects) {
    if (o.id && o.id === skipId) continue;
    const q = project({ az: o.pos.az + p.daz, alt: o.pos.alt + p.dalt }, p.R, p.screenAngle, p.focal, p.w, p.h);
    if (!q.onScreen || !ok(q)) continue;
    const below = o.pos.alt < 0;
    const r = dotR(o.mag);
    ctx.globalAlpha = below ? 0.45 : 1;

    // Marca: un cercle al voltant (la imatge real ja hi mostra el punt; el cercle ajuda a trobar-lo)
    ctx.lineWidth = o.kind === 'planeta' || o.kind === 'iss' ? 2 : 1.4;
    ctx.strokeStyle = o.kind === 'sol' ? 'rgba(255, 120, 80, 0.95)' : o.kind === 'planeta' ? o.color : o.kind === 'iss' ? '#9ff0ff' : 'rgba(225, 232, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(q.x, q.y, o.kind === 'lluna' || o.kind === 'sol' ? 26 : r + 5, 0, Math.PI * 2);
    ctx.stroke();
    if (o.kind !== 'lluna' && o.kind !== 'sol') {
      ctx.fillStyle = o.kind === 'planeta' ? o.color : 'rgba(240, 244, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(q.x, q.y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nom
    const label = o.kind === 'sol' ? '⚠️ Sol: no el miris' : below ? `${o.name} (sortint)` : o.name;
    const bold = o.kind === 'planeta' || o.kind === 'lluna' || o.kind === 'iss' || o.mag < 0.5;
    ctx.font = `${bold ? '700 ' : ''}${o.kind === 'planeta' || o.kind === 'iss' ? 14 : 12.5}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    const off = (o.kind === 'lluna' || o.kind === 'sol' ? 30 : r + 9);
    const w = ctx.measureText(label).width;
    const box = { x: q.x + off - 4, y: q.y - 11, w: w + 8, h: 22 };
    if (overlaps(box)) {
      ctx.globalAlpha = 1;
      continue;
    }
    taken.push(box);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeText(label, q.x + off, q.y + 4);
    ctx.fillStyle = o.kind === 'planeta' ? '#ffe2a8' : o.kind === 'iss' ? '#bff6ff' : o.kind === 'sol' ? '#ffb199' : '#e9eeff';
    ctx.fillText(label, q.x + off, q.y + 4);
    ctx.globalAlpha = 1;
    // Zona tocable: el nom i el punt
    if (o.id && o.kind !== 'sol') hits.push({ id: o.id, name: o.name, x: Math.min(q.x - r - 8, box.x), y: box.y - 6, w: box.x + box.w - Math.min(q.x - r - 8, box.x), h: box.h + 12 });
  }
  return hits;
}

export function clearFigures(canvas: HTMLCanvasElement | null): void {
  canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
}
