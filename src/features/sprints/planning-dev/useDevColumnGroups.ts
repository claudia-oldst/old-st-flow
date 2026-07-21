import { useMemo } from "react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useStatuses } from "@/features/statuses/useStatuses";

export type DevColGroupBy = "none" | "epic" | "type" | "status";

export const DEV_COL_GROUP_OPTIONS: Array<{ value: DevColGroupBy; label: string }> = [
  { value: "none", label: "None" },
  { value: "epic", label: "Epic" },
  { value: "type", label: "Type" },
  { value: "status", label: "Status" },
];

export interface DevColGroup {
  key: string;
  label: string;
  tickets: TicketRow[];
}

/** Groups a dev column's assigned tickets. Mirrors usePoolGroups style. */
export function useDevColumnGroups(
  tickets: TicketRow[],
  groupBy: DevColGroupBy,
): DevColGroup[] {
  const { statuses } = useStatuses();
  const statusById = useMemo(() => {
    const m = new Map<string, { name: string; position: number }>();
    statuses.forEach((s) => m.set(s.id, { name: s.name, position: s.position }));
    return m;
  }, [statuses]);

  return useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", tickets }];
    }
    const map = new Map<string, { label: string; tickets: TicketRow[]; order: number }>();
    const push = (key: string, label: string, order: number, t: TicketRow) => {
      const g = map.get(key);
      if (g) g.tickets.push(t);
      else map.set(key, { label, tickets: [t], order });
    };
    tickets.forEach((t) => {
      if (groupBy === "epic") {
        const key = t.epic_name ?? "__no_epic__";
        push(key, t.epic_name ?? "No epic", t.epic_name ? 0 : 9999, t);
      } else if (groupBy === "type") {
        push(t.ticket_type, t.ticket_type, 0, t);
      } else if (groupBy === "status") {
        if (t.status_id) {
          const s = statusById.get(t.status_id);
          push(t.status_id, s?.name ?? "Status", s?.position ?? 0, t);
        } else {
          push("__no_status__", "No status", 9999, t);
        }
      }
    });
    return [...map.entries()]
      .map(([key, v]) => ({ key, label: v.label, tickets: v.tickets, order: v.order }))
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [tickets, groupBy, statusById]);
}
