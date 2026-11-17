import { useMemo, useState } from 'react';
import { hrefFor } from '../router';
import { skyEvents, type EventKind } from '../sky/events';
import { PLACE_PRESETS, useLocation } from '../sky/hooks';
import { EventCard } from '../ui/EventCard';
import { Icon } from '../ui/Icon';

/** Dies que cobreix la llista (els eclipsis, dos anys) */
const DAYS = 120;

type Filter = 'tots' | 'destacats' | EventKind;
const FILTERS: [Filter, string][] = [
  ['tots', 'Tots'],
  ['destacats', 'Destacats'],
  ['pluja', 'Pluges d’estels'],
  ['trobada', 'Trobades'],
  ['eclipsi', 'Eclipsis'],
  ['lluna', 'Lluna'],
];

/** Calendari del cel: què passarà els propers mesos */
export function Events({ now }: { now: Date }) {
  const location = useLocation();
  const place = location.place ?? PLACE_PRESETS[0];
  const [filter, setFilter] = useState<Filter>('tots');
  const dayKey = Math.floor(now.getTime() / 86_400_000);

  // Es calcula un cop al dia (i quan canvia la ubicació): des de mitja nit d'avui
  const all = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return skyEvents(today, place, DAYS);
  }, [dayKey, place.lat, place.lon]);

  const events = all.filter((e) =>
    filter === 'tots' ? true
      : filter === 'destacats' ? e.big || e.kind === 'eclipsi' || e.kind === 'oposicio'
        : e.kind === filter || (filter === 'trobada' && e.kind === 'elongacio'),
  );

  // Agrupats per mes
  const months: { label: string; items: typeof events }[] = [];
  for (const e of events) {
    const label = e.date.toLocaleDateString('ca', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase());
    const last = months[months.length - 1];
    if (last?.label === label) last.items.push(e);
    else months.push({ label, items: [e] });
  }
  const horizon = new Date(now.getTime() + DAYS * 86_400_000);
  const firstFar = months.findIndex((m) => m.items[0].date > horizon);

  return (
    <div className="pane tonight events-page">
      <a className="body-page__back" href={hrefFor.nit}><Icon name="back" /> Aquesta nit</a>
      <h1>Calendari del cel</h1>
      <p className="muted">
        El que passarà al cel els pròxims quatre mesos (i els eclipsis dels dos anys vinents), calculat per a{' '}
        <strong>{place.name ?? `${place.lat.toFixed(1)}, ${place.lon.toFixed(1)}`}</strong>.
        {!location.place && <> Pots triar la teva ubicació a <a href={hrefFor.nit}>Aquesta nit</a>.</>}
      </p>

      <div className="chips" role="radiogroup" aria-label="Quins esdeveniments">
        {FILTERS.map(([f, label]) => (
          <button key={f} role="radio" aria-checked={filter === f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {label}
          </button>
        ))}
      </div>

      {months.length === 0 && <p className="muted">No hi ha cap esdeveniment d’aquest tipus els propers mesos.</p>}
      {months.map((m, i) => (
        <section key={m.label} aria-label={m.label}>
          {i === firstFar && <h2 className="tonight__far-title">Més endavant: eclipsis</h2>}
          <h2 className="events-page__month">{m.label}</h2>
          <ul className="event-list">
            {m.items.map((e) => <EventCard key={e.id} e={e} now={now} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
