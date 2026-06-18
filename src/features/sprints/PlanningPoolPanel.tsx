import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  TicketsFilter,
  EMPTY_FILTERS,
  applyFilters,
  type TicketFilters,
} from "@/features/tickets/TicketsFilter";
import { TicketsList, type GroupBy } from "@/features/tickets/TicketsList";
import { GroupBySelect } from "@/features/tickets/GroupBySelect";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { usePlannedSprintAssignments } from "./useSprintBoard";
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
 * that have not yet been assigned to any dev. Uses TicketsList with groupBy="none"
 * by default for a flat scannable list during planning calls.
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
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

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

  return (
    <div className="flex flex-col gap-2 h-full min-h-0 rounded-md hairline bg-surface-1/40 w-72 shrink-0">
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
          <GroupBySelect value={groupBy} onChange={setGroupBy} label={null} className="w-[120px]" />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="text-[11px] text-dim text-center py-6">
            No pooled tickets for this sprint
          </div>
        ) : (
          <TicketsList
            tickets={filtered}
            groupBy={groupBy}
            onOpen={onOpenTicket}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onToggleSelectAll={onToggleSelectAll}
          />
        )}
      </div>
    </div>
  );
}
