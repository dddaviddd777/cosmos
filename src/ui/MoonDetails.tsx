import { useMemo } from 'react';
import { PLACE_PRESETS, useLocation } from '../sky/hooks';
import { daysToBest, days, featureState, lunarDay, MOON_FEATURES, moonToday, SYNODIC } from '../sky/moon';
import { towardsCardinal, horizontalOf } from '../sky/sky';
import { bodyById } from '../astro/bodies';

const hm = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });
const dayMonth = (d: Date) => d.toLocaleDateString('ca', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Disc il·luminat segons la fase (vist des de l'hemisferi nord: creixent, il·luminada per la dreta).
 * `lit` = fracció il·luminada (0–1). Serveix per a la Lluna i per a Venus.
 */
export function PhaseDisc({ lit, waxing, size = 120, light = '#f1eee4', dark = '#1b2038', label }: {
  lit: number; waxing: boolean; size?: number; light?: string; dark?: string; label?: string;
}) {
  const r = 48;
  const k = Math.min(1, Math.max(0, lit));
  const rx = Math.abs(1 - 2 * k) * r;
  // Meitat il·luminada (dreta) + terminador (una el·lipse): cap a la part fosca si és creixent prima,
  // cap a la il·luminada si és gibosa
  const d = `M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${rx} ${r} 0 0 ${k < 0.5 ? 0 : 1} 0 ${-r}Z`;
  return (
    <svg className="phase-disc" viewBox="-55 -55 110 110" width={size} height={size} role="img" aria-label={label ?? `Il·luminada al ${Math.round(k * 100)} %`}>
      <defs>
        <radialGradient id="phase-glow" cx="40%" cy="38%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={r} fill={dark} stroke="rgba(160,175,220,0.35)" strokeWidth="0.8" />
      <g transform={waxing ? undefined : 'scale(-1 1)'}>
        <path d={d} fill={light} />
      </g>
      <circle r={r} fill="url(#phase-glow)" />
    </svg>
  );
}

/** La Lluna avui: fase, sortida i posta, properes fases i què s'hi pot veure */
export function MoonDetails({ now }: { now: Date }) {
  const location = useLocation();
  const place = location.place ?? PLACE_PRESETS[0];
  const minute = Math.floor(now.getTime() / 60_000);
  const m = useMemo(() => moonToday(new Date(minute * 60_000), place), [minute, place]);
  const pos = horizontalOf(bodyById('moon')!, now, place)!;
  const features = MOON_FEATURES.map((f) => ({ f, state: featureState(f, m.age), wait: daysToBest(f, m.age) }));
  const best = features.filter((x) => x.state === 'millor');

  return (
    <>
      <section className="box moon-box" aria-labelledby="moon-title">
        <h2 id="moon-title">La Lluna avui</h2>
        <div className="moon-box__top">
          <PhaseDisc lit={m.lit} waxing={m.waxing} label={`${m.name}, il·luminada al ${Math.round(m.lit * 100)} %`} />
          <div>
            <p className="moon-box__phase">{m.name}</p>
            <p>Il·luminada al <strong>{Math.round(m.lit * 100)} %</strong> · dia {lunarDay(m.age)} de {Math.round(SYNODIC)}</p>
            <p className="muted">
              {m.rise && <>Surt a les <strong>{hm(m.rise)}</strong></>}
              {m.rise && m.set && ' · '}
              {m.set && <>es pon a les <strong>{hm(m.set)}</strong>{m.set.toDateString() !== now.toDateString() && ' de demà'}</>}
              {!m.rise && !m.set && 'Avui no surt ni es pon'}
            </p>
            <p className="muted small">
              {pos.alt > 0 ? <>Ara és {towardsCardinal(pos.az)}, a {Math.round(pos.alt)}° d’altura.</> : 'Ara és sota l’horitzó.'}
              {location.place ? '' : ` Hores per a ${place.name}.`}
            </p>
          </div>
        </div>
        <ul className="moon-box__quarters">
          {m.quarters.map((q) => (
            <li key={q.date.getTime()}>
              <PhaseDisc
                size={30}
                lit={q.name === 'Lluna nova' ? 0 : q.name === 'Lluna plena' ? 1 : 0.5}
                waxing={q.name !== 'Quart minvant'}
                label={q.name}
              />
              <span><strong>{q.name}</strong><br /><span className="muted small">{dayMonth(q.date)}, {hm(q.date)}</span></span>
            </li>
          ))}
        </ul>
        <p className="muted small">
          {m.waxing
            ? 'Creix: cada dia surt uns 50 minuts més tard i es veu més estona al vespre.'
            : 'Minva: cada dia surt més tard, de matinada; es veu millor abans que surti el sol.'}
        </p>
      </section>

      <section className="box moon-sights" aria-labelledby="sights-title">
        <h2 id="sights-title">Què s’hi pot veure</h2>
        <p className="muted small">
          El millor lloc per mirar és la <strong>línia entre la part clara i la fosca</strong>: el Sol hi surt o s’hi pon i
          les ombres llargues fan ressaltar cràters i muntanyes. Els «mars» es veuen a ull nu; els cràters, amb prismàtics.
          {best.length > 0 && <> Avui destaca: <strong>{best.map((x) => x.f.name).join(', ')}</strong>.</>}
        </p>
        <ul className="moon-sights__list">
          {features.map(({ f, state, wait }) => (
            <li key={f.name} className={`moon-sight moon-sight--${state}`}>
              <span className="moon-sight__badge">{state === 'millor' ? '★ Avui és el millor moment' : state === 'visible' ? '✓ Es veu' : '· Ara és fosc'}</span>
              <strong>{f.name}</strong> <span className="muted small">{f.eye ? 'a ull nu' : 'amb prismàtics'}</span>
              <p className="small">{f.text}{state !== 'millor' && wait > 0 && <span className="muted"> Millor moment: d’aquí a {days(wait)}.</span>}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
