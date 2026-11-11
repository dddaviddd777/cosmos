/**
 * Perfil divulgatiu de cada cos: una frase curta per a la llista i comparacions amb la Terra
 * calculades a partir de les dades (mida, gravetat, durada de l'any, distància al Sol).
 */
import { Body } from 'astronomy-engine';
import { bodyById, type BodyInfo } from './bodies';
import { orbitalPeriodDays } from './engine';
import { formatLy, formatPeriod, formatYears } from './format';
import { SMALL_BODIES } from './kepler';

/** Frase curta per a la llista (com un subtítol) */
export const TAGLINES: Record<string, string> = {
  sun: 'La nostra estrella: hi cabrien 1,3 milions de Terres',
  mercury: 'El més petit i el més proper al Sol',
  venus: 'L’estel del vespre, un infern sota els núvols',
  earth: 'Ets aquí: l’únic món amb vida coneguda',
  mars: 'El planeta vermell, amb robots explorant-lo',
  jupiter: 'El gegant: hi cabrien 1.300 Terres',
  saturn: 'El senyor dels anells',
  uranus: 'Un gegant de gel que gira de costat',
  neptune: 'El més llunyà, amb els vents més forts',
  pluto: 'L’antic novè planeta, amb un cor de gel',
  ceres: 'El més gran del cinturó d’asteroides',
  eris: 'Gairebé com Plutó, i encara més lluny',
  haumea: 'Gira tan de pressa que s’ha allargat',
  makemake: 'Un món gelat i rogenc més enllà de Neptú',
  moon: 'La nostra companya, a poc més d’1 segon llum',
  phobos: 'La lluna de Mart que s’acosta al planeta',
  deimos: 'La lluna petita de Mart',
  io: 'El món amb més volcans actius',
  europa: 'Un oceà amagat sota el gel',
  ganymede: 'La lluna més gran del sistema solar',
  callisto: 'Plena de cràters des de fa milers de milions d’anys',
  titan: 'Té rius i llacs de metà',
  enceladus: 'Llança guèisers d’aigua a l’espai',
  mimas: 'La lluna del cràter gegant',
  rhea: 'Una bola de gel, la segona de Saturn',
  iapetus: 'Una cara fosca i una de brillant',
  titania: 'La lluna més gran d’Urà',
  oberon: 'Una lluna d’Urà plena de cràters',
  miranda: 'Té penya-segats de 20 km d’alçada',
  triton: 'Gira al revés que Neptú',
  charon: 'Tan gran que balla amb Plutó',
  vesta: 'L’asteroide més brillant del cel',
  pallas: 'Un gran asteroide d’òrbita inclinada',
  hygiea: 'Gairebé rodó: candidat a planeta nan',
  psyche: 'Potser el nucli metàl·lic d’un món antic',
  eros: 'El primer asteroide on es va aterrar',
  didymos: 'Una sonda en va desviar la lluna el 2022',
  bennu: 'Una sonda en va portar mostres a la Terra',
  apophis: 'Passarà fregant la Terra el 2029',
  halley: 'Torna cada 76 anys; el pròxim cop, el 2061',
  encke: 'El cometa que torna més sovint',
  '67p': 'L’«ànec de goma» on es va posar Philae',
  'swift-tuttle': 'L’origen de les Perseides d’agost',
  'tempel-tuttle': 'L’origen de les Leònides de novembre',
  'hale-bopp': 'El gran cometa de 1997',
};

export const taglineOf = (b: BodyInfo) => TAGLINES[b.id] ?? b.sky?.tagline ?? '';

/** Gravetat a la superfície (m/s²). Als gegants gasosos, a l'altura dels núvols. */
const GRAVITY: Record<string, number> = {
  sun: 274, mercury: 3.7, venus: 8.87, earth: 9.81, mars: 3.71, jupiter: 24.79, saturn: 10.44,
  uranus: 8.69, neptune: 11.15, pluto: 0.62, moon: 1.62, ceres: 0.28, eris: 0.82, io: 1.8,
  europa: 1.31, ganymede: 1.43, callisto: 1.24, titan: 1.35, triton: 0.78,
};
const NO_SURFACE = new Set(['sun', 'jupiter', 'saturn', 'uranus', 'neptune']);

