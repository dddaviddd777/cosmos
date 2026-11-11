import { describe, expect, it } from 'vitest';
import { bodyById } from './bodies';
import { extentFor, mapAnchor, orbitOf, placeLabels, project, scaleRadius } from './minimap';

const T = new Date('2026-11-09T12:00:00Z');

describe('mapa 2D', () => {
  it('l’escala és creixent, comença al Sol i acaba a la vora', () => {
    expect(scaleRadius(0, 40, 140)).toBe(0);
    expect(scaleRadius(40, 40, 140)).toBeCloseTo(140);
    const r = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].map((id) =>
      scaleRadius(Math.hypot(orbitOf(bodyById(id)!, T)![0].x, orbitOf(bodyById(id)!, T)![0].y), 40, 140),
    );
    expect(r).toEqual([...r].sort((a, b) => a - b));
    // Els planetes interiors no queden enganxats al Sol: Mercuri a més de 15 px, Mart a més de 40
    expect(r[0]).toBeGreaterThan(15);
    expect(r[3]).toBeGreaterThan(40);
  });

  it('projecta mirant des del nord: +y de l’eclíptica cap amunt a la pantalla', () => {
    const [x, y] = project({ x: 0, y: 1, z: 0.3 }, 40, 140);
    expect(x).toBeCloseTo(0);
    expect(y).toBeLessThan(0);
  });

  it('cada fitxa veu l’òrbita sencera del seu cos i la Terra', () => {
    expect(extentFor(undefined, T)).toBe(40);
    expect(extentFor(bodyById('mercury'), T)).toBeGreaterThan(1.02); // la Terra hi cap
    const halley = extentFor(bodyById('halley'), T);
    expect(halley).toBeGreaterThan(35); // afeli del Halley ≈ 35 UA
    expect(extentFor(bodyById('ganymede'), T)).toBe(extentFor(bodyById('jupiter'), T));
    expect(mapAnchor(bodyById('moon')!).id).toBe('earth');
  });

  it('les etiquetes no se solapen', () => {
    const labels = placeLabels(
      [
        { id: 'a', x: 20, y: 0, text: 'Venus', font: 11 },
        { id: 'b', x: 22, y: 2, text: 'Terra', font: 11 },
        { id: 'c', x: 18, y: -3, text: 'Mercuri', font: 11 },
      ],
      [{ x: 20, y: 0, r: 4 }, { x: 22, y: 2, r: 4 }, { x: 18, y: -3, r: 4 }],
      160,
    );
    const ys = labels.map((l) => `${l.x.toFixed(0)},${l.y.toFixed(0)},${l.anchor}`);
    expect(new Set(ys).size).toBe(3);
  });
});
