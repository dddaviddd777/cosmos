import { describe, expect, it } from 'vitest';
import { bodyById } from '../astro/bodies';
import { bandQuads, galToRaDec, milkyWayBest, milkyWayInSky, MILKY_WAY_ID } from './milkyway';
import { horizontalOf } from './sky';
import { FAR_BODIES } from './tonight';

const bcn = { lat: 41.39, lon: 2.17, name: 'Barcelona' };

describe('Via Làctia', () => {
  it('el centre galàctic és al Sagitari', () => {
    const c = galToRaDec(0, 0);
    expect(c.ra).toBeCloseTo(17.76, 1);
    expect(c.dec).toBeCloseTo(-28.94, 1);
  });

  it('el pol nord galàctic és a la Cabellera de Berenice', () => {
    const p = galToRaDec(0, 90);
    expect(p.ra).toBeCloseTo(12.86, 1);
    expect(p.dec).toBeCloseTo(27.13, 1);
  });

  it('una nit d’estiu la franja és al cel i el millor punt és amunt', () => {
    const d = new Date('2026-08-10T22:00:00Z');
    const q = bandQuads(milkyWayInSky(d, bcn));
    expect(q.length).toBeGreaterThan(20);
    const best = milkyWayBest(d, bcn);
    expect(best.alt).toBeGreaterThan(15);
    // «Troba-la» apunta a aquest punt
    expect(horizontalOf(bodyById(MILKY_WAY_ID)!, d, bcn)).toEqual(best);
  });

  it('no surt a la llista d’estrelles i objectes llunyans', () => {
    expect(FAR_BODIES.some((b) => b.id === MILKY_WAY_ID)).toBe(false);
  });
});
