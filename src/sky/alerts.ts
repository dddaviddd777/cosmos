/**
 * Avisos dels esdeveniments del cel:
 *  - fitxer de calendari (.ics) amb recordatori: arriba encara que l'app estigui tancada;
 *  - notificació quan s'obre l'app, si un esdeveniment destacat és a prop (amb la previsió de núvols).
 * Una web publicada sense servidor no pot enviar avisos tota sola amb l'app tancada: per això el calendari.
 */
import type { SkyEvent } from './events';
import { skyEvents } from './events';
import { loadPlace, PLACE_PRESETS } from './hooks';
import type { Place } from './sky';
import { getForecast, nightOutlook } from './weather';
import { refreshTle, upcomingPass, type IssPass } from './iss';
import { cardinal } from './sky';

const HOUR = 3_600_000;

/** Moment en què val la pena mirar-ho (o el moment de l'esdeveniment) */
export const whenToLook = (e: SkyEvent) => e.look?.time ?? e.date;

/** Els que mereixen un avís: destacats i visibles des d'aquí */
export const worthAlert = (e: SkyEvent) =>
  e.visible !== false && (e.big === true || e.kind === 'eclipsi' || e.kind === 'pluja' || e.kind === 'oposicio' || e.kind === 'trobada');

// ── Calendari (.ics) ──────────────────────────────────────

const icsTime = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Les línies llargues es parteixen a 75 octets, com demana el format */
function fold(line: string): string {
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 73) {
      out.push(cur);
      cur = ' ' + ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
}

const hm = (d: Date) => d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });

