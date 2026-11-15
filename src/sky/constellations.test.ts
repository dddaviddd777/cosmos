import { describe, expect, it } from 'vitest';
import { bodyById } from '../astro/bodies';
import { CONSTELLATIONS, constellationByOf } from '../astro/constellations';
import { BEYOND } from '../astro/beyond';
import { searchBodies } from '../search/search';
import { horizontalOf, horizontalOfRaDec, isCircumpolar } from './sky';
import { constellationsInSky } from './constelSky';
import { constelTonight } from './tonight';

const BCN = { lat: 41.39, lon: 2.17, name: 'Barcelona' };

describe('constel·lacions', () => {
  it('té les 23 principals amb figures coherents', () => {
    expect(CONSTELLATIONS).toHaveLength(23);
    for (const b of CONSTELLATIONS) {
      const c = b.constel!;
      expect(c.figure.stars.length).toBeGreaterThan(1);
      for (const [i, j] of c.figure.lines) {
        expect(c.figure.stars[i]).toBeDefined();
        expect(c.figure.stars[j]).toBeDefined();
      }
      for (const id of c.objects) expect(bodyById(id), `${b.name}: ${id}`).toBeDefined();
    }
  });

  it('calcula el centre de la figura on toca', () => {
    const ori = bodyById('cst-ori')!.constel!;
    expect(ori.ra).toBeGreaterThan(5.2);
    expect(ori.ra).toBeLessThan(5.9);
    expect(Math.abs(ori.dec - 5)).toBeLessThan(6);
    // Pegàs i Andròmeda passen per RA 0h: el centre no pot sortir a l'altra banda del cel
    const peg = bodyById('cst-peg')!.constel!;
    expect(peg.ra > 21 || peg.ra < 1).toBe(true);
  });

  it('les del nord no es ponen mai des de Barcelona i les altres sí', () => {
    for (const id of ['cst-uma', 'cst-umi', 'cst-cas', 'cst-cep', 'cst-dra']) expect(isCircumpolar(bodyById(id)!, BCN), id).toBe(true);
    for (const id of ['cst-ori', 'cst-sco', 'cst-leo']) expect(isCircumpolar(bodyById(id)!, BCN), id).toBe(false);
  });

  it('a l’hivern es veu Orió i a l’estiu l’Escorpió', () => {
    const winter = constelTonight(new Date('2027-01-15T21:00:00Z'), BCN);
    expect(winter.up.map((e) => e.body.id)).toContain('cst-ori');
    expect(winter.up.map((e) => e.body.id)).not.toContain('cst-sco');
    const summer = constelTonight(new Date('2027-07-10T21:30:00Z'), BCN);
    expect(summer.up.map((e) => e.body.id)).toContain('cst-sco');
    expect(summer.up.map((e) => e.body.id)).not.toContain('cst-ori');
    // Ordenades de més alta a més baixa
    const alts = summer.up.map((e) => e.pos.alt);
    expect([...alts].sort((a, b) => b - a)).toEqual(alts);
  });

  it('la Polar és dins de la figura de l’Óssa Menor', () => {
    const t = new Date('2027-03-01T22:00:00Z');
    const polar = horizontalOf(bodyById('polaris')!, t, BCN)!;
    expect(Math.abs(polar.alt - BCN.lat)).toBeLessThan(1.5);
    const umi = bodyById('cst-umi')!.constel!;
    const near = umi.figure.stars.some((s) => Math.abs(s.dec - bodyById('polaris')!.sky!.dec) < 0.1);
    expect(near).toBe(true);
  });

  it('enllaça les estrelles amb la seva constel·lació', () => {
    const linked = BEYOND.filter((b) => constellationByOf(b.sky!.constellation));
    expect(linked.map((b) => b.id)).toEqual(expect.arrayContaining(['sirius', 'betelgeuse', 'vega', 'antares', 'polaris', 'm31', 'm13']));
  });

  it('es troba pel nom popular', () => {
    expect(searchBodies('carro')[0]?.id).toBe('cst-uma');
    expect(searchBodies('tres maries')[0]?.id).toBe('cst-ori');
    expect(searchBodies('escorpi').map((b) => b.id)).toContain('cst-sco');
  });

  it('el mapa del cel situa les estrelles de les figures igual que el càlcul detallat', () => {
    const t = new Date('2027-01-15T21:00:00Z');
    const figs = constellationsInSky(t, BCN);
    expect(figs).toHaveLength(23);
    for (const f of figs.filter((x) => ['cst-ori', 'cst-uma', 'cst-sco'].includes(x.body.id))) {
      const fig = f.body.constel!.figure;
      fig.stars.forEach((s, i) => {
        const ref = horizontalOfRaDec(s.ra, s.dec, t, BCN);
        // Per sobre de l'horitzó tots dos apliquen la mateixa refracció
        if (ref.alt > 1) {
          expect(Math.abs(f.stars[i].alt - ref.alt)).toBeLessThan(0.05);
          expect(Math.abs(((f.stars[i].az - ref.az + 540) % 360) - 180)).toBeLessThan(0.1);
        }
      });
    }
    // Al gener a les 22 h, Orió és ben amunt cap al sud
    const ori = figs.find((x) => x.body.id === 'cst-ori')!;
    expect(ori.center.alt).toBeGreaterThan(30);
    expect(ori.center.az).toBeGreaterThan(120);
    expect(ori.center.az).toBeLessThan(240);
  });
});
