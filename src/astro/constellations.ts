/**
 * Constel·lacions principals que es veuen des de Catalunya: figura, quan es veuen, com trobar-les
 * i què hi ha d'interessant. Les figures (estrelles i línies) són a figures.ts.
 */
import type { BodyInfo, Fact } from './bodies';
import { FIGURES, type Figure } from './figures';

/** Millor època per veure-la a primera hora de la nit */
export type Season = 'hivern' | 'primavera' | 'estiu' | 'tardor' | 'tot l’any';

export interface Constel {
  /** Abreviatura oficial (UAI) */
  abbr: string;
  /** «del Ca Major», «d’Orió»: el nom amb la preposició, com a FixedSky.constellation */
  of: string;
  /** Centre de la figura: ascensió recta J2000 (hores) i declinació (graus) */
  ra: number;
  dec: number;
  /** Magnitud de l'estrella més brillant */
  brightest: number;
  season: Season;
  tagline: string;
  /** Com trobar-la, en dues o tres frases */
  hint: string;
  /** Coses que val la pena saber o buscar-hi */
  highlights: string[];
  /** Estrelles i objectes del catàleg que hi són */
  objects: string[];
  figure: Figure;
}

export const SEASON_TEXT: Record<Season, string> = {
  hivern: 'A l’hivern',
  primavera: 'A la primavera',
  estiu: 'A l’estiu',
  tardor: 'A la tardor',
  'tot l’any': 'Tot l’any',
};

/** Centre d'un grup d'estrelles: mitjana de les direccions (vectors unitaris) */
function centerOf(fig: Figure): { ra: number; dec: number } {
  let x = 0, y = 0, z = 0;
  const D = Math.PI / 180;
  for (const s of fig.stars) {
    const ra = s.ra * 15 * D, dec = s.dec * D;
    x += Math.cos(dec) * Math.cos(ra);
    y += Math.cos(dec) * Math.sin(ra);
    z += Math.sin(dec);
  }
  const ra = ((Math.atan2(y, x) / D + 360) % 360) / 15;
  return { ra, dec: Math.atan2(z, Math.hypot(x, y)) / D };
}

interface Def {
  id: string;
  name: string;
  of: string;
  abbr: string;
  aliases: string[];
  wikiCa: string;
  wikiEn: string;
  season: Season;
  tagline: string;
  hint: string;
  intro: string;
  highlights: string[];
  objects?: string[];
}

const f = (label: string, value: string): Fact => ({ label, value });
const mag = (m: number) => m.toLocaleString('ca', { maximumFractionDigits: 1 });

function constel(d: Def): BodyInfo {
  const figure = FIGURES[d.abbr];
  const { ra, dec } = centerOf(figure);
  const brightest = Math.min(...figure.stars.map((s) => s.mag));
  return {
    id: `cst-${d.id}`,
    name: d.name,
    kind: 'constel·lació',
    aliases: [...d.aliases, `constel·lació ${d.of}`],
    radiusKm: 0,
    color: '#9fb4e8',
    wikiCa: d.wikiCa,
    wikiEn: d.wikiEn,
    intro: d.intro,
    facts: [
      f('Millor època', d.season === 'tot l’any' ? 'Tot l’any (des de Catalunya no es pon mai)' : SEASON_TEXT[d.season].replace(/^A (l’|la )/, '').replace(/^./, (c) => c.toUpperCase())),
      f('Estrelles de la figura', String(figure.stars.length)),
      f('Estrella més brillant', `Magnitud ${mag(brightest)}`),
      f('Abreviatura', d.abbr),
    ],
    constel: {
      abbr: d.abbr, of: d.of, ra, dec, brightest, season: d.season, tagline: d.tagline, hint: d.hint,
      highlights: d.highlights, objects: d.objects ?? [], figure,
    },
  };
}

