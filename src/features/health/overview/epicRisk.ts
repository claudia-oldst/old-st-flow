import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Status } from "@/lib/types";

export interface EpicLite {
  id: number;
  epic_name: string | null;
}

export type Risk = "at_risk" | "watch" | "healthy";

export type SortKey =
  | "originalEst"
  | "currentEst"
  | "actualHours"
  | "delta"
  | "burnPct"
  | "progressPct"
  | "name";

export interface EpicRiskRow {
  epicId: number;
  name: string;
  total: number;
  done: number;
  devDone: number;
  active: number;
  backlog: number;
  currentEst: number;
  originalEst: number;
  baselineEst: number;
  actualHours: number;
  delta: number;
  burnPct: number;
  progressPct: number;
  risk: Risk;
}

export const SORT_LABELS: Record<SortKey, string> = {
  originalEst: "Original Estimate Size",
  currentEst: "Current Estimate Size",
  actualHours: "Actual Logs",
  delta: "Current vs Original Delta",
  burnPct: "% Burned",
  progressPct: "% Done",
  name: "A-Z",
};

export function computeRisk(row: Omit<EpicRiskRow, "risk">): Risk {
  const { burnPct, done, devDone, active, backlog, total, baselineEst, actualHours } = row;
  if (total === 0) return "healthy";
  if (baselineEst === 0) return actualHours > 0 ? "at_risk" : "healthy";
  const effectiveProgress = ((done + devDone + active * 0.3) / total) * 100;
  const burnAhead = burnPct - effectiveProgress;
  if (burnAhead > 35) return "at_risk";
  if (burnAhead > 15 || (backlog / total > 0.7 && burnPct > 25)) return "watch";
  return "healthy";
}

/** Aggregate per-epic doneness/burn rows and sort them. */
export function buildEpicRiskRows(
  tickets: TicketRow[],
  statuses: Status[],
  epics: EpicLite[],
  sort: { key: SortKey; dir: "asc" | "desc" },
): EpicRiskRow[] {
  const catById = new Map<string, string>();
  for (const s of statuses) catById.set(s.id, s.category);

  const result: EpicRiskRow[] = [];
  for (const e of epics) {
    const epicTickets = tickets.filter(
      (t) => t.epic_id === e.id && !(t.ticket_type === "CR" && t.cr_approval !== "approved"),
    );
    let done = 0,
      devDone = 0,
      active = 0,
      backlog = 0;
    let currentEst = 0;
    let originalEst = 0;
    let actualHours = 0;
    for (const t of epicTickets) {
      const cat = t.status_id ? catById.get(t.status_id) : undefined;
      if (cat === "done") done++;
      else if (cat === "dev done") devDone++;
      else if (cat === "active") active++;
      else if (cat === "backlog") backlog++;
      currentEst += t.current_fe_estimate + t.current_be_estimate + t.current_project_estimate;
      originalEst +=
        (t.original_fe_estimate ?? 0) +
        (t.original_be_estimate ?? 0) +
        (t.original_project_estimate ?? 0);
      actualHours += t.actual_frontend_hours + t.actual_backend_hours + t.actual_project_hours;
    }
    // Exclude unknown-status tickets from totals used for risk math.
    const total = done + devDone + active + backlog;
    if (total === 0) continue;
    // Burn is measured against the ORIGINAL baseline; fall back to current
    // when no original estimate was ever captured.
    const baselineEst = originalEst > 0 ? originalEst : currentEst;
    // Uncapped: a 900%-burned epic must not read the same as a 160% one.
    const burnPct = baselineEst === 0 ? 0 : (actualHours / baselineEst) * 100;
    const progressPct = ((done + devDone) / total) * 100;
    const base = {
      epicId: e.id,
      name: e.epic_name ?? "Untitled epic",
      total,
      done,
      devDone,
      active,
      backlog,
      currentEst,
      originalEst,
      baselineEst,
      actualHours,
      delta: currentEst - originalEst,
      burnPct,
      progressPct,
    };
    result.push({ ...base, risk: computeRisk(base) });
  }

  result.sort((a, b) => {
    const dir = sort.dir === "asc" ? 1 : -1;
    if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
    return (a[sort.key] - b[sort.key]) * dir;
  });
  return result;
}
