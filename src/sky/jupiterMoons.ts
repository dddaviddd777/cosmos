/**
 * Les quatre llunes grans de Júpiter tal com es veuen des de la Terra (amb prismàtics):
 * posició a banda i banda del planeta, i si són davant, darrere o amagades.
 */
import { GeoVector, JupiterMoons, Body } from 'astronomy-engine';

/** Radi equatorial de Júpiter en UA */
const JUP_R_AU = 71_492 / 149_597_870.7;

export const GALILEANS = [
  { key: 'io', id: 'io', name: 'Io' },
  { key: 'europa', id: 'europa', name: 'Europa' },
  { key: 'ganymede', id: 'ganymede', name: 'Ganimedes' },
  { key: 'callisto', id: 'callisto', name: 'Cal·listo' },
] as const;

export interface MoonSpot {
  id: string;
  name: string;
  /** Cap a l'est (+) o l'oest (−), en radis de Júpiter */
  x: number;
  /** Cap al nord (+), en radis de Júpiter */
  y: number;
  /** Més a prop que Júpiter (passa per davant) */
  front: boolean;
  /** Tapada pel disc de Júpiter (darrere) */
  hidden: boolean;
  /** Davant del disc (es veu la seva ombra al telescopi, però no amb prismàtics) */
  transit: boolean;
}

export function jupiterMoonsView(date: Date): MoonSpot[] {
  const j = GeoVector(Body.Jupiter, date, true);
  const dist = Math.hypot(j.x, j.y, j.z);
  const [ux, uy, uz] = [j.x / dist, j.y / dist, j.z / dist];
  // Base del pla del cel: est i nord (equatorials)
  const ra = Math.atan2(uy, ux);
  const dec = Math.asin(uz);
  const east = [-Math.sin(ra), Math.cos(ra), 0];
  const north = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)];
  // Les llunes es veuen on eren quan en va sortir la llum: la mateixa correcció que per a Júpiter
  const moons = JupiterMoons(new Date(date.getTime() - (dist * 499.005) * 1000));
  return GALILEANS.map((g) => {
    const m = moons[g.key];
    const x = (m.x * east[0] + m.y * east[1] + m.z * east[2]) / JUP_R_AU;
    const y = (m.x * north[0] + m.y * north[1] + m.z * north[2]) / JUP_R_AU;
    const depth = m.x * ux + m.y * uy + m.z * uz; // positiu: més lluny que Júpiter
    const onDisc = Math.hypot(x, y) < 1;
    return { id: g.id, name: g.name, x, y, front: depth < 0, hidden: onDisc && depth > 0, transit: onDisc && depth < 0 };
  });
}
