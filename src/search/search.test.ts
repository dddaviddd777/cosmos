import { describe, expect, it } from 'vitest';
import { normalize, searchBodies } from './search';
import { CATALOG, bodyById } from '../astro/bodies';
import { liveDistance } from '../astro/live';
import { SMALL_BODIES } from '../astro/kepler';

const first = (q: string) => searchBodies(q)[0]?.id;

describe('cerca', () => {
  it('normalitza accents i punt volat', () => {
    expect(normalize('Júpiter')).toBe('jupiter');
    expect(normalize('Cal·listo')).toBe('callisto');
  });

  it('troba per nom català, sense accents i en majúscules', () => {
    expect(first('Saturn')).toBe('saturn');
    expect(first('jupiter')).toBe('jupiter');
    expect(first('URA')).toBe('uranus');
    expect(first('lluna')).toBe('moon');
  });

  it('troba per nom en anglès o castellà', () => {
    expect(first('Earth')).toBe('earth');
    expect(first('marte')).toBe('mars');
    expect(first('Ganymede')).toBe('ganymede');
  });

  it('tolera faltes d’ortografia', () => {
    expect(first('saturm')).toBe('saturn');
    expect(first('jupitr')).toBe('jupiter');
    expect(first('neptuu')).toBe('neptune');
  });

  it('troba mentre s’escriu (prefix) i per paraula', () => {
    expect(first('sat')).toBe('saturn');
    expect(first('halley')).toBe('halley');
    expect(first('rosetta')).toBe('67p');
    expect(first('perseides')).toBe('swift-tuttle');
    expect(first('dart')).toBe('didymos');
  });

  it('filtra per tipus', () => {
    const r = searchBodies('', new Set(['satèl·lit']));
    expect(r.length).toBeGreaterThan(10);
    expect(r.every((b) => b.kind === 'satèl·lit')).toBe(true);
  });

  it('no retorna res per a textos sense relació', () => {
    expect(searchBodies('xyzzy')).toHaveLength(0);
  });
});

describe('catàleg', () => {
  it('ids únics i dades completes', () => {
    expect(new Set(CATALOG.map((b) => b.id)).size).toBe(CATALOG.length);
    for (const b of CATALOG) {
      expect(b.intro.length).toBeGreaterThan(30);
      expect(b.facts.length).toBeGreaterThan(0);
      if (b.parent) expect(bodyById(b.parent)).toBeDefined();
    }
  });

  it('tots els asteroides, cometes i planetes nans tenen òrbita de JPL o d’astronomy-engine', () => {
    for (const b of CATALOG.filter((x) => ['asteroide', 'cometa', 'planeta nan'].includes(x.kind))) {
      expect(b.body ?? SMALL_BODIES[b.id], b.id).toBeDefined();
    }
  });

  it('distància en directe: exacta per a planetes i llunes galileanes, aproximada per a altres llunes', () => {
    const date = new Date('2026-11-07T00:00Z');
    const jup = liveDistance(bodyById('jupiter')!, date)!;
    const io = liveDistance(bodyById('io')!, date)!;
    expect(io.approx).toBe(false);
    // Io és a menys de 0,003 UA (≈ 422.000 km) de Júpiter
    expect(Math.abs(io.au - jup.au)).toBeLessThan(0.003);
    expect(Math.abs(io.au - jup.au)).toBeGreaterThan(0);
    expect(liveDistance(bodyById('titan')!, date)!.approx).toBe(true);
    // Ceres (dades JPL): sempre entre 1,5 i 4 UA de la Terra
    const ceres = liveDistance(bodyById('ceres')!, date)!;
    expect(ceres.au).toBeGreaterThan(1.5);
    expect(ceres.au).toBeLessThan(4);
    // Caront: es fa servir la distància de Plutó → aproximada
    expect(liveDistance(bodyById('charon')!, date)!.approx).toBe(true);
  });
});
