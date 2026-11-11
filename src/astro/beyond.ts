/**
 * Més enllà del sistema solar: estrelles brillants i objectes del cel profund que es poden veure
 * sense telescopi. Coordenades J2000 (ascensió recta en hores, declinació en graus), magnitud visual
 * i distància en anys llum: valors de referència arrodonits (SIMBAD / Viquipèdia).
 * Aquests objectes no es mouen al cel: només gira la Terra.
 */
import type { BodyInfo, Fact } from './bodies';
import { formatLy } from './format';

/** Com es pot veure: a ull nu (fins i tot des de ciutat), a ull nu però només amb cel fosc, o amb prismàtics */
export type SkyEye = 'ull nu' | 'cel fosc' | 'prismàtics';

export interface FixedSky {
  /** Ascensió recta J2000 (hores) */
  ra: number;
  /** Declinació J2000 (graus) */
  dec: number;
  /** Magnitud visual (com més petita, més brillant) */
  mag: number;
  /** Distància (anys llum) */
  ly: number;
  /** «del Ca Major», «d'Orió»: constel·lació amb la preposició */
  constellation: string;
  /** Tipus, per a la fitxa: «Estrella», «Galàxia espiral»… */
  type: string;
  tagline: string;
  /** Com trobar-lo, en una frase */
  hint: string;
  eye: SkyEye;
  /** Per als molt llunyans: què passava a la Terra quan en va sortir la llum */
  past?: string;
}

const KM_PER_LY = 9.4607e12;
const SUN_R = 695_700;

const f = (label: string, value: string): Fact => ({ label, value });

/** Dades comunes a tots: distància, constel·lació i magnitud */
const baseFacts = (s: { ly: number; constellation: string; mag: number }): Fact[] => [
  f('Distància', formatLy(s.ly)),
  f('Constel·lació', s.constellation.replace(/^del /, '').replace(/^de la /, '').replace(/^de l’/, '').replace(/^d’/, '').replace(/^dels /, '')),
  f('Magnitud', s.mag.toLocaleString('ca', { maximumFractionDigits: 2 })),
];

function star(
  id: string, name: string, aliases: string[], sky: Omit<FixedSky, 'type' | 'eye'> & { eye?: SkyEye },
  radiusSun: number, color: string, wikiCa: string, wikiEn: string, intro: string, facts: Fact[] = [],
): BodyInfo {
  return {
    id, name, kind: 'estel', aliases, radiusKm: radiusSun * SUN_R, color, wikiCa, wikiEn, intro,
    facts: [...baseFacts(sky), ...facts],
    sky: { eye: 'ull nu', type: 'Estrella', ...sky },
  };
}

function deep(
  id: string, name: string, aliases: string[], sky: FixedSky, diameterLy: number, color: string,
  wikiCa: string, wikiEn: string, intro: string, facts: Fact[] = [],
): BodyInfo {
  return {
    id, name, kind: 'cel profund', aliases, radiusKm: (diameterLy / 2) * KM_PER_LY, color, wikiCa, wikiEn, intro,
    facts: [...baseFacts(sky), ...facts], sky,
  };
}

