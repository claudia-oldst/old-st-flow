import { useMemo } from "react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Sprint } from "../types";

export const UNPLANNED = "__unplanned__";

export type PoolGroupBy = "none" | "epic" | "type" | "assignee" | "roadmap";

export const GROUP_BY_OPTIONS: Array<{ value: PoolGroupBy; label: string }> = [
  { value: "none", label: "None" },
  { value: "epic", label: "Epic" },
  { value: "type", label: "Type" },
  { value: "assignee", label: "Assignee" },
  { value: "roadmap", label: "Roadmap" },
];

interface Params {
  filtered: TicketRow[];
  groupBy: PoolGroupBy;
  discipline: "FE" | "BE";
  planByTicket: Map<string, { fe: string | null; be: string | null }>;
  sortedSprints: Sprint[];
}

export interface PoolGroup {
  key: string;
  label: string;
  tickets: TicketRow[];
}

export function usePoolGroups({
  filtered,
  groupBy,
  discipline,
  planByTicket,
  sortedSprints,
}: Params): PoolGroup[] {
  const sprintNumberById = useMemo(() => {
    const m = new Map<string, number>();
    sortedSprints.forEach((s) => m.set(s.id, s.sprint_number));
    return m;
  }, [sortedSprints]);

  return useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", tickets: filtered }];
    }
    const map = new Map<string, { label: string; tickets: TicketRow[]; order: number }>();
    const push = (key: string, label: string, order: number, t: TicketRow) => {
      const g = map.get(key);
      if (g) g.tickets.push(t);
      else map.set(key, { label, tickets: [t], order });
    };
    filtered.forEach((t) => {
      if (groupBy === "epic") {
        const key = t.epic_name ?? "__no_epic__";
        push(key, t.epic_name ?? "No epic", t.epic_name ? 0 : 1, t);
      } else if (groupBy === "type") {
        push(t.ticket_type, t.ticket_type, 0, t);
      } else if (groupBy === "assignee") {
        const slot = discipline === "FE" ? "FE" : "BE";
        const a = t.assignees.find((x) => x.slot === slot);
        if (a) push(a.user_id, a.member.name || "Unknown", 0, t);
        else push("__unassigned__", "Unassigned", 1, t);
      } else if (groupBy === "roadmap") {
        const plan = planByTicket.get(t.id);
        const planned = discipline === "FE" ? plan?.fe ?? null : plan?.be ?? null;
        if (planned) {
          const n = sprintNumberById.get(planned);
          push(planned, n ? `Sprint ${n}` : "Roadmap", n ?? 0, t);
        } else {
          push(UNPLANNED, "Unplanned", 9999, t);
        }
      }
    });
    return [...map.entries()]
      .map(([key, v]) => ({ key, label: v.label, tickets: v.tickets, order: v.order }))
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [filtered, groupBy, discipline, planByTicket, sprintNumberById]);
}
