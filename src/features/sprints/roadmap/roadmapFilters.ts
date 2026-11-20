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
}

export interface RoadmapFilters {
  epics: string[];
  types: string[];
  statuses: string[];
  feStatuses: string[];
  beStatuses: string[];
  /** user ids, or "unassigned" */
  assignees: string[];
  /** "unfinished" | "not_planned" | `planned:<id>` | `committed:<id>` */
  sprint: string[];
}

export const emptyFilters: RoadmapFilters = {
  epics: [], types: [], statuses: [], feStatuses: [], beStatuses: [], assignees: [], sprint: [],
};

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

export function applyFilters<T extends FilterTicket>(rows: T[], f: RoadmapFilters, ctx: FilterCtx): T[] {
  const any = (sel: string[], v: string) => sel.length === 0 || sel.includes(v);
  return rows.filter((t) => {
    if (t.ticket_type === "Feedback") return false;
    if (!any(f.epics, t.epic_id == null ? "none" : String(t.epic_id))) return false;
    if (!any(f.types, t.ticket_type)) return false;
    if (!any(f.statuses, t.status_id ?? "")) return false;
    if (f.feStatuses.length && !f.feStatuses.includes(hasHours(t, "FE") ? t.fe_status : "-")) return false;
    if (f.beStatuses.length && !f.beStatuses.includes(hasHours(t, "BE") ? t.be_status : "-")) return false;
    if (f.assignees.length) {
      const devs = t.assignees.filter((a) => a.slot === "FE" || a.slot === "BE");
      const ok = f.assignees.some((u) => (u === "unassigned" ? devs.length === 0 : devs.some((a) => a.user_id === u)));
      if (!ok) return false;
    }
    if (f.sprint.length && !f.sprint.some((k) => sprintMatch(t, k, ctx))) return false;
    return true;
  });
}
