import { useLayoutEffect, useRef } from 'react';
import { CATALOG, bodyById, KIND_SINGULAR, wikipediaUrl, type BodyInfo, findVerb } from '../astro/bodies';
import { distanceFromSun } from '../astro/engine';
import { formatAu, formatKm, formatLightTime, formatLy, formatYears } from '../astro/format';
import { liveDistance } from '../astro/live';
import { smallBodyData } from '../astro/positions';
import { compareWithEarth, taglineOf } from '../astro/profile';
import { hrefFor } from '../router';
import { useWikiSummary } from '../search/wiki';
import { MiniMap } from '../ui/MiniMap';
import { IssPassList } from '../ui/IssPasses';
import { ISS_ID, issState, useIssData } from '../sky/iss';
import { PLACE_PRESETS, useLocation } from '../sky/hooks';
import { OrbitFacts } from '../ui/OrbitFacts';
import { MoonDetails } from '../ui/MoonDetails';
import { JupiterMoonsBox, VenusPhaseBox } from '../ui/PlanetViews';
import { Term } from '../ui/Term';
import { Icon } from '../ui/Icon';
import { ConstellationFigure } from '../ui/ConstellationFigure';
import { BodyDot } from '../ui/BodyDot';
import { constellationByOf, SEASON_TEXT } from '../astro/constellations';

interface Props {
  body: BodyInfo;
  now: Date;
  onFind: (id: string) => void;
  onShowOnMap: (id: string) => void;
}

const clock = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const LUNAR_KM = 384_400;

