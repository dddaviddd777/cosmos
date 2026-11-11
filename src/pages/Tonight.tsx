import { useMemo, useState } from 'react';
import { hrefFor } from '../router';
import { PLACE_PRESETS, useLocation } from '../sky/hooks';
import { cardinal, towardsCardinal } from '../sky/sky';
import { darkStart, farTonight, isDark, moonInfo, skyTonight, sunTimes, type FarEntry, type SkyEntry, type SkyStatus } from '../sky/tonight';
import type { SkyEye } from '../astro/beyond';
import { Icon } from '../ui/Icon';

/** «pel nord-est», «per l’est» */
const towards = (c: string) => (/^[eo]/.test(c) ? `per l’${c}` : `pel ${c}`);

const hm = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });

/** «a les 21:40», «demà a les 06:10» */
function when(d: Date, from: Date): string {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(d) - day(from)) / 86_400_000);
  return `${days >= 1 ? (days === 1 ? 'demà ' : 'demà passat ') : ''}a les ${hm(d)}`;
}

const EYE_TEXT: Record<SkyEntry['eye'], string> = {
  'ull nu': 'Es veu a ull nu',
  prismàtics: 'Calen prismàtics',
  telescopi: 'Cal un telescopi',
};

const STATUS_TEXT: Record<SkyStatus, string> = {
  visible: '',
  baix: 'Molt baix: busca un horitzó sense edificis',
  dia: 'Hi és, però amb la claror del dia no es veu',
  sol: 'Massa a prop del Sol: no es pot veure',
  sota: 'Sota l’horitzó',
};

interface Props {
  now: Date;
  onFind: (id: string) => void;
}

