import { formatAu, formatDay, formatMonthYear, formatPeriod } from '../astro/format';
import { dateToJd, elementsAt, jdToDate, type SmallBodyData } from '../astro/kepler';

const ORBIT_CLASS_CA: Record<string, string> = {
  'Main-belt Asteroid': 'Cinturó principal d’asteroides',
  Amor: 'Asteroide proper a la Terra (Amor)',
  Apollo: 'Asteroide que creua l’òrbita de la Terra (Apollo)',
  Aten: 'Asteroide que creua l’òrbita de la Terra (Aten)',
  'TransNeptunian Object': 'Objecte transneptunià',
  'Halley-type Comet*': 'Cometa de tipus Halley',
  'Encke-type Comet': 'Cometa de tipus Encke',
  'Jupiter-family Comet': 'Cometa de la família de Júpiter',
  Comet: 'Cometa de període llarg',
};

const YEAR_MS = 365.25 * 86_400_000;

/** Dades orbitals d'un asteroide, cometa o planeta nan, calculades a partir de NASA/JPL. */
export function OrbitFacts({ data, date }: { data: SmallBodyData; date: Date }) {
  const el = elementsAt(data, date);
  // Proper pas pel periheli a partir de la data mostrada
  const jd = dateToJd(date);
  const k = Math.ceil((jd - el.tp) / el.per);
  const nextPeri = jdToDate(el.tp + k * el.per);
  // Lluny de l'època dels elements, el model de dos cossos és menys precís
  const far = Math.abs(nextPeri.getTime() - jdToDate(el.epochJd).getTime()) > 10 * YEAR_MS;
  const periText = Math.abs(nextPeri.getTime() - date.getTime()) < 2 * YEAR_MS && !far
    ? formatDay(nextPeri)
    : `${far ? '≈ ' : ''}${formatMonthYear(nextPeri)}`;

  const facts: [string, string][] = [
    ['Tipus d’òrbita', ORBIT_CLASS_CA[data.orbitClass] ?? data.orbitClass],
    ...(data.diameterKm
      ? [['Diàmetre', data.diameterKm < 2 ? `${Math.round(data.diameterKm * 1000)} m` : `${data.diameterKm.toLocaleString('ca', { maximumFractionDigits: 0 })} km`] as [string, string]]
      : []),
    ['Distància mitjana al Sol', formatAu(el.a)],
    ['Període (volta al Sol)', formatPeriod(el.per)],
    ['Punt més proper al Sol', formatAu(el.q)],
    ['Punt més llunyà del Sol', formatAu(el.ad)],
    ['Proper pas pel periheli', periText],
  ];

  return (
    <section className="orbit-facts" aria-label="Dades orbitals">
      <h3>Òrbita · dades NASA/JPL</h3>
      <dl className="card__facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="muted orbit-facts__note">
        Posició calculada amb les lleis de Kepler a partir d’elements orbitals de JPL Horizons
        ({data.fullname}). Error típic &lt; 0,3° fins a un parell d’anys de distància; creix lentament amb el temps.
      </p>
    </section>
  );
}
