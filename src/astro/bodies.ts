/**
 * Catàleg de cossos del sistema solar.
 * Les xifres són valors arrodonits de referència (NASA / Viquipèdia); el text complet i
 * actualitzat sempre es pot consultar a l'article enllaçat de la Viquipèdia.
 * Tots els títols d'article s'han comprovat contra l'API de la Viquipèdia (ca i en).
 */
import { Body } from 'astronomy-engine';
import { BEYOND, type FixedSky } from './beyond';

export type BodyKind = 'estrella' | 'planeta' | 'planeta nan' | 'satèl·lit' | 'asteroide' | 'cometa' | 'estel' | 'cel profund';

export const KIND_LABELS: Record<BodyKind, string> = {
  estrella: 'Estrella',
  planeta: 'Planetes',
  'planeta nan': 'Planetes nans',
  'satèl·lit': 'Llunes',
  asteroide: 'Asteroides',
  cometa: 'Cometes',
  estel: 'Estrelles',
  'cel profund': 'Galàxies i cúmuls',
};

export const KIND_SINGULAR: Record<BodyKind, string> = {
  estrella: 'Estrella',
  planeta: 'Planeta',
  'planeta nan': 'Planeta nan',
  'satèl·lit': 'Satèl·lit',
  asteroide: 'Asteroide',
  cometa: 'Cometa',
  estel: 'Estrella',
  'cel profund': 'Objecte del cel profund',
};

export interface Fact {
  label: string;
  value: string;
}

export interface BodyInfo {
  id: string;
  name: string;
  kind: BodyKind;
  /** Cos de l'astronomy-engine si en podem calcular la posició exacta */
  body?: Body;
  /** Id del cos al voltant del qual orbita (satèl·lits) */
  parent?: string;
  /** Altres noms per a la cerca (anglès, castellà, designacions) */
  aliases: string[];
  /** Radi mitjà (km) */
  radiusKm: number;
  color: string;
  wikiCa: string;
  wikiEn: string;
  /** Explicació breu i senzilla */
  intro: string;
  facts: Fact[];
  /** Objectes de fora del sistema solar: posició fixa al cel */
  sky?: FixedSky;
}

export type SceneBody = BodyInfo & { body: Body };

const f = (label: string, value: string): Fact => ({ label, value });

