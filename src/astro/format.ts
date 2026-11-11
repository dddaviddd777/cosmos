const nf0 = new Intl.NumberFormat('ca', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('ca', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
/** 2 xifres significatives com a mínim: «8,1», «81», «23.650» */
const big = (v: number) => v.toLocaleString('ca', { maximumFractionDigits: v < 10 ? 1 : 0 });
const nf3 = new Intl.NumberFormat('ca', { maximumFractionDigits: 3, minimumFractionDigits: 3 });

/** 225.300.000 km → «225,3 milions de km» */
export function formatKm(km: number): string {
  if (km >= 1e18) return `${big(km / 1e18)} trilions de km`;
  if (km >= 1e12) return `${big(km / 1e12)} bilions de km`;
  if (km >= 1e9) return `${nf2.format(km / 1e9)} mil milions de km`;
  if (km >= 1e6) return `${nf2.format(km / 1e6)} milions de km`;
  return `${nf0.format(km)} km`;
}

export function formatAu(au: number): string {
  return `${nf3.format(au)} UA`;
}

/** Temps de llum en format llegible: «8 min 19 s», «1 h 12 min», «1,3 s». */
export function formatLightTime(minutes: number): string {
  const days = minutes / 1440;
  if (days >= 730) return formatYears(days / 365.25);
  if (days >= 2) return `${nf0.format(days)} dies`;
  const totalSeconds = minutes * 60;
  if (totalSeconds < 60) return `${totalSeconds.toLocaleString('ca', { maximumFractionDigits: 1 })} s`;
  if (minutes < 60) {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return s === 60 ? `${m + 1} min` : `${m} min ${s} s`;
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes - h * 60);
  return m === 60 ? `${h + 1} h` : `${h} h ${m} min`;
}

/** «8,6 anys», «2.600 anys», «2,5 milions d’anys» */
export function formatYears(years: number): string {
  if (years >= 1e6) return `${big(years / 1e6)} milions d’anys`;
  return `${years.toLocaleString('ca', { maximumFractionDigits: years < 100 ? 1 : 0 })} anys`;
}

/** «8,6 anys llum», «2,5 milions d’anys llum» */
export const formatLy = (ly: number): string => `${formatYears(ly)} llum`;

/** Període orbital: «436 dies», «4,6 anys», «2.440 anys» */
export function formatPeriod(days: number): string {
  if (days < 730) return `${nf0.format(days)} dies`;
  const years = days / 365.25;
  return `${years.toLocaleString('ca', { maximumFractionDigits: years < 100 ? 1 : 0 })} anys`;
}

const monthYearFmt = new Intl.DateTimeFormat('ca', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayMonthYearFmt = new Intl.DateTimeFormat('ca', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatMonthYear(d: Date): string {
  return monthYearFmt.format(d);
}

export function formatDay(d: Date): string {
  return dayMonthYearFmt.format(d);
}

const dateFmt = new Intl.DateTimeFormat('ca', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(d: Date): string {
  return dateFmt.format(d);
}
