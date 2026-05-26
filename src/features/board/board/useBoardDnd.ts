import { useState } from "react";
import { DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { syncTicketToGithub } from "@/features/github/syncTicket";
import type { DisciplineStatus, Status } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { BoardMode, DISCIPLINE_STATUSES, DISCIPLINE_TO_CATEGORY } from "./constants";

export function useBoardDnd({
  mode,
  tickets,
  statuses,
  statusCategoryById,
  reload,
}: {
  mode: BoardMode;
  tickets: TicketRow[];
  statuses: Status[];
  statusCategoryById: Record<string, string>;
  reload: () => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    if (mode === "project") {
      const ticketId = String(e.active.id);
      const t = tickets.find((x) => x.id === ticketId);
      if (!t || t.status_id === overId) return;
      const { error } = await supabase
        .from("tickets")
        .update({ status_id: overId })
        .eq("id", ticketId);
      if (error) toast.error(error.message);
      else {
        reload();
        void syncTicketToGithub(ticketId);
      }
      return;
    }

    const [ticketId, slot] = String(e.active.id).split("::");
    const newStatus = overId as DisciplineStatus;
    if (!DISCIPLINE_STATUSES.includes(newStatus)) return;
    const t = tickets.find((x) => x.id === ticketId);
    if (!t) return;
    const hasSlot = t.assignees.some((a) => a.slot === slot);
    if (!hasSlot) return;

    if (slot === "Project") {
      const targetCategory = DISCIPLINE_TO_CATEGORY[newStatus];
      const currentCategory = t.status_id ? statusCategoryById[t.status_id] : undefined;
      if (currentCategory === targetCategory) return;
      const target = statuses
        .filter((s) => s.category === targetCategory)
        .sort((a, b) => a.position - b.position)[0];
      if (!target) return;
      const { error } = await supabase
        .from("tickets")
        .update({ status_id: target.id, project_status_override: true })
        .eq("id", ticketId);
      if (error) toast.error(error.message);
      else reload();
      return;
    }

    const current = slot === "FE" ? t.fe_status : t.be_status;
    if (current === newStatus) return;
    const patch =
      slot === "FE" ? { fe_status: newStatus } : { be_status: newStatus };
    const { error } = await supabase
      .from("tickets")
      .update(patch)
      .eq("id", ticketId);
    if (error) toast.error(error.message);
    else reload();
  };

  return { sensors, activeId, handleDragStart, handleDragEnd };
}
