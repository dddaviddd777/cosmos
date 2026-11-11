import { Body, DefineStar, Equator, Horizon, Observer } from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import { bodyById } from '../astro/bodies';
import { formatKm, formatLightTime } from '../astro/format';
import { liveDistance } from '../astro/live';
import { compareWithEarth } from '../astro/profile';
import { searchBodies } from '../search/search';
import { horizontalOf, isCircumpolar, maxAltitude, visibilityOf } from './sky';
import { farTonight } from './tonight';

const BCN = { lat: 41.3874, lon: 2.1686 };
const T = new Date('2026-11-09T21:00:00Z'); // 22 h a Barcelona

describe('més enllà del sistema solar', () => {
  it('posició al cel igual que la d’astronomy-engine per a una estrella definida', () => {
    // Objectes ben alts a aquesta hora (a sota, astronomy-engine aplica refracció i nosaltres no)
    for (const id of ['vega', 'm31', 'capella', 'deneb', 'polaris']) {
      const b = bodyById(id)!;
      DefineStar(Body.Star1, b.sky!.ra, b.sky!.dec, b.sky!.ly);
      const obs = new Observer(BCN.lat, BCN.lon, 0);
      const eq = Equator(Body.Star1, T, obs, true, true);
      const ref = Horizon(T, obs, eq.ra, eq.dec, 'normal');
      const ours = horizontalOf(b, T, BCN)!;
      expect(Math.abs(ours.alt - ref.altitude)).toBeLessThan(0.05);
      expect(Math.abs(((ours.az - ref.azimuth + 540) % 360) - 180)).toBeLessThan(0.1);
    }
  });

  it('la Polar és a una altura igual a la latitud', () => {
    expect(Math.abs(horizontalOf(bodyById('polaris')!, T, BCN)!.alt - BCN.lat)).toBeLessThan(1.2);
    expect(isCircumpolar(bodyById('polaris')!, BCN)).toBe(true);
    expect(isCircumpolar(bodyById('sirius')!, BCN)).toBe(false);
  });

  it('a Barcelona, una nit de novembre: Andròmeda just a sobre, Canopus i els Núvols de Magalhães mai', () => {
    const far = farTonight(T, BCN);
    const up = far.up.map((e) => e.body.id);
    expect(up).toContain('m31');
    expect(far.up.find((e) => e.body.id === 'm31')!.pos.alt).toBeGreaterThan(70);
    expect(up).toContain('m45');
    expect(far.never.map((e) => e.body.id).sort()).toEqual(['alpha-cen', 'canopus', 'lmc', 'omega-cen', 'smc']);
    // Antares és sota l'horitzó i en sap l'hora de sortida
    const antares = far.down.find((e) => e.body.id === 'antares')!;
    expect(antares.rise).not.toBeNull();
    expect(maxAltitude(bodyById('canopus')!, BCN)!).toBeLessThan(0);
    expect(visibilityOf(bodyById('canopus')!, T, BCN)!.notes.join(' ')).toMatch(/no surt mai/);
  });

  it('distàncies i temps de llum en anys', () => {
    const d = liveDistance(bodyById('sirius')!, T)!;
    expect(formatLightTime(d.lightMinutes)).toBe('8,6 anys');
    expect(formatKm(d.km)).toBe('81 bilions de km');
    expect(formatLightTime(liveDistance(bodyById('m31')!, T)!.lightMinutes)).toBe('2,5 milions d’anys');
  });

  it('comparacions: Betelgeuse arribaria més enllà de Mart', () => {
    const mida = compareWithEarth(bodyById('betelgeuse')!).find((c) => c.label === 'Mida')!;
    expect(mida.text).toMatch(/més enllà de l’òrbita de Mart/);
  });

  it('es troben per noms habituals', () => {
    expect(searchBodies('andromeda')[0].id).toBe('m31');
    expect(searchBodies('Sirius')[0].id).toBe('sirius');
    expect(searchBodies('pleiades')[0].id).toBe('m45');
  });
});

describe('xifres grans en paraules', () => {
  it('bigCount', async () => {
    const { bigCount } = await import('../astro/profile');
    expect(bigCount(543_000, 'vegades')).toBe('543.000 vegades');
    expect(bigCount(158.1e9, 'vegades')).toBe('158.100 milions de vegades');
    expect(bigCount(2.998e12, 'anys')).toBe('3 bilions d’anys');
    expect(bigCount(1.03e7, 'anys')).toBe('10 milions d’anys');
  });
});
