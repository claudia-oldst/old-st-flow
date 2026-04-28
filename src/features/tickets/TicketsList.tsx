import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { useStatuses } from "@/features/statuses/useStatuses";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { displayTitle, formatHours, cn } from "@/lib/utils";
import { DisciplineStatusChip } from "@/features/tickets/DisciplineStatusChip";
import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type GroupBy = "none" | "status" | "assignee" | "type" | "epic" | "version" | "fe_status" | "be_status";

const DISC_OPTS: DisciplineStatus[] = ["todo", "in_progress", "for_integration", "done"];

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
  | "version"
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
  version: { key: "version", label: "Version", default: 110, min: 80 },
  status: { key: "status", label: "Status", default: 140, min: 100 },
  dev_status: { key: "dev_status", label: "Dev status", default: 200, min: 140 },
  fe: { key: "fe", label: "FE", default: 110, min: 80, align: "right" },
  be: { key: "be", label: "BE", default: 110, min: 80, align: "right" },
  assignees: { key: "assignees", label: "Assignees", default: 200, min: 120 },
};

const STORAGE_KEY = "tickets-list-col-widths-v1";
const SORT_STORAGE_KEY = "tickets-list-sort-v1";

type SortDir = "asc" | "desc";
interface SortState {
  key: ColKey;
  dir: SortDir;
}

const SORTABLE: Record<ColKey, boolean> = {
  id: true,
  title: true,
  epic: true,
  version: true,
  status: true,
  dev_status: true,
  fe: true,
  be: true,
  assignees: true,
};

const DISC_ORDER: Record<DisciplineStatus, number> = {
  todo: 0,
  in_progress: 1,
  for_integration: 2,
  done: 3,
};

