import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ArrowRight, ArrowRightCircle, Trash2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
import { BulkMenu, BulkMenuRow } from "@/features/tickets/bulk-actions/BulkMenu";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import type { AssigneeSlot } from "@/lib/types";
import type { Sprint, SprintMember } from "./types";
import { memberDisciplines } from "./types";
import {
  useSprintCapacities,
  useSprintTickets,
  useProjectMembers,
} from "./useSprintBoard";
import { addTicketToLane, removeTicketFromSprint } from "./dnd";
import {
  SprintSelectionProvider,
  useSprintSelection,
} from "./SprintSelectionContext";
import { CapacityIndicator } from "./CapacityIndicator";
import { PlanningPoolPanel } from "./PlanningPoolPanel";
import { PlanningDevColumn } from "./PlanningDevColumn";
import { formatSupabaseError } from "@/lib/formatSupabaseError";

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
  const qc = useQueryClient();
  const [targetSprintId, setTargetSprintId] = useState<string>(sprints[0]?.id ?? "");
  const [discipline, setDiscipline] = useState<"FE" | "BE">("FE");
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);

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

  // Devs with capacity for this sprint+discipline.
  const sprintDevs = useMemo<SprintMember[]>(() => {
    const idsForDisc = new Set(
      capacities.filter((c) => c.discipline === discipline).map((c) => c.user_id),
    );
    return members.filter(
      (m) =>
        idsForDisc.has(m.user_id) &&
        memberDisciplines(m.role).includes(discipline),
    );
  }, [capacities, members, discipline]);

  // Assignments per dev for this sprint, scoped to current discipline.
  // sprint_tickets links a ticket+user; we filter to tickets that have hours
  // in the selected discipline so we don't show FE-only tickets in BE view.
  const devAssignments = useMemo(() => {
    const m = new Map<string, TicketRow[]>();
    sprintDevs.forEach((d) => m.set(d.user_id, []));
    sprintTickets.forEach((st) => {
      if (!st.assigned_user_id) return;
      const list = m.get(st.assigned_user_id);
      if (!list) return;
      const t = ticketById.get(st.ticket_id);
      if (!t) return;
      const hasHours =
        discipline === "FE"
          ? (t.current_fe_estimate || 0) > 0
          : (t.current_be_estimate || 0) > 0;
      if (!hasHours) return;
      list.push(t);
    });
    return m;
  }, [sprintDevs, sprintTickets, ticketById, discipline]);

  const allDevTicketIds = useMemo(() => {
    const s = new Set<string>();
    devAssignments.forEach((rows) => rows.forEach((t) => s.add(t.id)));
    return s;
  }, [devAssignments]);

  const capByDev = useMemo(() => {
    const m = new Map<string, number>();
    capacities
      .filter((c) => c.discipline === discipline)
      .forEach((c) => m.set(c.user_id, Number(c.hours ?? 0)));
    return m;
  }, [capacities, discipline]);

  const totalCap = useMemo(
    () => sprintDevs.reduce((s, d) => s + (capByDev.get(d.user_id) ?? 0), 0),
    [sprintDevs, capByDev],
  );

  const pooledHours = useMemo(() => {
    let total = 0;
    devAssignments.forEach((rows) =>
      rows.forEach((t) => {
        total +=
          discipline === "FE"
            ? Math.max(0, (t.current_fe_estimate || 0) - (t.actual_frontend_hours || 0))
            : Math.max(0, (t.current_be_estimate || 0) - (t.actual_backend_hours || 0));
      }),
    );
    return total;
  }, [devAssignments, discipline]);

  const { selected, source, toggle, setMany, clear } = useSprintSelection();

  const togglePool = (id: string) => toggle(id, "pool");
  const toggleDev = (id: string) => toggle(id, "dev");
  const toggleAllPool = (ids: string[], select: boolean) =>
    setMany(ids, select, "pool");

  const selectedArr = useMemo(() => Array.from(selected), [selected]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sprint_tickets"] });
    qc.invalidateQueries({ queryKey: ["project_sprint_tickets"] });
    qc.invalidateQueries({ queryKey: ["planned_sprint_assignments", projectId] });
  };

  // -------- Bulk actions ----------
  const assignToDev = async (userId: string) => {
    if (!isPMBA || !targetSprintId) return;
    const slot: AssigneeSlot = discipline;
    try {
      for (const id of selectedArr) {
        await addTicketToLane(targetSprintId, id, userId, slot);
      }
      toast.success(`Assigned ${selectedArr.length} ticket${selectedArr.length === 1 ? "" : "s"}`);
      clear();
    } catch (err: unknown) {
      toast.error(formatSupabaseError(err));
    } finally {
      invalidate();
    }
  };

  const moveToSprint = async (toSprintId: string) => {
    if (!isPMBA) return;
    const patch =
      discipline === "FE"
        ? { planned_sprint_fe_id: toSprintId }
        : { planned_sprint_be_id: toSprintId };
    try {
      // If selection is from dev columns, also remove their current sprint_tickets row.
      if (source === "dev" && targetSprintId) {
        for (const id of selectedArr) {
          const links = sprintTickets.filter((st) => st.ticket_id === id);
          for (const link of links) {
            if (link.assigned_user_id) {
              await removeTicketFromSprint(link.id, id, link.assigned_user_id, discipline);
            }
          }
        }
      }
      const { error } = await supabase
        .from("tickets")
        .update(patch)
        .in("id", selectedArr);
      if (error) throw error;
      toast.success(
        `Moved ${selectedArr.length} ticket${selectedArr.length === 1 ? "" : "s"} to sprint`,
      );
      clear();
    } catch (err: unknown) {
      toast.error(formatSupabaseError(err));
    } finally {
      invalidate();
    }
  };

  const carryOver = async () => {
    if (!isPMBA || !targetSprint) return;
    const next = sprints.find((s) => s.sprint_number === targetSprint.sprint_number + 1);
    if (!next) {
      toast.error("No next sprint exists — create one in the Roadmap tab first.");
      return;
    }
    const slot: AssigneeSlot = discipline;
    try {
      for (const id of selectedArr) {
        // Use the same dev who owns the current sprint_tickets row.
        const link = sprintTickets.find((st) => st.ticket_id === id);
        const userId = link?.assigned_user_id ?? null;
        if (!userId) continue;
        await addTicketToLane(next.id, id, userId, slot);
      }
      toast.success(
        `Carried over ${selectedArr.length} ticket${selectedArr.length === 1 ? "" : "s"} to Sprint ${next.sprint_number}`,
      );
      clear();
    } catch (err: unknown) {
      toast.error(formatSupabaseError(err));
    } finally {
      invalidate();
    }
  };

  const removeFromSprint = async () => {
    if (!isPMBA) return;
    try {
      for (const id of selectedArr) {
        const links = sprintTickets.filter((st) => st.ticket_id === id);
        for (const link of links) {
          if (!link.assigned_user_id) continue;
          await removeTicketFromSprint(link.id, id, link.assigned_user_id, discipline);
        }
      }
      toast.success(
        `Removed ${selectedArr.length} ticket${selectedArr.length === 1 ? "" : "s"} from sprint`,
      );
      clear();
    } catch (err: unknown) {
      toast.error(formatSupabaseError(err));
    } finally {
      invalidate();
    }
  };

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
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 glass-strong hairline rounded-2xl shadow-2xl px-2 py-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="text-[10px] uppercase tracking-wider text-dim px-2">
                {source === "pool" ? "Pool" : "Sprint"}
              </span>

              {source === "pool" && (
                <>
                  <BulkMenu icon={UserPlus} label="Assign to" title="Assign to dev" width="w-56">
                    {sprintDevs.length === 0 ? (
                      <div className="text-xs text-dim px-2 py-2">No devs available</div>
                    ) : (
                      sprintDevs.map((d) => (
                        <BulkMenuRow key={d.user_id} onClick={() => assignToDev(d.user_id)}>
                          <span className="truncate">{d.member.name}</span>
                          <span className="text-[10px] text-dimmer ml-auto">{d.role}</span>
                        </BulkMenuRow>
                      ))
                    )}
                  </BulkMenu>
                  <BulkMenu icon={ArrowRight} label="Move to Sprint" title="Move to sprint" width="w-56">
                    {otherSprints.length === 0 ? (
                      <div className="text-xs text-dim px-2 py-2">No other sprints</div>
                    ) : (
                      otherSprints.map((s) => (
                        <BulkMenuRow key={s.id} onClick={() => moveToSprint(s.id)}>
                          Sprint {s.sprint_number}
                        </BulkMenuRow>
                      ))
                    )}
                  </BulkMenu>
                </>
              )}

              {source === "dev" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-dim hover:text-foreground gap-1.5"
                    onClick={carryOver}
                    disabled={!nextSprint}
                    title={
                      nextSprint
                        ? `Carry over to Sprint ${nextSprint.sprint_number}`
                        : "No next sprint exists — create one in the Roadmap tab first."
                    }
                  >
                    <ArrowRightCircle className="h-3.5 w-3.5" /> Carry over
                  </Button>
                  <BulkMenu icon={ArrowRight} label="Move to Sprint" title="Move to sprint" width="w-56">
                    {otherSprints.length === 0 ? (
                      <div className="text-xs text-dim px-2 py-2">No other sprints</div>
                    ) : (
                      otherSprints.map((s) => (
                        <BulkMenuRow key={s.id} onClick={() => moveToSprint(s.id)}>
                          Sprint {s.sprint_number}
                        </BulkMenuRow>
                      ))
                    )}
                  </BulkMenu>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-dim hover:text-destructive gap-1.5"
                    onClick={removeFromSprint}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </>
              )}
            </div>
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
