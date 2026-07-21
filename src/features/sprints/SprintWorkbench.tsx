import { useMemo, useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";

import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import type { Sprint } from "./types";
import {
  useSprintCapacities,
  useSprintTickets,
  useProjectMembers,
} from "./useSprintBoard";
import {
  SprintSelectionProvider,
  useSprintSelection,
} from "./SprintSelectionContext";
import { CapacityIndicator } from "./CapacityIndicator";
import { PlanningPoolPanel } from "./PlanningPoolPanel";
import { PlanningDevColumn } from "./PlanningDevColumn";
import { useWorkbenchData } from "./workbench/useWorkbenchData";
import { useWorkbenchBulkActions } from "./workbench/useWorkbenchBulkActions";
import { WorkbenchBulkBar } from "./workbench/WorkbenchBulkBar";
import { DevColumnsToolbar } from "./planning-dev/DevColumnsToolbar";
import type { DevColGroupBy } from "./planning-dev/useDevColumnGroups";
import {
  EMPTY_FILTERS,
  applyFilters,
  type TicketFilters,
} from "@/features/tickets/TicketsFilter";

interface Props {
  projectId: string;
  sprints: Sprint[];
  isPMBA: boolean;
}

export function SprintWorkbench(props: Props) {
  return (
    <SprintSelectionProvider>
      <PlanningInner {...props} />
    </SprintSelectionProvider>
  );
}

function PlanningInner({ projectId, sprints, isPMBA }: Props) {
  const [targetSprintId, setTargetSprintId] = useState<string>(sprints[0]?.id ?? "");
  const [discipline, setDiscipline] = useState<"FE" | "BE">("FE");
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const [poolWidth, setPoolWidth] = usePersistentState<number>("sprints:poolWidth", 384);
  const dk = (name: string) => `sprint-planning:dev-cols:${projectId}:${name}`;
  const [devSearch, setDevSearch] = usePersistentState<string>(dk("search"), "");
  const [devFilters, setDevFilters] = usePersistentState<TicketFilters>(dk("filters"), EMPTY_FILTERS);
  const [devGroupBy, setDevGroupBy] = usePersistentState<DevColGroupBy>(dk("groupBy"), "none");


  const { tickets } = useProjectTickets(projectId);
  const ticketById = useMemo(() => {
    const m = new Map<string, TicketRow>();
    tickets.forEach((t) => m.set(t.id, t));
    return m;
  }, [tickets]);

  const { data: capacities = [] } = useSprintCapacities(targetSprintId || undefined);
  const { data: sprintTickets = [] } = useSprintTickets(targetSprintId || undefined);
  const { data: members = [] } = useProjectMembers(projectId);

  const targetSprint = sprints.find((s) => s.id === targetSprintId);

  const { sprintDevs, devAssignments, allDevTicketIds, capByDev, totalCap, pooledHours } =
    useWorkbenchData({
      capacities,
      members,
      sprintTickets,
      ticketById,
      discipline,
    });

  const { selected, source, toggle, setMany, clear } = useSprintSelection();

  const togglePool = (id: string) => toggle(id, "pool");
  const toggleDev = (id: string) => toggle(id, "dev");
  const toggleAllPool = (ids: string[], select: boolean) =>
    setMany(ids, select, "pool");

  const selectedArr = useMemo(() => Array.from(selected), [selected]);

  const { assignToDev, moveToSprint, carryOver, removeFromSprint, invalidate } =
    useWorkbenchBulkActions({
      projectId,
      isPMBA,
      targetSprintId,
      targetSprint,
      sprints,
      sprintTickets,
      discipline,
      selectedArr,
      source,
      clear,
    });

  if (sprints.length === 0) {
    return (
      <div className="text-sm text-dim p-6 text-center hairline rounded-md">
        Create a sprint in the Roadmap tab first.
      </div>
    );
  }

  const otherSprints = sprints.filter((s) => s.id !== targetSprintId);
  const nextSprint = targetSprint
    ? sprints.find((s) => s.sprint_number === targetSprint.sprint_number + 1)
    : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-[10px] uppercase tracking-wide text-dim">Sprint</label>
        <Select value={targetSprintId} onValueChange={setTargetSprintId}>
          <SelectTrigger className="h-8 w-56 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                Sprint {s.sprint_number} · {format(parseISO(s.start_date), "MMM d")} →{" "}
                {format(parseISO(s.end_date), "MMM d")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="inline-flex rounded-md hairline overflow-hidden">
          {(["FE", "BE"] as const).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDiscipline(d);
                clear();
              }}
              className={cn(
                "px-3 h-8 text-xs font-medium transition",
                discipline === d
                  ? "bg-accent/15 text-accent"
                  : "text-dim hover:text-foreground hover:bg-white/5",
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 min-w-64">
          <span className="text-[10px] uppercase tracking-wide text-dim">Total</span>
          <CapacityIndicator used={pooledHours} cap={totalCap} className="w-56" />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-row gap-3 h-[calc(100vh-280px)] min-h-[560px]">
        <PlanningPoolPanel
          projectId={projectId}
          sprintId={targetSprintId}
          discipline={discipline}
          sprints={sprints}
          allDevTicketIds={allDevTicketIds}
          selectedIds={selected}
          onToggleSelect={togglePool}
          onToggleSelectAll={toggleAllPool}
          onOpenTicket={setOpenTicket}
          width={poolWidth}
          onResize={setPoolWidth}

        />

        {sprintDevs.length === 0 ? (
          <div className="flex-1 hairline rounded-md bg-surface-1/40 flex items-center justify-center text-sm text-dim p-6 text-center">
            No devs have {discipline} capacity in this sprint.
          </div>
        ) : (
          <div className="flex flex-row gap-3 flex-1 overflow-x-auto">
            {sprintDevs.map((dev) => (
              <PlanningDevColumn
                key={dev.user_id}
                projectId={projectId}
                sprintId={targetSprintId}
                allSprints={sprints}
                dev={dev}
                discipline={discipline}
                capacityHours={capByDev.get(dev.user_id) ?? 0}
                assignedTickets={devAssignments.get(dev.user_id) ?? []}
                selectedIds={selected}
                onToggleSelect={toggleDev}
                onOpenTicket={setOpenTicket}
                isPMBA={isPMBA}
                carriedOverIds={new Set()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bars */}
      {selected.size > 0 && (
        <>
          <BulkActionsBar
            projectId={projectId}
            selectedIds={selectedArr}
            onClear={clear}
            canEdit={isPMBA}
          />
          {isPMBA && (
            <WorkbenchBulkBar
              source={source}
              sprintDevs={sprintDevs}
              otherSprints={otherSprints}
              nextSprint={nextSprint}
              onAssignToDev={assignToDev}
              onMoveToSprint={moveToSprint}
              onCarryOver={carryOver}
              onRemoveFromSprint={removeFromSprint}
            />
          )}
        </>
      )}

      <TicketDetailSheet
        open={!!openTicket}
        onOpenChange={(o) => !o && setOpenTicket(null)}
        ticket={openTicket}
        projectId={projectId}
        onChange={invalidate}
      />
    </div>
  );
}
