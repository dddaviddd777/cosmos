import { formatDate } from '../astro/format';

export const SPEEDS = [
  { label: 'Temps real', daysPerSec: 1 / 86_400 },
  { label: '1 hora/s', daysPerSec: 1 / 24 },
  { label: '1 dia/s', daysPerSec: 1 },
  { label: '1 setmana/s', daysPerSec: 7 },
  { label: '1 mes/s', daysPerSec: 30.44 },
  { label: '1 any/s', daysPerSec: 365.25 },
] as const;

interface Props {
  date: Date;
  direction: -1 | 0 | 1;
  speedIndex: number;
  onDirection: (d: -1 | 0 | 1) => void;
  onSpeed: (i: number) => void;
  onNow: () => void;
  onDate: (d: Date) => void;
}

/** Data → valor per a <input type="datetime-local"> en hora local */
const toLocalInput = (d: Date) => {
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

export function TimeBar({ date, direction, speedIndex, onDirection, onSpeed, onNow, onDate }: Props) {
  return (
    <div className="timebar" role="group" aria-label="Control del temps">
      <div className="timebar__date">{formatDate(date)}</div>
      <div className="timebar__controls">
        <button className={direction === -1 ? 'active' : ''} onClick={() => onDirection(-1)} aria-label="Retrocedir">◀</button>
        <button className={direction === 0 ? 'active' : ''} onClick={() => onDirection(0)} aria-label="Pausa">❚❚</button>
        <button className={direction === 1 ? 'active' : ''} onClick={() => onDirection(1)} aria-label="Avançar">▶</button>
        <select value={speedIndex} onChange={(e) => onSpeed(Number(e.target.value))} aria-label="Velocitat">
          {SPEEDS.map((s, i) => (
            <option key={s.label} value={i}>{s.label}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={toLocalInput(date)}
          onChange={(e) => {
            const d = new Date(e.target.value);
            if (!Number.isNaN(d.getTime())) onDate(d);
          }}
          aria-label="Anar a una data"
        />
        <button onClick={onNow}>Ara</button>
      </div>
    </div>
  );
}
