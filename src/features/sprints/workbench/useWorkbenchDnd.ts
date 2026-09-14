import { useState } from "react";
import { useSensor, PointerSensor, useSensors } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { SprintTicket } from "../types";
import { addTicketToLane, removeTicketFromSprint } from "../dnd";

/** Stable DnD ids for the planning workbench. */
export const planDndId = {
  poolCard: (ticketId: string) => `plan:pool:${ticketId}`,
  devCard: (userId: string, ticketId: string) => `plan:dev:${userId}:${ticketId}`,
  poolZone: "plan:zone:pool",
  devZone: (userId: string) => `plan:zone:dev:${userId}`,
};

interface DragData {
  source: "pool" | "dev";
  ticketId: string;
  userId?: string;
}

interface Params {
  sprintId: string;
  discipline: "FE" | "BE";
  sprintTickets: SprintTicket[];
  isPMBA: boolean;
  selected: Set<string>;
  source: "pool" | "dev" | null;
  ticketById: Map<string, TicketRow>;
  clear: () => void;
  invalidate: () => void;
}

/**
 * Drag-and-drop orchestration for the sprint planning workbench.
 * Reuses addTicketToLane / removeTicketFromSprint — no new SQL.
 */
export function useWorkbenchDnd({
  sprintId,
  discipline,
  sprintTickets,
  isPMBA,
  selected,
  source,
  ticketById,
  clear,
  invalidate,
}: Params) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const activeTickets: TicketRow[] = (() => {
    if (!activeId) return [];
    const data = decodeId(activeId);
    if (!data) return [];
    // Move the whole selection when the dragged ticket is part of it and the
    // active selection source matches the drag origin.
    const useSelection =
      selected.has(data.ticketId) && source === (data.source === "pool" ? "pool" : "dev");
    const ids = useSelection ? Array.from(selected) : [data.ticketId];
    return ids
      .map((id) => ticketById.get(id))
      .filter((t): t is TicketRow => !!t);
  })();

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !isPMBA) return;

    const data = decodeId(String(active.id));
    const target = String(over.id);
    if (!data) return;

    // Resolve payload: selection (if active) or just the dragged ticket.
    const useSelection =
      selected.has(data.ticketId) && source === (data.source === "pool" ? "pool" : "dev");
    const ids = useSelection ? Array.from(selected) : [data.ticketId];

    const toPool = target === planDndId.poolZone;
    const devMatch = target.startsWith("plan:zone:dev:");
    const targetUserId = devMatch ? target.replace("plan:zone:dev:", "") : null;

    try {
      if (toPool) {
        // Uncommit from the sprint for the active discipline.
        await removeFromSprint(ids, data.source, data.userId);
        toast.success(`Uncommitted ${ids.length} ticket${ids.length === 1 ? "" : "s"}`);
      } else if (targetUserId) {
        // Commit to the target dev. If coming from another dev, remove there first.
        if (data.source === "dev" && data.userId && data.userId !== targetUserId) {
          await removeFromSprint(ids, "dev", data.userId);
        }
        for (const id of ids) {
          await addTicketToLane(sprintId, id, targetUserId, discipline);
        }
        toast.success(`Assigned ${ids.length} ticket${ids.length === 1 ? "" : "s"}`);
      }
      clear();
    } catch (err: unknown) {
      toast.error(formatSupabaseError(err));
    } finally {
      invalidate();
    }
  }

  async function removeFromSprint(
    ids: string[],
    fromSource: "pool" | "dev",
    fromUserId?: string,
  ) {
    for (const id of ids) {
      const links = sprintTickets.filter(
        (st) =>
          st.ticket_id === id &&
          st.discipline === discipline &&
          (fromSource === "dev" ? st.assigned_user_id === fromUserId : true),
      );
      for (const link of links) {
        if (!link.assigned_user_id) continue;
        await removeTicketFromSprint(link.id, id, link.assigned_user_id, discipline);
      }
    }
  }

  return { sensors, onDragStart, onDragEnd, activeId, activeTickets };
}

function decodeId(id: string): DragData | null {
  if (id.startsWith("plan:pool:")) {
    return { source: "pool", ticketId: id.replace("plan:pool:", "") };
  }
  if (id.startsWith("plan:dev:")) {
    const rest = id.replace("plan:dev:", "");
    const [userId, ticketId] = [rest.substring(0, rest.indexOf(":")), rest.substring(rest.indexOf(":") + 1)];
    return { source: "dev", ticketId, userId };
  }
  return null;
}
