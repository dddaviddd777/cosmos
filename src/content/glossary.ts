/** Glossari: paraules que es poden tocar a tota l'app per veure'n una explicació curta. */
export interface GlossaryEntry {
  id: string;
  term: string;
  text: string;
  /** Secció d'«Entendre» on s'explica amb més calma */
  more?: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: 'ua', term: 'Unitat astronòmica (UA)', more: 'ua',
    text: 'La distància mitjana entre la Terra i el Sol: uns 150 milions de km. Serveix per no haver d’escriure tants zeros: Júpiter és a 5,2 UA del Sol.',
  },
  {
    id: 'llum', term: 'Velocitat de la llum', more: 'llum',
    text: 'Gairebé 300.000 km cada segon. Res no va més de pressa. Tot i així, la llum del Sol triga més de 8 minuts a arribar-nos.',
  },
  {
    id: 'any-llum', term: 'Any llum', more: 'llum',
    text: 'La distància que recorre la llum en un any: uns 9,46 bilions de km, o 63.000 UA. Tot i el nom, és una distància, no un temps.',
  },
  {
    id: 'orbita', term: 'Òrbita',
    text: 'El camí que segueix un cos al voltant d’un altre, atret per la seva gravetat. Les òrbites són el·lipses: cercles una mica aixafats.',
  },
  {
    id: 'periheli', term: 'Periheli i afeli',
    text: 'El punt de l’òrbita més proper al Sol (periheli) i el més llunyà (afeli). Els cometes passen pel periheli a tota velocitat i s’allunyen molt a poc a poc.',
  },
  {
    id: 'planeta-nan', term: 'Planeta nan',
    text: 'Un cos prou gran per ser rodó que gira al voltant del Sol, però que comparteix la seva òrbita amb molts altres objectes. Plutó n’és un des del 2006.',
  },
  {
    id: 'satellit', term: 'Satèl·lit (lluna)',
    text: 'Un cos que gira al voltant d’un planeta. La Lluna és el satèl·lit natural de la Terra; Júpiter i Saturn en tenen més de noranta cadascun.',
  },
  {
    id: 'asteroide', term: 'Asteroide',
    text: 'Un tros de roca o metall que gira al voltant del Sol, massa petit per ser un planeta. La majoria són al cinturó d’asteroides, entre Mart i Júpiter.',
  },
  {
    id: 'cometa', term: 'Cometa',
    text: 'Una bola de gel i pols. Quan s’acosta al Sol, el gel s’evapora i forma una cabellera i una cua que poden fer milions de km.',
  },
  {
    id: 'kuiper', term: 'Cinturó de Kuiper',
    text: 'Una regió de cossos gelats més enllà de Neptú, entre 30 i 50 UA del Sol. Hi ha Plutó, Haumea i Makemake.',
  },
  {
    id: 'gegant', term: 'Gegant gasós i gegant de gel',
    text: 'Planetes enormes sense superfície sòlida. Júpiter i Saturn són sobretot hidrogen i heli (gasosos); Urà i Neptú tenen molta aigua, amoníac i metà (de gel).',
  },
  {
    id: 'magnitud', term: 'Magnitud',
    text: 'La brillantor d’un astre vist des de la Terra. Com més petit el número, més brillant: Venus arriba a −4,9, i a ull nu, lluny de les ciutats, es veu fins a 6.',
  },
];

const byId = new Map(GLOSSARY.map((g) => [g.id, g]));
export const glossaryEntry = (id: string) => byId.get(id);
