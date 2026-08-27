import { useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { EMPTY_FILTERS, type TicketFilters } from "@/features/tickets/TicketsFilter";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Sprint } from "./types";
import { PoolFilterBar } from "./planning-pool/PoolFilterBar";
import { PoolRow } from "./planning-pool/PoolRow";
import { usePoolGroups, type PoolGroupBy } from "./planning-pool/usePoolGroups";
import { usePoolTickets } from "./planning-pool/usePoolTickets";

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
  width: number;
  onResize: (width: number) => void;
}

const MIN_WIDTH = 320;
const MAX_WIDTH = 900;

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
  width,
  onResize,
}: Props) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [groupBy, setGroupBy] = useState<PoolGroupBy>("none");

  const panelRef = useRef<HTMLDivElement>(null);
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;
    const left = panel.getBoundingClientRect().left;
    const onMove = (ev: MouseEvent) => {
      onResize(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, ev.clientX - left)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const { pool, filtered, planByTicket, sortedSprints, roadmapIds, roadmapLabel, toggleRoadmap } =
    usePoolTickets({
      projectId,
      sprintId,
      discipline,
      sprints,
      allDevTicketIds,
      filters,
      search,
    });

  const filteredIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const allSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && filteredIds.some((id) => selectedIds.has(id));

  const groups = usePoolGroups({
    filtered,
    groupBy,
    discipline,
    planByTicket,
    sortedSprints,
  });


  return (
    <div
      ref={panelRef}
      className="relative flex flex-col gap-2 h-full min-h-0 min-w-0 rounded-md hairline bg-surface-1/40 shrink-0"
      style={{ width }}
    >


      <div className="p-2.5 hairline-b bg-surface-1/60 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold tracking-tight">Pool</h3>
          <span className="text-[10px] font-mono text-dim">{filtered.length}</span>
        </div>
        <PoolFilterBar
          projectId={projectId}
          pool={pool}
          search={search}
          setSearch={setSearch}
          filters={filters}
          setFilters={setFilters}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          sortedSprints={sortedSprints}
          sprintId={sprintId}
          roadmapIds={roadmapIds}
          toggleRoadmap={toggleRoadmap}
          roadmapLabel={roadmapLabel}
        />
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
                {g.tickets.map((t) => (
                  <PoolRow
                    key={t.id}
                    ticket={t}
                    selected={selectedIds.has(t.id)}
                    discipline={discipline}
                    groupBy={groupBy}
                    onToggleSelect={onToggleSelect}
                    onOpenTicket={onOpenTicket}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize pool"
        onMouseDown={startResize}
        className="absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize hover:bg-accent/40 active:bg-accent/60 transition-colors"
      />
    </div>

  );
}
