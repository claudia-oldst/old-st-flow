/**
 * Discount application helpers.
 *
 * Discounts are recorded at the (epic, discipline) level. They reduce the
 * billable / "effective" hours displayed across Health, Estimate Revisions,
 * CR views, and the client portal. Estimates and actuals on tickets remain
 * untouched at the source — discounts are applied only at display time.
 *
 * Display invariant:  Effective Actual = max(0, Actual − Discounted)
 *                     Estimate stays the raw current estimate.
 */

export type Discipline = "FE" | "BE" | "Project";

export interface EpicDiscount {
  id: string;
  project_id: string;
  epic_id: number;
  discipline: Discipline;
  hours: number;
  reason: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisciplineTotals {
  FE: number;
  BE: number;
  Project: number;
}

const ZERO: DisciplineTotals = { FE: 0, BE: 0, Project: 0 };

export function discountTotalsByDiscipline(discounts: EpicDiscount[]): DisciplineTotals {
  const out: DisciplineTotals = { ...ZERO };
  for (const d of discounts) {
    out[d.discipline] = (out[d.discipline] ?? 0) + Number(d.hours);
  }
  return out;
}

export function discountTotalsByEpic(
  discounts: EpicDiscount[],
): Map<number, DisciplineTotals> {
  const map = new Map<number, DisciplineTotals>();
  for (const d of discounts) {
    const cur = map.get(d.epic_id) ?? { ...ZERO };
    cur[d.discipline] = (cur[d.discipline] ?? 0) + Number(d.hours);
    map.set(d.epic_id, cur);
  }
  return map;
}

export const sumTotals = (t: DisciplineTotals) => t.FE + t.BE + t.Project;

/** Discounts that existed at or before the given timestamp. */
export function discountsBefore<T extends { created_at: string }>(
  discounts: T[],
  cutoffMs: number,
): T[] {
  return discounts.filter((d) => new Date(d.created_at).getTime() <= cutoffMs);
}
