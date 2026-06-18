import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TicketsFilter,
  EMPTY_FILTERS,
  applyFilters,
  type TicketFilters,
} from "@/features/tickets/TicketsFilter";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { usePlannedSprintAssignments } from "./useSprintBoard";
import { formatHours } from "./hours";
import type { Sprint } from "./types";

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
      const planned = discipline === "FE" ? plan?.fe : plan?.be;
      return planned === sprintId;
    });
  }, [allTickets, allDevTicketIds, discipline, sprintId, planByTicket]);

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
          <TicketsFilter
            projectId={projectId}
            tickets={pool}
            filters={filters}
            onChange={setFilters}
          />
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
            {filtered.map((t) => {
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
                  {t.epic_name && (
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
          </>
        )}
      </div>
    </div>
  );
}
