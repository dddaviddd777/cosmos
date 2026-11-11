import { SearchMoonPhase } from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import { horizontalOf } from './sky';
import { bodyById } from '../astro/bodies';
import { darkStart, isDark, moonInfo, skyTonight, TONIGHT_IDS } from './tonight';

const BCN = { lat: 41.3874, lon: 2.1686 };

describe('aquesta nit', () => {
  it('troba quan es fa fosc i abans encara no ho és', () => {
    const noon = new Date('2026-11-20T11:00:00Z');
    expect(isDark(noon, BCN)).toBe(false);
    const dark = darkStart(noon, BCN)!;
    // A Barcelona, al novembre, el Sol es pon cap a les 16:30 UTC: fosc poc després de les 17 h UTC
    expect(dark.getUTCHours()).toBeGreaterThanOrEqual(16);
    expect(dark.getUTCHours()).toBeLessThanOrEqual(18);
    expect(isDark(dark, BCN)).toBe(true);
    expect(isDark(new Date(dark.getTime() - 30 * 60_000), BCN)).toBe(false);
    // Si ja és fosc, és ara mateix
    expect(darkStart(dark, BCN)!.getTime()).toBe(dark.getTime());
  });

  it('classifica els cossos (Saturn alt, Júpiter sota l’horitzó; dades contrastades amb JPL a sky.test)', () => {
    const list = skyTonight(new Date('2026-11-20T20:00:00Z'), BCN);
    expect(list.map((e) => e.body.id).sort()).toEqual([...TONIGHT_IDS].sort());
    const saturn = list.find((e) => e.body.id === 'saturn')!;
    expect(saturn.status).toBe('visible');
    expect(saturn.eye).toBe('ull nu');
    expect(saturn.set!.getTime()).toBeGreaterThan(Date.parse('2026-11-20T20:00:00Z'));

    const jup = skyTonight(new Date('2026-11-07T22:00:00Z'), BCN).find((e) => e.body.id === 'jupiter')!;
    expect(jup.status).toBe('sota');
    expect(Math.abs(horizontalOf(bodyById('jupiter')!, jup.rise!, BCN)!.alt)).toBeLessThan(0.05);
    expect(jup.riseAz!).toBeGreaterThan(30);
    expect(jup.riseAz!).toBeLessThan(120); // surt per l'est / nord-est

    // Els que es poden veure van primer, i dins d'aquests, els d'ull nu abans que els de prismàtics
    const up = list.map((e) => (e.status === 'visible' || e.status === 'baix' ? 0 : 1));
    expect(up).toEqual([...up].sort((a, b) => a - b));
    const upEyes = list.filter((e) => up[list.indexOf(e)] === 0).map((e) => (e.eye === 'ull nu' ? 0 : 1));
    expect(upEyes).toEqual([...upEyes].sort((a, b) => a - b));
  });

  it('Urà i Neptú no es veuen a ull nu: calen prismàtics (magnituds 5,7 i 7,8)', () => {
    const list = skyTonight(new Date('2026-11-20T20:00:00Z'), BCN);
    expect(list.find((e) => e.body.id === 'neptune')!.eye).toBe('prismàtics');
    expect(list.find((e) => e.body.id === 'uranus')!.eye).toBe('prismàtics');
  });

  it('fases de la Lluna', () => {
    const full = SearchMoonPhase(180, new Date('2026-11-01T00:00:00Z'), 40)!.date;
    expect(moonInfo(full).name).toBe('Lluna plena');
    expect(moonInfo(full).lit).toBeGreaterThan(0.98);
    const nova = SearchMoonPhase(0, new Date('2026-11-01T00:00:00Z'), 40)!.date;
    expect(moonInfo(nova).name).toBe('Lluna nova');
    const quart = SearchMoonPhase(90, new Date('2026-11-01T00:00:00Z'), 40)!.date;
    expect(moonInfo(quart).name).toBe('Quart creixent');
  });
});
