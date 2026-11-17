/**
 * Previsió de núvols per a la nit, d'Open-Meteo (gratuït, sense clau, permet CORS).
 * Només s'hi envia la posició arrodonida a 0,1° (uns 10 km): prou per a la previsió i res més precís.
 */
import { useEffect, useState } from 'react';
import type { Place } from './sky';

export interface CloudHour {
  time: Date;
  /** Nuvolositat total, baixa, mitjana i alta (%) */
  total: number;
  low: number;
  mid: number;
  high: number;
  /** Probabilitat de precipitació (%) */
  rain: number;
}

export interface Forecast {
  hours: CloudHour[];
  /** Quan es va descarregar */
  fetched: number;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const TTL = 60 * 60_000;
const memory = new Map<string, Promise<Forecast | null>>();

async function download(lat: number, lon: number): Promise<Forecast | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation_probability' +
    '&timezone=GMT&timeformat=unixtime&forecast_days=3';
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json();
  const h = j.hourly;
  if (!h?.time) return null;
  return {
    fetched: Date.now(),
    hours: (h.time as number[]).map((t, i) => ({
      time: new Date(t * 1000),
      total: h.cloud_cover?.[i] ?? 0,
      low: h.cloud_cover_low?.[i] ?? 0,
      mid: h.cloud_cover_mid?.[i] ?? 0,
      high: h.cloud_cover_high?.[i] ?? 0,
      rain: h.precipitation_probability?.[i] ?? 0,
    })),
  };
}

export function getForecast(place: Place): Promise<Forecast | null> {
  const [lat, lon] = [round1(place.lat), round1(place.lon)];
  const key = `${lat},${lon}`;
  const hit = memory.get(key);
  if (hit) return hit;
  const p = download(lat, lon).catch(() => null);
  memory.set(key, p);
  // Si falla, s'oblida per poder reintentar; si va bé, caduca al cap d'una hora
  p.then((r) => (r ? setTimeout(() => memory.delete(key), TTL) : memory.delete(key)));
  return p;
}

export type ForecastState = { status: 'loading' } | { status: 'ok'; data: Forecast } | { status: 'error' };

export function useForecast(place: Place | null): ForecastState {
  const [state, setState] = useState<ForecastState>({ status: 'loading' });
  const key = place ? `${round1(place.lat)},${round1(place.lon)}` : '';
  useEffect(() => {
    if (!place) return;
    let alive = true;
    setState({ status: 'loading' });
    getForecast(place).then((data) => alive && setState(data ? { status: 'ok', data } : { status: 'error' }));
    return () => {
      alive = false;
    };
  }, [key]);
  return state;
}

// ── Valoració de la nit ────────────────────────────────────

export type Rating = 'bona' | 'regular' | 'dolenta';

export interface NightOutlook {
  rating: Rating;
  /** Nuvolositat efectiva mitjana de la nit (%) */
  clouds: number;
  /** Hores de la nit amb la seva nuvolositat efectiva */
  hours: { time: Date; clouds: number; rain: number }[];
  /** Millor hora (la menys ennuvolada), si la nit no és uniforme */
  best: Date | null;
  rain: number;
}

/**
 * Els núvols alts (cirrus) són prims i deixen veure les estrelles més brillants: compten la meitat.
 * Els baixos i mitjans tapen el cel del tot.
 */
export const effectiveClouds = (h: CloudHour) => Math.min(100, Math.max(h.low, h.mid, h.high * 0.5, h.total * 0.6));

/** Valoració de les hores de foscor entre `from` i `to` (com a molt les 6 primeres) */
export function nightOutlook(f: Forecast, from: Date, to: Date): NightOutlook | null {
  const end = Math.min(to.getTime(), from.getTime() + 6 * 3_600_000);
  const hours = f.hours
    .filter((h) => h.time.getTime() >= from.getTime() - 30 * 60_000 && h.time.getTime() <= end)
    .map((h) => ({ time: h.time, clouds: Math.round(effectiveClouds(h)), rain: h.rain }));
  if (!hours.length) return null;
  const clouds = Math.round(hours.reduce((s, h) => s + h.clouds, 0) / hours.length);
  const rain = Math.max(...hours.map((h) => h.rain));
  const rating: Rating = rain >= 50 || clouds > 65 ? 'dolenta' : clouds > 30 ? 'regular' : 'bona';
  const min = hours.reduce((a, b) => (b.clouds < a.clouds ? b : a));
  const best = rating !== 'bona' && min.clouds <= 30 && clouds - min.clouds >= 20 ? min.time : null;
  return { rating, clouds, hours, best, rain };
}
