import type { TicketRow } from "@/features/tickets/useProjectTickets";

export type GroupBy = "none" | "epic" | "type" | "status" | "assignee";
export const GROUP_LABEL: Record<GroupBy, string> = { none: "None", epic: "Epic", type: "Type", status: "Status", assignee: "Assignee" };

export interface RoadmapGroup { key: string; label: string; rows: TicketRow[] }

/** Group rows, keeping epic order (by epic list) and alphabetical for the rest. */
export function groupRows(
  rows: TicketRow[],
  by: GroupBy,
  ctx: { epicOrder: Map<number, number>; statusName: (id: string | null) => string; statusOrder: (id: string | null) => number; memberName: (id: string) => string },
): RoadmapGroup[] {
  if (by === "none") return [{ key: "all", label: "All tickets", rows }];
  const map = new Map<string, RoadmapGroup & { sort: number | string }>();
  const push = (key: string, label: string, sort: number | string, t: TicketRow) => {
    const g = map.get(key) ?? { key, label, rows: [], sort };
    g.rows.push(t);
    map.set(key, g);
  };
  rows.forEach((t) => {
    if (by === "epic") {
      if (t.epic_id == null) push("none", "No epic", Number.MAX_SAFE_INTEGER, t);
      else push(`e${t.epic_id}`, t.epic_name ?? "Untitled epic", ctx.epicOrder.get(t.epic_id) ?? 1e9, t);
    } else if (by === "type") push(t.ticket_type, t.ticket_type, t.ticket_type, t);
    else if (by === "status") push(t.status_id ?? "none", ctx.statusName(t.status_id), ctx.statusOrder(t.status_id), t);
    else {
      const devs = [...new Set(t.assignees.filter((a) => a.slot !== "Project").map((a) => a.user_id))];
      if (!devs.length) push("unassigned", "Unassigned", "~", t);
      devs.forEach((u) => push(u, ctx.memberName(u), ctx.memberName(u).toLowerCase(), t));
    }
  });
  return [...map.values()]
    .sort((a, b) => (typeof a.sort === "number" && typeof b.sort === "number" ? a.sort - b.sort : String(a.sort).localeCompare(String(b.sort))))
    .map(({ key, label, rows }) => ({ key, label, rows }));
}
