import { describe, expect, it } from 'vitest';
import { angleDiff, cameraDirection, focalForCover, project, rotationFromEuler } from './orientation';

const W = 400;
const H = 800;
const F = 600;

describe('direcció de la càmera', () => {
  it('mòbil vertical mirant al nord → azimut 0°, altitud 0°', () => {
    const c = cameraDirection(rotationFromEuler(0, 90, 0));
    expect(Math.abs(angleDiff(c.az, 0))).toBeLessThan(1e-6);
    expect(c.alt).toBeCloseTo(0, 6);
  });

  it('girar cap a l’est (α = 270°) → azimut 90°', () => {
    expect(cameraDirection(rotationFromEuler(270, 90, 0)).az).toBeCloseTo(90, 6);
  });

  it('mòbil pla amb la pantalla amunt → la càmera mira a terra', () => {
    expect(cameraDirection(rotationFromEuler(0, 0, 0)).alt).toBeCloseTo(-90, 6);
  });

  it('inclinat 30° cap amunt (β = 120°) → altitud 30°', () => {
    expect(cameraDirection(rotationFromEuler(0, 120, 0)).alt).toBeCloseTo(30, 6);
  });
});

describe('projecció a la pantalla', () => {
  const north = rotationFromEuler(0, 90, 0);

  it('objectiu just davant → centre de la pantalla', () => {
    const p = project({ az: 0, alt: 0 }, north, 0, F, W, H);
    expect(p.onScreen).toBe(true);
    expect(p.x).toBeCloseTo(W / 2, 6);
    expect(p.y).toBeCloseTo(H / 2, 6);
    expect(p.offAngle).toBeCloseTo(0, 6);
  });

  it('una mica a la dreta (est) → a la dreta del centre', () => {
    const p = project({ az: 10, alt: 0 }, north, 0, F, W, H);
    expect(p.x).toBeCloseTo(W / 2 + F * Math.tan((10 * Math.PI) / 180), 6);
    expect(p.y).toBeCloseTo(H / 2, 6);
    expect(p.offAngle).toBeCloseTo(10, 6);
  });

  it('una mica amunt → per sobre del centre', () => {
    const p = project({ az: 0, alt: 10 }, north, 0, F, W, H);
    expect(p.y).toBeLessThan(H / 2);
    expect(p.arrowDeg).toBeCloseTo(-90, 6); // fletxa cap amunt
  });

  it('darrere teu → fora de pantalla i fletxa cap a un costat', () => {
    const p = project({ az: 170, alt: 0 }, north, 0, F, W, H);
    expect(p.onScreen).toBe(false);
    expect(p.offAngle).toBeCloseTo(170, 6);
    expect(Math.abs(p.arrowDeg)).toBeLessThan(1); // gira a la dreta
  });

  it('pantalla horitzontal (angle 90): el que és amunt del dispositiu queda a l’esquerra', () => {
    const p = project({ az: 0, alt: 10 }, north, 90, F, H, W);
    expect(p.x).toBeLessThan(H / 2);
    expect(p.y).toBeCloseTo(W / 2, 6);
  });
});

describe('focal del vídeo', () => {
  it('vídeo 1920×1080 en una pantalla vertical 400×800 amb cover', () => {
    const f = focalForCover(1920, 1080, 400, 800, 65);
    // escala = 800/1080; focal del vídeo = 960 / tan(32,5°)
    expect(f).toBeCloseTo((960 / Math.tan((32.5 * Math.PI) / 180)) * (800 / 1080), 6);
  });
});