/** Què es pot veure al cel des d'on ets: ara mateix o quan es faci fosc. */
export function Tonight({ now, onFind }: Props) {
  const location = useLocation();
  const place = location.place;
  const minute = Math.floor(now.getTime() / 60_000);
  const [mode, setMode] = useState<'ara' | 'fosc'>('fosc');

  const data = useMemo(() => {
    if (!place) return null;
    const t0 = new Date(minute * 60_000);
    const darkNow = isDark(t0, place);
    const dark = darkNow ? t0 : darkStart(t0, place);
    const t = mode === 'ara' || darkNow || !dark ? t0 : dark;
    return {
      t, darkNow, dark,
      entries: skyTonight(t, place),
      far: farTonight(t, place),
      tDark: isDark(t, place),
      moon: moonInfo(t),
      sun: sunTimes(t0, place),
    };
  }, [place, minute, mode]);

  const placeName = place ? place.name ?? `${place.lat.toFixed(2)}, ${place.lon.toFixed(2)}` : '';

  const placePicker = (
    <div className="tonight__place-pick">
      <button className="btn" onClick={location.request}><Icon name="pin" /> Utilitza la meva ubicació</button>
      <select
        value=""
        onChange={(e) => e.target.value && location.setPlace(PLACE_PRESETS[Number(e.target.value)])}
        aria-label="Tria una ciutat"
      >
        <option value="">Tria una ciutat…</option>
        {PLACE_PRESETS.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
      </select>
    </div>
  );

  if (!place || !data) {
    return (
      <div className="pane tonight">
        <h1>Aquesta nit</h1>
        <p>Per saber què pots veure al cel, necessitem saber aproximadament on ets. La ubicació només es fa servir dins del teu dispositiu.</p>
        {location.status === 'asking' && <p className="muted">Esperant la ubicació…</p>}
        {location.status === 'denied' && <p className="muted">No tenim permís per a la ubicació: tria la ciutat més propera.</p>}
        {location.status === 'unavailable' && <p className="muted">No s’ha pogut obtenir la ubicació: tria la ciutat més propera.</p>}
        {placePicker}
      </div>
    );
  }

  const { t, darkNow, dark, entries, moon, sun, far, tDark } = data;
  const moonUp = entries.some((e) => e.body.id === 'moon' && (e.status === 'visible' || e.status === 'baix'));
  const atNow = darkNow || mode === 'ara' || !dark;
  const visible = entries.filter((e) => e.status === 'visible' || e.status === 'baix');
  const hidden = entries.filter((e) => !visible.includes(e));

  return (
    <div className="pane tonight">
      <h1>Aquesta nit</h1>
      <details className="tonight__place">
        <summary><Icon name="pin" /> {placeName} <span className="muted">· canvia</span></summary>
        {placePicker}
      </details>

      {!darkNow && dark && (
        <div className="chips" role="radiogroup" aria-label="Quan">
          <button role="radio" aria-checked={mode === 'fosc'} className={mode === 'fosc' ? 'active' : ''} onClick={() => setMode('fosc')}>
            Quan es faci fosc ({when(dark, now)})
          </button>
          <button role="radio" aria-checked={mode === 'ara'} className={mode === 'ara' ? 'active' : ''} onClick={() => setMode('ara')}>
            Ara ({hm(now)})
          </button>
        </div>
      )}

      <div className="box tonight__summary">
        <p>
          <span className="tonight__moon" aria-hidden="true">{moon.emoji}</span>
          <strong>{moon.name}</strong> · il·luminada al {Math.round(moon.lit * 100)} %
          {moon.lit > 0.7 && <span className="muted"> · la seva claror amaga els estels més febles</span>}
        </p>
        <p className="muted">
          {sun.set && sun.rise && sun.rise < sun.set ? (
            <>El Sol surt {when(sun.rise, now)} i es pon {sun.set.getDate() === sun.rise.getDate() ? `a les ${hm(sun.set)}` : when(sun.set, now)}</>
          ) : (
            <>
              {sun.set && <>El Sol es pon {when(sun.set, now)}</>}
              {sun.set && sun.rise && ' i torna a sortir '}
              {sun.rise && when(sun.rise, now)}
            </>
          )}
        </p>
      </div>

      <h2>
        {visible.length > 0
          ? `Es veu${visible.length > 1 ? 'en' : ''} ${atNow ? 'ara' : when(t, now)}`
          : `${atNow ? 'Ara' : when(t, now).replace(/^a/, 'A')} no es veu cap planeta`}
      </h2>
      {visible.length > 0 && (
        <p className="muted small">Ordenats de més a menys brillant. Truc: un puny amb el braç estirat tapa uns 10° de cel.</p>
      )}
      <ul className="sky-list">
        {visible.map((e) => (
          <SkyRow key={e.body.id} e={e} from={now} dawn={sun.rise} onFind={onFind} />
        ))}
      </ul>

      {hidden.length > 0 && (
        <>
          <h2>No es veuen {atNow ? 'ara' : 'llavors'}</h2>
          <ul className="sky-list sky-list--hidden">
            {hidden.map((e) => (
              <SkyRow key={e.body.id} e={e} from={now} dawn={sun.rise} onFind={onFind} />
            ))}
          </ul>
        </>
      )}

      <h2 className="tonight__far-title">Estrelles i més enllà</h2>
      {!tDark ? (
        <p className="muted">
          Ara encara hi ha massa claror per veure estrelles.
          {dark && <> Tria «Quan es faci fosc» a dalt de tot per veure quines hi haurà.</>}
        </p>
      ) : (
        <>
          <p className="muted small">
            Ordenades de més a menys brillant. Les galàxies i cúmuls es veuen com taques borroses: busca un lloc fosc i deixa
            que la vista s’acostumi a la foscor uns 15 minuts.
            {moonUp && moon.lit > 0.5 && <> Avui la Lluna fa molta claror i les farà més difícils de veure.</>}
          </p>
          <ul className="sky-list">
            {far.up.map((e) => <FarRow key={e.body.id} e={e} onFind={onFind} />)}
          </ul>
          {far.down.length > 0 && (
            <p className="muted small tonight__far-more">
              <strong>Ara no es veuen:</strong>{' '}
              {far.down.map((e, i) => (
                <span key={e.body.id}>
                  {i > 0 && ', '}
                  <a href={hrefFor.body(e.body.id)}>{e.body.name}</a>
                  {e.rise ? ` (surt ${when(e.rise, now)})` : e.pos.alt >= 0 ? ' (massa baix)' : ''}
                </span>
              ))}
              .
            </p>
          )}
          {far.never.length > 0 && (
            <p className="muted small tonight__far-more">
              <strong>Des d’aquí no surten mai</strong> (cal anar més al sud):{' '}
              {far.never.map((e, i) => (
                <span key={e.body.id}>
                  {i > 0 && ', '}
                  <a href={hrefFor.body(e.body.id)}>{e.body.name}</a>
                </span>
              ))}
              .
            </p>
          )}
        </>
      )}

      <p className="muted small tonight__tip">
        Com distingir un planeta d’una estrella? Els estels fan pampallugues; els planetes brillen amb una llum més quieta.
      </p>
    </div>
  );
}

function SkyRow({ e, from, dawn, onFind }: { e: SkyEntry; from: Date; dawn: Date | null; onFind: (id: string) => void }) {
  const up = e.status === 'visible' || e.status === 'baix';
  return (
    <li className="sky-row">
      <span className="body-row__dot" style={{ background: e.body.color }} aria-hidden="true" />
      <div className="sky-row__main">
        <a href={hrefFor.body(e.body.id)} className="sky-row__name">{e.body.name}</a>
        {up ? (
          <>
            <p>
              Mira <strong>{towardsCardinal(e.pos.az)}</strong> i aixeca la vista <strong>{Math.round(e.pos.alt)}°</strong>
            </p>
            <p className="muted small">
              {e.body.id === 'moon' ? 'Impossible de no veure-la' : EYE_TEXT[e.eye]}
              {e.status === 'baix' && ` · ${STATUS_TEXT.baix}`}
              {e.set && (dawn && e.set > dawn && e.body.id !== 'moon' ? ' · es veu fins que es faci de dia' : ` · es pon ${when(e.set, from)}`)}
            </p>
          </>
        ) : (
          <p className="muted small">
            {STATUS_TEXT[e.status]}
            {e.status === 'sota' && e.rise && ` · surt ${when(e.rise, from)}`}
            {e.riseAz !== null && ` ${towards(cardinal(e.riseAz))}`}
          </p>
        )}
      </div>
      {e.status !== 'sol' && (
        <button className="sky-row__find" onClick={() => onFind(e.body.id)} aria-label={`Troba ${e.body.name} al cel`}>
          <Icon name="telescope" /><span> Troba’l</span>
        </button>
      )}
    </li>
  );
}

const FAR_EYE: Record<SkyEye, string> = {
  'ull nu': 'Es veu a ull nu',
  'cel fosc': 'A ull nu, lluny dels llums de ciutat',
  prismàtics: 'Amb prismàtics i cel fosc',
};

function FarRow({ e, onFind }: { e: FarEntry; onFind: (id: string) => void }) {
  const sky = e.body.sky!;
  return (
    <li className="sky-row">
      <span className="body-row__dot" style={{ background: e.body.color }} aria-hidden="true" />
      <div className="sky-row__main">
        <a href={hrefFor.body(e.body.id)} className="sky-row__name">{e.body.name}</a>
        <p>
          Mira <strong>{towardsCardinal(e.pos.az)}</strong> i aixeca la vista <strong>{Math.round(e.pos.alt)}°</strong>
        </p>
        <p className="muted small">
          {sky.eye === 'ull nu' && sky.mag > 1.5 ? 'Es veu a ull nu si el cel és net' : FAR_EYE[sky.eye]}
          {' · '}{sky.type.toLowerCase()} {sky.constellation}
          {e.pos.alt > 80 && ' · just a sobre del cap'}
        </p>
      </div>
      <button className="sky-row__find" onClick={() => onFind(e.body.id)} aria-label={`Troba ${e.body.name} al cel`}>
        <Icon name="telescope" /><span> Troba’l</span>
      </button>
    </li>
  );
}