function loadWidths(): Partial<Record<ColKey, number>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function loadSort(): SortState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function TicketsList({
  tickets,
  groupBy,
  onOpen,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  tickets: TicketRow[];
  groupBy: GroupBy;
  onOpen: (t: TicketRow) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, shiftKey: boolean) => void;
  onToggleSelectAll?: (ids: string[], select: boolean) => void;
}) {
  const selectionEnabled = !!selectedIds && !!onToggleSelect;
  const { statuses } = useStatuses();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [widths, setWidths] = useState<Partial<Record<ColKey, number>>>(() => loadWidths());
  const [sort, setSort] = useState<SortState | null>(() => loadSort());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch {
      /* ignore */
    }
  }, [widths]);

  useEffect(() => {
    try {
      if (sort) localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
      else localStorage.removeItem(SORT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [sort]);

  const toggleSort = useCallback((key: ColKey) => {
    if (!SORTABLE[key]) return;
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null; // third click clears
    });
  }, []);

  const statusOrder = useMemo(() => {
    const m = new Map<string, number>();
    statuses.forEach((s, i) => m.set(s.id, i));
    return m;
  }, [statuses]);

  const sortTickets = useCallback(
    (arr: TicketRow[]): TicketRow[] => {
      if (!sort) return arr;
      const dir = sort.dir === "asc" ? 1 : -1;
      const cmpStr = (a: string, b: string) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
      const valFor = (t: TicketRow): string | number => {
        switch (sort.key) {
          case "id":
            return t.formatted_id ?? "";
          case "title":
            return (t.title ?? "").toLowerCase();
          case "epic":
            return (t.epic_name ?? "").toLowerCase();
          case "version":
            return t.version ?? "";
          case "status":
            return statusOrder.get(t.status_id ?? "") ?? Number.MAX_SAFE_INTEGER;
          case "dev_status": {
            const hasFE = t.assignees.some((a) => a.slot === "FE");
            const hasBE = t.assignees.some((a) => a.slot === "BE");
            const fe = hasFE ? DISC_ORDER[t.fe_status] : 99;
            const be = hasBE ? DISC_ORDER[t.be_status] : 99;
            return fe * 100 + be;
          }
          case "fe":
            return Number(t.actual_frontend_hours ?? 0);
          case "be":
            return Number(t.actual_backend_hours ?? 0);
          case "assignees":
            return (t.assignees[0]?.member.name ?? "~").toLowerCase();
        }
      };
      return [...arr].sort((a, b) => {
        const va = valFor(a);
        const vb = valFor(b);
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
        return cmpStr(String(va), String(vb)) * dir;
      });
    },
    [sort, statusOrder]
  );

  const visibleCols: ColKey[] = useMemo(() => {
    const out: ColKey[] = ["id", "title"];
    if (groupBy !== "epic") out.push("epic");
    if (groupBy !== "version") out.push("version");
    if (groupBy !== "status") out.push("status");
    out.push("dev_status");
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
        // Only tickets that have an assignee for this discipline have a status here.
        const hasSlot = t.assignees.some((a) => a.slot === slot);
        if (!hasSlot) return;
        const v = slot === "FE" ? t.fe_status : t.be_status;
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
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block">{displayTitle(t.title, t.ticket_type)}</span>
            </TooltipTrigger>
            <TooltipContent side="top" align="start" className="max-w-md">
              <p className="text-sm">{t.title}</p>
            </TooltipContent>
          </Tooltip>
        );
      case "epic":
        return (
          <span className="text-xs text-dim truncate block">
            {t.epic_name ?? <span className="text-dimmer">—</span>}
          </span>
        );
      case "version":
        return t.version ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hairline text-dim">
            {t.version}
          </span>
        ) : (
          <span className="text-dimmer text-xs">—</span>
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
      case "dev_status": {
        const hasFE = t.assignees.some((a) => a.slot === "FE");
        const hasBE = t.assignees.some((a) => a.slot === "BE");
        if (!hasFE && !hasBE) {
          return <span className="text-dimmer text-xs">—</span>;
        }
        return (
          <span className="inline-flex items-center gap-1.5 flex-wrap">
            {hasFE && <DisciplineStatusChip slot="FE" status={t.fe_status} />}
            {hasBE && <DisciplineStatusChip slot="BE" status={t.be_status} />}
          </span>
        );
      }
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
    <TooltipProvider>
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
                      {selectionEnabled && <col style={{ width: 36 }} />}
                      {visibleCols.map((k) => (
                        <col key={k} style={{ width: widthFor(k) }} />
                      ))}
                    </colgroup>
                    <thead className="text-left text-xs text-dimmer uppercase tracking-wider">
                      <tr className="hairline-b">
                        {selectionEnabled && (() => {
                          const ids = g.tickets.map((t) => t.id);
                          const allChecked = ids.length > 0 && ids.every((id) => selectedIds!.has(id));
                          const someChecked = !allChecked && ids.some((id) => selectedIds!.has(id));
                          return (
                            <th className="pl-4 pr-1 py-2.5 font-normal">
                              <input
                                type="checkbox"
                                aria-label="Select all in group"
                                checked={allChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = someChecked;
                                }}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  onToggleSelectAll?.(ids, e.target.checked);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-accent cursor-pointer"
                              />
                            </th>
                          );
                        })()}
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
                      {g.tickets.map((t) => {
                        const isSelected = selectionEnabled && selectedIds!.has(t.id);
                        return (
                          <tr
                            key={`${g.key}-${t.id}`}
                            onClick={() => onOpen(t)}
                            className={cn(
                              "cursor-pointer transition hairline-b last:border-b-0",
                              isSelected ? "bg-accent/10 hover:bg-accent/15" : "hover:bg-white/[0.02]"
                            )}
                          >
                            {selectionEnabled && (
                              <td className="pl-4 pr-1 align-middle">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ticket ${t.formatted_id}`}
                                  checked={isSelected}
                                  onChange={() => {}}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSelect!(t.id, (e as unknown as React.MouseEvent).shiftKey);
                                  }}
                                  className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-accent cursor-pointer"
                                />
                              </td>
                            )}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