/** Fitxa d'un cos: on és ara, com és comparat amb la Terra, dades i resum de la Viquipèdia. */
export function BodyPage({ body, now, onFind, onShowOnMap }: Props) {
  const parent = body.parent ? bodyById(body.parent) : undefined;
  const moons = CATALOG.filter((b) => b.parent === body.id);
  const dist = body.id === 'earth' ? null : liveDistance(body, now);
  const wiki = useWikiSummary(body);
  const small = smallBodyData(body);
  const comparisons = compareWithEarth(body);

  // Cada fitxa comença a dalt de tot
  const pane = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    pane.current?.scrollTo(0, 0);
  }, [body.id]);

  const departed = dist ? new Date(now.getTime() - dist.lightMinutes * 60_000) : null;

  return (
    <article className="body-page pane" ref={pane} aria-labelledby="body-title">
      <a className="body-page__back" href={hrefFor.explora}><Icon name="back" /> Tots els cossos</a>

      <header className="body-page__head">
        <BodyDot body={body} size="page" />
        <div>
          <h1 id="body-title">{body.name}</h1>
          <p className="muted">
            {body.sky ? <SkyKind body={body} /> : body.constel ? <>Constel·lació · {body.constel.season === 'tot l’any' ? 'es veu tot l’any' : `es veu millor ${SEASON_TEXT[body.constel.season].toLowerCase()}`}</> : KIND_SINGULAR[body.kind]}
            {parent && <> · lluna de <a href={hrefFor.body(parent.id)}>{parent.name}</a></>}
          </p>
        </div>
      </header>
      <p className="body-page__tagline">{taglineOf(body)}</p>

      <div className="body-page__actions">
        {body.id !== 'earth' && (
          <button className="primary" onClick={() => onFind(body.id)}>
            {body.id === 'sun' ? '☀️ On és el Sol ara?' : <><Icon name="telescope" /> {findVerb(body)} al cel</>}
          </button>
        )}
        <a className="btn" href={wiki.status === 'ok' ? wiki.data.url : wikipediaUrl(body)} target="_blank" rel="noopener noreferrer">
          Viquipèdia <Icon name="external" />
        </a>
        {!body.sky && !body.constel && body.id !== ISS_ID && <button onClick={() => onShowOnMap(body.id)}><Icon name="orbit" /> Al mapa</button>}
      </div>

      {body.constel && <ConstelBoxes body={body} />}

      {!body.constel && <section className="box now-box" aria-label="Ara mateix">
        {body.sky ? (
          <FarNow body={body} now={now} />
        ) : body.id === ISS_ID ? (
          <IssNow now={now} onFind={() => onFind(body.id)} />
        ) : body.id === 'earth' ? (
          <p>Ets aquí! Ara mateix som a <strong>{formatKm(distanceFromSun(body.body!, now) * 149_597_870.7)}</strong> del Sol ({formatAu(distanceFromSun(body.body!, now))}).</p>
        ) : dist ? (
          <>
            <p className="muted now-box__label">Ara mateix és a</p>
            <p className="now-box__big">{dist.approx ? '≈ ' : ''}{formatKm(dist.km)}</p>
            <p className="muted">
              {dist.au < 0.02
                ? `${(dist.km / LUNAR_KM).toLocaleString('ca', { maximumFractionDigits: 2 })} vegades la distància a la Lluna`
                : <>{formatAu(dist.au).replace(' UA', '')} <Term id="ua">UA</Term> · {Math.round(dist.km / LUNAR_KM).toLocaleString('ca')} vegades la distància a la Lluna</>}
              {dist.approx && parent && <> · calculat a partir de {parent.name}</>}
            </p>
            <p className="now-box__light">
              La <Term id="llum">llum</Term> que en veus va sortir fa <strong>{formatLightTime(dist.lightMinutes)}</strong>
              {departed && dist.lightMinutes >= 1 && (
                <>: el veus tal com era a les <strong>{clock(departed)}</strong>, no com és ara.</>
              )}{' '}
              <a href={`${hrefFor.entendre}/llum`} className="small">Per què?</a>
            </p>
          </>
        ) : (
          <p className="muted">La posició en temps real d’aquest cos encara no està disponible.</p>
        )}
      </section>}

      {body.sky && <FindFar body={body} />}
      {body.id === 'moon' && <MoonDetails now={now} />}
      {body.id === 'jupiter' && <JupiterMoonsBox now={now} />}
      {body.id === 'venus' && <VenusPhaseBox now={now} />}

      {!body.sky && body.id !== ISS_ID && (body.id === 'sun' || body.id === 'earth' || dist) && (
        <section className="box where-box" aria-labelledby="where-title">
          <h2 id="where-title">On és al sistema solar</h2>
          <MiniMap now={now} highlight={body} size={300} />
          <p className="muted small">
            {body.id === 'sun'
              ? 'Al centre de tot: els planetes hi giren al voltant.'
              : body.id === 'earth'
                ? 'Vist des de dalt, amb el Sol al centre.'
                : <>La línia discontínua és el camí que fa la llum fins a la Terra{dist ? <> ({formatLightTime(dist.lightMinutes)})</> : null}.</>}
            {parent && <> A aquesta escala, {body.name} i {parent.name} es veuen al mateix punt.</>}
            {' '}Distàncies comprimides: com més lluny, més s’escurcen.{' '}
            <button className="link" onClick={() => onShowOnMap(body.id)}>Obre el mapa 3D →</button>
          </p>
        </section>
      )}

      <p className="body-page__intro">{body.intro}</p>

      {comparisons.length > 0 && (
        <section className="box" aria-labelledby="cmp-title">
          <h2 id="cmp-title">{body.sky ? 'Per fer-se’n una idea' : 'Comparat amb la Terra'}</h2>
          <dl className="compare">
            {comparisons.map((c) => (
              <div key={c.label}>
                <dt>{c.label}</dt>
                <dd>{c.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {body.facts.length > 0 && (
        <section aria-labelledby="facts-title">
          <h2 id="facts-title">Dades</h2>
          <dl className="card__facts">
            {body.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {small && <OrbitFacts data={small} date={now} />}

      {moons.length > 0 && (
        <section aria-labelledby="moons-title">
          <h2 id="moons-title">Llunes</h2>
          <ul className="moon-list">
            {moons.map((m) => (
              <li key={m.id}>
                <a href={hrefFor.body(m.id)}>{m.name}</a> <span className="muted">· {taglineOf(m)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="wiki" aria-labelledby="wiki-title">
        <h2 id="wiki-title">A la Viquipèdia</h2>
        {wiki.status === 'loading' && <p className="muted">Carregant el resum…</p>}
        {wiki.status === 'error' && <p className="muted">No s’ha pogut carregar el resum (sense connexió?).</p>}
        {wiki.status === 'ok' && (
          <>
            {wiki.data.thumbnail && <img src={wiki.data.thumbnail} alt={wiki.data.title} loading="lazy" />}
            <p className="wiki__extract">{wiki.data.extract}</p>
            {wiki.data.lang === 'en' && <p className="muted">(Resum en anglès: no hi ha article en català.)</p>}
          </>
        )}
        <a href={wiki.status === 'ok' ? wiki.data.url : wikipediaUrl(body)} target="_blank" rel="noopener noreferrer">
          Llegeix l’article complet <Icon name="external" />
        </a>
        <p className="wiki__license">
          Text de la Viquipèdia, sota llicència{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ca" target="_blank" rel="noopener noreferrer">CC BY-SA</a>.
        </p>
      </section>
    </article>
  );
}

/** «Ara mateix és a…» per a estrelles i galàxies: anys llum i el viatge en el temps de la seva llum */
function FarNow({ body, now }: { body: BodyInfo; now: Date }) {
  const sky = body.sky!;
  const km = sky.ly * 9.4607e12;
  const year = Math.round(now.getFullYear() - sky.ly);
  const when =
    sky.ly < 30 ? <>: el veus tal com era el <strong>{year}</strong>, no com és ara.</>
      : sky.ly <= 5000 ? <>: el veus tal com era cap a l’any <strong>{year > 0 ? year : `${-year} aC`}</strong>.</>
        : sky.past ? <>, {sky.past}.</> : '.';
  return (
    <>
      <p className="muted now-box__label">{sky.distLabel ?? 'És a'}</p>
      <p className="now-box__big">{formatLy(sky.ly)}</p>
      <p className="muted">
        Un <Term id="any-llum">any llum</Term> és la distància que fa la llum en un any: uns 9,5 bilions de km. En total, {formatKm(km)}.
      </p>
      <p className="now-box__light">
        La <Term id="llum">llum</Term> que en veus va sortir fa <strong>{formatYears(sky.ly)}</strong>{when}{' '}
        <a href={`${hrefFor.entendre}/llum`} className="small">Per què?</a>
      </p>
    </>
  );
}

/** Latitud de referència per als textos generals (Catalunya) */
const HOME_LAT = 41.5;

/** Com trobar-lo al cel i des d'on es veu */
function FindFar({ body }: { body: BodyInfo }) {
  const sky = body.sky!;
  const top = 90 - Math.abs(HOME_LAT - sky.dec);
  const from =
    top < 0 ? `Des de Catalunya no surt mai: cal anar al sud del paral·lel ${Math.round(90 + sky.dec)}° N.`
      : top < 10 ? `Des de Catalunya surt molt poc: com a molt ${Math.round(top)}° sobre l’horitzó sud.`
        : sky.dec > 90 - HOME_LAT ? 'Des de Catalunya no es pon mai: és al cel tota la nit, tot l’any.'
          : null;
  const eye =
    sky.eye === 'ull nu' ? (sky.mag < 2 ? 'Es veu a ull nu, fins i tot des de ciutat.' : 'Es veu a ull nu si el cel és net.')
      : sky.eye === 'cel fosc' ? 'A ull nu es veu com una taca borrosa, però només lluny dels llums de ciutat. Amb prismàtics, molt millor.'
        : 'Cal un cel fosc i, millor, uns prismàtics.';
  return (
    <section className="box" aria-labelledby="find-title">
      <h2 id="find-title">Com trobar-lo</h2>
      <p>{sky.hint}</p>
      <p className="muted small find-far__eye">
        <Icon name="eye" /> {eye}
        {from && <> {from}</>}
        {' '}Mira la llista d’<a href={hrefFor.nit}>Aquesta nit</a> per saber si ara és al cel.
      </p>
    </section>
  );
}

/** «Estrella · constel·lació del Ca Major», amb l'enllaç a la constel·lació si en tenim la fitxa */
function SkyKind({ body }: { body: BodyInfo }) {
  const sky = body.sky!;
  const cst = constellationByOf(sky.constellation);
  return (
    <>
      {sky.type} · constel·lació{' '}
      {cst ? <a href={hrefFor.body(cst.id)}>{sky.constellation}</a> : sky.constellation}
    </>
  );
}

/** Constel·lacions: la figura, com trobar-la i què s'hi pot veure */
function ConstelBoxes({ body }: { body: BodyInfo }) {
  const c = body.constel!;
  const top = 90 - Math.abs(HOME_LAT - c.dec);
  const from =
    c.season === 'tot l’any' ? 'Des de Catalunya no es pon mai: és al cel totes les nits, girant al voltant de la Polar.'
      : top < 25 ? `Des de Catalunya es veu baixa: com a molt a ${Math.round(top)}° sobre l’horitzó sud.`
        : null;
  const eye =
    c.brightest < 1 ? 'Té estrelles molt brillants: es reconeix fins i tot des de ciutat.'
      : c.brightest < 2.2 ? 'Les estrelles principals es veuen des de ciutat si el cel és net; la figura sencera, millor des d’un lloc fosc.'
        : 'Les seves estrelles no són gaire brillants: cal un cel fosc, lluny dels llums.';
  const objects = c.objects.map((id) => bodyById(id)).filter((b): b is BodyInfo => !!b);
  return (
    <>
      <section className="box cst-box" aria-labelledby="fig-title">
        <h2 id="fig-title">La figura</h2>
        <ConstellationFigure body={body} />
        <p className="muted small">
          Tal com es veu mirant amunt, amb el nord a dalt. Com més gros és el punt, més brillant és l’estrella. Durant la nit
          la figura es mou i gira, com tot el cel.
        </p>
      </section>

      <section className="box" aria-labelledby="find-title">
        <h2 id="find-title">Com trobar-la</h2>
        <p>{c.hint}</p>
        <p className="muted small find-far__eye">
          <Icon name="eye" /> {eye}
          {from && <> {from}</>}
          {' '}Mira la llista d’<a href={hrefFor.nit}>Aquesta nit</a> per saber si ara és al cel.
        </p>
      </section>

      <section className="box" aria-labelledby="hl-title">
        <h2 id="hl-title">Què hi pots veure</h2>
        <ul className="cst-highlights">
          {c.highlights.map((h) => <li key={h}>{h}</li>)}
        </ul>
        {objects.length > 0 && (
          <p className="cst-objects">
            <span className="muted small">Fitxes:</span>{' '}
            {objects.map((o) => (
              <a key={o.id} className="chip-link" href={hrefFor.body(o.id)}>
                <BodyDot body={o} /> {o.name}
              </a>
            ))}
          </p>
        )}
      </section>
    </>
  );
}

/** L'ISS ara: a quina altura vola i quan es podrà veure des d'on ets */
function IssNow({ now, onFind }: { now: Date; onFind: () => void }) {
  const location = useLocation();
  const place = location.place ?? PLACE_PRESETS[0];
  const { ready } = useIssData(true);
  const s = ready ? issState(now, place) : null;
  return (
    <>
      {s && (
        <>
          <p className="muted now-box__label">Ara mateix vola a</p>
          <p className="now-box__big">{Math.round(s.heightKm).toLocaleString('ca')} km d’altura</p>
          <p className="muted">
            A {Math.round(s.rangeKm).toLocaleString('ca')} km de {location.place ? 'tu' : place.name}
            {s.pos.alt > 0 ? ', per sobre de l’horitzó' : ', a l’altra banda de la Terra'}.
          </p>
        </>
      )}
      <h2 className="iss-passes__title">Quan la podràs veure{location.place ? '' : ` des de ${place.name}`}</h2>
      <IssPassList place={place} now={now} onFind={onFind} />
    </>
  );
}