/** Semieix major dels planetes (UA): la «distància mitjana al Sol» */
const PLANET_A: Partial<Record<Body, number>> = {
  [Body.Mercury]: 0.387, [Body.Venus]: 0.723, [Body.Earth]: 1, [Body.Mars]: 1.524, [Body.Jupiter]: 5.203,
  [Body.Saturn]: 9.537, [Body.Uranus]: 19.19, [Body.Neptune]: 30.07, [Body.Pluto]: 39.48,
};

/** Distància mitjana al Sol (UA). Les llunes, la del seu planeta; el Sol, 0. */
export function meanSunDistanceAu(b: BodyInfo): number {
  if (b.id === 'sun') return 0;
  if (b.sky) return b.sky.ly * 63_241.077;
  if (b.parent) return meanSunDistanceAu(bodyById(b.parent)!);
  const small = SMALL_BODIES[b.id];
  if (small) return small.orbits[0].a;
  return (b.body !== undefined && PLANET_A[b.body]) || 0;
}

/** Durada de l'any (volta al Sol) en dies, si té sentit */
export function yearDays(b: BodyInfo): number | undefined {
  if (b.id === 'sun' || b.parent) return undefined;
  const small = SMALL_BODIES[b.id];
  if (small) return small.orbits[0].per;
  return b.body !== undefined ? orbitalPeriodDays(b.body) : undefined;
}

/** Diàmetre (km): el de JPL si n'hi ha, si no el del catàleg */
export function diameterKm(b: BodyInfo): number {
  return SMALL_BODIES[b.id]?.diameterKm ?? b.radiusKm * 2;
}

const n0 = (v: number) => v.toLocaleString('ca', { maximumFractionDigits: 0 });
const n1 = (v: number) => v.toLocaleString('ca', { maximumFractionDigits: 1 });

export function formatDiameter(km: number): string {
  if (km > 1e12) return formatLy(km / 9.4607e12);
  if (km > 1e7) return `${n1(km / 1e6)} milions de km`;
  return km < 2 ? `${n0(km * 1000)} m` : `${n0(km)} km`;
}

export interface Comparison {
  label: string;
  text: string;
}

/** Comparacions senzilles amb la Terra (no n'hi ha per a la mateixa Terra) */
export function compareWithEarth(b: BodyInfo): Comparison[] {
  if (b.id === 'earth') return [];
  if (b.sky) return compareFar(b);
  const out: Comparison[] = [];

  // Mida
  const d = diameterKm(b);
  const r = d / 12_742;
  let size: string;
  if (r >= 2) size = `${n1(r)} vegades més ample que la Terra: hi cabrien ${n0(r ** 3)} Terres`;
  else if (r >= 0.9) size = 'Gairebé com la Terra';
  else if (d >= 300) size = `La Terra és ${n1(1 / r)} vegades més ampla (${formatDiameter(d)} de diàmetre)`;
  else size = `Fa uns ${formatDiameter(d)} d’ample: ${d < 30 ? 'com una ciutat' : 'com una comarca'}`;
  out.push({ label: 'Mida', text: size });

  // Gravetat
  const g = GRAVITY[b.id];
  if (g) {
    const k = g / 9.81;
    const where = NO_SURFACE.has(b.id) ? ' (si hi haguessis on posar els peus)' : '';
    const text =
      k < 0.95 ? `Pesaries un ${n0((1 - k) * 100)} % menys${where}`
        : k > 1.05 ? `Pesaries ${n1(k)} vegades més${where}`
          : `Pesaries gairebé el mateix${where}`;
    out.push({ label: 'Gravetat', text });
  }

  // Any
  const y = yearDays(b);
  if (y) out.push({ label: 'Un any (volta al Sol)', text: `${formatPeriod(y)}${y > 730 ? ' terrestres' : ''}` });

  // Distància al Sol
  const a = meanSunDistanceAu(b);
  if (a > 0 && !b.parent) {
    const text = a > 1.15 ? `De mitjana, ${n1(a)} vegades més lluny del Sol que la Terra`
      : a < 0.87 ? `Més a prop del Sol: a ${n0(a * 100)} % de la distància de la Terra`
        : 'Gairebé a la mateixa distància del Sol que la Terra';
    out.push({ label: 'Distància al Sol', text });
  }
  return out;
}

