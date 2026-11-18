import { describe, expect, it } from 'vitest';
import { daysToBest, featureState, MOON_FEATURES, moonToday, SYNODIC } from './moon';
import { jupiterMoonsView } from './jupiterMoons';

const bcn = { lat: 41.39, lon: 2.17, name: 'Barcelona' };
const byName = (n: string) => MOON_FEATURES.find((f) => f.name === n)!;

describe('Lluna en detall', () => {
  it('fase, edat i quatre properes fases en ordre', () => {
    const m = moonToday(new Date('2026-11-24T16:00:00Z'), bcn); // lluna plena
    expect(m.lit).toBeGreaterThan(0.98);
    expect(m.age).toBeGreaterThan(14);
    expect(m.age).toBeLessThan(15.5);
    expect(m.quarters).toHaveLength(4);
    for (let i = 1; i < 4; i++) expect(m.quarters[i].date > m.quarters[i - 1].date).toBe(true);
    if (m.rise && m.set) expect(m.set > m.rise).toBe(true);
  });

  it('el Mar de les Crisis és el primer que es veu; Copèrnic, cap al quart creixent', () => {
    expect(featureState(byName('Mar de les Crisis'), 1)).toBe('fosc');
    expect(featureState(byName('Mar de les Crisis'), 3.5)).toBe('millor');
    expect(featureState(byName('Cràter Copèrnic'), 5)).toBe('fosc');
    expect(featureState(byName('Cràter Copèrnic'), 10)).toBe('millor');
    expect(featureState(byName('Cràter Tycho'), SYNODIC / 2)).toBe('millor');
    // Tots tenen un «millor moment» durant el mes
    for (const f of MOON_FEATURES) expect(daysToBest(f, 0)).toBeLessThan(30);
  });
});

describe('llunes de Júpiter', () => {
  it('són a prop del planeta i en una línia', () => {
    const v = jupiterMoonsView(new Date('2026-11-18T22:00:00Z'));
    expect(v.map((m) => m.name)).toEqual(['Io', 'Europa', 'Ganimedes', 'Cal·listo']);
    const max = [6.5, 10, 16, 27];
    v.forEach((m, i) => expect(Math.hypot(m.x, m.y)).toBeLessThan(max[i]));
    // Totes gairebé en el mateix pla: l'angle respecte de l'eix del pla es manté
    const far = v.filter((m) => Math.hypot(m.x, m.y) > 3);
    const angles = far.map((m) => Math.atan(m.y / m.x));
    for (const a of angles) expect(Math.abs(a - angles[0])).toBeLessThan(0.15);
  });
});
