import type { LogDiscipline } from "@/lib/types";

export interface EditableTicket {
  id: string;
  project_id: string;
  formatted_id: string;
  title: string;
  ticket_type: string;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_project_hours: number;
  current_fe_estimate: number;
  current_be_estimate: number;
  current_project_estimate: number;
  /** Disciplines the current user is assigned to on this ticket. */
  disciplines: LogDiscipline[];
}

/**
 * Hours already used on the target ticket+discipline, excluding this log's own
 * contribution only when the log stays on the same ticket and discipline.
 */
export function usedExcludingLog(
  actual: number,
  log: { ticketId: string; discipline: LogDiscipline; hours: number },
  target: { ticketId: string; discipline: LogDiscipline },
): number {
  const same = log.ticketId === target.ticketId && log.discipline === target.discipline;
  return Math.max(0, same ? actual - log.hours : actual);
}

/** Disciplines a log on this ticket may use: follows the user's assignment. */
export function allowedDisciplines(
  t: Pick<EditableTicket, "ticket_type" | "disciplines">,
  fallback: LogDiscipline,
): LogDiscipline[] {
  if (t.ticket_type === "Proj") return ["Project"];
  const ds = t.disciplines.filter((d) => d !== "Project");
  return ds.length ? ds : [fallback];
}
