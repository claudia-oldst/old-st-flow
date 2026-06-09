import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CardDisplayMenu } from "@/features/tickets/CardDisplayMenu";
import { useCardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import type { AssigneeSlot } from "@/lib/types";
import type { Sprint } from "./types";
import { memberDisciplines } from "./types";
import {
  useSprintCapacities,
  useSprintTickets,
  useProjectMembers,
  useProjectSprintTickets,
  usePlannedSprintAssignments,
} from "./useSprintBoard";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { addTicketToLane, removeTicketFromSprint } from "./dnd";
import {
  SprintSelectionProvider,
  useSprintSelection,
} from "./SprintSelectionContext";
import { SprintBoardColumn } from "./SprintBoardColumn";

interface Props {
  projectId: string;
  sprints: Sprint[];
  isPMBA: boolean;
}

export function SprintWorkbench(props: Props) {
  return (
    <SprintSelectionProvider>
      <SprintWorkbenchInner {...props} />
    </SprintSelectionProvider>
  );
}

const DROP_DEV = "zone:dev";
const DROP_BACKLOG = "zone:backlog";

function SprintWorkbenchInner({ projectId, sprints, isPMBA }: Props) {
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const { prefs: cardPrefs, setPrefs: setCardPrefs, reset: resetCardPrefs } = useCardDisplayPrefs();

  const [targetSprintId, setTargetSprintId] = useState<string>(sprints[0]?.id ?? "");
  const [focusUserId, setFocusUserId] = useState<string>("");
  const [poolSource, setPoolSource] = useState<string>("__current__");
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);

  const { tickets: allTickets } = useProjectTickets(projectId);
  const tickets = useMemo(
    () => allTickets.filter((t) => t.ticket_type !== "Proj"),
    [allTickets],
  );
  const ticketById = useMemo(() => {
    const m = new Map<string, TicketRow>();
    tickets.forEach((t) => m.set(t.id, t));
    return m;
  }, [tickets]);

  const { data: capacities = [] } = useSprintCapacities(targetSprintId || undefined);
  const { data: sprintTickets = [] } = useSprintTickets(targetSprintId || undefined);
  const { data: allSprintTickets = [] } = useProjectSprintTickets(projectId);
  const { data: members = [] } = useProjectMembers(projectId);
  const { data: assignments = [] } = usePlannedSprintAssignments(projectId);

  const targetSprint = sprints.find((s) => s.id === targetSprintId);

  // Devs with capacity in this sprint
  const sprintDevs = useMemo(() => {
    const ids = new Set(capacities.map((c) => c.user_id));
    return members.filter(
      (m) => memberDisciplines(m.role).length > 0 && ids.has(m.user_id),
    );
  }, [capacities, members]);

  // Auto-select first dev when target sprint changes
  const focusDev = useMemo(() => {
    if (!focusUserId) return sprintDevs[0];
    return sprintDevs.find((d) => d.user_id === focusUserId) ?? sprintDevs[0];
  }, [focusUserId, sprintDevs]);

  const focusDisciplines = focusDev ? memberDisciplines(focusDev.role) : [];

  // --- DEV COLUMN: per-dev sprint_tickets in current sprint
  const devTickets = useMemo(() => {
    if (!focusDev) return [];
    const ids = sprintTickets
      .filter((st) => st.assigned_user_id === focusDev.user_id)
      .map((st) => st.ticket_id);
    return ids.map((id) => ticketById.get(id)).filter((t): t is TicketRow => !!t);
  }, [sprintTickets, focusDev, ticketById]);

  const devTicketIdSet = useMemo(() => new Set(devTickets.map((t) => t.id)), [devTickets]);

  // --- CARRYOVER: tickets where focus dev has prior-sprint sprint_tickets row,
  // no row in current sprint, and discipline status non-done.
  const carryoverTickets = useMemo(() => {
    if (!focusDev || !targetSprint) return [];
    const priorSprintIds = new Set(
      sprints
        .filter((s) => s.start_date < targetSprint.start_date)
        .map((s) => s.id),
    );
    const ticketIds = new Set<string>();
    allSprintTickets.forEach((st) => {
      if (
        st.assigned_user_id === focusDev.user_id &&
        priorSprintIds.has(st.sprint_id)
      ) {
        ticketIds.add(st.ticket_id);
      }
    });
    const result: TicketRow[] = [];
    ticketIds.forEach((id) => {
      if (devTicketIdSet.has(id)) return;
      const t = ticketById.get(id);
      if (!t) return;
      // non-done for at least one of dev's disciplines
      const isNonDone = focusDisciplines.some((d) => {
        const s = d === "FE" ? t.fe_status : t.be_status;
        return s !== "done";
      });
      if (isNonDone) result.push(t);
    });
    return result;
  }, [
    focusDev,
    targetSprint,
    sprints,
    allSprintTickets,
    devTicketIdSet,
    ticketById,
    focusDisciplines,
  ]);

  const carryoverIdSet = useMemo(
    () => new Set(carryoverTickets.map((t) => t.id)),
    [carryoverTickets],
  );

  // --- BACKLOG: pool-sourced, filtered by focus discipline, minus dev/carryover.
  const backlogTickets = useMemo(() => {
    if (!focusDev) return [];
    const fePool = focusDisciplines.includes("FE");
    const bePool = focusDisciplines.includes("BE");
    return tickets.filter((t) => {
      if (devTicketIdSet.has(t.id)) return false;
      if (carryoverIdSet.has(t.id)) return false;

      // Discipline match: at least one of focus dev's disciplines has hours.
      const hasFE = (t.current_fe_estimate || 0) > 0;
      const hasBE = (t.current_be_estimate || 0) > 0;
      if (!((fePool && hasFE) || (bePool && hasBE))) return false;

      const a = assignments.find((x) => x.ticket_id === t.id);
      const fePlan = a?.planned_sprint_fe_id ?? null;
      const bePlan = a?.planned_sprint_be_id ?? null;

      // Pool source filter
      if (poolSource === "__unpooled__") {
        if (fePool && hasFE && fePlan) return false;
        if (bePool && hasBE && bePlan) return false;
        // only unpooled in relevant discipline
        return (fePool && hasFE && !fePlan) || (bePool && hasBE && !bePlan);
      }
      if (poolSource === "__any__") {
        // any sprint pool (FE or BE), discipline-relevant
        return (
          (fePool && hasFE && !!fePlan) || (bePool && hasBE && !!bePlan)
        );
      }
      if (poolSource === "__current__") {
        return (
          (fePool && hasFE && fePlan === targetSprintId) ||
          (bePool && hasBE && bePlan === targetSprintId)
        );
      }
      // specific sprint id
      return (
        (fePool && hasFE && fePlan === poolSource) ||
        (bePool && hasBE && bePlan === poolSource)
      );
    });
  }, [
    focusDev,
    focusDisciplines,
    tickets,
    devTicketIdSet,
    carryoverIdSet,
    assignments,
    poolSource,
    targetSprintId,
  ]);

  const { selected, clear } = useSprintSelection();

  const capacityHours = useMemo(() => {
    if (!focusDev) return 0;
    return focusDisciplines.reduce(
      (s, d) =>
        s +
        Number(
          capacities.find(
            (c) => c.user_id === focusDev.user_id && c.discipline === d,
          )?.hours ?? 0,
        ),
      0,
    );
  }, [focusDev, focusDisciplines, capacities]);

  const usedHours = useMemo(
    () =>
      devTickets.reduce((s, t) => {
        let h = 0;
        if (focusDisciplines.includes("FE")) {
          h += Math.max(0, (t.current_fe_estimate || 0) - (t.actual_frontend_hours || 0));
        }
        if (focusDisciplines.includes("BE")) {
          h += Math.max(0, (t.current_be_estimate || 0) - (t.actual_backend_hours || 0));
        }
        return s + h;
      }, 0),
    [devTickets, focusDisciplines],
  );


  const handleDragEnd = async (e: DragEndEvent) => {
    if (!isPMBA || !targetSprintId || !focusDev) return;
    const { active, over } = e;
    if (!over || String(over.id) !== DROP_DEV) return;
    const activeTicketId = (active.data.current as { ticketId?: string } | undefined)?.ticketId;
    if (!activeTicketId) return;

    const ticketIds = selected.has(activeTicketId)
      ? Array.from(selected)
      : [activeTicketId];

    const toSlot: AssigneeSlot = focusDisciplines[0] as AssigneeSlot;

    try {
      for (const id of ticketIds) {
        await addTicketToLane(targetSprintId, id, focusDev.user_id, toSlot);
      }
      if (ticketIds.length > 1) {
        toast.success(`Added ${ticketIds.length} tickets to ${focusDev.member.name}`);
        clear();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      qc.invalidateQueries({ queryKey: ["sprint_tickets"] });
      qc.invalidateQueries({ queryKey: ["project_sprint_tickets"] });
    }
  };

  const removeSelectedFromSprint = async () => {
    if (!focusDev) return;
    const ids = Array.from(selected).filter((id) => devTicketIdSet.has(id));
    if (ids.length === 0) return;
    const toSlot: AssigneeSlot = focusDisciplines[0] as AssigneeSlot;
    try {
      for (const id of ids) {
        const link = sprintTickets.find(
          (st) => st.ticket_id === id && st.assigned_user_id === focusDev.user_id,
        );
        if (link) {
          await removeTicketFromSprint(link.id, id, focusDev.user_id, toSlot);
        }
      }
      toast.success(`Removed ${ids.length} ticket${ids.length === 1 ? "" : "s"}`);
      clear();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      qc.invalidateQueries({ queryKey: ["sprint_tickets"] });
      qc.invalidateQueries({ queryKey: ["project_sprint_tickets"] });
    }
  };

  if (sprints.length === 0) {
    return (
      <div className="text-sm text-dim p-6 text-center hairline rounded-md">
        Create a sprint in the Sprint Forecasting & Pooling tab first.
      </div>
    );
  }

  const otherSprints = sprints.filter((s) => s.id !== targetSprintId);

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-280px)] min-h-[560px]">
      {/* Header: sprint + focus dev + capacity + display menu */}
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

        <label className="text-[10px] uppercase tracking-wide text-dim">Focus Dev</label>
        <Select
          value={focusDev?.user_id ?? ""}
          onValueChange={setFocusUserId}
          disabled={sprintDevs.length === 0}
        >
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="Pick a dev" />
          </SelectTrigger>
          <SelectContent>
            {sprintDevs.map((d) => (
              <SelectItem key={d.user_id} value={d.user_id}>
                {d.member.name} · {d.role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {focusDev && (
          <CapacityIndicator used={usedHours} cap={capacityHours} />
        )}

        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-[11px] font-mono text-primary">
                {selected.size} selected
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={clear}>
                Clear
              </Button>
            </>
          )}
          <CardDisplayMenu prefs={cardPrefs} onChange={setCardPrefs} onReset={resetCardPrefs} />
        </div>
      </div>

      {!focusDev ? (
        <div className="text-sm text-dim p-6 text-center hairline rounded-md">
          {sprintDevs.length === 0
            ? "Add a dev with capacity in this sprint to start planning."
            : "Pick a focus dev to start planning."}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
            <SprintBoardColumn
              projectId={projectId}
              title="Backlog & Pool"
              tickets={backlogTickets}
              dragKey="backlog"
              disabled={!isPMBA}
              emptyHint="No tickets in this pool"
              toolbarExtras={
                <Select value={poolSource} onValueChange={setPoolSource}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__current__">
                      Sprint {targetSprint?.sprint_number} pool
                    </SelectItem>
                    <SelectItem value="__unpooled__">Unpooled</SelectItem>
                    <SelectItem value="__any__">Any sprint pool</SelectItem>
                    {otherSprints.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        Sprint {s.sprint_number} pool
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <SprintBoardColumn
              projectId={projectId}
              title="Carryover"
              subtitle={`${focusDev.member.name}'s open tickets from prior sprints`}
              tickets={carryoverTickets}
              dragKey="carryover"
              disabled={!isPMBA}
              emptyHint="No carryover tickets"
            />
            <SprintBoardColumn
              projectId={projectId}
              title={`${focusDev.member.name} — Sprint ${targetSprint?.sprint_number}`}
              tickets={devTickets}
              dropZoneId={DROP_DEV}
              dragKey="dev"
              disabled={!isPMBA}
              emptyHint="Drop tickets here"
            />
          </div>
        </DndContext>
      )}

      {selected.size > 0 && (
        <>
          <BulkActionsBar
            projectId={projectId}
            selectedIds={Array.from(selected)}
            onClear={clear}
            canEdit={isPMBA}
          />
          {isPMBA && focusDev && Array.from(selected).some((id) => devTicketIdSet.has(id)) && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 glass-strong hairline rounded-2xl shadow-2xl px-2 py-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-dim hover:text-destructive"
                onClick={removeSelectedFromSprint}
              >
                Remove from sprint
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CapacityIndicator({ used, cap }: { used: number; cap: number }) {
  const over = cap > 0 && used > cap;
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <div className="flex items-center gap-2 w-56">
      <span
        className={cn(
          "font-mono text-[11px]",
          over && "text-primary font-semibold",
        )}
      >
        {used}h / {cap}h
      </span>
      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full transition-all", over ? "bg-primary" : "bg-accent/70")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
