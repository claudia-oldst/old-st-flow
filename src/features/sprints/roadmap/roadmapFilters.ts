import type { SprintDiscipline } from "../types";
import type { Commitment, SprintLite } from "./cellRules";

export interface FilterTicket {
  id: string;
  ticket_type: string;
  status_id: string | null;
  epic_id: number | null;
  fe_status: string;
  be_status: string;
  current_fe_estimate: number;
  current_be_estimate: number;
  assignees: Array<{ user_id: string; slot: string }>;
  has_acceptance_criteria?: boolean;
  acceptance_criteria?: string | null;
}


export interface FilterCtx {
  working: SprintLite | undefined;
  previous: SprintLite | undefined;
  commitsByTicket: Map<string, Commitment[]>;
  plannedByTicket: Map<string, { fe: string | null; be: string | null }>;
  devDoneStatusIds: Set<string>;
}

const DISCS: SprintDiscipline[] = ["FE", "BE"];
const hasHours = (t: FilterTicket, d: SprintDiscipline) => (d === "FE" ? t.current_fe_estimate : t.current_be_estimate) > 0;

/** Committed in the previous sprint for a discipline that isn't done and isn't in the working sprint. */
export function isUnfinished(t: FilterTicket, ctx: FilterCtx): boolean {
  if (!ctx.previous || !ctx.working) return false;
  const cs = ctx.commitsByTicket.get(t.id) ?? [];
  return DISCS.some((d) => {
    const status = d === "FE" ? t.fe_status : t.be_status;
    if (status === "done") return false;
    const inPrev = cs.some((c) => c.sprint_id === ctx.previous!.id && c.discipline === d);
    const inWork = cs.some((c) => c.sprint_id === ctx.working!.id && c.discipline === d);
    return inPrev && !inWork;
  });
}

/** "!" marker: one discipline is in the working sprint and the other has hours but isn't. */
export function isSplit(t: FilterTicket, ctx: FilterCtx): boolean {
  if (!ctx.working) return false;
  const cs = ctx.commitsByTicket.get(t.id) ?? [];
  const p = ctx.plannedByTicket.get(t.id);
  const inWork = (d: SprintDiscipline) =>
    cs.some((c) => c.sprint_id === ctx.working!.id && c.discipline === d) ||
    (d === "FE" ? p?.fe : p?.be) === ctx.working!.id;
  const fe = inWork("FE"), be = inWork("BE");
  return (fe && !be && hasHours(t, "BE")) || (be && !fe && hasHours(t, "FE"));
}

function sprintMatch(t: FilterTicket, key: string, ctx: FilterCtx): boolean {
  const cs = ctx.commitsByTicket.get(t.id) ?? [];
  const p = ctx.plannedByTicket.get(t.id);
  if (key === "unfinished") return isUnfinished(t, ctx);
  if (key === "not_planned") return cs.length === 0 && !p?.fe && !p?.be;
  const [kind, id] = key.split(":");
  if (kind === "planned") return p?.fe === id || p?.be === id;
  if (kind === "committed") return cs.some((c) => c.sprint_id === id);
  return true;
}

/** Roadmap-only rules on top of the shared Tickets filters: never Feedback, plus the sprint filter. */
export function applySprintFilter<T extends FilterTicket>(rows: T[], sprint: string[], ctx: FilterCtx): T[] {
  return rows.filter((t) => t.ticket_type !== "Feedback" && (!sprint.length || sprint.some((k) => sprintMatch(t, k, ctx))));
}