export function eventsToIcs(events: SkyEvent[], stamp = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cosmos//Calendari del cel//CA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    const start = whenToLook(e);
    const desc = [e.text, e.look ? `Mira-ho ${e.look.where} cap a les ${hm(e.look.time)}.` : ''].filter(Boolean).join('\n\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@cosmos`,
      `DTSTAMP:${icsTime(stamp)}`,
      `DTSTART:${icsTime(start)}`,
      `DTEND:${icsTime(new Date(start.getTime() + HOUR))}`,
      `SUMMARY:${icsText(`🔭 ${e.title}`)}`,
      `DESCRIPTION:${icsText(desc)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsText(e.title)}`,
      'TRIGGER:-PT1H',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Baixa el fitxer: el mòbil o l'ordinador l'obren amb l'app de calendari */
export function downloadIcs(events: SkyEvent[], name: string): void {
  const blob = new Blob([eventsToIcs(events)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ── Notificacions ─────────────────────────────────────────

export const ALERTS_KEY = 'cosmos.alerts';
const SEEN_KEY = 'cosmos.alerts.seen';

/** Esdeveniments que toca avisar ara: d'aquí a 30 h com a molt (o fa menys de 2 h), i no avisats abans */
export function dueAlerts(events: SkyEvent[], now: Date, seen: Set<string>): SkyEvent[] {
  return events.filter((e) => {
    const dt = whenToLook(e).getTime() - now.getTime();
    return worthAlert(e) && dt > -2 * HOUR && dt < 30 * HOUR && !seen.has(e.id);
  });
}

const CLOUD_TEXT = { bona: 'cel serè', regular: 'alguns núvols', dolenta: 'molt tapat' } as const;

/** «Aquesta nit», «Avui», «Demà a la nit»… La matinada compta com la nit anterior. */
export function relativeDay(t: Date, now: Date): string {
  const night = t.getHours() >= 18 || t.getHours() < 7;
  // Dia «de calendari nocturn»: la matinada pertany al vespre del dia abans
  const base = new Date(t.getTime() - (t.getHours() < 7 ? 12 * HOUR : 0));
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const d = Math.round((day(night ? base : t) - day(now)) / 86_400_000);
  if (d <= 0) return night ? 'Aquesta nit' : 'Avui';
  if (d === 1) return night ? 'Demà a la nit' : 'Demà';
  return t.toLocaleDateString('ca', { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase());
}

/** Text de l'avís, amb el moment, cap on mirar i (si n'hi ha) la previsió de núvols */
export function alertText(e: SkyEvent, now: Date, outlook: { rating: keyof typeof CLOUD_TEXT; clouds: number } | null): string {
  const t = whenToLook(e);
  const when = `${relativeDay(t, now)} cap a les ${hm(t)}`;
  const where = e.look ? `, mirant ${e.look.where}` : '';
  const sky = outlook ? ` Previsió: ${CLOUD_TEXT[outlook.rating]} (${outlook.clouds} % de núvols).` : '';
  return `${when}${where}.${sky}`;
}

export const alertsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export function alertsEnabled(): boolean {
  try {
    return localStorage.getItem(ALERTS_KEY) === '1' && alertsSupported() && Notification.permission === 'granted';
  } catch {
    return false;
  }
}

function loadSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]');
  } catch {
    return [];
  }
}

async function notify(title: string, body: string, tag: string, url = '#/aquesta-nit/esdeveniments'): Promise<void> {
  const opts: NotificationOptions = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png', data: { url } };
  // Al mòbil cal passar pel service worker; a l'ordinador també funciona directament
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (reg) await reg.showNotification(title, opts);
  else new Notification(title, opts);
}

let running = false;

/** Comprova si hi ha res a avisar i ho avisa (un sol cop per esdeveniment). */
export async function checkAlerts(now = new Date()): Promise<number> {
  if (running || !alertsEnabled()) return 0;
  running = true;
  try {
    const place: Place = loadPlace() ?? PLACE_PRESETS[0];
    const seenList = loadSeen();
    const due = dueAlerts(skyEvents(new Date(now.getTime() - 3 * HOUR), place, 2, 2), now, new Set(seenList));
    if (!due.length) return 0;
    const forecast = await getForecast(place).catch(() => null);
    for (const e of due) {
      const t = whenToLook(e);
      const o = forecast ? nightOutlook(forecast, new Date(t.getTime() - HOUR), new Date(t.getTime() + 3 * HOUR)) : null;
      await notify(e.title, alertText(e, now, o), e.id);
      seenList.push(e.id);
    }
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(seenList.slice(-60)));
    } catch {
      /* sense emmagatzematge */
    }
    return due.length;
  } finally {
    running = false;
  }
}

// ── Estació Espacial ──────────────────────────────────────

const fromDir = (az: number) => {
  const c = cardinal(az);
  return /^[eo]/.test(c) ? `per l’${c}` : `pel ${c}`;
};

/** Un pas de l'ISS com a esdeveniment (per al calendari) */
export function passEvent(p: IssPass): SkyEvent {
  return {
    id: `iss-${p.start.getTime()}`,
    date: p.start,
    kind: 'trobada',
    title: 'Passa l’Estació Espacial Internacional',
    text: `Apareix ${fromDir(p.startAz)}, puja fins a ${Math.round(p.peakAlt)}° i es perd ${fromDir(p.endAz)}. Es veu uns ${p.minutes} minuts: un punt molt brillant que es mou de pressa, sense parpellejar.`,
    bodies: ['iss'],
    visible: true,
    look: { time: p.start, where: fromDir(p.startAz).replace(/^per l’/, 'cap a l’').replace(/^pel /, 'cap al ') },
  };
}

/** Text de l'avís d'un pas que comença aviat */
export function passAlertText(p: IssPass, now: Date): { title: string; body: string } {
  const min = Math.max(0, Math.round((p.start.getTime() - now.getTime()) / 60_000));
  return {
    title: min <= 1 ? 'L’Estació Espacial passa ara!' : `L’Estació Espacial passa d’aquí a ${min} minuts`,
    body: `Apareixerà ${fromDir(p.startAz)} a les ${hm(p.start)}, pujarà fins a ${Math.round(p.peakAlt)}° i es perdrà ${fromDir(p.endAz)}. Es veu uns ${p.minutes} min.`,
  };
}

/** Avisa uns 10 minuts abans d'un pas visible de l'ISS (si els avisos estan activats i l'app és oberta) */
export async function checkIssAlert(now = new Date()): Promise<boolean> {
  if (!alertsEnabled()) return false;
  await refreshTle();
  const place: Place = loadPlace() ?? PLACE_PRESETS[0];
  const p = upcomingPass(place, now, 15);
  if (!p || p.end < now) return false;
  const id = `iss-${Math.round(p.start.getTime() / 60_000)}`;
  const seen = loadSeen();
  if (seen.includes(id)) return false;
  const { title, body } = passAlertText(p, now);
  await notify(title, body, id, '#/cos/iss');
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id].slice(-60)));
  } catch {
    /* sense emmagatzematge */
  }
  return true;
}
