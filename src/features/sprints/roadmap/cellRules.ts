import type { SprintDiscipline } from "../types";

export type CellState = "none" | "planned" | "committed";

export interface Commitment {
  id: string;
  sprint_id: string;
  ticket_id: string;
  discipline: string;
  unplanned: boolean;
}

export interface SprintLite {
  id: string;
  sprint_number: number;
  start_date: string;
  end_date: string;
}

/** A sprint is closed once its end date is before today (yyyy-MM-dd). */
export function isClosed(s: SprintLite, today: string): boolean {
  return s.end_date < today;
}

export interface CellInput {
  ticketId: string;
  discipline: SprintDiscipline;
  sprint: SprintLite;
  /** Planned sprint id for this ticket + discipline. */
  plannedId: string | null;
  /** This ticket's commitments for this discipline (any sprint). */
  commitments: Commitment[];
  sprints: SprintLite[];
  today: string;
}

export function cellState(i: Pick<CellInput, "sprint" | "plannedId" | "commitments">): CellState {
  if (i.commitments.some((c) => c.sprint_id === i.sprint.id)) return "committed";
  if (i.plannedId === i.sprint.id) return "planned";
  return "none";
}

export interface CellPlan {
  /** Commitment rows to delete. */
  remove: Commitment[];
  /** Commitment to insert (no id yet). */
  add: Omit<Commitment, "id"> | null;
  /** New planned sprint id; undefined = unchanged. */
  planned?: string | null;
}

/**
 * Work out the writes for moving one cell to `target`.
 * - Planned is one sprint per discipline (planning elsewhere moves it).
 * - Committing in an open sprint drops that discipline's commitments in
 *   other open sprints and sets planned to the same sprint.
 * - Committing always records a plain commitment (never flagged unplanned).
 * - Editing a closed sprint never touches other sprints or the planned sprint.
 */
export function planCell(i: CellInput, target: CellState): CellPlan {
  const closed = isClosed(i.sprint, i.today);
  const here = i.commitments.filter((c) => c.sprint_id === i.sprint.id);
  const plan: CellPlan = { remove: [], add: null };
  if (target === "none") {
    plan.remove = here;
    if (!closed && i.plannedId === i.sprint.id) plan.planned = null;
    return plan;
  }
  if (target === "planned") {
    plan.remove = here;
    if (!closed && i.plannedId !== i.sprint.id) plan.planned = i.sprint.id;
    return plan;
  }
  // committed
  if (here.length > 0) return plan;
  if (!closed) {
    const openIds = new Set(i.sprints.filter((s) => !isClosed(s, i.today)).map((s) => s.id));
    plan.remove = i.commitments.filter((c) => c.sprint_id !== i.sprint.id && openIds.has(c.sprint_id));
    if (i.plannedId !== i.sprint.id) plan.planned = i.sprint.id;
  }
  plan.add = {
    sprint_id: i.sprint.id,
    ticket_id: i.ticketId,
    discipline: i.discipline,
    unplanned: false,
  };
  return plan;
}

export function isEmptyPlan(p: CellPlan): boolean {
  return p.remove.length === 0 && !p.add && p.planned === undefined;
}

/** Default working sprint: covers today, else next upcoming, else the latest. */
export function defaultWorkingSprint<T extends SprintLite>(sprints: T[], today: string): T | undefined {
  const sorted = [...sprints].sort((a, b) => a.start_date.localeCompare(b.start_date));
  return (
    sorted.find((s) => s.start_date <= today && s.end_date >= today) ??
    sorted.find((s) => s.start_date > today) ??
    sorted[sorted.length - 1]
  );
}
