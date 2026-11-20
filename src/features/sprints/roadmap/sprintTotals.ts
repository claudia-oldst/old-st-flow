import type { SprintDiscipline } from "../types";
import type { Commitment, SprintLite } from "./cellRules";
import { isClosed } from "./cellRules";

export interface TotalsTicket {
  id: string;
  current_fe_estimate: number;
  current_be_estimate: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  assignees: Array<{ user_id: string; slot: string }>;
}

export interface Planned { ticket_id: string; planned_sprint_fe_id: string | null; planned_sprint_be_id: string | null }

export interface Load { committed: number; unplanned: number; planned: number; committedCount: number; unplannedCount: number; plannedCount: number }
const empty = (): Load => ({ committed: 0, unplanned: 0, planned: 0, committedCount: 0, unplannedCount: 0, plannedCount: 0 });

/** Hours that count for a ticket: remaining (estimate − actual, min 0); closed sprints use the estimate. */
export function hoursFor(t: TotalsTicket, d: SprintDiscipline, closed: boolean): number {
  const est = d === "FE" ? t.current_fe_estimate || 0 : t.current_be_estimate || 0;
  if (closed) return est;
  const act = d === "FE" ? t.actual_frontend_hours || 0 : t.actual_backend_hours || 0;
  return Math.max(0, est - act);
}

export interface SprintTotals {
  sprint: Record<SprintDiscipline, Load>;
  /** user_id → discipline → load */
  perDev: Map<string, Record<SprintDiscipline, Load>>;
}

/** Committed / planned hours for one sprint, overall and per assigned developer. */
export function sprintTotals(
  sprint: SprintLite,
  tickets: TotalsTicket[],
  commitments: Commitment[],
  planned: Planned[],
  today: string,
): SprintTotals {
  const closed = isClosed(sprint, today);
  const byId = new Map(tickets.map((t) => [t.id, t]));
  const out: SprintTotals = { sprint: { FE: empty(), BE: empty() }, perDev: new Map() };
  const committedKeys = new Set<string>();
  const add = (t: TotalsTicket, d: SprintDiscipline, kind: "committed" | "planned", unplanned = false) => {
    const h = hoursFor(t, d, closed);
    const bump = (l: Load) => {
      if (kind === "committed") {
        l.committed += h; l.committedCount += 1;
        if (unplanned) { l.unplanned += h; l.unplannedCount += 1; }
      } else { l.planned += h; l.plannedCount += 1; }
    };
    bump(out.sprint[d]);
    t.assignees.filter((a) => a.slot === d).forEach((a) => {
      const cur = out.perDev.get(a.user_id) ?? { FE: empty(), BE: empty() };
      bump(cur[d]);
      out.perDev.set(a.user_id, cur);
    });
  };
  commitments.forEach((c) => {
    if (c.sprint_id !== sprint.id) return;
    const t = byId.get(c.ticket_id);
    if (!t || (c.discipline !== "FE" && c.discipline !== "BE")) return;
    committedKeys.add(`${c.ticket_id}:${c.discipline}`);
    add(t, c.discipline, "committed", c.unplanned);
  });
  planned.forEach((p) => {
    const t = byId.get(p.ticket_id);
    if (!t) return;
    (["FE", "BE"] as const).forEach((d) => {
      const pid = d === "FE" ? p.planned_sprint_fe_id : p.planned_sprint_be_id;
      if (pid !== sprint.id || committedKeys.has(`${p.ticket_id}:${d}`)) return;
      add(t, d, "planned");
    });
  });
  return out;
}
