import { useEffect, useMemo, useRef, useState } from 'react';
import { bodyById } from '../astro/bodies';
import { formatLightTime } from '../astro/format';
import { liveDistance } from '../astro/live';
import { meanSunDistanceAu } from '../astro/profile';
import { GLOSSARY } from '../content/glossary';
import { hrefFor } from '../router';
import { Term } from '../ui/Term';

const KM_PER_AU = 149_597_870.7;
const SUN_DIAMETER_KM = 1_392_700;
const LIGHT_YEAR_KM = 9.4607e12;
const YEAR_S = 365.25 * 86_400;

const nf = (v: number, d = 0) => v.toLocaleString('ca', { maximumFractionDigits: d });
const clock = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Temps de llum llegible, fins a milions d'anys */
function lightText(seconds: number): string {
  if (seconds < 86_400 * 2) return formatLightTime(seconds / 60);
  const years = seconds / YEAR_S;
  if (years < 1) return `${nf(seconds / 86_400)} dies`;
  if (years < 1e6) return `${nf(years, years < 10 ? 1 : 0)} anys`;
  return `${nf(years / 1e6, 1)} milions d’anys`;
}

/** Longitud en la unitat que s'entén millor */
function lengthText(meters: number): string {
  if (meters < 0.01) return `${nf(meters * 1000, meters < 0.001 ? 2 : 1)} mm`;
  if (meters < 1) return `${nf(meters * 100, 1)} cm`;
  if (meters < 1000) return `${nf(meters)} m`;
  return `${nf(meters / 1000, meters < 10_000 ? 1 : 0)} km`;
}

const SOLAR_LIGHT = ['moon', 'sun', 'venus', 'mars', 'jupiter', 'saturn', 'neptune', 'pluto'];

/** Llum que ve de més enllà del sistema solar (distàncies de referència) */
const FAR_LIGHT: { name: string; id?: string; seconds: number; note: string }[] = [
  { name: 'Voyager 1', seconds: 86_400, note: 'La nau espacial més llunyana. Aquest novembre de 2026 arriba a un dia llum de la Terra.' },
  { name: 'Sírius', id: 'sirius', seconds: 8.6 * YEAR_S, note: 'L’estrella més brillant del cel nocturn.' },
  { name: 'Estrella Polar', id: 'polaris', seconds: 430 * YEAR_S, note: 'La llum que en veus va sortir cap a finals del segle XVI.' },
  { name: 'Galàxia d’Andròmeda', id: 'm31', seconds: 2.5e6 * YEAR_S, note: 'L’objecte més llunyà visible a ull nu. Quan aquesta llum va sortir, a l’Àfrica tot just apareixien els primers humans.' },
];

/** Amplada de barra en escala logarítmica, d'1 segon a 10 milions d'anys */
const logWidth = (s: number) => `${Math.max(3, Math.min(100, ((Math.log10(s) + 0.3) / 14.8) * 100))}%`;

const SCALE_OPTIONS = [
  { id: 'pingpong', label: 'una pilota de ping-pong (4 cm)', m: 0.04 },
  { id: 'taronja', label: 'una taronja (8 cm)', m: 0.08 },
  { id: 'basquet', label: 'una pilota de bàsquet (24 cm)', m: 0.24 },
  { id: 'casa', label: 'una casa (10 m)', m: 10 },
];

const PLANETS_AU = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

