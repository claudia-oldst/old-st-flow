import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useStatuses } from "@/features/statuses/useStatuses";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { displayTitle, formatHours, cn } from "@/lib/utils";

export type GroupBy = "none" | "status" | "assignee" | "type" | "epic";

interface Group {
  key: string;
  label: string;
  color?: string;
  tickets: TicketRow[];
}

export function TicketsList({
  tickets,
  groupBy,
  onOpen,
}: {
  tickets: TicketRow[];
  groupBy: GroupBy;
  onOpen: (t: TicketRow) => void;
}) {
  const { statuses } = useStatuses();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups: Group[] = useMemo(() => {
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
    // assignee
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

  if (tickets.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => {
        const isCollapsed = collapsed[g.key];
        return (
          <div key={g.key} className="glass rounded-2xl overflow-hidden">
            {groupBy !== "none" && (
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                className="w-full flex items-center gap-2 px-4 py-3 hairline-b hover:bg-white/[0.02] transition text-left"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 text-dimmer" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-dimmer" />
                )}
                {g.color && (
                  <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                )}
                <span className="text-sm font-medium">{g.label}</span>
                <span className="text-xs text-dimmer font-mono ml-1">
                  {g.tickets.length}
                </span>
              </button>
            )}
            {!isCollapsed && (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-dimmer uppercase tracking-wider">
                  <tr className="hairline-b">
                    <th className="px-4 py-2.5 font-normal w-20">ID</th>
                    <th className="px-4 py-2.5 font-normal">Title</th>
                    {groupBy !== "status" && (
                      <th className="px-4 py-2.5 font-normal w-32">Status</th>
                    )}
                    <th className="px-4 py-2.5 font-normal text-right w-24">FE</th>
                    <th className="px-4 py-2.5 font-normal text-right w-24">BE</th>
                    {groupBy !== "assignee" && (
                      <th className="px-4 py-2.5 font-normal w-48">Assignees</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {g.tickets.map((t) => {
                    const status = statuses.find((s) => s.id === t.status_id);
                    return (
                      <tr
                        key={`${g.key}-${t.id}`}
                        onClick={() => onOpen(t)}
                        className="cursor-pointer hover:bg-white/[0.02] transition hairline-b last:border-b-0"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-dimmer">
                          {t.formatted_id}
                        </td>
                        <td className="px-4 py-3">
                          {displayTitle(t.title, t.ticket_type)}
                        </td>
                        {groupBy !== "status" && (
                          <td className="px-4 py-3">
                            {status && (
                              <span className="inline-flex items-center gap-1.5 text-xs">
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ background: status.color }}
                                />
                                {status.name}
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right text-xs font-mono text-dim">
                          {formatHours(t.actual_frontend_hours)} /{" "}
                          {formatHours(t.est_frontend_hours)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-dim">
                          {formatHours(t.actual_backend_hours)} /{" "}
                          {formatHours(t.est_backend_hours)}
                        </td>
                        {groupBy !== "assignee" && (
                          <td className="px-4 py-3 text-xs text-dim">
                            {t.assignees.length === 0
                              ? "—"
                              : t.assignees.map((a) => a.member.name).join(", ")}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
