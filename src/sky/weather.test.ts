import { describe, expect, it } from 'vitest';
import { effectiveClouds, nightOutlook, type CloudHour, type Forecast } from './weather';

const T0 = Date.UTC(2026, 10, 17, 17); // 18 h a Catalunya
const hour = (i: number, low: number, mid = 0, high = 0, rain = 0): CloudHour => ({
  time: new Date(T0 + i * 3_600_000), total: Math.max(low, mid, high), low, mid, high, rain,
});
const fc = (hours: CloudHour[]): Forecast => ({ hours, fetched: T0 });

describe('previsió de núvols', () => {
  it('els núvols alts compten menys que els baixos', () => {
    expect(effectiveClouds(hour(0, 0, 0, 80))).toBeLessThan(effectiveClouds(hour(0, 80)));
    expect(effectiveClouds(hour(0, 70))).toBe(70);
  });

  it('nit serena → bona', () => {
    const o = nightOutlook(fc([0, 1, 2, 3, 4, 5, 6].map((i) => hour(i, 5))), new Date(T0), new Date(T0 + 12 * 3_600_000))!;
    expect(o.rating).toBe('bona');
    expect(o.best).toBeNull();
    // Com a molt les 6 primeres hores de foscor
    expect(o.hours.length).toBe(7);
  });

  it('núvols que marxen → regular, amb la millor hora', () => {
    const o = nightOutlook(fc([90, 80, 60, 20, 5, 5].map((c, i) => hour(i, c))), new Date(T0), new Date(T0 + 12 * 3_600_000))!;
    expect(o.rating).toBe('regular');
    expect(o.best?.getTime()).toBe(T0 + 4 * 3_600_000);
  });

  it('pluja probable → dolenta encara que hi hagi clarianes', () => {
    const o = nightOutlook(fc([0, 1, 2].map((i) => hour(i, 20, 0, 0, 70))), new Date(T0), new Date(T0 + 3 * 3_600_000))!;
    expect(o.rating).toBe('dolenta');
  });

  it('sense dades per a aquesta nit → null', () => {
    expect(nightOutlook(fc([hour(-30, 0)]), new Date(T0), new Date(T0 + 3_600_000))).toBeNull();
  });
});
