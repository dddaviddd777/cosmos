import { describe, expect, it } from 'vitest';
import { skyEvents } from './events';

const BCN = { lat: 41.39, lon: 2.17, name: 'Barcelona' };
const FROM = new Date('2026-11-17T12:00:00Z');
const events = skyEvents(FROM, BCN);
const day = (d: Date) => d.toISOString().slice(0, 10);

describe('calendari d’esdeveniments', () => {
  it('està ordenat per data i comença a partir d’avui', () => {
    const t = events.map((e) => e.date.getTime());
    expect([...t].sort((a, b) => a - b)).toEqual(t);
    expect(t[0]).toBeGreaterThanOrEqual(FROM.getTime());
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it('troba la lluna plena del 24 de novembre de 2026', () => {
    expect(events.some((e) => e.title === 'Lluna plena' && day(e.date) === '2026-11-24')).toBe(true);
  });

  it('inclou les Gemínides i el solstici d’hivern', () => {
    const gem = events.find((e) => e.title.includes('Gemínides'))!;
    expect(day(gem.date)).toBe('2026-12-15');
    expect(events.find((e) => e.title === 'Solstici d’hivern')!.date.getUTCDate()).toBe(21);
  });

  it('avisa de l’eclipsi de Sol del 2 d’agost de 2027, visible des de Barcelona', () => {
    const e = events.find((x) => x.kind === 'eclipsi' && x.bodies[0] === 'sun' && day(x.date) === '2027-08-02');
    expect(e).toBeDefined();
    expect(e!.visible).toBe(true);
    expect(e!.text).toContain('ulleres');
  });

  it('troba l’oposició de Júpiter de 2027', () => {
    const o = events.find((e) => e.kind === 'oposicio' && e.bodies[0] === 'jupiter');
    expect(o).toBeDefined();
    expect(o!.date.getUTCFullYear()).toBe(2027);
    expect(o!.date.getUTCMonth()).toBe(1); // febrer
  });

  it('cada mes la Lluna passa a prop d’algun planeta', () => {
    const moonMeets = events.filter((e) => e.kind === 'trobada' && e.bodies[0] === 'moon');
    expect(moonMeets.length).toBeGreaterThanOrEqual(3);
    for (const m of moonMeets.filter((x) => x.look)) expect(m.look!.where).toMatch(/^cap a/);
  });
});