export function Understand({ now, section }: { now: Date; section?: string }) {
  const pane = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = section ? document.getElementById(`sec-${section}`) : null;
    if (el) el.scrollIntoView({ block: 'start' });
    else pane.current?.scrollTo(0, 0);
  }, [section]);

  const second = Math.floor(now.getTime() / 1000);
  const solar = useMemo(
    () =>
      SOLAR_LIGHT.map((id) => {
        const b = bodyById(id)!;
        const d = liveDistance(b, new Date(second * 1000))!;
        return { b, seconds: d.lightMinutes * 60 };
      }).sort((x, y) => x.seconds - y.seconds),
    [second],
  );
  const sunSeconds = solar.find((s) => s.b.id === 'sun')!.seconds;

  const [scaleId, setScaleId] = useState('basquet');
  const sunM = SCALE_OPTIONS.find((o) => o.id === scaleId)!.m;
  const k = sunM / (SUN_DIAMETER_KM * 1000); // metres del model per metre real
  const model = [
    { what: 'La Terra', size: 12_742e3 * k, dist: KM_PER_AU * 1e3 * k, where: 'del Sol' },
    { what: 'La Lluna', size: 3_474e3 * k, dist: 384_400e3 * k, where: 'de la Terra' },
    { what: 'Júpiter', size: 139_820e3 * k, dist: 5.2 * KM_PER_AU * 1e3 * k, where: 'del Sol' },
    { what: 'Neptú', size: 49_244e3 * k, dist: 30.07 * KM_PER_AU * 1e3 * k, where: 'del Sol' },
    { what: 'Pròxima del Centaure (l’estrella més propera)', size: 0, dist: 4.24 * LIGHT_YEAR_KM * 1e3 * k, where: 'del Sol' },
  ];

  return (
    <div className="pane understand" ref={pane}>
      <header className="understand__intro">
        <h1>Entendre</h1>
        <p>Algunes idees senzilles per fer-se una idea de com n’és d’enorme, el sistema solar.</p>
        <nav className="chips" aria-label="Temes">
          <a href={`${hrefFor.entendre}/llum`}>Mirar el passat</a>
          <a href={`${hrefFor.entendre}/ua`}>Què és una UA</a>
          <a href={`${hrefFor.entendre}/escala`}>A escala</a>
          <a href={`${hrefFor.entendre}/mides`}>Per què el mapa exagera</a>
          <a href={`${hrefFor.entendre}/glossari`}>Glossari</a>
        </nav>
      </header>

      {/* ── La llum ve del passat ── */}
      <section id="sec-llum" className="topic" aria-labelledby="t-llum">
        <h2 id="t-llum">Mirar el cel és mirar el passat</h2>
        <p>
          La llum és el més ràpid que existeix: recorre gairebé <strong>300.000 km cada segon</strong>. En un segon
          faria set voltes i mitja a la Terra. Però l’espai és tan gran que, fins i tot així, tarda una estona a arribar-nos.
        </p>
        <p>
          Per això, quan mires un astre no el veus com és ara, sinó <strong>com era quan en va sortir la llum</strong>.
        </p>

        <div className="box clock-box" aria-live="off">
          <p className="clock-box__row"><span className="muted">Ara són les</span> <strong>{clock(now)}</strong></p>
          <p className="clock-box__row">
            <span className="muted">El Sol que veus és el de les</span> <strong>{clock(new Date(now.getTime() - sunSeconds * 1000))}</strong>
          </p>
          <p className="muted clock-box__note">
            Si el Sol s’apagués en aquest instant, encara el veuríem brillar durant {formatLightTime(sunSeconds / 60)}.
          </p>
        </div>

        <h3>Quant triga la llum a arribar-te, ara mateix</h3>
        <ul className="light-list">
          {solar.map(({ b, seconds }) => (
            <li key={b.id}>
              <a href={hrefFor.body(b.id)} className="light-list__name">{b.name}</a>
              <span className="light-list__bar"><span style={{ width: logWidth(seconds), background: b.color }} /></span>
              <span className="light-list__time">{lightText(seconds)}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">
          Varien al llarg de l’any, perquè la Terra i els planetes es mouen: ara, per exemple, la llum de Mart triga
          {' '}{lightText(solar.find((s) => s.b.id === 'mars')!.seconds)}.
        </p>

        <h3>I més enllà</h3>
        <ul className="light-list">
          {FAR_LIGHT.map((f) => (
            <li key={f.name} className="light-list__far">
              <span className="light-list__name">{f.id ? <a href={hrefFor.body(f.id)}>{f.name}</a> : f.name}</span>
              <span className="light-list__bar"><span style={{ width: logWidth(f.seconds) }} /></span>
              <span className="light-list__time">{lightText(f.seconds)}</span>
              <span className="light-list__note muted">{f.note}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">Les barres creixen deu vegades a cada pas: si no, la Lluna i Andròmeda no cabrien a la mateixa pantalla.</p>
        <p>
          Com més lluny mires, més enrere en el temps. Els telescopis més potents veuen galàxies tal com eren fa més de
          13.000 milions d’anys, poc després del naixement de l’univers.
        </p>
      </section>

      {/* ── La UA ── */}
      <section id="sec-ua" className="topic" aria-labelledby="t-ua">
        <h2 id="t-ua">Què és una unitat astronòmica (UA)</h2>
        <p>
          És la distància mitjana entre la Terra i el Sol: <strong>149.597.871 km</strong>. Els astrònoms la fan servir
          com a «metre» del sistema solar, perquè els quilòmetres es queden petits.
        </p>
        <div className="ua-grid">
          <div className="box"><p className="muted">A peu, a 5 km/h, sense parar</p><p className="ua-grid__big">{nf(KM_PER_AU / 5 / 24 / 365.25)} anys</p></div>
          <div className="box"><p className="muted">En cotxe, a 120 km/h</p><p className="ua-grid__big">{nf(KM_PER_AU / 120 / 24 / 365.25)} anys</p></div>
          <div className="box"><p className="muted">En avió, a 900 km/h</p><p className="ua-grid__big">{nf(KM_PER_AU / 900 / 24 / 365.25)} anys</p></div>
          <div className="box"><p className="muted">La llum</p><p className="ua-grid__big">8 min 19 s</p></div>
        </div>
        <h3>On és cada planeta, en UA</h3>
        <ul className="au-list">
          {PLANETS_AU.map((id) => {
            const b = bodyById(id)!;
            const au = meanSunDistanceAu(b);
            return (
              <li key={id}>
                <a href={hrefFor.body(id)} className="au-list__name">{b.name}</a>
                <span className="au-list__bar"><span style={{ width: `${(au / 39.5) * 100}%`, background: b.color }} /></span>
                <span className="au-list__val">{nf(au, au < 10 ? 2 : 1)} UA</span>
              </li>
            );
          })}
        </ul>
        <p className="muted small">
          Fixa’t que els quatre planetes rocosos s’amunteguen a l’inici: tot el que hi ha fins a Mart cabria en un
          dels espais buits entre els planetes exteriors.
        </p>
      </section>

      {/* ── Model a escala ── */}
      <section id="sec-escala" className="topic" aria-labelledby="t-escala">
        <h2 id="t-escala">El sistema solar a escala</h2>
        <label className="scale-pick">
          Si el Sol fos{' '}
          <select value={scaleId} onChange={(e) => setScaleId(e.target.value)}>
            {SCALE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <ul className="scale-list">
          {model.map((m) => (
            <li key={m.what}>
              <strong>{m.what}</strong>{' '}
              {m.size > 0 ? <>seria {m.size < 0.001 ? 'un granet' : 'una bola'} de {lengthText(m.size)}, a </> : 'quedaria a '}
              {lengthText(m.dist)} {m.where}.
            </li>
          ))}
        </ul>
        <p className="muted small">
          Gairebé tot és buit. Amb el Sol com una pilota de bàsquet, l’estrella més propera quedaria a uns 6.900 km:
          més lluny que de Barcelona a Nova York.
        </p>
      </section>

      {/* ── Mides del mapa ── */}
      <section id="sec-mides" className="topic" aria-labelledby="t-mides">
        <h2 id="t-mides">Per què el mapa exagera</h2>
        <p>
          Si es dibuixés el sistema solar a escala en una pantalla, el Sol seria un punt diminut i els planetes no es
          veurien: la Terra és 109 vegades més petita que el Sol i el separa del Sol una distància d’11.700 vegades la seva pròpia amplada.
        </p>
        <p>
          Per això, al <a href={hrefFor.mapa}>Mapa</a> els planetes són molt més grossos del que tocaria i, amb
          l’<em>escala didàctica</em>, les distàncies estan comprimides perquè hi càpiga tot. Prova el botó
          {' '}<em>Distàncies reals</em> per veure les proporcions de debò.
        </p>
      </section>

      {/* ── Glossari ── */}
      <section id="sec-glossari" className="topic" aria-labelledby="t-glossari">
        <h2 id="t-glossari">Glossari</h2>
        <p className="muted small">
          A tota l’app, les paraules <Term id="ua">subratllades així</Term> es poden tocar per veure’n la definició.
        </p>
        <dl className="glossary">
          {GLOSSARY.map((g) => (
            <div key={g.id} id={`g-${g.id}`}>
              <dt>{g.term}</dt>
              <dd>{g.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
