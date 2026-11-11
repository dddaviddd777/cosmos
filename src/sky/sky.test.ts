/**
 * Validació de la posició al cel contra JPL Horizons (observador a Barcelona, 41,3874 N 2,1686 E).
 * Valors obtinguts de l'API de Horizons (EPHEM_TYPE=OBSERVER, QUANTITIES=4, refracció inclosa).
 */
import { describe, expect, it } from 'vitest';
import { bodyById, toBody, withArticle } from '../astro/bodies';
import { cardinal, horizontalOf, nextRise, separation, skyTargetOf, towardsCardinal, visibilityOf } from './sky';

const BCN = { lat: 41.3874, lon: 2.1686 };

const HORIZONS: Record<string, { utc: string; az: number; alt: number }[]> = {
  ceres: [{ utc: '2026-11-07T22:00:00Z', az: 67.516252, alt: 11.386322 }, { utc: '2027-03-15T04:30:00Z', az: 325.660637, alt: -6.962571 }],
  vesta: [{ utc: '2026-11-07T22:00:00Z', az: 182.66764, alt: 44.156729 }, { utc: '2027-03-15T04:30:00Z', az: 27.551738, alt: -33.012276 }],
  halley: [{ utc: '2026-11-07T22:00:00Z', az: 77.209382, alt: -9.688031 }, { utc: '2027-03-15T04:30:00Z', az: 292.912567, alt: -18.980597 }],
  encke: [{ utc: '2026-11-07T22:00:00Z', az: 230.443236, alt: 51.910366 }, { utc: '2027-03-15T04:30:00Z', az: 113.43502, alt: -5.904975 }],
  jupiter: [{ utc: '2026-11-07T22:00:00Z', az: 52.822963, alt: -16.451144 }, { utc: '2027-03-15T04:30:00Z', az: 289.546294, alt: 2.929082 }],
  mars: [{ utc: '2026-11-07T22:00:00Z', az: 53.620658, alt: -13.293421 }, { utc: '2027-03-15T04:30:00Z', az: 286.954458, alt: 7.5132 }],
  // La Lluna, per sobre de l'horitzó (on la paral·laxi i la refracció importen de debò)
  moon: [
    { utc: '2026-11-07T10:00:00Z', az: 178.581925, alt: 34.921896 },
    { utc: '2026-11-20T20:00:00Z', az: 173.348711, alt: 54.16209 },
    { utc: '2026-11-20T23:30:00Z', az: 244.017253, alt: 35.396258 },
  ],
  saturn: [
    { utc: '2026-11-20T20:00:00Z', az: 169.845537, alt: 49.062058 },
    { utc: '2026-11-20T23:30:00Z', az: 238.107399, alt: 32.105704 },
  ],
};

describe('posició al cel contra JPL Horizons (Barcelona)', () => {
  for (const [id, refs] of Object.entries(HORIZONS)) {
    it(`${id}: coincideix amb Horizons`, () => {
      for (const r of refs) {
        const p = horizontalOf(bodyById(id)!, new Date(r.utc), BCN)!;
        if (r.alt >= 0) {
          // Visible: error inferior a 1 minut d'arc (els valors mesurats són de 0,02′ a 0,3′)
          const err = separation(p, r) * 60;
          expect(err, `${id} ${r.utc}: ${err.toFixed(2)}′`).toBeLessThan(1);
        } else {
          // Sota l'horitzó Horizons aplica igualment la refracció de l'horitzó (≈ 0,65°) i nosaltres no:
          // només comprovem que és sota l'horitzó i l'azimut
          expect(p.alt).toBeLessThan(0);
          expect(Math.abs(p.alt - r.alt)).toBeLessThan(0.7);
          expect(Math.abs(p.az - r.az)).toBeLessThan(0.02);
        }
      }
    });
  }
});

describe('visibilitat', () => {
  it('les llunes sense efemèride es busquen al costat del seu planeta', () => {
    expect(skyTargetOf(bodyById('titan')!).id).toBe('saturn');
    expect(skyTargetOf(bodyById('ceres')!).id).toBe('ceres');
  });

  it('el Sol sempre porta avís de perill', () => {
    const v = visibilityOf(bodyById('sun')!, new Date('2026-06-21T12:00:00Z'), BCN)!;
    expect(v.danger).toBe(true);
    expect(v.notes[0]).toMatch(/No miris mai el Sol/);
  });

  it('un cos sota l’horitzó ho indica i té una propera sortida', () => {
    const date = new Date('2026-11-07T22:00:00Z');
    const v = visibilityOf(bodyById('jupiter')!, date, BCN)!;
    expect(v.pos.alt).toBeLessThan(0);
    expect(v.notes.join(' ')).toMatch(/sota l’horitzó/);
    const rise = nextRise(bodyById('jupiter')!, date, BCN)!;
    expect(rise.getTime()).toBeGreaterThan(date.getTime());
    expect(Math.abs(horizontalOf(bodyById('jupiter')!, rise, BCN)!.alt)).toBeLessThan(0.05);
  });

  it('noms amb article i contraccions en català', () => {
    expect(toBody(bodyById('sun')!)).toBe('al Sol');
    expect(toBody(bodyById('moon')!)).toBe('a la Lluna');
    expect(toBody(bodyById('saturn')!)).toBe('a Saturn');
    expect(toBody(bodyById('halley')!)).toBe('al cometa Halley');
    expect(withArticle(bodyById('67p')!)).toBe('el cometa 67P/Txuriúmov-Herassimenko');
  });

  it('noms dels punts cardinals', () => {
    expect(cardinal(0)).toBe('nord');
    expect(cardinal(359)).toBe('nord');
    expect(cardinal(90)).toBe('est');
    expect(cardinal(225)).toBe('sud-oest');
    expect(towardsCardinal(90)).toBe('cap a l’est');
    expect(towardsCardinal(270)).toBe('cap a l’oest');
    expect(towardsCardinal(180)).toBe('cap al sud');
  });
});
