/** Pure helpers for the client portal Billing tab. All values are hours. */

export interface BillingEpic {
  /** null = the "No Epic" bucket. */
  id: number | null;
  epic_name: string | null;
  original_std: number | null;
  original_cr: number | null;
  original_bug: number | null;
  revised: number | null;
  revised_std?: number | null;
  revised_cr?: number | null;
  revised_bug?: number | null;
}

/** Hours split by ticket type. */
export interface Split { std: number; cr: number; bug: number }
const zero = (): Split => ({ std: 0, cr: 0, bug: 0 });
const addSplit = (a: Split, b: Split) => { a.std += b.std; a.cr += b.cr; a.bug += b.bug; };

export interface BillingPayload {
  project: { id: string; name: string; rate_per_hour: number; start_date: string | null; cutoff: string };
  epics: BillingEpic[];
  logs: { epic_id: number | null; month: string; hours: number; std?: number | null; cr?: number | null; bug?: number | null }[];
  /** Discount/unbilled hours per epic per month (month the discount was applied). */
  discounts?: { epic_id: number | null; month: string; hours: number }[];
}

export interface BillingRow {
  id: number | null;
  name: string;
  std: number;
  cr: number;
  bug: number;
  original: number;
  revised: number;
  rStd: number;
  rCr: number;
  rBug: number;
  months: Record<string, number>;
  /** Logged hours per month split by ticket type. */
  splitMonths: Record<string, Split>;
  actual: number;
  actualSplit: Split;
  /** Discount hours per month. */
  discountMonths: Record<string, number>;
  /** Whole-project discount hours. */
  discount: number;
  /** actual - discount (whole project). */
  grand: number;
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

const group = (list: { epic_id: number | null; month: string; hours: number }[]) => {
  const byEpic = new Map<number | null, Record<string, number>>();
  for (const l of list) {
    const m = byEpic.get(l.epic_id) ?? {};
    m[l.month] = (m[l.month] ?? 0) + Number(l.hours);
    byEpic.set(l.epic_id, m);
  }
  return byEpic;
};

export function buildRows(p: BillingPayload): BillingRow[] {
  const byEpic = group(p.logs);
  const splitByEpic = new Map<number | null, Record<string, Split>>();
  for (const l of p.logs) {
    const m = splitByEpic.get(l.epic_id) ?? {};
    const cur = (m[l.month] ??= zero());
    addSplit(cur, { std: Number(l.std ?? 0), cr: Number(l.cr ?? 0), bug: Number(l.bug ?? 0) });
    splitByEpic.set(l.epic_id, m);
  }
  const discByEpic = group(p.discounts ?? []);
  const sum = (m: Record<string, number>) => Object.values(m).reduce((s, h) => s + h, 0);
  return p.epics.map((e) => {
    const std = Number(e.original_std ?? 0);
    const cr = Number(e.original_cr ?? 0);
    const bug = Number(e.original_bug ?? 0);
    const months = byEpic.get(e.id) ?? {};
    const discountMonths = discByEpic.get(e.id) ?? {};
    const actual = sum(months);
    const splitMonths = splitByEpic.get(e.id) ?? {};
    const actualSplit = zero();
    Object.values(splitMonths).forEach((x) => addSplit(actualSplit, x));
    const discount = sum(discountMonths);
    return {
      id: e.id,
      name: e.id === null ? "No Epic" : e.epic_name ?? "Untitled epic",
      std, cr, bug,
      original: std + cr + bug,
      revised: Number(e.revised ?? 0),
      rStd: Number(e.revised_std ?? 0),
      rCr: Number(e.revised_cr ?? 0),
      rBug: Number(e.revised_bug ?? 0),
      months,
      splitMonths,
      actual,
      actualSplit,
      discountMonths,
      discount,
      grand: actual - discount,
    };
  });
}

/** Column-wise totals across rows (same shape as a row). */
export function totalRow(rows: BillingRow[]): BillingRow {
  const t: BillingRow = { id: null, name: "Total", std: 0, cr: 0, bug: 0, original: 0, revised: 0, rStd: 0, rCr: 0, rBug: 0, months: {}, splitMonths: {}, actual: 0, actualSplit: zero(), discountMonths: {}, discount: 0, grand: 0 };
  for (const r of rows) {
    t.std += r.std; t.cr += r.cr; t.bug += r.bug;
    t.original += r.original; t.revised += r.revised; t.rStd += r.rStd; t.rCr += r.rCr; t.rBug += r.rBug; t.actual += r.actual;
    t.discount += r.discount; t.grand += r.grand;
    for (const [m, h] of Object.entries(r.months)) t.months[m] = (t.months[m] ?? 0) + h;
    for (const [m, x] of Object.entries(r.splitMonths)) addSplit((t.splitMonths[m] ??= zero()), x);
    addSplit(t.actualSplit, r.actualSplit);
    for (const [m, h] of Object.entries(r.discountMonths)) t.discountMonths[m] = (t.discountMonths[m] ?? 0) + h;
  }
  return t;
}

export const fmtHours = (h: number) => String(Math.round(h * 10) / 10);

/** Monthly billed hours after discounts: month total minus that month's discount. */
export const grandMonth = (total: BillingRow, m: string) => (total.months[m] ?? 0) - (total.discountMonths[m] ?? 0);

/** True when the project has any discount/unbilled hours at all (whole project, all months). */
export const hasDiscounts = (total: BillingRow) =>
  Math.abs(total.discount) > 0.005 || Object.values(total.discountMonths).some((h) => Math.abs(h) > 0.005);
