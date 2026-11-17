/**
 * Superfícies dels cossos del mapa 3D: textura, inclinació de l'eix i període de rotació.
 * Textures: Solar System Scope (CC BY 4.0), reduïdes. Es carreguen en segon pla: mentre no hi són
 * (o si fallen) el cos es dibuixa amb el seu color.
 */
import { useEffect, useState } from 'react';
import { CanvasTexture, SRGBColorSpace, TextureLoader, type Texture } from 'three';

export interface Surface {
  /** Fitxer dins de public/textures */
  map: string;
  /** Inclinació de l'eix respecte de l'eclíptica (graus) */
  tilt: number;
  /** Període de rotació sideri (hores); negatiu = gira al revés (Venus, Urà, Plutó) */
  spinHours: number;
}

export const SURFACES: Record<string, Surface> = {
  sun: { map: 'sun.jpg', tilt: 7.25, spinHours: 609.1 },
  mercury: { map: 'mercury.jpg', tilt: 0.03, spinHours: 1407.6 },
  venus: { map: 'venus.jpg', tilt: 177.4, spinHours: -5832.5 },
  earth: { map: 'earth.jpg', tilt: 23.44, spinHours: 23.934 },
  // La Lluna sempre ensenya la mateixa cara a la Terra: la gira el codi de l'escena
  moon: { map: 'moon.jpg', tilt: 6.7, spinHours: 0 },
  mars: { map: 'mars.jpg', tilt: 25.19, spinHours: 24.623 },
  jupiter: { map: 'jupiter.jpg', tilt: 3.13, spinHours: 9.925 },
  saturn: { map: 'saturn.jpg', tilt: 26.73, spinHours: 10.656 },
  uranus: { map: 'uranus.jpg', tilt: 97.77, spinHours: -17.24 },
  neptune: { map: 'neptune.jpg', tilt: 28.32, spinHours: 16.11 },
};

/** Anells de Saturn: vores interior i exterior en radis del planeta (la textura va d'una a l'altra) */
export const SATURN_RING = { file: 'saturn_ring.png', inner: 1.24, outer: 2.27 };

const D = Math.PI / 180;
const DAY = 86_400_000;
/** 1 de gener de 2000 a les 12 h UT */
const J2000 = Date.UTC(2000, 0, 1, 12);

/** Angle de gir (radians) al voltant del seu eix en una data */
export function spinAngle(s: Surface, date: Date): number {
  if (!s.spinHours) return 0;
  const turns = (date.getTime() - J2000) / (s.spinHours * 3_600_000);
  return (turns - Math.floor(turns)) * 2 * Math.PI;
}

/**
 * Gir de la Terra perquè el meridià de Greenwich miri cap al Sol a les 12 h UT: així la cara il·luminada
 * és la que té de dia de debò. `sunDir` = direcció Terra → Sol a l'escena (x, z).
 */
export function earthSpin(date: Date, sunDir: [number, number]): number {
  const ut = ((date.getTime() % DAY) + DAY) % DAY;
  const noon = Math.atan2(-sunDir[1], sunDir[0]);
  return noon + ((ut - DAY / 2) / DAY) * 2 * Math.PI;
}

export const tiltRad = (s: Surface) => -s.tilt * D;

const cache = new Map<string, Texture>();
const loader = new TextureLoader();

/** Textura de public/textures, o null mentre es carrega (o si no hi és) */
export function useSurfaceTexture(file: string | undefined): Texture | null {
  const [tex, setTex] = useState<Texture | null>(() => (file ? (cache.get(file) ?? null) : null));
  useEffect(() => {
    if (!file) return setTex(null);
    const hit = cache.get(file);
    if (hit) return setTex(hit);
    let alive = true;
    loader.load(
      `${import.meta.env.BASE_URL}textures/${file}`,
      (t) => {
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = 4;
        cache.set(file, t);
        if (alive) setTex(t);
      },
      undefined,
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [file]);
  return tex;
}

let glow: Texture | null = null;
/** Halo del Sol: un degradat radial dibuixat un sol cop */
export function sunGlow(): Texture {
  if (glow) return glow;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  // El disc del Sol ocupa el 36 % central: a sobre, el halo és suau perquè no l'emblanquineixi
  grad.addColorStop(0, 'rgba(255, 200, 110, 0.12)');
  grad.addColorStop(0.34, 'rgba(255, 190, 90, 0.4)');
  grad.addColorStop(0.45, 'rgba(255, 160, 60, 0.22)');
  grad.addColorStop(0.7, 'rgba(255, 130, 40, 0.06)');
  grad.addColorStop(1, 'rgba(255, 120, 30, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  glow = new CanvasTexture(c);
  glow.colorSpace = SRGBColorSpace;
  return glow;
}
