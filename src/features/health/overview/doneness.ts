import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { DisciplineStatus, Status } from "@/lib/types";
import { CATEGORY_TO_DISCIPLINE } from "@/features/board/board/constants";

export type Doneness = Record<DisciplineStatus, number>;
export type DonenessDiscipline = "FE" | "BE" | "Project";
export type DonenessBasis = "current" | "original";

/** Filled segments, clockwise from 12 o'clock. To Do is the empty track. */
export const DONENESS_SEGMENTS: { key: Exclude<DisciplineStatus, "todo">; label: string; color: string }[] = [
  { key: "in_progress", label: "In Progress", color: "hsl(var(--status-progress))" },
  { key: "for_integration", label: "For Integration", color: "hsl(var(--status-integration))" },
  { key: "done", label: "Done", color: "hsl(var(--status-done))" },
];

function hoursFor(t: TicketRow, d: DonenessDiscipline, basis: DonenessBasis): number {
  if (basis === "current") {
    return d === "FE" ? t.current_fe_estimate : d === "BE" ? t.current_be_estimate : t.current_project_estimate;
  }
  return (
    (d === "FE" ? t.original_fe_estimate : d === "BE" ? t.original_be_estimate : t.original_project_estimate) ?? 0
  );
}

function actualFor(t: TicketRow, d: DonenessDiscipline): number {
  return Number(d === "FE" ? t.actual_frontend_hours : d === "BE" ? t.actual_backend_hours : t.actual_project_hours) || 0;
}

/** Logged hours (capped at estimate) count as done; the remainder sits in the ticket's status.
 * Estimate hours per status for one discipline (unapproved CRs excluded). */
export function donenessHours(
  tickets: TicketRow[],
  statuses: Status[],
  discipline: DonenessDiscipline,
  basis: DonenessBasis,
): Doneness {
  const catById = new Map(statuses.map((s) => [s.id, s.category as string]));
  const out: Doneness = { todo: 0, in_progress: 0, for_integration: 0, done: 0 };
  for (const t of tickets) {
    if (t.ticket_type === "CR" && t.cr_approval !== "approved") continue;
    const h = Number(hoursFor(t, discipline, basis)) || 0;
    if (h <= 0) continue;
    let status: DisciplineStatus;
    if (discipline === "FE") status = t.fe_status ?? "todo";
    else if (discipline === "BE") status = t.be_status ?? "todo";
    else {
      const cat = t.status_id ? catById.get(t.status_id) : undefined;
      status = (cat ? CATEGORY_TO_DISCIPLINE[cat] : undefined) ?? "todo";
    }
    const logged = Math.min(actualFor(t, discipline), h);
    out.done += logged;
    out[status] += h - logged;
  }
  return out;
}
