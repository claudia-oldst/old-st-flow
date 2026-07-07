/**
 * Distribute a total amount across n rows as evenly as possible, with the
 * remainder added to the first row.
 */
export function evenSplit(total: number, n: number): number[] {
  if (n === 0) return [];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  const out = new Array(n).fill(base);
  if (out.length > 0) out[0] += remainder;
  return out;
}

/** Combine hours + minutes strings into decimal hours. Empty = 0. */
export function hoursMinutesToDecimal(h: string, m: string): number {
  const hn = parseInt(h, 10);
  const mn = parseInt(m, 10);
  const hours = Number.isFinite(hn) && hn > 0 ? hn : 0;
  const mins = Number.isFinite(mn) && mn > 0 ? mn : 0;
  return Math.round((hours + mins / 60) * 10000) / 10000;
}

/** Split a decimal-hours value into whole hours + whole minutes (rounded). */
export function decimalToHoursMinutes(dec: number): { h: number; m: number } {
  if (!Number.isFinite(dec) || dec <= 0) return { h: 0, m: 0 };
  const totalMinutes = Math.round(dec * 60);
  return { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 };
}
