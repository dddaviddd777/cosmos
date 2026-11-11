/**
 * Matemàtica de l'orientació del mòbil (especificació W3C DeviceOrientation).
 *
 * Marc de la Terra (ENU): x = est, y = nord, z = amunt.
 * Marc del dispositiu: x = dreta de la pantalla, y = part de dalt, z = surt de la pantalla cap a tu.
 * La càmera posterior mira cap a −z.
 * R = Rz(α) · Rx(β) · Ry(γ) passa del marc del dispositiu al de la Terra.
 */
import type { Horizontal } from './sky';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
/** Matriu 3×3 per files */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

const D = Math.PI / 180;

export function rotationFromEuler(alpha: number, beta: number, gamma: number): Mat3 {
  const [ca, sa] = [Math.cos(alpha * D), Math.sin(alpha * D)];
  const [cb, sb] = [Math.cos(beta * D), Math.sin(beta * D)];
  const [cg, sg] = [Math.cos(gamma * D), Math.sin(gamma * D)];
  return [
    ca * cg - sa * sb * sg, -sa * cb, ca * sg + sa * sb * cg,
    sa * cg + ca * sb * sg, ca * cb, sa * sg - ca * sb * cg,
    -cb * sg, sb, cb * cg,
  ];
}

const mul = (m: Mat3, v: Vec3): Vec3 => ({
  x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
  y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
  z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
});
/** Multiplica per la transposada (= inversa, perquè R és una rotació) */
const mulT = (m: Mat3, v: Vec3): Vec3 => ({
  x: m[0] * v.x + m[3] * v.y + m[6] * v.z,
  y: m[1] * v.x + m[4] * v.y + m[7] * v.z,
  z: m[2] * v.x + m[5] * v.y + m[8] * v.z,
});

export function enuFromHorizontal(h: Horizontal): Vec3 {
  const [ca, sa] = [Math.cos(h.alt * D), Math.sin(h.alt * D)];
  return { x: ca * Math.sin(h.az * D), y: ca * Math.cos(h.az * D), z: sa };
}

export function horizontalFromEnu(v: Vec3): Horizontal {
  const r = Math.hypot(v.x, v.y, v.z) || 1;
  const az = (Math.atan2(v.x, v.y) / D + 360) % 360;
  return { az, alt: Math.asin(Math.max(-1, Math.min(1, v.z / r))) / D };
}

/** Cap on apunta la càmera posterior. */
export function cameraDirection(R: Mat3): Horizontal {
  return horizontalFromEnu(mul(R, { x: 0, y: 0, z: -1 }));
}

export interface Projection {
  /** L'objectiu és dins del camp de visió de la pantalla */
  onScreen: boolean;
  /** Posició a la pantalla (px des de dalt a l'esquerra), vàlida si onScreen */
  x: number;
  y: number;
  /** Angle entre el centre de la càmera i l'objectiu (graus) */
  offAngle: number;
  /** Direcció cap a on girar, en graus CSS (0 = dreta, 90 = avall) */
  arrowDeg: number;
}

/**
 * Projecta una direcció del cel a la pantalla.
 * @param screenAngle  screen.orientation.angle (0 vertical, 90 / 270 horitzontal)
 * @param focalPx      distància focal de la vista en píxels CSS
 */
export function project(target: Horizontal, R: Mat3, screenAngle: number, focalPx: number, w: number, h: number): Projection {
  const d = mulT(R, enuFromHorizontal(target));
  // Dels eixos del dispositiu als de la pantalla segons la rotació de la pantalla
  const t = screenAngle * D;
  const sx = d.x * Math.cos(t) - d.y * Math.sin(t);
  const sy = d.x * Math.sin(t) + d.y * Math.cos(t);
  const offAngle = Math.acos(Math.max(-1, Math.min(1, -d.z))) / D;
  const arrowDeg = Math.atan2(-sy, sx) / D; // y de pantalla cap avall
  if (d.z >= -1e-6) return { onScreen: false, x: 0, y: 0, offAngle, arrowDeg };
  const x = w / 2 + (focalPx * sx) / -d.z;
  const y = h / 2 - (focalPx * sy) / -d.z;
  const onScreen = x >= 0 && x <= w && y >= 0 && y <= h;
  return { onScreen, x, y, offAngle, arrowDeg };
}

/**
 * Distància focal (px CSS) d'un vídeo de càmera mostrat amb object-fit: cover.
 * @param fovLongDeg camp de visió de la càmera en el seu costat llarg (típic en mòbils: 60–70°)
 */
export function focalForCover(videoW: number, videoH: number, viewW: number, viewH: number, fovLongDeg: number): number {
  const scale = Math.max(viewW / videoW, viewH / videoH);
  const focalVideo = Math.max(videoW, videoH) / 2 / Math.tan((fovLongDeg / 2) * D);
  return focalVideo * scale;
}

/** Diferència d'angles en [−180, 180) */
export const angleDiff = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;
