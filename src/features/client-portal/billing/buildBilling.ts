/** Pure helpers for the client portal Billing tab. All values are hours. */

export interface BillingEpic {
  id: number;
  epic_name: string | null;
  original_std: number | null;
  original_cr: number | null;
  original_bug: number | null;
  revised: number | null;
}

export interface BillingPayload {
  project: { id: string; name: string; rate_per_hour: number; start_date: string | null; cutoff: string };
  epics: BillingEpic[];
  logs: { epic_id: number | null; month: string; hours: number }[];
}

export interface BillingRow {
  id: number | null;
  name: string;
  std: number;
  cr: number;
  bug: number;
  original: number;
  revised: number;
  months: Record<string, number>;
  actual: number;
}

const ym = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/** Every "YYYY-MM" from the start month to the cutoff month, inclusive. */
export function monthRange(start: string | null, cutoff: string, firstLog?: string): string[] {
  const end = ym(new Date(cutoff));
  let cur = start ? start.slice(0, 7) : firstLog ?? end;
  if (cur > end) cur = end;
  const out: string[] = [];
  while (cur <= end) {
    out.push(cur);
    const [y, m] = cur.split("-").map(Number);
    cur = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  return out;
}

/** Default month selection: the most recent `n` months up to the cutoff. */
export const defaultMonths = (months: string[], n = 5) => months.slice(-n);

export function buildRows(p: BillingPayload): BillingRow[] {
  const byEpic = new Map<number | null, Record<string, number>>();
  for (const l of p.logs) {
    const m = byEpic.get(l.epic_id) ?? {};
    m[l.month] = (m[l.month] ?? 0) + Number(l.hours);
    byEpic.set(l.epic_id, m);
  }
  const sum = (m: Record<string, number>) => Object.values(m).reduce((s, h) => s + h, 0);
  return p.epics.map((e) => {
    const std = Number(e.original_std ?? 0);
    const cr = Number(e.original_cr ?? 0);
    const bug = Number(e.original_bug ?? 0);
    const months = byEpic.get(e.id) ?? {};
    return {
      id: e.id,
      name: e.epic_name ?? "Untitled epic",
      std, cr, bug,
      original: std + cr + bug,
      revised: Number(e.revised ?? 0),
      months,
      actual: sum(months),
    };
  });
}

/** Column-wise totals across rows (same shape as a row). */
export function totalRow(rows: BillingRow[]): BillingRow {
  const t: BillingRow = { id: null, name: "Total", std: 0, cr: 0, bug: 0, original: 0, revised: 0, months: {}, actual: 0 };
  for (const r of rows) {
    t.std += r.std; t.cr += r.cr; t.bug += r.bug;
    t.original += r.original; t.revised += r.revised; t.actual += r.actual;
    for (const [m, h] of Object.entries(r.months)) t.months[m] = (t.months[m] ?? 0) + h;
  }
  return t;
}

export const fmtHours = (h: number) => `${(Math.round(h * 10) / 10).toFixed(1)}`;
