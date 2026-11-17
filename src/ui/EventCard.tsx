import { bodyById, type BodyInfo } from '../astro/bodies';
import { hrefFor } from '../router';
import { downloadIcs } from '../sky/alerts';
import type { EventKind, SkyEvent } from '../sky/events';
import { BodyDot } from './BodyDot';

const ICON: Record<EventKind, string> = {
  lluna: '🌕',
  pluja: '☄️',
  eclipsi: '🌘',
  trobada: '✨',
  oposicio: '🪐',
  elongacio: '⭐',
  estacio: '🌍',
};

const hm = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });
const dayMonth = (d: Date) => d.toLocaleDateString('ca', { day: 'numeric', month: 'long' });
const weekday = (d: Date) => d.toLocaleDateString('ca', { weekday: 'long' });

/** «Avui», «Demà», «Dissabte 12 de desembre», amb l'hora si interessa */
export function eventDate(e: SkyEvent, now: Date): string {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  if (e.kind === 'pluja') {
    // La nit del màxim: el dia anterior a la matinada del màxim
    const eve = new Date(e.date.getTime() - 12 * 3_600_000);
    return `Nit del ${eve.getDate()} al ${dayMonth(e.date)}`;
  }
  const n = Math.round((day(e.date) - day(now)) / 86_400_000);
  const d = n === 0 ? 'Avui' : n === 1 ? 'Demà' : `${weekday(e.date)} ${dayMonth(e.date)}`.replace(/^./, (c) => c.toUpperCase());
  const year = e.date.getFullYear() !== now.getFullYear() && n > 0 ? ` de ${e.date.getFullYear()}` : '';
  const withTime = e.kind === 'eclipsi' || e.kind === 'lluna';
  return `${d}${year}${withTime ? `, a les ${hm(e.date)}` : ''}`;
}

/** Targeta d'un esdeveniment del cel */
export function EventCard({ e, now, compact = false }: { e: SkyEvent; now: Date; compact?: boolean }) {
  const icon = e.kind === 'lluna' && e.title.includes('nova') ? '🌑' : ICON[e.kind];
  const bodies = e.bodies.map((id) => bodyById(id)).filter((b): b is BodyInfo => !!b);
  return (
    <li className={`event ${e.big ? 'event--big' : ''} ${e.visible === false ? 'event--hidden' : ''}`}>
      <span className="event__icon" aria-hidden="true">{icon}</span>
      <div className="event__main">
        <p className="event__date">{eventDate(e, now)}</p>
        <h3 className="event__title">{e.title}</h3>
        {!compact && <p className="event__text">{e.text}</p>}
        {e.look && (
          <p className="event__look">
            Mira-ho {e.look.where} cap a les <strong>{hm(e.look.time)}</strong>
            {Math.abs(e.look.time.getTime() - e.date.getTime()) > 6 * 3_600_000 ? ' (la nit més propera)' : ''}.
          </p>
        )}
        {e.visible === false && <p className="event__look muted">Des d’on ets no es veurà.</p>}
        {!compact && e.visible !== false && (
          <button className="event__cal" onClick={() => downloadIcs([e], e.id)} title="Afegeix-lo al calendari del mòbil, amb un recordatori una hora abans">
            📅 Al calendari
          </button>
        )}
        {!compact && bodies.length > 0 && (
          <p className="event__links">
            {bodies.map((b) => (
              <a key={b.id} className="chip-link" href={hrefFor.body(b.id)}>
                <BodyDot body={b} /> {b.name}
              </a>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}