export const BEYOND: BodyInfo[] = [
  // ── Estrelles ──
  star('alpha-cen', 'Alfa Centauri', ['Alpha Centauri', 'Rigil Kentaurus', 'Rigel Kentaurus', 'Toliman', 'Pròxima Centauri'], {
    ra: 14.6601, dec: -60.835, mag: -0.27, ly: 4.37, constellation: 'del Centaure',
    tagline: 'L’estrella més propera que es veu a ull nu',
    hint: 'Només es veu des de l’hemisferi sud: és el «punter» brillant al costat de la Creu del Sud.',
  }, 1.22, '#fff1c9', 'Alfa Centauri', 'Alpha Centauri',
  'En realitat són tres estrelles: dues de semblants al Sol que giren l’una al voltant de l’altra i una nana vermella petita, Pròxima Centauri, que és l’estrella més propera de totes. Té almenys un planeta de mida semblant a la Terra.',
  [f('Estrelles', '3 (sistema triple)'), f('Planetes coneguts', 'Almenys 1, al voltant de Pròxima')]),

  star('sirius', 'Sírius', ['Sirius', 'Alfa del Ca Major', 'Alpha Canis Majoris', 'Estrella del Gos'], {
    ra: 6.7525, dec: -16.716, mag: -1.46, ly: 8.6, constellation: 'del Ca Major',
    tagline: 'L’estrella més brillant del cel nocturn',
    hint: 'Segueix les tres estrelles del cinturó d’Orió cap avall i a l’esquerra: el primer punt molt brillant és Sírius.',
  }, 1.71, '#d6e4ff', 'Sírius', 'Sirius',
  'Brilla tant perquè és força a prop i fa unes 25 vegades més llum que el Sol. Té una companya minúscula, Sírius B: una nana blanca, el nucli mort d’una estrella, de la mida de la Terra però amb tanta massa com el Sol.',
  [f('Llum', '25 vegades la del Sol'), f('Companya', 'Sírius B, una nana blanca')]),

  star('canopus', 'Canopus', ['Canopo', 'Alfa de la Quilla', 'Alpha Carinae'], {
    ra: 6.3992, dec: -52.696, mag: -0.74, ly: 310, constellation: 'de la Quilla',
    tagline: 'La segona estrella més brillant, invisible des de Catalunya',
    hint: 'Molt al sud: des de Catalunya no arriba a sortir. Des de les Canàries es veu baixa cap al sud a l’hivern.',
  }, 71, '#fff8e4', 'Canopus', 'Canopus',
  'És una estrella gegant que fa més de 10.000 vegades la llum del Sol. Les naus espacials la fan servir per orientar-se, perquè és molt brillant i és lluny del Sol al cel.',
  [f('Llum', 'Més de 10.000 vegades la del Sol')]),

  star('arcturus', 'Arcturus', ['Arctur', 'Arturus', 'Alfa del Bover', 'Alpha Bootis'], {
    ra: 14.2612, dec: 19.1825, mag: -0.05, ly: 36.7, constellation: 'del Bover',
    tagline: 'Una gegant taronja, la més brillant de l’hemisferi nord',
    hint: 'Segueix la corba del mànec del Carro (l’Óssa Major) i continua-la: arribaràs a Arcturus, d’un color taronja clar.',
  }, 25.4, '#ffc685', 'Arcturus', 'Arcturus',
  'És una estrella vella que ja ha gastat l’hidrogen del nucli i s’ha inflat fins a fer 25 vegades l’amplada del Sol. El Sol farà el mateix d’aquí a uns 5.000 milions d’anys.'),

  star('vega', 'Vega', ['Alfa de la Lira', 'Alpha Lyrae'], {
    ra: 18.6156, dec: 38.7837, mag: 0.03, ly: 25, constellation: 'de la Lira',
    tagline: 'L’estrella blava de les nits d’estiu',
    hint: 'A l’estiu, gairebé a sobre del cap a mitjanit. Forma el «triangle d’estiu» amb Dèneb i Altair.',
  }, 2.36, '#dfe9ff', 'Vega', 'Vega',
  'Fa uns 14.000 anys era l’estrella polar, i ho tornarà a ser d’aquí a uns 12.000: l’eix de la Terra va girant lentament com una baldufa. Gira tan de pressa sobre si mateixa que està aixafada pels pols.'),

  star('capella', 'Capella', ['Cabra', 'Alfa del Cotxer', 'Alpha Aurigae'], {
    ra: 5.2782, dec: 45.998, mag: 0.08, ly: 42.9, constellation: 'del Cotxer',
    tagline: 'La gran estrella groga de les nits d’hivern',
    hint: 'A l’hivern, molt alta cap al nord-est a primera hora de la nit. De les estrelles més brillants, és la més propera al pol nord del cel.',
  }, 11.98, '#fff3c2', 'Capella (estrella)', 'Capella',
  'Sembla una sola estrella, però són dues gegants grogues que giren l’una al voltant de l’altra cada 104 dies, acompanyades de dues nanes vermelles més lluny.',
  [f('Estrelles', '4 (dues parelles)')]),

  star('rigel', 'Rigel', ['Beta d’Orió', 'Beta Orionis'], {
    ra: 5.2423, dec: -8.2017, mag: 0.13, ly: 860, constellation: 'd’Orió',
    tagline: 'El peu blau d’Orió, una supergegant',
    hint: 'A Orió (a l’hivern), la brillant blanca-blavosa de sota a la dreta del cinturó. Betelgeuse és a l’altra banda.',
  }, 78.9, '#cad9ff', 'Rigel', 'Rigel',
  'Fa unes 120.000 vegades la llum del Sol. Si fos tan a prop com Sírius, faria ombres a la nit. Acabarà explotant com a supernova.'),

  star('procyon', 'Proció', ['Procyon', 'Alfa del Ca Menor', 'Alpha Canis Minoris'], {
    ra: 7.655, dec: 5.225, mag: 0.34, ly: 11.5, constellation: 'del Ca Menor',
    tagline: 'Una veïna propera, a l’est d’Orió',
    hint: 'A l’hivern: forma un gran triangle equilàter amb Betelgeuse i Sírius (el «triangle d’hivern»).',
  }, 2.05, '#fff7e3', 'Proció', 'Procyon',
  'És una de les estrelles més properes. Com Sírius, té una companya nana blanca. El seu nom vol dir «abans del gos» perquè surt just abans que Sírius.'),

  star('betelgeuse', 'Betelgeuse', ['Betelgeuze', 'Alfa d’Orió', 'Alpha Orionis'], {
    ra: 5.9195, dec: 7.407, mag: 0.5, ly: 550, constellation: 'd’Orió',
    tagline: 'Una supergegant vermella que explotarà',
    hint: 'A Orió (a l’hivern), l’estrella ataronjada de dalt a l’esquerra del cinturó.',
  }, 764, '#ff9b5c', 'Betelgeuse', 'Betelgeuse',
  'És una de les estrelles més grans que es coneixen: si fos al lloc del Sol, s’empassaria Mercuri, Venus, la Terra i Mart. Està a les acaballes de la seva vida i esclatarà com a supernova, potser d’aquí a 100.000 anys. El 2019 es va enfosquir de cop: havia expulsat un núvol de pols.',
  [f('Brillantor', 'Variable: canvia al llarg dels mesos')]),

  star('altair', 'Altair', ['Alfa de l’Àguila', 'Alpha Aquilae'], {
    ra: 19.8464, dec: 8.8683, mag: 0.76, ly: 16.7, constellation: 'de l’Àguila',
    tagline: 'Una estrella que gira a tota velocitat',
    hint: 'A l’estiu i la tardor, cap al sud: és la punta inferior del «triangle d’estiu», amb Vega i Dèneb.',
  }, 1.8, '#f2f5ff', 'Altair', 'Altair',
  'Fa una volta sobre si mateixa en només 9 hores (el Sol en triga uns 25 dies). Gira tan de pressa que és molt més ampla per l’equador que pels pols.'),

  star('aldebaran', 'Aldebaran', ['Alfa del Taure', 'Alpha Tauri', 'Ull del Toro'], {
    ra: 4.5987, dec: 16.509, mag: 0.86, ly: 65, constellation: 'del Taure',
    tagline: 'L’ull taronja del Taure',
    hint: 'Segueix el cinturó d’Orió cap amunt i a la dreta: la primera estrella taronja brillant és Aldebaran. Més enllà hi ha les Plèiades.',
  }, 44, '#ffae6a', 'Aldebaran', 'Aldebaran',
  'Sembla que formi part del cúmul de les Híades, en forma de V, però és molt més a prop: només és a la mateixa línia de visió. La sonda Pioneer 10 hi va en direcció i hi arribaria d’aquí a uns 2 milions d’anys.'),

  star('antares', 'Antares', ['Alfa de l’Escorpí', 'Alpha Scorpii', 'Cor de l’Escorpí'], {
    ra: 16.4901, dec: -26.432, mag: 1.0, ly: 550, constellation: 'de l’Escorpí',
    tagline: 'El cor vermell de l’Escorpí',
    hint: 'A l’estiu, baixa cap al sud: una estrella vermellosa al mig de l’Escorpí. Sovint es confon amb Mart.',
  }, 680, '#ff7a52', 'Antares (estrella)', 'Antares',
  'El seu nom vol dir «rival de Mart» pel color vermell. És una supergegant: al lloc del Sol arribaria més enllà de l’òrbita de Mart.'),

  star('spica', 'Espiga', ['Spica', 'Alfa de la Verge', 'Alpha Virginis'], {
    ra: 13.4199, dec: -11.161, mag: 0.97, ly: 250, constellation: 'de la Verge',
    tagline: 'Una parella d’estrelles blaves molt calentes',
    hint: 'A la primavera: segueix el mànec del Carro fins a Arcturus i continua la corba («arc fins a Arcturus, punta fins a l’Espiga»).',
  }, 7.47, '#cfdcff', 'Spica', 'Spica',
  'Són dues estrelles tan juntes que es deformen l’una a l’altra amb la gravetat i fan una volta cada 4 dies.'),

  star('pollux', 'Pòl·lux', ['Pollux', 'Beta dels Bessons', 'Beta Geminorum'], {
    ra: 7.7553, dec: 28.026, mag: 1.14, ly: 33.8, constellation: 'dels Bessons',
    tagline: 'El bessó taronja, amb un planeta',
    hint: 'A l’hivern i la primavera, a dalt a l’esquerra d’Orió: dues estrelles juntes, Càstor i Pòl·lux. Pòl·lux és la més brillant i taronja.',
  }, 9.06, '#ffd18f', 'Pòl·lux (estrella)', 'Pollux (star)',
  'És la gegant més propera al Sol. Té un planeta més gran que Júpiter que hi fa una volta cada 590 dies.'),

  star('deneb', 'Dèneb', ['Deneb', 'Alfa del Cigne', 'Alpha Cygni'], {
    ra: 20.6905, dec: 45.28, mag: 1.25, ly: 2600, constellation: 'del Cigne',
    tagline: 'Una de les estrelles més lluminoses que es veuen',
    hint: 'A l’estiu i la tardor, molt amunt: la cua del Cigne i un vèrtex del «triangle d’estiu» amb Vega i Altair.',
  }, 200, '#e9efff', 'Deneb', 'Deneb',
  'És molt més lluny que les altres estrelles brillants però es veu igual de bé: fa unes 200.000 vegades la llum del Sol. La seva distància encara no se sap amb gaire precisió.'),

  star('polaris', 'Estrella Polar', ['Polaris', 'Polar', 'Alfa de l’Óssa Menor', 'Alpha Ursae Minoris'], {
    ra: 2.5303, dec: 89.264, mag: 1.98, ly: 430, constellation: 'de l’Óssa Menor',
    tagline: 'L’estrella que marca el nord',
    hint: 'Allarga cinc vegades la distància entre les dues estrelles del final del Carro (l’Óssa Major): arribaràs a la Polar. No és gaire brillant!',
  }, 37.5, '#fff4d8', 'Estrella Polar', 'Polaris',
  'No és de les més brillants, però és especial: és just a sobre del pol nord de la Terra, i per això no es mou mentre totes les altres giren al seu voltant. La seva altura sobre l’horitzó és igual a la teva latitud.'),

  // ── Galàxies, cúmuls i nebuloses ──
  deep('m31', 'Galàxia d’Andròmeda', ['Andromeda', 'Andròmeda', 'M31', 'Messier 31', 'NGC 224'], {
    ra: 0.7123, dec: 41.269, mag: 3.4, ly: 2.5e6, constellation: 'd’Andròmeda', type: 'Galàxia espiral', eye: 'cel fosc',
    tagline: 'L’objecte més llunyà que es veu a ull nu',
    hint: 'A la tardor, molt amunt. Des del gran quadrat de Pegàs, segueix la filera d’estrelles d’Andròmeda: hi veuràs una taca allargada i borrosa.',
    past: 'quan a l’Àfrica tot just apareixien els primers humans',
  }, 152_000, '#c9c2ff', 'Galàxia d\'Andròmeda', 'Andromeda Galaxy',
  'És una galàxia com la nostra, amb un bilió d’estrelles, i la més gran del nostre veïnat. S’acosta a la Via Làctia a 110 km per segon: d’aquí a uns 4.500 milions d’anys les dues galàxies xocaran i es fusionaran.',
  [f('Estrelles', 'Un bilió (un milió de milions)'), f('Velocitat', 'S’acosta a 110 km/s')]),

  deep('m33', 'Galàxia del Triangle', ['Triangulum', 'M33', 'Messier 33', 'NGC 598'], {
    ra: 1.5641, dec: 30.66, mag: 5.7, ly: 2.73e6, constellation: 'del Triangle', type: 'Galàxia espiral', eye: 'prismàtics',
    tagline: 'La tercera galàxia del nostre grup, al límit de la vista',
    hint: 'A la tardor, al costat d’Andròmeda, a l’altra banda de l’estrella Mirach. Amb prismàtics i un cel molt fosc.',
    past: 'quan a l’Àfrica tot just apareixien els primers humans',
  }, 61_000, '#b9c6ff', 'Galàxia del Triangle', 'Triangulum Galaxy',
  'És la tercera galàxia més gran del Grup Local, després d’Andròmeda i la Via Làctia. Té molts núvols de gas on neixen estrelles noves. Amb un cel perfecte, algunes persones la veuen a ull nu: seria l’objecte més llunyà visible sense ajuda.'),

  deep('m45', 'Plèiades', ['Pleiades', 'Pléyades', 'Set Germanes', 'Cabretes', 'M45', 'Messier 45'], {
    ra: 3.79, dec: 24.117, mag: 1.6, ly: 444, constellation: 'del Taure', type: 'Cúmul obert', eye: 'ull nu',
    tagline: 'Un grapat d’estrelles joves, molt fàcil de veure',
    hint: 'A la tardor i l’hivern: un grupet compacte d’estrelles com un carro petit, a la dreta d’Aldebaran. Es veu fins i tot des de ciutat.',
  }, 30, '#bcd3ff', 'Plèiades (astronomia)', 'Pleiades',
  'Són un miler d’estrelles que van néixer juntes fa només uns 100 milions d’anys (el Sol en té 4.600). A ull nu se’n veuen sis o set; amb prismàtics, desenes.',
  [f('Estrelles', 'Un miler'), f('Edat', 'Uns 100 milions d’anys')]),

  deep('m42', 'Nebulosa d’Orió', ['Orion Nebula', 'M42', 'Messier 42', 'NGC 1976'], {
    ra: 5.5881, dec: -5.391, mag: 4.0, ly: 1344, constellation: 'd’Orió', type: 'Nebulosa', eye: 'cel fosc',
    tagline: 'Un bressol d’estrelles que es veu a ull nu',
    hint: 'A l’hivern: sota el cinturó d’Orió penja l’«espasa», tres estrelles en fila. La del mig no és una estrella: és la nebulosa, una taca borrosa.',
  }, 24, '#ff9fc4', 'Nebulosa d\'Orió', 'Orion Nebula',
  'És un núvol immens de gas i pols on ara mateix estan naixent estrelles i planetes. És la zona de formació d’estrelles més propera a la Terra.'),

  deep('m44', 'Cúmul del Pessebre', ['Beehive', 'Praesepe', 'Pessebre', 'Rusc', 'M44', 'Messier 44'], {
    ra: 8.6733, dec: 19.667, mag: 3.7, ly: 577, constellation: 'del Cranc', type: 'Cúmul obert', eye: 'cel fosc',
    tagline: 'Un núvol d’estrelles que sembla una boirina',
    hint: 'A l’hivern i la primavera, entre Pòl·lux i Règulus. A ull nu, una taqueta borrosa; amb prismàtics, un eixam d’estrelles.',
  }, 23, '#dcd6c8', 'Cúmul del pessebre', 'Beehive Cluster',
  'Galileu va ser el primer a veure que aquella boirina eren estrelles, amb el seu telescopi. Té uns 1.000 estels i uns 600 milions d’anys.'),

  deep('double-cluster', 'Doble cúmul de Perseu', ['Double Cluster', 'h i χ Persei', 'NGC 869', 'NGC 884'], {
    ra: 2.3333, dec: 57.133, mag: 3.7, ly: 7500, constellation: 'de Perseu', type: 'Dos cúmuls oberts', eye: 'prismàtics',
    tagline: 'Dos eixams d’estrelles l’un al costat de l’altre',
    hint: 'A la tardor i l’hivern, entre Cassiopea (la «W») i Perseu. Amb prismàtics és espectacular.',
    past: 'quan a Europa s’hi començaven a construir els primers pobles d’agricultors',
  }, 70, '#d2dcff', 'Cúmul doble de Perseu', 'Double Cluster',
  'Són dos cúmuls d’estrelles joves molt a prop l’un de l’altre, amb centenars d’estrelles cadascun.'),

  deep('m13', 'Gran cúmul d’Hèrcules', ['Hercules Cluster', 'M13', 'Messier 13', 'NGC 6205'], {
    ra: 16.6948, dec: 36.46, mag: 5.8, ly: 22_200, constellation: 'd’Hèrcules', type: 'Cúmul globular', eye: 'prismàtics',
    tagline: 'Una bola de centenars de milers d’estrelles velles',
    hint: 'A l’estiu, molt amunt: dins del «trapezi» d’Hèrcules, entre Vega i Arcturus. Amb prismàtics, una boleta borrosa.',
    past: 'en plena era glacial, quan els humans pintaven les coves',
  }, 145, '#ffe9c4', 'Messier 13', 'Messier 13',
  'Conté uns 300.000 estels apinyats en una bola. Són de les estrelles més velles de la galàxia, de més de 11.000 milions d’anys. El 1974 s’hi va enviar un missatge de ràdio: arribarà d’aquí a uns 25.000 anys.'),

  deep('omega-cen', 'Omega Centauri', ['ω Centauri', 'NGC 5139'], {
    ra: 13.4464, dec: -47.479, mag: 3.9, ly: 17_000, constellation: 'del Centaure', type: 'Cúmul globular', eye: 'cel fosc',
    tagline: 'El cúmul d’estrelles més gran de la Via Làctia',
    hint: 'Molt al sud: des de Catalunya frega l’horitzó i és gairebé impossible. Des de les Canàries es veu baix cap al sud a la primavera.',
    past: 'en plena era glacial, quan els humans pintaven les coves',
  }, 150, '#ffe7c2', 'Omega Centauri', 'Omega Centauri',
  'Té uns 10 milions d’estrelles. Potser és el nucli d’una petita galàxia que la Via Làctia es va empassar fa molt de temps.'),

  deep('lmc', 'Gran Núvol de Magalhães', ['Large Magellanic Cloud', 'LMC', 'Gran Nube de Magallanes'], {
    ra: 5.3931, dec: -69.756, mag: 0.9, ly: 160_000, constellation: 'de la Dorada', type: 'Galàxia satèl·lit', eye: 'ull nu',
    tagline: 'Una galàxia petita que gira al voltant de la nostra',
    hint: 'Només des de l’hemisferi sud: sembla un tros de Via Làctia separat, ben visible a ull nu.',
    past: 'quan els primers humans moderns vivien a l’Àfrica',
  }, 32_000, '#d9d4f5', 'Gran Núvol de Magalhães', 'Large Magellanic Cloud',
  'És una galàxia satèl·lit de la Via Làctia. El 1987 s’hi va veure explotar una supernova a ull nu, la més propera dels últims segles.'),

  deep('smc', 'Petit Núvol de Magalhães', ['Small Magellanic Cloud', 'SMC', 'Pequeña Nube de Magallanes'], {
    ra: 0.8791, dec: -72.829, mag: 2.7, ly: 200_000, constellation: 'del Tucà', type: 'Galàxia satèl·lit', eye: 'ull nu',
    tagline: 'La germana petita del Gran Núvol',
    hint: 'Només des de l’hemisferi sud: una taca de llum al costat del Gran Núvol.',
    past: 'quan els primers humans moderns vivien a l’Àfrica',
  }, 19_000, '#d4d0ee', 'Petit Núvol de Magalhães', 'Small Magellanic Cloud',
  'Una galàxia nana amb uns quants centenars de milions d’estrelles, que la gravetat de la Via Làctia va deformant.'),
];
