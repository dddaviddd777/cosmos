import { describe, expect, it } from 'vitest';
import { issPasses, issState, parseTle, setIssTle, tleEpoch, tleUsable } from './iss';

// Dades reals de CelesTrak (17-11-2026)
const TEXT = `ISS (ZARYA)
1 25544U 98067A   26321.52804937  .00010237  00000+0  19073-3 0  9997
2 25544  51.6318 261.2656 0007379  36.1207 324.0279 15.49435330595529`;
const bcn = { lat: 41.39, lon: 2.17 };

describe('ISS', () => {
  const p = parseTle(TEXT)!;
  setIssTle({ ...p, fetched: Date.UTC(2026, 10, 17) });

  it('llegeix les dades i la seva data', () => {
    expect(p.l1.startsWith('1 25544')).toBe(true);
    const e = tleEpoch({ ...p, fetched: 0 });
    expect(e.toISOString().slice(0, 13)).toBe('2026-11-17T12');
    expect(tleUsable(new Date('2026-11-20'))).toBe(true);
    expect(tleUsable(new Date('2026-12-20'))).toBe(false);
  });

  it('vola a uns 400 km d’altura', () => {
    const s = issState(new Date('2026-11-18T12:00:00Z'), bcn)!;
    expect(s.heightKm).toBeGreaterThan(380);
    expect(s.heightKm).toBeLessThan(440);
  });

  it('troba passos visibles des de Barcelona i són coherents', () => {
    const passes = issPasses(bcn, new Date('2026-11-17T12:00:00Z'), 5);
    const all = issPasses(bcn, new Date('2026-11-17T12:00:00Z'), 5, false);
    expect(all.length).toBeGreaterThan(passes.length);
    for (const x of passes) {
      expect(x.visible).toBe(true);
      expect(x.peakAlt).toBeGreaterThan(5);
      expect(x.end.getTime()).toBeGreaterThan(x.start.getTime());
      expect(x.minutes).toBeLessThanOrEqual(12);
    }
    // Es mostren per poder-los revisar a mà
    console.log(passes.map((x) => `${x.start.toISOString()} ${Math.round(x.peakAlt)}° ${x.minutes}min`).join('\n'));
  });
});
