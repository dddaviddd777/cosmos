import { describe, expect, it } from 'vitest';
import { alertText, dueAlerts, eventsToIcs, relativeDay, worthAlert } from './alerts';
import type { SkyEvent } from './events';

const ev = (over: Partial<SkyEvent> = {}): SkyEvent => ({
  id: 'pluja-gem-2026',
  date: new Date('2026-12-14T07:00:00Z'),
  kind: 'pluja',
  title: 'Gemínides, la millor pluja d’estels de l’any',
  text: 'Fins a 120 estels per hora, des d’un lloc fosc; mira lluny de la Lluna.',
  bodies: [],
  visible: true,
  look: { time: new Date('2026-12-13T23:00:00Z'), where: 'cap a l’est' },
  big: true,
  ...over,
});

describe('calendari .ics', () => {
  const ics = eventsToIcs([ev()], new Date('2026-11-17T12:00:00Z'));

  it('té l’estructura i les hores en UTC', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('DTSTART:20261213T230000Z');
    expect(ics).toContain('DTEND:20261214T000000Z');
    expect(ics).toContain('TRIGGER:-PT1H');
    expect(ics).toContain('UID:pluja-gem-2026@cosmos');
  });

  it('escapa comes i punts i coma, i cap línia passa de 75 octets', () => {
    expect(ics).toContain('Fins a 120 estels per hora\\, des d’un lloc fosc\\;');
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});

describe('avisos', () => {
  const now = new Date('2026-12-13T10:00:00Z');

  it('avisa dels destacats que són a prop, un sol cop', () => {
    expect(dueAlerts([ev()], now, new Set())).toHaveLength(1);
    expect(dueAlerts([ev()], now, new Set(['pluja-gem-2026']))).toHaveLength(0);
    // Massa lluny
    expect(dueAlerts([ev()], new Date('2026-12-11T10:00:00Z'), new Set())).toHaveLength(0);
  });

  it('no avisa del que no es veurà ni de les fases de la Lluna', () => {
    expect(worthAlert(ev({ visible: false }))).toBe(false);
    expect(worthAlert(ev({ kind: 'lluna', big: false }))).toBe(false);
  });

  it('el text diu quan, cap on i com estarà el cel', () => {
    const t = alertText(ev(), now, { rating: 'bona', clouds: 10 });
    expect(t).toMatch(/^Aquesta nit cap a les \d\d:\d\d, mirant cap a l’est\. Previsió: cel serè \(10 % de núvols\)\.$/);
  });

  it('la matinada és «aquesta nit»', () => {
    const at = (h: number, d = 13) => new Date(2026, 11, d, h, 0);
    const n = at(10);
    expect(relativeDay(at(22), n)).toBe('Aquesta nit');
    expect(relativeDay(at(2, 14), n)).toBe('Aquesta nit');
    expect(relativeDay(at(15), n)).toBe('Avui');
    expect(relativeDay(at(21, 14), n)).toBe('Demà a la nit');
    expect(relativeDay(at(3, 15), n)).toBe('Demà a la nit');
    expect(relativeDay(at(12, 14), n)).toBe('Demà');
  });
});

describe('avís de l’Estació Espacial', () => {
  const pass = {
    start: new Date('2026-11-19T17:35:00Z'), startAz: 300, peak: new Date('2026-11-19T17:37:00Z'), peakAlt: 41.6, peakAz: 0,
    end: new Date('2026-11-19T17:40:00Z'), endAz: 60, visible: true, minutes: 5,
  };
  it('diu quan falta i per on surt', async () => {
    const { passAlertText, passEvent } = await import('./alerts');
    const t = passAlertText(pass, new Date('2026-11-19T17:25:00Z'));
    expect(t.title).toBe('L’Estació Espacial passa d’aquí a 10 minuts');
    expect(t.body).toMatch(/^Apareixerà pel nord-oest a les \d\d:\d\d, pujarà fins a 42° i es perdrà pel nord-est\./);
    const e = passEvent(pass);
    expect(e.look?.where).toBe('cap al nord-oest');
    expect(eventsToIcs([e])).toContain('DTSTART:20261119T173500Z');
  });
});
