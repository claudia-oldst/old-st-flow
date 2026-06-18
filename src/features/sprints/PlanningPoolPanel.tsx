import { useEffect, useMemo, useState } from "react";
import { Search, X, Map as MapIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TicketsFilter,
  EMPTY_FILTERS,
  applyFilters,
  type TicketFilters,
  type FilterSection,
} from "@/features/tickets/TicketsFilter";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { usePlannedSprintAssignments } from "./useSprintBoard";
import { formatHours } from "@/lib/utils";
import type { Sprint } from "./types";

const UNPLANNED = "__unplanned__";

type PoolGroupBy = "none" | "epic" | "type" | "assignee" | "roadmap";

const GROUP_BY_OPTIONS: Array<{ value: PoolGroupBy; label: string }> = [
  { value: "none", label: "None" },
  { value: "epic", label: "Epic" },
  { value: "type", label: "Type" },
  { value: "assignee", label: "Assignee" },
  { value: "roadmap", label: "Roadmap" },
];

interface Props {
  projectId: string;
  sprintId: string;
  discipline: "FE" | "BE";
  sprints: Sprint[];
  /** Union of ticket ids currently assigned in any dev column — excluded. */
  allDevTicketIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onToggleSelectAll: (ids: string[], select: boolean) => void;
  onOpenTicket: (t: TicketRow) => void;
}

/**
 * Planning tab left panel: tickets roadmapped to the selected sprint+discipline
 * that have not yet been assigned to any dev. Tight div-based rows for fast
 * scanning during planning calls.
 */
