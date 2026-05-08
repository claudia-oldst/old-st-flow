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
