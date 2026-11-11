/**
 * Tests de validació del motor contra efemèrides publicades (NASA/JPL, IMCCE)
 * i fets astronòmics coneguts.
 */
import { describe, expect, it } from 'vitest';
import { Body } from 'astronomy-engine';
import {
  distanceFromEarth,
  distanceFromSun,
  geocentricPosition,
  length,
  makeObserver,
  sampleOrbit,
  skyPosition,
  nextRiseSet,
  apparentMagnitude,
} from './engine';
import { formatKm, formatLightTime } from './format';
import { BODIES, wikipediaUrl } from './bodies';

const utc = (s: string) => new Date(s);

describe('distàncies', () => {
  it('Terra al periheli (3 gen 2026) ≈ 0,98330 UA', () => {
    expect(distanceFromSun(Body.Earth, utc('2026-01-03T17:00Z'))).toBeCloseTo(0.9833, 3);
  });

  it('Terra a l’afeli (6 jul 2026) ≈ 1,01664 UA', () => {
    expect(distanceFromSun(Body.Earth, utc('2026-07-06T18:00Z'))).toBeCloseTo(1.0166, 3);
  });

  it('màxima aproximació de Mart (12 gen 2025) ≈ 96,1 milions de km', () => {
    const d = distanceFromEarth(Body.Mars, utc('2025-01-12T12:00Z'));
    expect(d.km / 1e6).toBeGreaterThan(95.6);
    expect(d.km / 1e6).toBeLessThan(96.6);
  });

  it('la llum del Sol triga entre 8,1 i 8,5 minuts a arribar a la Terra', () => {
    for (const s of ['2026-01-03T00:00Z', '2026-07-06T00:00Z', '2026-11-07T00:00Z']) {
      const { lightMinutes } = distanceFromEarth(Body.Sun, utc(s));
      expect(lightMinutes).toBeGreaterThan(8.1);
      expect(lightMinutes).toBeLessThan(8.5);
    }
  });

  it('la Lluna sempre és entre 356.000 i 407.000 km', () => {
    for (let day = 0; day < 60; day++) {
      const { km } = distanceFromEarth(Body.Moon, new Date(Date.UTC(2026, 0, 1) + day * 86_400_000));
      expect(km).toBeGreaterThan(356_000);
      expect(km).toBeLessThan(407_000);
    }
  });

  it('distància de la Terra a si mateixa és 0', () => {
    expect(distanceFromEarth(Body.Earth, new Date()).km).toBe(0);
  });
});

describe('geometria', () => {
  it('oposició de Júpiter (10 gen 2026): Júpiter oposat al Sol vist des de la Terra', () => {
    const date = utc('2026-01-10T08:00Z');
    const j = geocentricPosition(Body.Jupiter, date);
    const s = geocentricPosition(Body.Sun, date);
    const lonJ = Math.atan2(j.y, j.x);
    const lonS = Math.atan2(s.y, s.x);
    let diff = Math.abs(((lonJ - lonS) * 180) / Math.PI) % 360;
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBeGreaterThan(178.5);
  });

  it('l’òrbita mostrejada de la Terra es tanca i té radi ≈ 1 UA', () => {
    const pts = sampleOrbit(Body.Earth, utc('2026-01-01T00:00Z'), 128);
    const first = pts[0];
    const last = pts[pts.length - 1];
    expect(length({ x: first.x - last.x, y: first.y - last.y, z: first.z - last.z })).toBeLessThan(0.002);
    for (const p of pts) expect(Math.abs(length(p) - 1)).toBeLessThan(0.02);
  });

  it('els planetes són gairebé al pla de l’eclíptica (z petita)', () => {
    const date = utc('2026-11-07T00:00Z');
    for (const b of [Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn]) {
      const p = geocentricPosition(b, date);
      expect(Math.abs(p.z) / length(p)).toBeLessThan(0.1);
    }
  });
});

describe('cel local (base de «Troba’l al cel»)', () => {
  const barcelona = makeObserver(41.3874, 2.1686, 12);

  it('Sol al migdia solar del solstici a Barcelona: altitud ≈ 72°, cap al sud', () => {
    const p = skyPosition(Body.Sun, utc('2026-06-21T11:52Z'), barcelona);
    expect(p.altitude).toBeGreaterThan(71.5);
    expect(p.altitude).toBeLessThan(72.6);
    expect(Math.abs(p.azimuth - 180)).toBeLessThan(6);
  });

  it('a mitjanit el Sol és sota l’horitzó', () => {
    expect(skyPosition(Body.Sun, utc('2026-06-21T23:50Z'), barcelona).altitude).toBeLessThan(0);
  });

  it('el Sol surt i es pon cada dia', () => {
    const rs = nextRiseSet(Body.Sun, utc('2026-11-07T00:00Z'), barcelona, 1);
    expect(rs.rise).not.toBeNull();
    expect(rs.set).not.toBeNull();
    expect(rs.set!.getTime()).toBeGreaterThan(rs.rise!.getTime());
  });

  it('Venus és molt brillant (magnitud negativa)', () => {
    expect(apparentMagnitude(Body.Venus, utc('2026-11-07T00:00Z'))).toBeLessThan(-3.5);
  });
});

describe('format i catàleg', () => {
  it('formata distàncies i temps de llum en català', () => {
    expect(formatKm(149_597_870)).toBe('149,60 milions de km');
    expect(formatKm(384_400)).toBe('384.400 km');
    expect(formatLightTime(8.317)).toBe('8 min 19 s');
    expect(formatLightTime(0.0214)).toBe('1,3 s');
    expect(formatLightTime(250)).toBe('4 h 10 min');
  });

  it('cada cos té enllaç a la Viquipèdia', () => {
    for (const b of BODIES) expect(wikipediaUrl(b)).toMatch(/^https:\/\/ca\.wikipedia\.org\/wiki\/.+/);
  });
});