export function PlanningPoolPanel({
  projectId,
  sprintId,
  discipline,
  sprints,
  allDevTicketIds,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenTicket,
}: Props) {
  const { tickets: allTickets } = useProjectTickets(projectId);
  const { data: assignments = [] } = usePlannedSprintAssignments(projectId);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [roadmapIds, setRoadmapIds] = useState<Set<string>>(() => new Set([sprintId]));
  const [groupBy, setGroupBy] = useState<PoolGroupBy>("none");

  // Reset roadmap selection to the current sprint whenever the planning sprint changes.
  useEffect(() => {
    setRoadmapIds(new Set([sprintId]));
  }, [sprintId]);

  const planByTicket = useMemo(() => {
    const m = new Map<string, { fe: string | null; be: string | null }>();
    assignments.forEach((a) =>
      m.set(a.ticket_id, { fe: a.planned_sprint_fe_id, be: a.planned_sprint_be_id }),
    );
    return m;
  }, [assignments]);

  const pool = useMemo(() => {
    return allTickets.filter((t) => {
      if (t.ticket_type === "Proj") return false;
      if (allDevTicketIds.has(t.id)) return false;
      const hasHours =
        discipline === "FE"
          ? (t.current_fe_estimate || 0) > 0
          : (t.current_be_estimate || 0) > 0;
      if (!hasHours) return false;
      const plan = planByTicket.get(t.id);
      const planned = discipline === "FE" ? plan?.fe ?? null : plan?.be ?? null;
      const key = planned ?? UNPLANNED;
      return roadmapIds.has(key);
    });
  }, [allTickets, allDevTicketIds, discipline, roadmapIds, planByTicket]);

  const sortedSprints = useMemo(
    () => [...sprints].sort((a, b) => a.sprint_number - b.sprint_number),
    [sprints],
  );
  const roadmapLabel = useMemo(() => {
    if (roadmapIds.size === 0) return "No roadmap";
    if (roadmapIds.size === 1) {
      const only = [...roadmapIds][0];
      if (only === UNPLANNED) return "Unplanned";
      const s = sortedSprints.find((x) => x.id === only);
      return s ? `Sprint ${s.sprint_number}` : "Roadmap";
    }
    return `${roadmapIds.size} roadmaps`;
  }, [roadmapIds, sortedSprints]);

  const toggleRoadmap = (id: string) => {
    setRoadmapIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const base = applyFilters(pool, filters);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((t) =>
      `${t.formatted_id} ${t.title}`.toLowerCase().includes(q),
    );
  }, [pool, filters, search]);

  const filteredIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const allSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && filteredIds.some((id) => selectedIds.has(id));
  const sprintNumberById = useMemo(() => {
    const m = new Map<string, number>();
    sortedSprints.forEach((s) => m.set(s.id, s.sprint_number));
    return m;
  }, [sortedSprints]);

  const groups = useMemo(() => {
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



  return (
    <div className="flex flex-col gap-2 h-full min-h-0 rounded-md hairline bg-surface-1/40 w-96 shrink-0">
      <div className="p-2.5 hairline-b bg-surface-1/60 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold tracking-tight">Pool</h3>
          <span className="text-[10px] font-mono text-dim">{filtered.length}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dimmer pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID or title…"
            className="h-8 pl-8 pr-7 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-dimmer hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5"
              >
                <MapIcon className="h-3 w-3" />
                <span className="truncate max-w-[10rem]">{roadmapLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-dimmer">
                Sprint roadmaps
              </div>
              <div className="max-h-72 overflow-y-auto">
                {sortedSprints.map((s) => {
                  const checked = roadmapIds.has(s.id);
                  const isCurrent = s.id === sprintId;
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/[0.04] cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRoadmap(s.id)}
                      />
                      <span className="flex-1">Sprint {s.sprint_number}</span>
                      {isCurrent && (
                        <span className="text-[9px] uppercase tracking-wide text-dimmer">
                          current
                        </span>
                      )}
                    </label>
                  );
                })}
                <label className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/[0.04] cursor-pointer">
                  <Checkbox
                    checked={roadmapIds.has(UNPLANNED)}
                    onCheckedChange={() => toggleRoadmap(UNPLANNED)}
                  />
                  <span className="flex-1">Unplanned</span>
                </label>
              </div>
            </PopoverContent>
          </Popover>
          <TicketsFilter
            projectId={projectId}
            tickets={pool}
            filters={filters}
            onChange={setFilters}
            sections={["epic"]}
          />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-dimmer">Group</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as PoolGroupBy)}>
              <SelectTrigger className="h-7 text-xs w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_BY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-[11px] text-dim text-center py-6">
            No pooled tickets for this sprint
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1.5 py-1">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(v) => onToggleSelectAll(filteredIds, !!v)}
                aria-label="Select all pool tickets"
              />
              <span className="text-[10px] uppercase tracking-wide text-dimmer">
                Select all
              </span>
            </div>
            {groups.map((g) => (
              <div key={g.key} className="space-y-1">
                {groupBy !== "none" && (
                  <div className="flex items-center gap-2 px-1.5 pt-2 pb-1">
                    <span className="text-[10px] uppercase tracking-wide text-dim font-semibold">
                      {g.label}
                    </span>
                    <span className="text-[10px] font-mono text-dimmer">
                      {g.tickets.length}
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                )}
                {g.tickets.map((t) => {
                  const selected = selectedIds.has(t.id);
                  const h =
                    discipline === "FE"
                      ? t.current_fe_estimate || 0
                      : t.current_be_estimate || 0;
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-center gap-2 px-1.5 py-1.5 rounded hover:bg-white/[0.04] cursor-pointer",
                        selected && "ring-1 ring-primary bg-primary/5",
                      )}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("[data-checkbox]")) return;
                        onOpenTicket(t);
                      }}
                    >
                      <div data-checkbox onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => onToggleSelect(t.id, false)}
                          aria-label="Select ticket"
                        />
                      </div>
                      <span className="font-mono text-xs text-dimmer w-16 shrink-0">
                        {t.formatted_id}
                      </span>
                      <span className="text-xs truncate flex-1 min-w-0">{t.title}</span>
                      {t.epic_name && groupBy !== "epic" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-dim truncate max-w-20 shrink-0">
                          {t.epic_name}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-dim shrink-0 w-10 text-right">
                        {formatHours(h)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
