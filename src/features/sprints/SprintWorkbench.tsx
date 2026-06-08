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
import type { AssigneeSlot } from "@/lib/types";
import type { Sprint, SprintTicket } from "./types";
import { memberDisciplines } from "./types";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import {
  useSprintCapacities,
  useSprintTickets,
  useProjectMembers,
  useProjectSprintTickets,
} from "./useSprintBoard";
import { BacklogPanel } from "./BacklogPanel";
import { SprintPoolPanel } from "./SprintPoolPanel";
import { DeveloperLane } from "./DeveloperLane";
import {
  addTicketToPool,
  addTicketToLane,
  unpinTicketFromLane,
  removeTicketFromSprint,
} from "./dnd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CardDisplayMenu } from "@/features/tickets/CardDisplayMenu";
import { useCardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import { SprintSelectionProvider, useSprintSelection } from "./SprintSelectionContext";
import { format, parseISO } from "date-fns";

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

function SprintWorkbenchInner({ projectId, sprints, isPMBA }: Props) {
  const [targetSprintId, setTargetSprintId] = useState<string>(sprints[0]?.id ?? "");
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const { prefs: cardPrefs, setPrefs: setCardPrefs, reset: resetCardPrefs } = useCardDisplayPrefs();

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

  const { data: allSprintTickets = [] } = useProjectSprintTickets(projectId);
  const { data: capacities = [] } = useSprintCapacities(targetSprintId || undefined);
  const { data: sprintTickets = [] } = useSprintTickets(targetSprintId || undefined);
  const { data: members = [] } = useProjectMembers(projectId);

  const targetSprint = sprints.find((s) => s.id === targetSprintId);

  const sprintMemberIds = useMemo(() => {
    const set = new Set<string>();
    capacities.forEach((c) => set.add(c.user_id));
    return set;
  }, [capacities]);

  const devMembers = useMemo(
    () =>
      members.filter(
        (m) => memberDisciplines(m.role).length > 0 && sprintMemberIds.has(m.user_id),
      ),
    [members, sprintMemberIds],
  );

  const resolveItems = (rows: SprintTicket[]) =>
    rows
      .map((link) => {
        const t = ticketById.get(link.ticket_id);
        return t ? { link, ticket: t } : null;
      })
      .filter((x): x is { link: SprintTicket; ticket: TicketRow } => !!x);

  const poolItems = resolveItems(sprintTickets.filter((st) => !st.assigned_user_id));
  const itemsByUser = (uid: string) =>
    resolveItems(sprintTickets.filter((st) => st.assigned_user_id === uid));

  const { selected, clear } = useSprintSelection();

  const moveTicketTo = async (
    ticketId: string,
    target: "pool" | "backlog" | { userId: string },
  ) => {
    const st = sprintTickets.find((s) => s.ticket_id === ticketId);
    const fromUserId = st?.assigned_user_id ?? null;
    const fromDev = fromUserId ? devMembers.find((d) => d.user_id === fromUserId) : null;
    const fromSlot: AssigneeSlot | null = fromDev
      ? (memberDisciplines(fromDev.role)[0] as AssigneeSlot)
      : null;

    if (target === "pool") {
      if (!st) {
        await addTicketToPool(targetSprintId, ticketId);
      } else if (fromUserId && fromSlot) {
        await unpinTicketFromLane(st.id, ticketId, fromUserId, fromSlot);
      }
      return;
    }
    if (target === "backlog") {
      if (st) {
        await removeTicketFromSprint(st.id, ticketId, fromUserId, fromSlot);
      }
      return;
    }
    // lane target
    const toUserId = target.userId;
    if (st && fromUserId === toUserId) return;
    const toDev = devMembers.find((d) => d.user_id === toUserId);
    if (!toDev) return;
    const toSlot: AssigneeSlot = memberDisciplines(toDev.role)[0] as AssigneeSlot;
    if (st && fromUserId && fromSlot) {
      await unpinTicketFromLane(st.id, ticketId, fromUserId, fromSlot);
    }
    await addTicketToLane(targetSprintId, ticketId, toUserId, toSlot);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    if (!isPMBA || !targetSprintId) return;
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    const [overKind, ...overRest] = overId.split(":");

    const activeTicketId = (active.data.current as { ticketId?: string } | undefined)?.ticketId;
    if (!activeTicketId) return;

    const ticketIds = selected.has(activeTicketId)
      ? Array.from(selected)
      : [activeTicketId];

    let target: "pool" | "backlog" | { userId: string } | null = null;
    if (overId === "zone:pool") target = "pool";
    else if (overId === "zone:backlog") target = "backlog";
    else if (overKind === "zone" && overRest[0] === "lane") target = { userId: overRest[1] };
    if (!target) return;

    try {
      for (const id of ticketIds) {
        await moveTicketTo(id, target);
      }
      if (ticketIds.length > 1) {
        toast.success(`Moved ${ticketIds.length} tickets`);
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


  if (sprints.length === 0) {
    return (
      <div className="text-sm text-dim p-6 text-center hairline rounded-md">
        Create a sprint in the Forecasting Calendar first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-280px)] min-h-[500px]">
      <div className="flex items-center gap-3">
        <label className="text-[10px] uppercase tracking-wide text-dim">Target Sprint</label>
        <Select value={targetSprintId} onValueChange={setTargetSprintId}>
          <SelectTrigger className="h-8 w-64 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                Sprint {s.sprint_number}
                {s.name ? ` — ${s.name}` : ""} · {format(parseISO(s.start_date), "MMM d")} →{" "}
                {format(parseISO(s.end_date), "MMM d")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {targetSprint && (
          <div className="text-[11px] text-dim ml-auto">
            {sprintTickets.length} tickets · {poolItems.length} unassigned
          </div>
        )}
        <CardDisplayMenu prefs={cardPrefs} onChange={setCardPrefs} onReset={resetCardPrefs} />
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          <div className="col-span-3 min-h-0">
            <BacklogPanel
              projectId={projectId}
              targetSprintId={targetSprintId}
              sprints={sprints}
              tickets={tickets}
              allSprintTickets={allSprintTickets}
              disabled={!isPMBA}
            />
          </div>
          <div className="col-span-3 min-h-0">
            <SprintPoolPanel projectId={projectId} items={poolItems} disabled={!isPMBA} />
          </div>
          <div className="col-span-6 min-h-0">
            <div className="flex gap-2 overflow-x-auto h-full pb-2">
              {devMembers.length === 0 && (
                <div className="text-xs text-dim p-6 hairline rounded-md w-full text-center">
                  No FE/BE/Fullstack members on this project.
                </div>
              )}
              {devMembers.map((m) => (
                <DeveloperLane
                  key={m.user_id}
                  member={m}
                  items={itemsByUser(m.user_id)}
                  capacities={capacities}
                  disabled={!isPMBA}
                />
              ))}
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}
