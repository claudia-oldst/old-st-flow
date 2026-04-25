import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useStatuses } from "@/features/statuses/useStatuses";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { displayTitle, formatHours, cn } from "@/lib/utils";
import { DisciplineStatusChip } from "@/features/tickets/DisciplineStatusChip";
import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";

export type GroupBy = "none" | "status" | "assignee" | "type" | "epic" | "fe_status" | "be_status";

const DISC_OPTS: DisciplineStatus[] = ["todo", "in_progress", "done"];

interface Group {
  key: string;
  label: string;
  color?: string;
  tickets: TicketRow[];
}

type ColKey =
  | "id"
  | "title"
  | "epic"
  | "status"
  | "dev_status"
  | "fe"
  | "be"
  | "assignees";

interface ColDef {
  key: ColKey;
  label: string;
  default: number;
  min: number;
  align?: "left" | "right";
}

const COLS: Record<ColKey, ColDef> = {
  id: { key: "id", label: "ID", default: 90, min: 70 },
  title: { key: "title", label: "Title", default: 320, min: 160 },
  epic: { key: "epic", label: "Epic", default: 160, min: 100 },
  status: { key: "status", label: "Status", default: 140, min: 100 },
  dev_status: { key: "dev_status", label: "Dev status", default: 200, min: 140 },
  fe: { key: "fe", label: "FE", default: 110, min: 80, align: "right" },
  be: { key: "be", label: "BE", default: 110, min: 80, align: "right" },
  assignees: { key: "assignees", label: "Assignees", default: 200, min: 120 },
};

const STORAGE_KEY = "tickets-list-col-widths-v1";

function loadWidths(): Partial<Record<ColKey, number>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
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
  const [widths, setWidths] = useState<Partial<Record<ColKey, number>>>(() => loadWidths());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch {
      /* ignore */
    }
  }, [widths]);

  const visibleCols: ColKey[] = useMemo(() => {
    const out: ColKey[] = ["id", "title"];
    if (groupBy !== "epic") out.push("epic");
    if (groupBy !== "status") out.push("status");
    if (groupBy !== "fe_status") out.push("fe_status");
    if (groupBy !== "be_status") out.push("be_status");
    out.push("fe", "be");
    if (groupBy !== "assignee") out.push("assignees");
    return out;
  }, [groupBy]);

  const widthFor = (k: ColKey) => widths[k] ?? COLS[k].default;
  const totalWidth = visibleCols.reduce((sum, k) => sum + widthFor(k), 0);

  const dragRef = useRef<{
    key: ColKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const onResizeStart = useCallback(
    (key: ColKey) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        key,
        startX: e.clientX,
        startWidth: widthFor(key),
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const next = Math.max(COLS[d.key].min, d.startWidth + (ev.clientX - d.startX));
        setWidths((w) => ({ ...w, [d.key]: next }));
      };
      const onUp = () => {
        dragRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widths]
  );

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
    if (groupBy === "fe_status" || groupBy === "be_status") {
      const map = new Map<string, Group>();
      DISC_OPTS.forEach((s) =>
        map.set(s, { key: s, label: DISCIPLINE_STATUS_LABEL[s], tickets: [] })
      );
      tickets.forEach((t) => {
        const v = groupBy === "fe_status" ? t.fe_status : t.be_status;
        map.get(v)?.tickets.push(t);
      });
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

  const renderCell = (key: ColKey, t: TicketRow) => {
    switch (key) {
      case "id":
        return (
          <span className="font-mono text-xs text-dimmer">{t.formatted_id}</span>
        );
      case "title":
        return <span className="truncate block">{displayTitle(t.title, t.ticket_type)}</span>;
      case "epic":
        return (
          <span className="text-xs text-dim truncate block">
            {t.epic_name ?? <span className="text-dimmer">—</span>}
          </span>
        );
      case "status": {
        const status = statuses.find((s) => s.id === t.status_id);
        if (!status) return null;
        return (
          <span className="inline-flex items-center gap-1.5 text-xs min-w-0">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: status.color }} />
            <span className="truncate">{status.name}</span>
          </span>
        );
      }
      case "fe_status":
        return <DisciplineStatusChip slot="FE" status={t.fe_status} />;
      case "be_status":
        return <DisciplineStatusChip slot="BE" status={t.be_status} />;
      case "fe":
        return (
          <span className="text-xs font-mono text-dim whitespace-nowrap">
            {formatHours(t.actual_frontend_hours)} / {formatHours(t.current_fe_estimate)}
          </span>
        );
      case "be":
        return (
          <span className="text-xs font-mono text-dim whitespace-nowrap">
            {formatHours(t.actual_backend_hours)} / {formatHours(t.current_be_estimate)}
          </span>
        );
      case "assignees":
        return (
          <span className="text-xs text-dim truncate block">
            {t.assignees.length === 0
              ? "—"
              : t.assignees.map((a) => a.member.name).join(", ")}
          </span>
        );
    }
  };

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
              <div className="overflow-x-auto">
                <table
                  className="text-sm table-fixed"
                  style={{ width: Math.max(totalWidth, 0), minWidth: "100%" }}
                >
                  <colgroup>
                    {visibleCols.map((k) => (
                      <col key={k} style={{ width: widthFor(k) }} />
                    ))}
                  </colgroup>
                  <thead className="text-left text-xs text-dimmer uppercase tracking-wider">
                    <tr className="hairline-b">
                      {visibleCols.map((k, idx) => {
                        const c = COLS[k];
                        const isLast = idx === visibleCols.length - 1;
                        return (
                          <th
                            key={k}
                            className={cn(
                              "px-4 py-2.5 font-normal relative select-none",
                              c.align === "right" && "text-right"
                            )}
                          >
                            <span className="truncate block">{c.label}</span>
                            {!isLast && (
                              <span
                                onMouseDown={onResizeStart(k)}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group flex items-center justify-center"
                                aria-label={`Resize ${c.label} column`}
                                role="separator"
                              >
                                <span className="h-4 w-px bg-white/10 group-hover:bg-accent transition" />
                              </span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {g.tickets.map((t) => (
                      <tr
                        key={`${g.key}-${t.id}`}
                        onClick={() => onOpen(t)}
                        className="cursor-pointer hover:bg-white/[0.02] transition hairline-b last:border-b-0"
                      >
                        {visibleCols.map((k) => {
                          const c = COLS[k];
                          return (
                            <td
                              key={k}
                              className={cn(
                                "px-4 py-3 align-middle overflow-hidden",
                                c.align === "right" && "text-right"
                              )}
                            >
                              {renderCell(k, t)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
