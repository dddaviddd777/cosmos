import { useMemo, useState } from 'react';
import { Body, Elongation, Illumination } from 'astronomy-engine';
import { bodyById } from '../astro/bodies';
import { hrefFor } from '../router';
import { PLACE_PRESETS, useLocation } from '../sky/hooks';
import { jupiterMoonsView } from '../sky/jupiterMoons';
import { horizontalOf } from '../sky/sky';
import { isDark } from '../sky/tonight';
import { PhaseDisc } from './MoonDetails';

const when = (d: Date, now: Date) => {
  const sameDay = d.toDateString() === now.toDateString();
  const t = d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `avui a les ${t}` : `${d.toLocaleDateString('ca', { weekday: 'long' })} a les ${t}`;
};

/**
 * Les llunes de Júpiter amb prismàtics: on és cadascuna ara (o d'aquí a unes hores).
 * Nord amunt i est a l'esquerra, com al cel a ull nu i amb la majoria de prismàtics.
 */
export function JupiterMoonsBox({ now }: { now: Date }) {
  const [hours, setHours] = useState(0);
  const location = useLocation();
  const place = location.place ?? PLACE_PRESETS[0];
  const slot = Math.floor(now.getTime() / 300_000);
  const t = useMemo(() => new Date(slot * 300_000 + hours * 3_600_000), [slot, hours]);
  const spots = useMemo(() => jupiterMoonsView(t), [t]);
  const jup = horizontalOf(bodyById('jupiter')!, t, place)!;
  const canSee = jup.alt > 8 && isDark(t, place);

  // Escala: Cal·listo s'allunya fins a ~26 radis; l'amplada del dibuix en cobreix ±28
  const W = 28;
  const X = (x: number) => -x * (100 / W); // est a l'esquerra
  const Y = (y: number) => -y * (100 / W);
  // La línia de les llunes va inclinada (l'eix de Júpiter no apunta al nord del cel): l'alçada s'hi adapta
  const H = Math.max(22, Math.ceil(Math.max(...spots.map((s) => Math.abs(Y(s.y)))) + 12));

  return (
    <section className="box jmoons" aria-labelledby="jmoons-title">
      <h2 id="jmoons-title">Les seves llunes, amb prismàtics</h2>
      <p className="muted small">
        Amb uns prismàtics normals, ben quiets (recolza’ls en una paret), veuràs Júpiter com una boleta i al costat fins a
        quatre puntets en línia: Io, Europa, Ganimedes i Cal·listo. Galileu les va descobrir així el 1610. Es mouen d’una nit a l’altra.
      </p>
      <svg className="jmoons__view" viewBox={`-110 ${-H} 220 ${2 * H}`} role="img" aria-label={`Posició de les llunes de Júpiter ${when(t, now)}`}>
        <rect x="-110" y={-H} width="220" height={2 * H} rx="6" fill="#070b1c" />
        <text x="-104" y={-H + 9} className="jmoons__dir">E</text>
        <text x="104" y={-H + 9} className="jmoons__dir" textAnchor="end">O</text>
        <text x="0" y={-H + 9} className="jmoons__dir" textAnchor="middle">N</text>
        <circle r={100 / W} fill="#d9b88a" />
        {spots.filter((s) => !s.hidden).map((s) => (
          <g key={s.id} transform={`translate(${X(s.x).toFixed(1)} ${Y(s.y).toFixed(1)})`}>
            <circle r="1.6" fill={s.transit ? '#8a7a66' : '#f4f1ea'} />
            <text y="9" className="jmoons__name">{s.name}</text>
          </g>
        ))}
      </svg>
      <ul className="jmoons__notes small">
        {spots.filter((s) => s.hidden).map((s) => <li key={s.id}>{s.name} és darrere de Júpiter: ara no es veu.</li>)}
        {spots.filter((s) => s.transit).map((s) => <li key={s.id}>{s.name} passa per davant de Júpiter: amb prismàtics no se separa del planeta.</li>)}
      </ul>
      <label className="jmoons__time">
        <span>{hours === 0 ? 'Ara' : `D’aquí a ${hours} h (${when(t, now)})`}</span>
        <input type="range" min={0} max={48} step={1} value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Hores des d’ara" />
      </label>
      <p className="muted small">
        {canSee
          ? 'Júpiter és ara prou amunt i és fosc: és un bon moment per mirar-lo.'
          : jup.alt <= 8
            ? 'En aquest moment Júpiter és baix o sota l’horitzó. '
            : 'En aquest moment encara hi ha claror. '}
        {!canSee && <a href={hrefFor.nit}>Mira a «Aquesta nit» quan es veu.</a>}
      </p>
    </section>
  );
}

/** Fase de Venus: amb prismàtics o un telescopi petit es veu com una lluna petita */
export function VenusPhaseBox({ now }: { now: Date }) {
  const hour = Math.floor(now.getTime() / 3_600_000);
  const { lit, evening, size } = useMemo(() => {
    const d = new Date(hour * 3_600_000);
    const ill = Illumination(Body.Venus, d);
    // Mida aparent en segons d'arc: 12.104 km de diàmetre a la distància d'ara
    const size = (12_104 / (ill.geo_dist * 149_597_870.7)) * 206_265;
    return { lit: ill.phase_fraction, evening: Elongation(Body.Venus, d).visibility === 'evening', size };
  }, [hour]);
  const pct = Math.round(lit * 100);
  return (
    <section className="box venus-phase" aria-labelledby="venus-phase-title">
      <h2 id="venus-phase-title">Les fases de Venus</h2>
      <div className="moon-box__top">
        <PhaseDisc lit={lit} waxing={evening} light="#fff4d6" size={96} label={`Venus il·luminat al ${pct} %`} />
        <div>
          <p>Ara està il·luminat al <strong>{pct} %</strong>{evening ? ', i es veu al vespre' : ', i es veu de matinada'}.</p>
          <p className="muted small">
            Com la Lluna, Venus té fases. A ull nu sembla un estel, però amb un telescopi petit (o uns prismàtics potents
            i ben quiets) se’n veu la forma. {pct < 40 ? 'Ara és prim i gran, perquè és a prop de la Terra.' : pct > 80 ? 'Ara és gairebé ple i petit, perquè és a l’altra banda del Sol.' : ''}{' '}
            Mida aparent: {Math.round(size)}″ (la Lluna en fa uns 1.800).
          </p>
        </div>
      </div>
    </section>
  );
}
