import { useMemo } from "react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Status } from "@/lib/types";
import { DISCIPLINE_STATUS_LABEL } from "@/lib/types";
import { DISC_OPTS, Group, GroupBy } from "./columns";

export function useTicketsGrouping({
  tickets,
  statuses,
  groupBy,
}: {
  tickets: TicketRow[];
  statuses: Status[];
  groupBy: GroupBy;
}): Group[] {
  return useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "All tickets", tickets }];
    }
    if (groupBy === "status") {
      const map = new Map<string, Group>();
      statuses.forEach((s) =>
        map.set(s.id, { key: s.id, label: s.name, color: s.color, tickets: [] })
      );
      const noStatus: Group = { key: "_none", label: "No status", tickets: [] };
      tickets.forEach((t) => {
        if (t.status_id && map.has(t.status_id)) map.get(t.status_id)!.tickets.push(t);
        else noStatus.tickets.push(t);
      });
      const out = [...map.values()];
      if (noStatus.tickets.length) out.push(noStatus);
      return out;
    }
    if (groupBy === "type") {
      const map = new Map<string, Group>();
      ["Standard", "Bug", "CR"].forEach((k) =>
        map.set(k, { key: k, label: k, tickets: [] })
      );
      tickets.forEach((t) => map.get(t.ticket_type)?.tickets.push(t));
      return [...map.values()].filter((g) => g.tickets.length);
    }
    if (groupBy === "epic") {
      const map = new Map<string, Group>();
      const noEpic: Group = { key: "_no_epic", label: "No epic", tickets: [] };
      tickets.forEach((t) => {
        if (!t.epic_id) {
          noEpic.tickets.push(t);
          return;
        }
        const key = String(t.epic_id);
        const g = map.get(key) ?? {
          key,
          label: t.epic_name ?? "Epic",
          tickets: [],
        };
        g.tickets.push(t);
        map.set(key, g);
      });
      const out = [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
      if (noEpic.tickets.length) out.push(noEpic);
      return out;
    }
    if (groupBy === "version") {
      const map = new Map<string, Group>();
      const noVersion: Group = { key: "_no_version", label: "No version", tickets: [] };
      tickets.forEach((t) => {
        const v = t.version?.trim();
        if (!v) {
          noVersion.tickets.push(t);
          return;
        }
        const g = map.get(v) ?? { key: v, label: v, tickets: [] };
        g.tickets.push(t);
        map.set(v, g);
      });
      const out = [...map.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
      if (noVersion.tickets.length) out.push(noVersion);
      return out;
    }
    if (groupBy === "fe_status" || groupBy === "be_status") {
      const slot: "FE" | "BE" = groupBy === "fe_status" ? "FE" : "BE";
      const map = new Map<string, Group>();
      DISC_OPTS.forEach((s) =>
        map.set(s, { key: s, label: DISCIPLINE_STATUS_LABEL[s], tickets: [] })
      );
      tickets.forEach((t) => {
        const hasSlot = t.assignees.some((a) => a.slot === slot);
        if (!hasSlot) return;
        const v = slot === "FE" ? t.fe_status : t.be_status;
        map.get(v)?.tickets.push(t);
      });
      return [...map.values()].filter((g) => g.tickets.length);
    }
    const map = new Map<string, Group>();
    const unassigned: Group = { key: "_unassigned", label: "Unassigned", tickets: [] };
    tickets.forEach((t) => {
      if (t.assignees.length === 0) {
        unassigned.tickets.push(t);
        return;
      }
      t.assignees.forEach((a) => {
        const g = map.get(a.user_id) ?? {
          key: a.user_id,
          label: a.member.name,
          color: a.member.avatar_color,
          tickets: [],
        };
        if (!g.tickets.includes(t)) g.tickets.push(t);
        map.set(a.user_id, g);
      });
    });
    const out = [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
    if (unassigned.tickets.length) out.push(unassigned);
    return out;
  }, [tickets, statuses, groupBy]);
}
