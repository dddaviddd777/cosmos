/**
 * Posició al cel (azimut i altura) de totes les estrelles de les figures de les constel·lacions,
 * per dibuixar-les al mapa del cel. Una sola matriu de rotació per a tot el cel: és ràpid.
 */
import { AstroTime, HorizonFromVector, RotateVector, Rotation_EQJ_HOR, Vector } from 'astronomy-engine';
import type { BodyInfo } from '../astro/bodies';
import { CONSTELLATIONS } from '../astro/constellations';
import { observerOf, type Horizontal, type Place } from './sky';

export interface SkyFigure {
  body: BodyInfo;
  center: Horizontal;
  stars: (Horizontal & { mag: number })[];
  lines: [number, number][];
}

const D = Math.PI / 180;

/** Converteix coordenades J2000 a horitzontals amb una matriu ja calculada */
function toHorizontal(rot: ReturnType<typeof Rotation_EQJ_HOR>, time: AstroTime, raH: number, decDeg: number): Horizontal {
  const ra = raH * 15 * D, dec = decDeg * D;
  const v = new Vector(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), time);
  const h = HorizonFromVector(RotateVector(rot, v), 'normal');
  return { az: h.lon, alt: h.lat };
}

export function constellationsInSky(date: Date, place: Place): SkyFigure[] {
  const time = new AstroTime(date);
  const rot = Rotation_EQJ_HOR(time, observerOf(place));
  return CONSTELLATIONS.map((body) => {
    const c = body.constel!;
    return {
      body,
      center: toHorizontal(rot, time, c.ra, c.dec),
      stars: c.figure.stars.map((s) => ({ ...toHorizontal(rot, time, s.ra, s.dec), mag: s.mag })),
      lines: c.figure.lines,
    };
  });
}