export const CONSTELLATIONS: BodyInfo[] = [
  // ── Tot l'any: no es ponen mai des de Catalunya ──
  constel({
    id: 'uma', name: 'Óssa Major', of: 'de l’Óssa Major', abbr: 'UMa', season: 'tot l’any',
    aliases: ['Ursa Major', 'Osa Mayor', 'Ossa Major', 'Big Dipper', 'Carro', 'Gran Carro'],
    wikiCa: 'Constel·lació de l\'Ossa Major', wikiEn: 'Ursa Major',
    tagline: 'La del Carro: la constel·lació més fàcil de trobar',
    hint: 'Mira cap al nord i busca set estrelles brillants que formen un carro o una cassola: quatre fan la caixa i tres el mànec. A la primavera és molt amunt; a la tardor, baixa a prop de l’horitzó nord.',
    intro: 'Per als grecs era Cal·listo, una nimfa que Zeus va convertir en óssa per amagar-la de la gelosia d’Hera, i que després va pujar al cel. El Carro només n’és una part: l’esquena i la cua. Des de Catalunya no es pon mai: hi és totes les nits de l’any, donant voltes al voltant de l’estrella Polar.',
    highlights: [
      'El Carro: set estrelles que formen una cassola amb mànec, la figura més coneguda del cel del nord.',
      'Les dues estrelles del costat de la caixa (Dubhe i Merak) apunten cap a l’estrella Polar: allarga uns cinc cops la distància que les separa.',
      'Seguint la corba del mànec arribaràs a Arcturus, l’estrella brillant del Bover.',
      'Mizar, al mig del mànec, té una companya feble al costat, Alcor: veure-les separades era una prova de bona vista.',
    ],
  }),
  constel({
    id: 'umi', name: 'Óssa Menor', of: 'de l’Óssa Menor', abbr: 'UMi', season: 'tot l’any',
    aliases: ['Ursa Minor', 'Osa Menor', 'Ossa Menor', 'Carro Petit', 'Little Dipper'],
    wikiCa: 'Constel·lació de l\'Ossa Menor', wikiEn: 'Ursa Minor',
    tagline: 'La de l’estrella Polar, que marca el nord',
    hint: 'Primer troba el Carro de l’Óssa Major i segueix les dues estrelles del costat de la caixa: arribaràs a la Polar, l’última estrella del mànec del Carro Petit. La resta d’estrelles són febles: cal un cel fosc.',
    intro: 'És el fill de Cal·listo, Arcas, que Zeus també va pujar al cel convertit en un ós petit. Durant segles els navegants s’hi han orientat: la Polar és sempre al mateix lloc, a una altura sobre l’horitzó igual a la latitud on ets (a Catalunya, uns 41°).',
    highlights: [
      'L’estrella Polar és gairebé exactament sobre el pol nord del cel: tot el cel sembla girar al seu voltant i sempre indica el nord.',
      'Té la forma d’un carro petit, com el de l’Óssa Major però més feble i girat a l’inrevés.',
    ],
    objects: ['polaris'],
  }),
  constel({
    id: 'cas', name: 'Cassiopea', of: 'de Cassiopea', abbr: 'Cas', season: 'tot l’any',
    aliases: ['Cassiopeia', 'Casiopea', 'W'],
    wikiCa: 'Constel·lació de Cassiopea', wikiEn: 'Cassiopeia (constellation)',
    tagline: 'La «W» del cel del nord',
    hint: 'Just a l’altra banda de la Polar respecte del Carro: cinc estrelles que formen una W (o una M, segons l’hora). A la tardor és molt amunt, gairebé sobre el cap.',
    intro: 'Cassiopea era una reina d’Etiòpia que presumia de ser més bella que les nimfes del mar. Com a càstig, Posidó la va lligar a un tron al cel, on de vegades queda cap per avall. Al seu costat hi ha tota la família: el seu marit Cefeu, la seva filla Andròmeda i Perseu, que la va salvar.',
    highlights: [
      'Les cinc estrelles principals són igual de brillants i formen una W molt clara, fàcil de trobar fins i tot des de ciutat.',
      'Hi passa la Via Làctia: amb prismàtics s’hi veuen molts grups d’estrelles.',
      'La W fa de contrapès al Carro: quan l’un és alt, l’altre és baix.',
    ],
  }),
  constel({
    id: 'cep', name: 'Cefeu', of: 'de Cefeu', abbr: 'Cep', season: 'tot l’any',
    aliases: ['Cepheus', 'Cefeo'],
    wikiCa: 'Constel·lació de Cefeu', wikiEn: 'Cepheus (constellation)',
    tagline: 'Una caseta d’estrelles febles al costat de Cassiopea',
    hint: 'Entre Cassiopea i la Polar: cinc estrelles que dibuixen una casa com les que dibuixen els nens, amb la teulada apuntant cap a la Polar. Són febles: cal un cel fosc.',
    intro: 'Cefeu era el rei d’Etiòpia, marit de Cassiopea i pare d’Andròmeda. És una constel·lació poc vistosa, però des de Catalunya no es pon mai.',
    highlights: [
      'Delta Cephei canvia de brillantor cada cinc dies i mig. Les estrelles com ella, les cefeides, van servir per mesurar per primer cop la distància a altres galàxies.',
      'Mu Cephei, l’«estrella granat», és d’un color vermell intens i una de les estrelles més grans que es coneixen.',
    ],
  }),
  constel({
    id: 'dra', name: 'Dragó', of: 'del Dragó', abbr: 'Dra', season: 'tot l’any',
    aliases: ['Draco', 'Dragón', 'Drac'],
    wikiCa: 'Constel·lació del Dragó', wikiEn: 'Draco (constellation)',
    tagline: 'Un drac llarg que s’enrosca entre les dues óssas',
    hint: 'El cap són quatre estrelles en forma de trapezi, a prop de Vega. El cos fa una corba llarga entre l’Óssa Major i l’Óssa Menor. A l’estiu el cap és molt amunt.',
    intro: 'Era el drac Ladó, que guardava les pomes d’or del jardí de les Hespèrides i que Hèrcules va vèncer. Al cel, l’heroi encara té un peu sobre el seu cap.',
    highlights: [
      'El cap, quatre estrelles en un trapezi, és la part més fàcil de veure.',
      'Fa uns 4.700 anys, quan es construïen les piràmides d’Egipte, l’estrella polar era Thuban, del Dragó: l’eix de la Terra va canviant de direcció molt a poc a poc.',
    ],
  }),

  // ── Hivern ──
  constel({
    id: 'ori', name: 'Orió', of: 'd’Orió', abbr: 'Ori', season: 'hivern',
    aliases: ['Orion', 'Orión', 'Cinturó d’Orió', 'Tres Maries', 'Tres Reis'],
    wikiCa: 'Orió (constel·lació)', wikiEn: 'Orion (constellation)',
    tagline: 'El caçador: la constel·lació més espectacular de l’hivern',
    hint: 'A l’hivern, cap al sud: tres estrelles brillants en línia (el cinturó) al mig d’un gran rectangle amb dues estrelles molt brillants, la vermellosa Betelgeuse a dalt i la blanca Rigel a baix.',
    intro: 'Orió era un caçador gegant de la mitologia grega. Segons una de les històries, va morir per la picada d’un escorpí, i per això els déus els van posar a extrems oposats del cel: quan l’Escorpió surt per l’est, Orió es pon per l’oest.',
    highlights: [
      'El cinturó: tres estrelles alineades i igual de brillants, molt fàcils de reconèixer. També se’n diu les Tres Maries o els Tres Reis.',
      'Betelgeuse és vermellosa i Rigel blavosa: la diferència de color es nota a ull nu.',
      'Sota el cinturó penja l’espasa, on hi ha la Nebulosa d’Orió.',
      'El cinturó fa de fletxa: cap avall porta a Sírius, i cap amunt, a Aldebaran i les Plèiades.',
    ],
    objects: ['betelgeuse', 'rigel', 'm42'],
  }),
  constel({
    id: 'tau', name: 'Taure', of: 'del Taure', abbr: 'Tau', season: 'hivern',
    aliases: ['Taurus', 'Tauro', 'Híades', 'Hyades'],
    wikiCa: 'Constel·lació del Taure', wikiEn: 'Taurus (constellation)',
    tagline: 'El brau, amb l’ull vermell d’Aldebaran',
    hint: 'Segueix el cinturó d’Orió cap amunt i a la dreta: arribaràs a Aldebaran, una estrella taronja al costat d’una «V» d’estrelles, les Híades. Una mica més enllà hi ha les Plèiades.',
    intro: 'És el brau blanc en què es va transformar Zeus per endur-se la princesa Europa. És una de les constel·lacions més antigues: fa més de 5.000 anys ja s’hi veia un brau.',
    highlights: [
      'Aldebaran és l’ull del brau, una estrella gegant taronja.',
      'La «V» del cap del brau són les Híades, el cúmul d’estrelles més proper a la Terra (Aldebaran no en forma part: és més a prop).',
      'Les Plèiades, un grupet d’estrelles molt compacte, són a l’espatlla del brau.',
    ],
    objects: ['aldebaran', 'm45'],
  }),
  constel({
    id: 'gem', name: 'Bessons', of: 'dels Bessons', abbr: 'Gem', season: 'hivern',
    aliases: ['Gemini', 'Géminis', 'Càstor', 'Castor'],
    wikiCa: 'Constel·lació dels Bessons', wikiEn: 'Gemini (constellation)',
    tagline: 'Dos germans inseparables: Càstor i Pòl·lux',
    hint: 'A l’hivern, a l’esquerra i per sobre d’Orió: dues estrelles brillants l’una al costat de l’altra, Càstor i Pòl·lux, que són els caps dels bessons. Els cossos baixen cap a Orió en dues files d’estrelles.',
    intro: 'Càstor i Pòl·lux eren germans bessons de la mitologia grega. Quan Càstor va morir, Pòl·lux va demanar a Zeus de compartir-hi la seva immortalitat, i els va posar junts al cel. Eren els protectors dels mariners.',
    highlights: [
      'Pòl·lux (la més brillant, ataronjada) i Càstor (blanca) són els caps dels dos germans.',
      'Càstor, vista amb telescopi, és en realitat un sistema de sis estrelles.',
      'Cada desembre hi ha la pluja d’estels de les Gemínides, una de les millors de l’any.',
    ],
    objects: ['pollux'],
  }),
  constel({
    id: 'cma', name: 'Ca Major', of: 'del Ca Major', abbr: 'CMa', season: 'hivern',
    aliases: ['Canis Major', 'Can Mayor', 'Gos Major'],
    wikiCa: 'Constel·lació del Ca Major', wikiEn: 'Canis Major',
    tagline: 'El gos d’Orió, amb Sírius, l’estrella més brillant',
    hint: 'Segueix el cinturó d’Orió cap avall i a l’esquerra fins a Sírius, l’estrella més brillant del cel. La resta del gos queda per sota, baixa sobre l’horitzó sud.',
    intro: 'És el més gran dels dos gossos que acompanyen Orió a caçar. Els antics egipcis esperaven veure sortir Sírius just abans de l’alba, perquè anunciava la crescuda del Nil.',
    highlights: [
      'Sírius, al morro del gos, és l’estrella més brillant de tot el cel nocturn.',
      'Des de Catalunya és baixa: les potes i la cua gairebé freguen l’horitzó sud.',
    ],
    objects: ['sirius'],
  }),
  constel({
    id: 'cmi', name: 'Ca Menor', of: 'del Ca Menor', abbr: 'CMi', season: 'hivern',
    aliases: ['Canis Minor', 'Can Menor', 'Gos Menor', 'Triangle d’hivern'],
    wikiCa: 'Constel·lació del Ca Menor', wikiEn: 'Canis Minor',
    tagline: 'El gos petit: només dues estrelles',
    hint: 'A l’esquerra de Betelgeuse, més o menys a la mateixa altura: Proció és una estrella molt brillant. Al seu costat n’hi ha una altra de més feble, i això és tota la constel·lació.',
    intro: 'És l’altre gos d’Orió, el petit. És de les constel·lacions més senzilles: només dues estrelles fàcils de veure.',
    highlights: [
      'Proció, Betelgeuse i Sírius formen el Triangle d’hivern: tres estrelles molt brillants, fàcils de reconèixer.',
    ],
    objects: ['procyon'],
  }),
  constel({
    id: 'aur', name: 'Cotxer', of: 'del Cotxer', abbr: 'Aur', season: 'hivern',
    aliases: ['Auriga', 'Cochero', 'Cabretes'],
    wikiCa: 'Constel·lació del Cotxer', wikiEn: 'Auriga',
    tagline: 'Un pentàgon d’estrelles amb la brillant Capella',
    hint: 'A l’hivern, molt amunt, gairebé sobre el cap: Capella és una estrella groguenca molt brillant, a la cantonada d’un gran pentàgon d’estrelles. L’estrella de baix del pentàgon la comparteix amb el Taure.',
    intro: 'Representa un cotxer, el conductor d’un carro, que porta una cabra a l’espatlla (Capella vol dir «cabreta») i les seves cries al braç.',
    highlights: [
      'Capella és la sisena estrella més brillant del cel; de fet, són quatre estrelles.',
      'Al costat de Capella hi ha un triangle petit d’estrelles febles: les Cabretes.',
    ],
    objects: ['capella'],
  }),

  // ── Primavera ──
  constel({
    id: 'leo', name: 'Lleó', of: 'del Lleó', abbr: 'Leo', season: 'primavera',
    aliases: ['Leo', 'León', 'Règulus', 'Regulus', 'Falç'],
    wikiCa: 'Constel·lació del Lleó', wikiEn: 'Leo (constellation)',
    tagline: 'Un lleó ajagut, amb Règulus al cor',
    hint: 'A la primavera, cap al sud i ben amunt. Busca una falç o un interrogant girat: és el cap i el pit del lleó, amb Règulus a la base. A l’esquerra, un triangle fa la part del darrere, amb Denebola a la cua.',
    intro: 'És el lleó de Nemea, una fera amb una pell que cap arma podia travessar, que Hèrcules va vèncer amb les mans en el primer dels seus dotze treballs. És una de les poques constel·lacions que s’assemblen de debò al que representen.',
    highlights: [
      'La Falç, sis estrelles en forma d’interrogant girat, és el cap del lleó.',
      'Règulus, «el petit rei», és el cor del lleó.',
      'Cada novembre hi ha la pluja d’estels de les Leònides.',
    ],
  }),
  constel({
    id: 'boo', name: 'Bover', of: 'del Bover', abbr: 'Boo', season: 'primavera',
    aliases: ['Boötes', 'Bootes', 'Boyero'],
    wikiCa: 'Constel·lació del Bover', wikiEn: 'Boötes',
    tagline: 'Un estel de cometa amb Arcturus a la punta',
    hint: 'Segueix la corba del mànec del Carro, allunyant-te’n: la primera estrella molt brillant i taronja que trobaràs és Arcturus. A sobre s’hi dibuixa una forma allargada, com un estel de cometa o un con de gelat.',
    intro: 'És un pastor de bous que sembla que empenyi l’Óssa Major per tot el cel. Arcturus, el nom de la seva estrella principal, vol dir «guardià de l’óssa» en grec.',
    highlights: [
      'Arcturus és l’estrella més brillant de la meitat nord del cel.',
      'Truc per trobar-la: «segueix l’arc del Carro fins a Arcturus».',
    ],
    objects: ['arcturus'],
  }),
  constel({
    id: 'vir', name: 'Verge', of: 'de la Verge', abbr: 'Vir', season: 'primavera',
    aliases: ['Virgo', 'Virgen'],
    wikiCa: 'Constel·lació de la Verge', wikiEn: 'Virgo (constellation)',
    tagline: 'La constel·lació més gran del zodíac, amb Espiga',
    hint: 'Segueix l’arc del mànec del Carro fins a Arcturus i continua en la mateixa direcció: la següent estrella brillant, de color blanc blavós, és Espiga. La resta de la constel·lació és feble.',
    intro: 'Se sol representar com una noia que porta una espiga de blat, relacionada amb Demèter, la deessa de les collites. El Sol hi passa al setembre i a l’octubre.',
    highlights: [
      'Espiga és una estrella blanc blavosa i molt calenta; en realitat són dues estrelles molt juntes.',
      'En aquesta zona del cel hi ha el cúmul de galàxies de la Verge, amb més d’un miler de galàxies (només visibles amb telescopi).',
    ],
    objects: ['spica'],
  }),

  // ── Estiu ──
  constel({
    id: 'cyg', name: 'Cigne', of: 'del Cigne', abbr: 'Cyg', season: 'estiu',
    aliases: ['Cygnus', 'Cisne', 'Creu del Nord', 'Triangle d’estiu'],
    wikiCa: 'Constel·lació del Cigne', wikiEn: 'Cygnus (constellation)',
    tagline: 'Un cigne que vola al llarg de la Via Làctia',
    hint: 'A l’estiu, molt amunt, gairebé sobre el cap: busca una gran creu d’estrelles. Dèneb, la cua del cigne, és l’estrella de dalt de la creu i un dels vèrtexs del Triangle d’estiu.',
    intro: 'Zeus es va transformar en cigne per acostar-se a Leda, la reina d’Esparta. Al cel, el cigne vola amb les ales esteses al llarg de la Via Làctia, que des d’un lloc fosc es veu passar just per aquí.',
    highlights: [
      'També se’n diu la Creu del Nord, per la forma que fan les estrelles principals.',
      'Dèneb és una supergegant molt llunyana: si fos tan a prop com Sírius, faria ombra.',
      'Albireo, el cap del cigne, amb un telescopi petit són dues estrelles: una de taronja i una de blava.',
    ],
    objects: ['deneb'],
  }),
  constel({
    id: 'lyr', name: 'Lira', of: 'de la Lira', abbr: 'Lyr', season: 'estiu',
    aliases: ['Lyra'],
    wikiCa: 'Constel·lació de la Lira', wikiEn: 'Lyra',
    tagline: 'Petita, però amb Vega, una de les estrelles més brillants',
    hint: 'A l’estiu, molt amunt: Vega és una estrella blanc blavosa molt brillant. Al seu costat hi ha un petit paral·lelogram d’estrelles febles: la lira.',
    intro: 'És la lira d’Orfeu, el músic llegendari que encantava animals i pedres i que va baixar a l’infern per recuperar la seva estimada Eurídice.',
    highlights: [
      'Vega és la cinquena estrella més brillant del cel i un dels vèrtexs del Triangle d’estiu.',
      'D’aquí a uns 12.000 anys, Vega serà l’estrella polar.',
      'A l’abril hi ha la pluja d’estels de les Lírides.',
    ],
    objects: ['vega'],
  }),
  constel({
    id: 'aql', name: 'Àguila', of: 'de l’Àguila', abbr: 'Aql', season: 'estiu',
    aliases: ['Aquila', 'Águila'],
    wikiCa: 'Constel·lació de l\'Àguila', wikiEn: 'Aquila (constellation)',
    tagline: 'L’àguila de Zeus, amb Altair',
    hint: 'A l’estiu, cap al sud: Altair és una estrella brillant amb una estrella més feble a cada costat, en línia. És la punta de baix del Triangle d’estiu, amb Vega i Dèneb.',
    intro: 'Era l’àguila que portava els llamps de Zeus. A la Xina i al Japó, Altair és un pastor separat de la seva estimada, Vega, pel riu del cel, la Via Làctia: només es poden trobar una nit l’any.',
    highlights: [
      'Altair gira molt de pressa: fa una volta sobre si mateixa en unes 9 hores i està aixafada pels pols.',
      'El Triangle d’estiu (Vega, Dèneb i Altair) és la guia per moure’s pel cel d’estiu.',
    ],
    objects: ['altair'],
  }),
  constel({
    id: 'sco', name: 'Escorpió', of: 'de l’Escorpió', abbr: 'Sco', season: 'estiu',
    aliases: ['Scorpius', 'Escorpio', 'Escorpí'],
    wikiCa: 'Constel·lació de l\'Escorpió', wikiEn: 'Scorpius',
    tagline: 'Un escorpí amb el cor vermell d’Antares',
    hint: 'A l’estiu, baix cap al sud: Antares és una estrella vermellosa i brillant. Al seu voltant, una línia d’estrelles fa les pinces a la dreta i una cua llarga que es corba cap a l’horitzó.',
    intro: 'És l’escorpí que va matar el caçador Orió. Per evitar més baralles, els déus els van posar a extrems oposats del cel: mai no es veuen tots dos alhora.',
    highlights: [
      'Antares és una supergegant vermella; el seu nom vol dir «rival de Mart», pel color.',
      'Des de Catalunya la cua queda molt baixa: cal un horitzó sud ben net per veure l’escorpí sencer.',
    ],
    objects: ['antares'],
  }),
  constel({
    id: 'sgr', name: 'Sagitari', of: 'del Sagitari', abbr: 'Sgr', season: 'estiu',
    aliases: ['Sagittarius', 'Sagitario', 'Tetera'],
    wikiCa: 'Constel·lació del Sagitari', wikiEn: 'Sagittarius (constellation)',
    tagline: 'L’arquer que apunta al centre de la galàxia',
    hint: 'A l’estiu, baix cap al sud, a l’esquerra de l’Escorpió: les estrelles principals formen una tetera, amb el broc a la dreta. Des d’un lloc fosc, la Via Làctia en surt com si fos el vapor.',
    intro: 'Representa un centaure, mig home i mig cavall, amb un arc que apunta cap a l’Escorpió. Des de Catalunya és baix, però amb un cel fosc és una de les zones més boniques del cel.',
    highlights: [
      'La Tetera: vuit estrelles que formen una tetera, molt més fàcil de veure que l’arquer.',
      'En aquesta direcció, a uns 26.000 anys llum, hi ha el centre de la Via Làctia: és la part més brillant de la Via Làctia, plena de nebuloses i cúmuls.',
    ],
  }),
  constel({
    id: 'her', name: 'Hèrcules', of: 'd’Hèrcules', abbr: 'Her', season: 'estiu',
    aliases: ['Hercules', 'Hércules', 'Trapezi'],
    wikiCa: 'Constel·lació d\'Hèrcules', wikiEn: 'Hercules (constellation)',
    tagline: 'L’heroi dels dotze treballs, amb un gran cúmul d’estrelles',
    hint: 'A l’estiu, molt amunt, entre Vega i Arcturus. Busca un trapezi de quatre estrelles no gaire brillants: és el cos de l’heroi. Cal un cel força fosc.',
    intro: 'Hèrcules, l’heroi més fort de la mitologia grega, va haver de fer dotze treballs impossibles. Al cel apareix agenollat i cap per avall, amb un peu sobre el cap del Dragó.',
    highlights: [
      'El Trapezi és la part més fàcil de trobar.',
      'En un costat del trapezi hi ha el Gran cúmul d’Hèrcules, una bola de 300.000 estrelles que amb prismàtics es veu com una taqueta.',
    ],
    objects: ['m13'],
  }),

  // ── Tardor ──
  constel({
    id: 'peg', name: 'Pegàs', of: 'de Pegàs', abbr: 'Peg', season: 'tardor',
    aliases: ['Pegasus', 'Pegaso', 'Gran Quadrat'],
    wikiCa: 'Constel·lació del Pegàs', wikiEn: 'Pegasus (constellation)',
    tagline: 'El cavall alat i el Gran Quadrat de la tardor',
    hint: 'A la tardor, cap al sud i ben amunt: quatre estrelles formen un quadrat molt gran i buit. És el cos del cavall; l’estrella de dalt a l’esquerra en realitat és d’Andròmeda.',
    intro: 'Pegàs és el cavall amb ales que va néixer quan Perseu va tallar el cap de la Medusa. Al cel només se’n veu la meitat de davant, i cap per avall.',
    highlights: [
      'El Gran Quadrat de Pegàs és la guia del cel de tardor.',
      'El 1995 s’hi va descobrir el primer planeta al voltant d’una estrella com el Sol, 51 Pegasi b, un descobriment que va merèixer el premi Nobel.',
    ],
  }),
  constel({
    id: 'and', name: 'Andròmeda', of: 'd’Andròmeda', abbr: 'And', season: 'tardor',
    aliases: ['Andromeda', 'Andrómeda'],
    wikiCa: 'Constel·lació d\'Andròmeda', wikiEn: 'Andromeda (constellation)',
    tagline: 'La princesa encadenada, amb la galàxia veïna',
    hint: 'A la tardor: surt de la cantonada de dalt a l’esquerra del Gran Quadrat de Pegàs i fa dues línies d’estrelles cap a l’esquerra, cap a Perseu.',
    intro: 'Andròmeda era la filla de Cefeu i Cassiopea. Per culpa de la vanitat de la seva mare, la van encadenar a una roca perquè se la mengés un monstre marí, però Perseu la va salvar.',
    highlights: [
      'La Galàxia d’Andròmeda, a 2,5 milions d’anys llum, es veu a ull nu des d’un lloc fosc com una taca allargada.',
      'Alpheratz, l’estrella que comparteix amb Pegàs, és el cap de la princesa.',
    ],
    objects: ['m31'],
  }),
  constel({
    id: 'per', name: 'Perseu', of: 'de Perseu', abbr: 'Per', season: 'tardor',
    aliases: ['Perseus', 'Perseo', 'Algol', 'Perseides'],
    wikiCa: 'Constel·lació de Perseu', wikiEn: 'Perseus (constellation)',
    tagline: 'L’heroi que va salvar Andròmeda',
    hint: 'A la tardor i l’hivern, molt amunt: entre Cassiopea i les Plèiades hi ha una corba d’estrelles amb Mirfak, la més brillant. A prop hi ha Algol, que canvia de brillantor.',
    intro: 'Perseu va tallar el cap de la Medusa, que convertia en pedra qui la mirava, i amb ell va salvar Andròmeda del monstre marí. Algol representa l’ull de la Medusa.',
    highlights: [
      'Algol, «l’estrella del dimoni», perd dos terços de la llum durant unes hores cada 2 dies i 21 hores: són dues estrelles que s’eclipsen l’una a l’altra.',
      'D’aquí sembla que surtin les Perseides, la pluja d’estels d’agost (les «llàgrimes de Sant Llorenç»).',
      'Entre Perseu i Cassiopea hi ha el Doble cúmul, preciós amb prismàtics.',
    ],
    objects: ['double-cluster'],
  }),
];

const byOf = new Map(CONSTELLATIONS.map((c) => [c.constel!.of, c]));

/** Fitxa de la constel·lació a partir de «del Ca Major», si la tenim */
export const constellationByOf = (of: string): BodyInfo | undefined => byOf.get(of);