export const CATALOG: BodyInfo[] = [
  // ── Estrella ──────────────────────────────────────────────
  {
    id: 'sun', name: 'Sol', kind: 'estrella', body: Body.Sun, aliases: ['sun', 'sol', 'estrella'],
    radiusKm: 695_700, color: '#ffc94a', wikiCa: 'Sol', wikiEn: 'Sun',
    intro: 'L’estrella al centre del sistema solar. Conté el 99,8 % de tota la massa del sistema i la seva llum i calor fan possible la vida a la Terra.',
    facts: [f('Diàmetre', '1,39 milions de km (109 Terres)'), f('Temperatura de la superfície', '≈ 5.500 °C'), f('Edat', '≈ 4.600 milions d’anys'), f('Tipus', 'Nana groga (G2V)')],
  },
  // ── Planetes ──────────────────────────────────────────────
  {
    id: 'mercury', name: 'Mercuri', kind: 'planeta', body: Body.Mercury, aliases: ['mercury', 'mercurio'],
    radiusKm: 2_439.7, color: '#a8a29e', wikiCa: 'Mercuri (planeta)', wikiEn: 'Mercury (planet)',
    intro: 'El planeta més petit i el més proper al Sol. No té atmosfera que retingui la calor: de dia supera els 400 °C i de nit baixa per sota de −170 °C.',
    facts: [f('Diàmetre', '4.879 km'), f('Distància mitjana al Sol', '0,39 UA'), f('Any (volta al Sol)', '88 dies'), f('Dia (rotació)', '58,6 dies terrestres')],
  },
  {
    id: 'venus', name: 'Venus', kind: 'planeta', body: Body.Venus, aliases: ['venus', 'estel del pastor', 'lucero'],
    radiusKm: 6_051.8, color: '#e8c48a', wikiCa: 'Venus (planeta)', wikiEn: 'Venus',
    intro: 'De mida semblant a la Terra, però amb una atmosfera densíssima de diòxid de carboni que el converteix en el planeta més calent. És l’objecte més brillant del cel després del Sol i la Lluna.',
    facts: [f('Diàmetre', '12.104 km'), f('Distància mitjana al Sol', '0,72 UA'), f('Any', '225 dies'), f('Dia (rotació)', '243 dies, en sentit contrari')],
  },
  {
    id: 'earth', name: 'Terra', kind: 'planeta', body: Body.Earth, aliases: ['earth', 'tierra', 'mon', 'món'],
    radiusKm: 6_371, color: '#4f8dff', wikiCa: 'Terra', wikiEn: 'Earth',
    intro: 'El nostre planeta, l’únic on coneixem vida. És el planeta rocós més gran i té aigua líquida a la superfície.',
    facts: [f('Diàmetre', '12.742 km'), f('Distància mitjana al Sol', '1 UA (≈ 150 milions de km)'), f('Any', '365,26 dies'), f('Dia (rotació)', '23 h 56 min')],
  },
  {
    id: 'mars', name: 'Mart', kind: 'planeta', body: Body.Mars, aliases: ['mars', 'marte', 'planeta vermell'],
    radiusKm: 3_389.5, color: '#e0603a', wikiCa: 'Mart (planeta)', wikiEn: 'Mars',
    intro: 'El «planeta vermell», pel color de l’òxid de ferro del seu sòl. Té el volcà més alt conegut, l’Olympus Mons, i hi ha robots explorant-lo ara mateix.',
    facts: [f('Diàmetre', '6.779 km'), f('Distància mitjana al Sol', '1,52 UA'), f('Any', '687 dies'), f('Dia (rotació)', '24 h 37 min')],
  },
  {
    id: 'jupiter', name: 'Júpiter', kind: 'planeta', body: Body.Jupiter, aliases: ['jupiter', 'júpiter'],
    radiusKm: 69_911, color: '#d9a066', wikiCa: 'Júpiter (planeta)', wikiEn: 'Jupiter',
    intro: 'El planeta més gran: hi cabrien més de 1.300 Terres. És un gegant gasós i la seva Gran Taca Vermella és una tempesta més gran que la Terra.',
    facts: [f('Diàmetre', '139.820 km'), f('Distància mitjana al Sol', '5,20 UA'), f('Any', '11,9 anys'), f('Dia (rotació)', '9 h 56 min')],
  },
  {
    id: 'saturn', name: 'Saturn', kind: 'planeta', body: Body.Saturn, aliases: ['saturn', 'saturno', 'anells'],
    radiusKm: 58_232, color: '#e9d38f', wikiCa: 'Saturn (planeta)', wikiEn: 'Saturn',
    intro: 'Famós pels seus anells, fets de milers de milions de trossos de gel i roca. És tan poc dens que, en teoria, suraria en una banyera prou gran.',
    facts: [f('Diàmetre', '116.460 km'), f('Distància mitjana al Sol', '9,58 UA'), f('Any', '29,5 anys'), f('Dia (rotació)', '10 h 33 min')],
  },
  {
    id: 'uranus', name: 'Urà', kind: 'planeta', body: Body.Uranus, aliases: ['uranus', 'urano', 'ura'],
    radiusKm: 25_362, color: '#8fd9e0', wikiCa: 'Urà (planeta)', wikiEn: 'Uranus',
    intro: 'Un gegant de gel que gira «estirat»: el seu eix està inclinat gairebé 98°, de manera que roda al voltant del Sol com una pilota.',
    facts: [f('Diàmetre', '50.724 km'), f('Distància mitjana al Sol', '19,2 UA'), f('Any', '84 anys'), f('Dia (rotació)', '17 h 14 min, en sentit contrari')],
  },
  {
    id: 'neptune', name: 'Neptú', kind: 'planeta', body: Body.Neptune, aliases: ['neptune', 'neptuno', 'neptu'],
    radiusKm: 24_622, color: '#4f6fe0', wikiCa: 'Neptú (planeta)', wikiEn: 'Neptune',
    intro: 'El planeta més llunyà. Es va descobrir el 1846 gràcies als càlculs matemàtics abans de veure’l amb el telescopi. Té els vents més ràpids del sistema solar.',
    facts: [f('Diàmetre', '49.244 km'), f('Distància mitjana al Sol', '30,1 UA'), f('Any', '165 anys'), f('Dia (rotació)', '16 h 6 min')],
  },
  // ── Planetes nans ─────────────────────────────────────────
  {
    id: 'pluto', name: 'Plutó', kind: 'planeta nan', body: Body.Pluto, aliases: ['pluto', 'pluton', 'plutón'],
    radiusKm: 1_188.3, color: '#c9b8a4', wikiCa: 'Plutó (planeta nan)', wikiEn: 'Pluto',
    intro: 'Va ser considerat el novè planeta fins al 2006, quan es va reclassificar com a planeta nan. La sonda New Horizons hi va descobrir una gran plana de gel en forma de cor.',
    facts: [f('Diàmetre', '2.377 km'), f('Distància mitjana al Sol', '39,5 UA'), f('Any', '248 anys'), f('Dia (rotació)', '6,4 dies')],
  },
  {
    id: 'ceres', name: 'Ceres', kind: 'planeta nan', aliases: ['ceres', '1 ceres'],
    radiusKm: 470, color: '#9a948c', wikiCa: 'Ceres (planeta nan)', wikiEn: 'Ceres (dwarf planet)',
    intro: 'L’objecte més gran del cinturó d’asteroides, entre Mart i Júpiter, i l’únic planeta nan d’aquesta zona. La sonda Dawn hi va trobar taques brillants de sals.',
    facts: [f('Dia (rotació)', '9 h 4 min'), f('Explorat per', 'sonda Dawn (2015–2018)')],
  },
  {
    id: 'eris', name: 'Eris', kind: 'planeta nan', aliases: ['eris'],
    radiusKm: 1_163, color: '#e6e1da', wikiCa: 'Eris (planeta nan)', wikiEn: 'Eris (dwarf planet)',
    intro: 'Un planeta nan molt llunyà, gairebé tan gran com Plutó. El seu descobriment, el 2005, va obrir el debat que va acabar amb la reclassificació de Plutó.',
    facts: [f('Diàmetre', '≈ 2.330 km'), f('Descobert', '2005')],
  },
  {
    id: 'haumea', name: 'Haumea', kind: 'planeta nan', aliases: ['haumea'],
    radiusKm: 800, color: '#d8d4cc', wikiCa: 'Haumea', wikiEn: 'Haumea',
    intro: 'Un planeta nan amb forma allargada, com una pilota de rugbi, perquè gira molt de pressa: fa una volta sobre si mateix en menys de 4 hores. Té un anell.',
    facts: [f('Mida', '≈ 2.100 km en l’eix més llarg'), f('Dia (rotació)', '≈ 3,9 h')],
  },
  {
    id: 'makemake', name: 'Makemake', kind: 'planeta nan', aliases: ['makemake'],
    radiusKm: 715, color: '#d9b49a', wikiCa: 'Makemake (planeta nan)', wikiEn: 'Makemake',
    intro: 'Un dels planetes nans més grans del cinturó de Kuiper, la regió de cossos gelats més enllà de Neptú. La seva superfície és rogenca i coberta de gels.',
    facts: [f('Diàmetre', '≈ 1.430 km'), f('Descobert', '2005')],
  },
  // ── Satèl·lits ────────────────────────────────────────────
  {
    id: 'moon', name: 'Lluna', kind: 'satèl·lit', body: Body.Moon, parent: 'earth', aliases: ['moon', 'luna', 'lluna'],
    radiusKm: 1_737.4, color: '#d6d3d1', wikiCa: 'Lluna', wikiEn: 'Moon',
    intro: 'L’únic satèl·lit natural de la Terra i l’únic lloc fora del nostre planeta on han caminat éssers humans (1969–1972). La seva gravetat provoca les marees.',
    facts: [f('Diàmetre', '3.474 km'), f('Distància mitjana a la Terra', '384.400 km'), f('Volta a la Terra', '27,3 dies')],
  },
  moon('phobos', 'Fobos', 'mars', ['phobos'], 11.3, 'Fobos (satèl·lit)', 'Phobos (moon)',
    'La lluna més gran de Mart, petita i de forma irregular. S’acosta lentament a Mart i d’aquí a uns milions d’anys es trencarà o hi xocarà.',
    [f('Mida mitjana', '≈ 22 km'), f('Volta a Mart', '7 h 39 min')]),
  moon('deimos', 'Deimos', 'mars', ['deimos'], 6.2, 'Deimos (satèl·lit)', 'Deimos (moon)',
    'La lluna petita de Mart. Probablement és un asteroide capturat o un fragment d’un gran impacte.',
    [f('Mida mitjana', '≈ 12 km'), f('Volta a Mart', '30,3 h')]),
  moon('io', 'Io', 'jupiter', ['io'], 1_821.6, 'Io (satèl·lit)', 'Io (moon)',
    'El món amb més activitat volcànica del sistema solar: té centenars de volcans actius, escalfats per les marees de Júpiter.',
    [f('Diàmetre', '3.643 km'), f('Volta a Júpiter', '1,77 dies'), f('Descoberta', 'Galileu, 1610')]),
  moon('europa', 'Europa', 'jupiter', ['europa'], 1_560.8, 'Europa (satèl·lit)', 'Europa (moon)',
    'Sota la seva escorça de gel hi ha un oceà d’aigua salada. És un dels llocs on més es busca vida fora de la Terra.',
    [f('Diàmetre', '3.122 km'), f('Volta a Júpiter', '3,55 dies'), f('Descoberta', 'Galileu, 1610')]),
  moon('ganymede', 'Ganimedes', 'jupiter', ['ganymede', 'ganimedes', 'ganímedes'], 2_634.1, 'Ganimedes (satèl·lit)', 'Ganymede (moon)',
    'La lluna més gran del sistema solar, més gran fins i tot que Mercuri. És l’única lluna coneguda amb camp magnètic propi.',
    [f('Diàmetre', '5.268 km'), f('Volta a Júpiter', '7,15 dies'), f('Descoberta', 'Galileu, 1610')]),
  moon('callisto', 'Cal·listo', 'jupiter', ['callisto', 'calisto', 'cal·listo'], 2_410.3, 'Cal·listo (satèl·lit)', 'Callisto (moon)',
    'Una de les superfícies més plenes de cràters del sistema solar: gairebé no ha canviat en milers de milions d’anys.',
    [f('Diàmetre', '4.821 km'), f('Volta a Júpiter', '16,7 dies'), f('Descoberta', 'Galileu, 1610')]),
  moon('titan', 'Tità', 'saturn', ['titan', 'titán', 'tita'], 2_574.7, 'Tità (satèl·lit)', 'Titan (moon)',
    'La lluna més gran de Saturn, amb una atmosfera més densa que la de la Terra i llacs i rius de metà líquid.',
    [f('Diàmetre', '5.150 km'), f('Volta a Saturn', '15,9 dies')]),
  moon('enceladus', 'Encèlad', 'saturn', ['enceladus', 'encelado', 'encelad'], 252.1, 'Encèlad (satèl·lit)', 'Enceladus',
    'Una lluna petita i blanquíssima que expulsa guèisers de vapor d’aigua des d’un oceà ocult sota el gel.',
    [f('Diàmetre', '≈ 504 km'), f('Volta a Saturn', '1,37 dies')]),
  moon('mimas', 'Mimas', 'saturn', ['mimas'], 198.2, 'Mimas (satèl·lit)', 'Mimas',
    'Té un cràter enorme, Herschel, que ocupa un terç del seu diàmetre.',
    [f('Diàmetre', '≈ 396 km'), f('Volta a Saturn', '0,94 dies')]),
  moon('rhea', 'Rea', 'saturn', ['rhea', 'rea'], 763.8, 'Rea (satèl·lit)', 'Rhea (moon)',
    'La segona lluna més gran de Saturn, feta sobretot de gel d’aigua.',
    [f('Diàmetre', '1.527 km'), f('Volta a Saturn', '4,5 dies')]),
  moon('iapetus', 'Jàpet', 'saturn', ['iapetus', 'japeto', 'japet'], 734.5, 'Jàpet (satèl·lit)', 'Iapetus (moon)',
    'Té dues cares de colors molt diferents, una de fosca i una de brillant, i una gran serralada al voltant de l’equador.',
    [f('Diàmetre', '1.469 km'), f('Volta a Saturn', '79 dies')]),
  moon('titania', 'Titània', 'uranus', ['titania'], 788.4, 'Titània (satèl·lit)', 'Titania (moon)',
    'La lluna més gran d’Urà, amb grans canyons a la superfície.',
    [f('Diàmetre', '1.577 km'), f('Volta a Urà', '8,7 dies')]),
  moon('oberon', 'Oberó', 'uranus', ['oberon', 'oberón', 'obero'], 761.4, 'Oberó (satèl·lit)', 'Oberon (moon)',
    'La lluna més exterior de les grans llunes d’Urà, plena de cràters.',
    [f('Diàmetre', '1.523 km'), f('Volta a Urà', '13,5 dies')]),
  moon('miranda', 'Miranda', 'uranus', ['miranda'], 235.8, 'Miranda (satèl·lit)', 'Miranda (moon)',
    'Té un dels paisatges més estranys del sistema solar, amb penya-segats d’uns 20 km d’alçada.',
    [f('Diàmetre', '≈ 472 km'), f('Volta a Urà', '1,4 dies')]),
  moon('triton', 'Tritó', 'neptune', ['triton', 'tritón', 'trito'], 1_353.4, 'Tritó (satèl·lit)', 'Triton (moon)',
    'La gran lluna de Neptú gira en sentit contrari al planeta: probablement és un objecte del cinturó de Kuiper capturat. Té guèisers de nitrogen.',
    [f('Diàmetre', '2.707 km'), f('Volta a Neptú', '5,9 dies, en sentit contrari')]),
  moon('charon', 'Caront', 'pluto', ['charon', 'caronte', 'caront'], 606, 'Caront (satèl·lit)', 'Charon (moon)',
    'La lluna de Plutó és tan gran en comparació amb el planeta que tots dos giren al voltant d’un punt situat entre ells.',
    [f('Diàmetre', '1.212 km'), f('Volta a Plutó', '6,4 dies')]),
  // ── Asteroides ────────────────────────────────────────────
  // Les dades orbitals i el diàmetre d'asteroides i cometes vénen de NASA/JPL (src/data/small-bodies.json)
  {
    id: 'vesta', name: 'Vesta', kind: 'asteroide', aliases: ['vesta', '4 vesta'],
    radiusKm: 261, color: '#b8ada0', wikiCa: '(4) Vesta', wikiEn: '4 Vesta',
    intro: 'El segon objecte més gran del cinturó d’asteroides i el més brillant vist des de la Terra. Alguns meteorits que cauen a la Terra en provenen.',
    facts: [f('Explorat per', 'sonda Dawn (2011–2012)')],
  },
  {
    id: 'pallas', name: 'Pal·les', kind: 'asteroide', aliases: ['pallas', 'palas', 'pal·les', '2 pallas'],
    radiusKm: 256, color: '#a39d94', wikiCa: '(2) Pal·les', wikiEn: '2 Pallas',
    intro: 'Un dels asteroides més grans, amb una òrbita força inclinada respecte a la dels planetes.',
    facts: [f('Descobert', '1802')],
  },
  {
    id: 'hygiea', name: 'Higiea', kind: 'asteroide', aliases: ['hygiea', 'higia', 'higiea', '10 hygiea'],
    radiusKm: 204, color: '#8f897f', wikiCa: '(10) Higiea', wikiEn: '10 Hygiea',
    intro: 'El quart objecte més gran del cinturó d’asteroides. És gairebé esfèric, i per això alguns astrònoms proposen considerar-lo un planeta nan.',
    facts: [f('Descobert', '1849')],
  },
  {
    id: 'psyche', name: 'Psique', kind: 'asteroide', aliases: ['psyche', 'psique', '16 psyche'],
    radiusKm: 111, color: '#b5a58a', wikiCa: '(16) Psique', wikiEn: '16 Psyche',
    intro: 'Un asteroide que podria ser ric en metalls, potser el nucli d’un antic protoplaneta. La sonda Psyche de la NASA, llançada el 2023, hi ha d’arribar el 2029.',
    facts: [f('Missió', 'Psyche (NASA)')],
  },
  {
    id: 'eros', name: 'Eros', kind: 'asteroide', aliases: ['eros', '433 eros'],
    radiusKm: 8.4, color: '#a08a6e', wikiCa: '(433) Eros', wikiEn: '433 Eros',
    intro: 'Un dels primers asteroides propers a la Terra que es van descobrir (1898). La sonda NEAR Shoemaker s’hi va posar el 2001: la primera a aterrar en un asteroide.',
    facts: [f('Descobert', '1898')],
  },
  {
    id: 'didymos', name: 'Dídim', kind: 'asteroide', aliases: ['didymos', 'didim', 'dimorphos', 'dimorfos', 'dart', '65803'],
    radiusKm: 0.39, color: '#7d766c', wikiCa: '(65803) Dídim', wikiEn: '65803 Didymos',
    intro: 'Un asteroide doble. El 2022 la sonda DART de la NASA va xocar contra la seva petita lluna, Dimorfos, i en va canviar l’òrbita: la primera prova real de defensa planetària.',
    facts: [f('Lluna', 'Dimorfos'), f('Impacte DART', '26 de setembre de 2022')],
  },
  {
    id: 'bennu', name: 'Bennu', kind: 'asteroide', aliases: ['bennu', '101955', 'osiris-rex'],
    radiusKm: 0.245, color: '#6f6a64', wikiCa: '(101955) Bennu', wikiEn: '101955 Bennu',
    intro: 'Un petit asteroide proper a la Terra. La sonda OSIRIS-REx en va recollir mostres que van arribar a la Terra el 2023.',
    facts: [f('Mostres a la Terra', '24 de setembre de 2023')],
  },
  {
    id: 'apophis', name: 'Apophis', kind: 'asteroide', aliases: ['apophis', 'apofis', '99942'],
    radiusKm: 0.17, color: '#857d72', wikiCa: '(99942) Apophis', wikiEn: '99942 Apophis',
    intro: 'Un asteroide que el 13 d’abril de 2029 passarà molt a prop de la Terra, més a prop que alguns satèl·lits artificials, i es podrà veure a ull nu. No hi ha risc d’impacte. La gravetat de la Terra li canviarà l’òrbita.',
    facts: [f('Pas proper', '13 d’abril de 2029, a ≈ 32.000 km de la superfície')],
  },
  // ── Cometes ───────────────────────────────────────────────
  {
    id: 'halley', name: 'Cometa Halley', kind: 'cometa', aliases: ['halley', '1p', '1p/halley'],
    radiusKm: 5.5, color: '#bfe3ff', wikiCa: 'Cometa de Halley', wikiEn: "Halley's Comet",
    intro: 'El cometa més famós: torna a prop del Sol aproximadament cada 76 anys i es pot veure a ull nu. Origina les pluges d’estels Eta Aquàrides i Oriònides.',
    facts: [f('Nucli', '≈ 15 × 8 km'), f('Darrer pas', '1986')],
  },
  {
    id: 'encke', name: 'Cometa Encke', kind: 'cometa', aliases: ['encke', '2p', '2p/encke', 'taurides'],
    radiusKm: 2.4, color: '#a9d6f5', wikiCa: 'Cometa Encke', wikiEn: 'Comet Encke',
    intro: 'El cometa periòdic conegut que torna més sovint: cada 3,3 anys. És l’origen de la pluja d’estels de les Tàurides.',
    facts: [f('Pluja d’estels', 'Tàurides (octubre–novembre)')],
  },
  {
    id: '67p', name: '67P/Txuriúmov-Herassimenko', kind: 'cometa', aliases: ['67p', 'churyumov', 'gerasimenko', 'rosetta', 'philae', 'txuriumov'],
    radiusKm: 1.7, color: '#a7c7e7', wikiCa: '67P/Txuriúmov-Herassimenko', wikiEn: '67P/Churyumov–Gerasimenko',
    intro: 'El primer cometa on es va posar un mòdul d’aterratge (Philae, de la missió europea Rosetta, el 2014). Té forma d’ànec de goma.',
    facts: [f('Missió', 'Rosetta (ESA, 2014–2016)')],
  },
  {
    id: 'swift-tuttle', name: 'Cometa Swift-Tuttle', kind: 'cometa', aliases: ['swift', 'tuttle', '109p', 'perseides', 'llagrimes de sant llorenc'],
    radiusKm: 13, color: '#c4e4ff', wikiCa: 'Cometa Swift-Tuttle', wikiEn: 'Comet Swift–Tuttle',
    intro: 'El cometa que origina les Perseides, les «llàgrimes de Sant Llorenç» que veiem cada agost: són les restes que deixa a la seva òrbita i que la Terra travessa.',
    facts: [f('Pluja d’estels', 'Perseides (agost)')],
  },
  {
    id: 'tempel-tuttle', name: 'Cometa Tempel-Tuttle', kind: 'cometa', aliases: ['tempel', 'tuttle', '55p', 'leonides'],
    radiusKm: 1.8, color: '#b3dcf5', wikiCa: 'Cometa Tempel-Tuttle', wikiEn: '55P/Tempel–Tuttle',
    intro: 'El cometa que origina les Leònides, la pluja d’estels de cada novembre, que alguns anys esdevé una autèntica tempesta de meteors.',
    facts: [f('Pluja d’estels', 'Leònides (novembre)')],
  },
  {
    id: 'hale-bopp', name: 'Cometa Hale-Bopp', kind: 'cometa', aliases: ['hale', 'bopp', 'hale-bopp', 'c/1995 o1'],
    radiusKm: 30, color: '#d5ecff', wikiCa: 'Cometa Hale-Bopp', wikiEn: 'Comet Hale–Bopp',
    intro: 'Un dels cometes més brillants del segle XX: el 1997 es va poder veure a ull nu durant uns 18 mesos. Ara s’allunya cap als confins del sistema solar i no tornarà fins d’aquí a més de 2.000 anys.',
    facts: [f('Visible a ull nu', '1996–1997')],
  },
];

