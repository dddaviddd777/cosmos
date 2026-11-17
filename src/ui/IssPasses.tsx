import { useMemo } from 'react';
import { issPasses, issState, useIssData, type IssPass } from '../sky/iss';
import { cardinal, towardsCardinal, type Place } from '../sky/sky';
import { Icon } from './Icon';

/** «Avui», «Demà» o el dia de la setmana (dia de calendari: els passos de matinada són de matinada) */
function dayLabel(t: Date, now: Date): string {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const d = Math.round((day(t) - day(now)) / 86_400_000);
  if (d <= 0) return 'Avui';
  if (d === 1) return 'Demà';
  return t.toLocaleDateString('ca', { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase());
}

const hm = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });
const height = (alt: number) => (alt >= 60 ? 'fins gairebé a sobre del cap' : alt >= 35 ? 'ben amunt' : alt >= 20 ? 'fins a mitja altura' : 'poc');
const fromDir = (az: number) => {
  const c = cardinal(az);
  return /^[eo]/.test(c) ? `per l’${c}` : `pel ${c}`;
};

/** Icona de l'estació: el mòdul central i els panells solars. Mai una bola. */
export function IssIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g fill="#3d5fa8" stroke="#a9c2ff" strokeWidth="1.5">
        {[22, 34, 62, 74].map((x) => (
          <g key={x}>
            <rect x={x - 5} y="18" width="10" height="26" />
            <rect x={x - 5} y="56" width="10" height="26" />
          </g>
        ))}
      </g>
      <line x1="14" y1="50" x2="86" y2="50" stroke="#dfe7f5" strokeWidth="3" />
      <rect x="42" y="40" width="16" height="20" rx="3" fill="#e8eef8" />
      <rect x="47" y="30" width="6" height="40" rx="2" fill="#c9d3e3" />
    </svg>
  );
}

/** Un pas: quan, per on surt, fins on puja i per on es perd */
export function IssPassText({ p, now }: { p: IssPass; now: Date }) {
  return (
    <>
      <strong>{dayLabel(p.start, now)}, a les {hm(p.start)}</strong>: apareix {fromDir(p.startAz)}, puja {height(p.peakAlt)} ({Math.round(p.peakAlt)}°) {towardsCardinal(p.peakAz)} i es perd {fromDir(p.endAz)}. Es veu uns {p.minutes} min.
    </>
  );
}

/**
 * Propers passos visibles de l'ISS des d'un lloc. Es calculen un cop cada 10 minuts.
 * Si no hi ha dades (sense connexió el primer cop), ho diu.
 */
export function IssPassList({ place, now, days = 5, limit = 5, onFind, compact = false }: {
  place: Place; now: Date; days?: number; limit?: number; onFind?: () => void; compact?: boolean;
}) {
  const { ready, tle } = useIssData(true);
  const slot = Math.floor(now.getTime() / 600_000);
  const passes = useMemo(
    () => (ready ? issPasses(place, new Date(slot * 600_000 - 15 * 60_000), days).filter((p) => p.end > now).slice(0, limit) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, tle, place.lat, place.lon, slot, days, limit],
  );
  const live = ready ? issState(now, place) : null;
  const upNow = live && live.pos.alt > 0 && live.sunlit && passes[0] && passes[0].start <= now;

  if (!ready) {
    return <p className="muted">{tle ? 'Les dades de l’òrbita són massa antigues: connecta’t a internet per actualitzar-les.' : 'Carregant l’òrbita de l’estació… (cal connexió el primer cop)'}</p>;
  }
  return (
    <div className="iss-passes">
      {upNow && (
        <p className="iss-passes__now">
          🛰️ <strong>Ara mateix és al cel!</strong> Busca un punt molt brillant que es mou de pressa, sense parpellejar.
          {onFind && <> <button className="primary" onClick={onFind}><Icon name="telescope" /> Troba-la</button></>}
        </p>
      )}
      {passes.length === 0 ? (
        <p className="muted">Els pròxims {days} dies no passarà per sobre de manera que es pugui veure. Torna-ho a mirar d’aquí a uns dies: els passos van per temporades.</p>
      ) : (
        <ul className={`iss-passes__list ${compact ? 'iss-passes__list--compact' : ''}`}>
          {passes.map((p) => (
            <li key={p.start.getTime()}>
              <IssPassText p={p} now={now} />
            </li>
          ))}
        </ul>
      )}
      {!compact && (
        <p className="muted small">
          Es veu com un estel molt brillant que creua el cel en pocs minuts. Es fon de cop quan entra a l’ombra de la Terra.
          Òrbita de <a href="https://celestrak.org/" target="_blank" rel="noopener noreferrer">CelesTrak</a>, actualitzada cada dia.
        </p>
      )}
    </div>
  );
}
