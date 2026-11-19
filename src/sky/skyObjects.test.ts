import { describe, expect, it } from 'vitest';
import { skyObjects } from './skyObjects';

const bcn = { lat: 41.39, lon: 2.17, name: 'Barcelona' };

describe('objectes brillants per a la càmera', () => {
  const t = new Date('2026-11-19T20:27:00Z');
  const list = skyObjects(t, bcn);

  it('hi ha la Lluna i, al seu costat, Saturn', () => {
    const moon = list.find((o) => o.id === 'moon')!;
    const saturn = list.find((o) => o.id === 'saturn')!;
    expect(moon.kind).toBe('lluna');
    expect(saturn.kind).toBe('planeta');
    expect(Math.abs(moon.pos.az - saturn.pos.az)).toBeLessThan(40);
  });

  it('van del més brillant al més feble, sense la Terra ni la Via Làctia', () => {
    for (let i = 1; i < list.length; i++) expect(list[i].mag).toBeGreaterThanOrEqual(list[i - 1].mag);
    expect(list.some((o) => o.id === 'earth' || o.id === 'milky-way')).toBe(false);
    // Estrelles amb fitxa i estrelles només amb nom
    expect(list.some((o) => o.id === 'vega')).toBe(true);
    expect(list.some((o) => o.name === 'Markab' && !o.id)).toBe(true);
    // Només el que és per sobre (o just a punt de sortir)
    for (const o of list) expect(o.pos.alt).toBeGreaterThanOrEqual(-3);
  });
});