function moon(
  id: string, name: string, parent: string, aliases: string[], radiusKm: number,
  wikiCa: string, wikiEn: string, intro: string, facts: Fact[],
): BodyInfo {
  return { id, name, kind: 'satèl·lit', parent, aliases, radiusKm, color: '#c8c4bd', wikiCa, wikiEn, intro, facts };
}

CATALOG.push(...BEYOND);

const byId = new Map(CATALOG.map((b) => [b.id, b]));
export const bodyById = (id: string): BodyInfo | undefined => byId.get(id);

/** Cossos que es dibuixen a l'escena 3D (tenen posició calculada per astronomy-engine) */
export const BODIES: SceneBody[] = CATALOG.filter((b): b is SceneBody => b.body !== undefined);

/** Cossos que orbiten directament el Sol i tenen òrbita calculable */
export const HELIO_ORBITERS = BODIES.filter((b) => b.kind === 'planeta' || b.kind === 'planeta nan');

export const wikipediaUrl = (b: BodyInfo, lang: 'ca' | 'en' = 'ca'): string => {
  const title = lang === 'ca' ? b.wikiCa : b.wikiEn;
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
};

/**
 * Nom amb article, per a frases: «el Sol», «la Lluna», «el cometa Halley», «Mart» (els planetes no en porten).
 */
export function withArticle(b: BodyInfo): string {
  if (b.id === 'sun') return 'el Sol';
  if (b.id === 'moon') return 'la Lluna';
  if (b.id === 'earth') return 'la Terra';
  if (b.kind === 'cometa') return b.name.startsWith('Cometa ') ? `el c${b.name.slice(1)}` : `el cometa ${b.name}`;
  return b.name;
}

/** «a» + nom amb les contraccions del català: «al Sol», «a la Lluna», «a Mart». */
export function toBody(b: BodyInfo): string {
  const n = withArticle(b);
  return n.startsWith('el ') ? `al ${n.slice(3)}` : `a ${n}`;
}

/** Com withArticle però amb la primera lletra en majúscula (inici de frase). */
export const WithArticle = (b: BodyInfo): string => {
  const n = withArticle(b);
  return n.charAt(0).toUpperCase() + n.slice(1);
};