/** Òrbites de referència (km) per imaginar la mida de les estrelles gegants */
const ORBITS_KM: [string, number][] = [
  ['Mercuri', 5.79e7], ['Venus', 1.082e8], ['la Terra', 1.496e8], ['Mart', 2.279e8], ['Júpiter', 7.785e8],
];
const KM_PER_LY = 9.4607e12;
/** Avió comercial: 900 km/h */
const PLANE_KM_PER_YEAR = 900 * 24 * 365.25;

/** «543.000 vegades», «158.000 milions de vegades», «3 bilions d’anys» */
export function bigCount(v: number, noun: string): string {
  const de = /^[aeiouàèéíòóú]/i.test(noun) ? 'd’' : 'de ';
  const r = (x: number) => x.toLocaleString('ca', { maximumFractionDigits: x < 10 ? 1 : 0 });
  if (v >= 1e12) return `${r(v / 1e12)} bili${v < 2e12 ? 'ó' : 'ons'} ${de}${noun}`;
  if (v >= 1e6) return `${r(v / 1e6)} milions ${de}${noun}`;
  return `${n0(v)} ${noun}`;
}

/** Comparacions per a estrelles i objectes de fora del sistema solar */
function compareFar(b: BodyInfo): Comparison[] {
  const sky = b.sky!;
  const out: Comparison[] = [];
  if (b.kind === 'estel') {
    const r = b.radiusKm / 695_700;
    const swallowed = ORBITS_KM.filter(([, km]) => km < b.radiusKm).map(([n]) => n);
    let text =
      r < 1.3 ? 'Semblant al Sol' : `${n1(r)} vegades més ampla que el Sol`;
    if (swallowed.length)
      text += `: al lloc del Sol, arribaria més enllà de l’òrbita de ${swallowed[swallowed.length - 1]}`;
    else if (r > 20) text += `: hi cabrien ${bigCount(r ** 3, 'Sols')}`;
    out.push({ label: 'Mida', text });
  } else {
    const ly = (b.radiusKm * 2) / KM_PER_LY;
    out.push({ label: 'Mida', text: `Uns ${formatLy(ly)} d’un extrem a l’altre: la llum triga ${formatYears(ly)} a travessar-${b.name.startsWith('Galàxia') || b.name.startsWith('Nebulosa') ? 'la' : 'lo'}` });
  }
  const sunTimes = (sky.ly * KM_PER_LY) / 1.496e8;
  out.push({ label: 'Distància', text: `${bigCount(sunTimes, 'vegades')} més lluny que el Sol` });
  out.push({
    label: 'En avió',
    text: `Volant sense parar a 900 km/h, hi arribaríem d’aquí a ${bigCount((sky.ly * KM_PER_LY) / PLANE_KM_PER_YEAR, 'anys')}`,
  });
  const m = sky.mag;
  const bright =
    m < 0 ? 'Molt brillant: de les que més brillen al cel'
      : m < 1.5 ? 'Brillant: es veu fins i tot des de ciutat'
        : m < 3 ? 'Es veu des de ciutat si el cel és ben net'
          : m < 4.5 ? 'Cal allunyar-se dels llums de ciutat'
            : 'Al límit de la vista: cal un cel molt fosc o prismàtics';
  out.push({ label: 'Brillantor', text: `${bright} (magnitud ${m.toLocaleString('ca', { maximumFractionDigits: 2 })})` });
  return out;
}
