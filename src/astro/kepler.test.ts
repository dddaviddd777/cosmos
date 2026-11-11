/**
 * Validació del propagador kepleriè contra les posicions oficials de JPL Horizons
 * (src/data/horizons-check.json, descarregades amb scripts/fetch-small-bodies.mjs).
 */
import { describe, expect, it } from 'vitest';
import check from '../data/horizons-check.json';
import {
  SMALL_BODIES, dateToJd, elementsAt, jdToDate, keplerOrbit, keplerPosition, smallBodyPosition, solveKepler,
} from './kepler';
import { length } from './engine';

type Vec = { x: number; y: number; z: number };
const sub = (a: Vec, b: Vec) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const angleDeg = (a: Vec, b: Vec) =>
  (Math.acos(Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (length(a) * length(b)))) * 180) / Math.PI;

const vectors = check.vectors as Record<string, { date: string; x: number; y: number; z: number }[]>;

/** Error màxim admès (graus vistos des del Sol) segons la distància a l'època dels elements (anys). */
const tolerance = (years: number) => (years < 0.01 ? 0.001 : 0.15 + 0.35 * years);

describe('equació de Kepler', () => {
  it('es resol fins i tot per a òrbites molt excèntriques', () => {
    for (const e of [0, 0.2, 0.6, 0.9, 0.97, 0.995]) {
      for (const M of [-3, -1, 0.001, 0.5, 2, 3.1]) {
        const E = solveKepler(M, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(M, 10);
      }
    }
  });

  it('conversió de dates juliana anada i tornada', () => {
    const d = new Date('2026-11-07T12:34:56Z');
    expect(jdToDate(dateToJd(d)).getTime()).toBeCloseTo(d.getTime(), -1);
    expect(dateToJd(new Date('2000-01-01T12:00:00Z'))).toBeCloseTo(2_451_545.0008, 3);
  });
});

describe('posicions contra JPL Horizons', () => {
  for (const [id, refs] of Object.entries(vectors)) {
    it(`${id}: coincideix amb Horizons`, () => {
      const body = SMALL_BODIES[id];
      for (const ref of refs) {
        // Les dates de Horizons són en TDB: les passem a UTC
        const date = new Date(Date.parse(ref.date) - 69_184);
        const p = smallBodyPosition(body, date);
        const epoch = jdToDate(elementsAt(body, date).epochJd);
        const years = Math.abs(date.getTime() - epoch.getTime()) / (365.25 * 86_400_000);
        const err = angleDeg(p, ref);
        expect(err, `${id} ${ref.date}: error ${err.toFixed(4)}°`).toBeLessThan(tolerance(years));
        // Error en distància relatiu petit
        expect(length(sub(p, ref)) / length(ref)).toBeLessThan(0.01 + 0.01 * years);
      }
    });
  }

  it('Apophis canvia d’òrbita després del pas proper del 13 d’abril de 2029', () => {
    const before = elementsAt(SMALL_BODIES.apophis, new Date('2029-04-01T00:00:00Z'));
    const after = elementsAt(SMALL_BODIES.apophis, new Date('2029-05-01T00:00:00Z'));
    expect(before.a).toBeLessThan(1); // asteroide Aten
    expect(after.a).toBeGreaterThan(1); // passa a ser Apollo
  });

  it('Apophis: distància mínima ≈ 38.000 km del centre de la Terra el 13/04/2029 (efemèride JPL)', async () => {
    const { liveDistance } = await import('./live');
    const { bodyById } = await import('./bodies');
    const apophis = bodyById('apophis')!;
    const at = (iso: string) => liveDistance(apophis, new Date(iso))!.km;
    expect(at('2029-04-13T21:46:00Z')).toBeGreaterThan(37_500);
    expect(at('2029-04-13T21:46:00Z')).toBeLessThan(39_000);
    // Un dia abans i un dia després és molt més lluny
    expect(at('2029-04-12T21:46:00Z')).toBeGreaterThan(400_000);
    expect(at('2029-04-14T21:46:00Z')).toBeGreaterThan(400_000);
  });

  it('cometa Halley: periheli de 2061 a menys de 10 dies de la predicció de JPL (28 jul 2061)', () => {
    // El model de dos cossos no inclou les pertorbacions dels planetes: un error de dies en 35 anys és esperable
    const el = SMALL_BODIES.halley.orbits[0];
    const tp = jdToDate(el.tp);
    const days = Math.abs(tp.getTime() - Date.parse('2061-07-28T00:00:00Z')) / 86_400_000;
    expect(days).toBeLessThan(10);
    expect(length(keplerPosition(el, tp))).toBeCloseTo(el.q, 3);
  });
});

describe('òrbites dibuixades', () => {
  it('l’òrbita es tanca i passa pel periheli i l’afeli', () => {
    for (const id of ['halley', 'hale-bopp', 'ceres']) {
      const el = SMALL_BODIES[id].orbits[0];
      const pts = keplerOrbit(el);
      const r = pts.map(length);
      expect(Math.min(...r)).toBeCloseTo(el.q, 2);
      expect(Math.max(...r) / el.ad).toBeCloseTo(1, 3);
      expect(length(sub(pts[0], pts[pts.length - 1]))).toBeLessThan(1e-9);
    }
  });
});
