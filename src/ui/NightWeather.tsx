import { useMemo } from 'react';
import type { Place } from '../sky/sky';
import { nightOutlook, useForecast, type Rating } from '../sky/weather';

const hm = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });
const hh = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit' }).replace(/\D+$/, '');

const TITLE: Record<Rating, string> = {
  bona: 'Bona nit per mirar el cel',
  regular: 'Núvols a estones',
  dolenta: 'Molt ennuvolat',
};
const TEXT: Record<Rating, string> = {
  bona: 'El cel estarà serè o gairebé: es veurà bé.',
  regular: 'Hi haurà clarianes, però els núvols taparan part del cel.',
  dolenta: 'Els núvols taparan gairebé tot el cel: costarà veure res.',
};

interface Props {
  place: Place;
  /** Inici i final de la foscor que es valora */
  from: Date;
  to: Date | null;
}

/** «És bona nit per mirar el cel?»: previsió de núvols per a les hores de foscor */
export function NightWeather({ place, from, to }: Props) {
  const forecast = useForecast(place);
  const hour = Math.floor(from.getTime() / 3_600_000);
  const outlook = useMemo(
    () => (forecast.status === 'ok' ? nightOutlook(forecast.data, new Date(hour * 3_600_000), to ?? new Date(hour * 3_600_000 + 8 * 3_600_000)) : null),
    [forecast, hour, to],
  );

  if (forecast.status === 'loading') return <p className="muted small weather weather--loading">Consultant la previsió de núvols…</p>;
  if (forecast.status === 'error' || !outlook) {
    return <p className="muted small weather">No s’ha pogut consultar la previsió de núvols (cal connexió a internet).</p>;
  }
  const { rating, clouds, hours, best, rain } = outlook;
  return (
    <section className={`box weather weather--${rating}`} aria-labelledby="weather-title">
      <div className="weather__head">
        <span className={`weather__badge weather__badge--${rating}`} aria-hidden="true" />
        <div>
          <h2 id="weather-title">{TITLE[rating]}</h2>
          <p className="muted small">
            {TEXT[rating]} Núvols: {clouds} % de mitjana{rain >= 30 && <> · probabilitat de pluja {rain} %</>}.
            {best && <> La millor estona: cap a les <strong>{hm(best)}</strong>.</>}
          </p>
        </div>
      </div>
      <ol className="weather__hours" aria-label="Núvols hora a hora">
        {hours.map((h) => (
          <li key={h.time.getTime()} title={`${hm(h.time)}: ${h.clouds} % de núvols`}>
            <span className="weather__col">
              <span className="weather__bar" style={{ height: `${Math.max(6, h.clouds)}%` }} data-level={h.clouds > 65 ? 3 : h.clouds > 30 ? 2 : 1} />
            </span>
            <span className="weather__h">{hh(h.time)}</span>
          </li>
        ))}
      </ol>
      <p className="muted small weather__credit">
        Barres: núvols de cada hora (com més alta, més tapat). Previsió d’<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>.
      </p>
    </section>
  );
}
