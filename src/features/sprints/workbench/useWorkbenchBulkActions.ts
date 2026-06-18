import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import type { AssigneeSlot } from "@/lib/types";
import type { Sprint } from "../types";
import { addTicketToLane, removeTicketFromSprint } from "../dnd";

interface SprintTicketLink {
  id: string;
  ticket_id: string;
  assigned_user_id: string | null;
}

interface Params {
  projectId: string;
  isPMBA: boolean;
  targetSprintId: string;
  targetSprint: Sprint | undefined;
  sprints: Sprint[];
  sprintTickets: SprintTicketLink[];
  discipline: "FE" | "BE";
  selectedArr: string[];
  source: "pool" | "dev" | null;
  clear: () => void;
}

export function useWorkbenchBulkActions({
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
}: Params) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sprint_tickets"] });
    qc.invalidateQueries({ queryKey: ["project_sprint_tickets"] });
    qc.invalidateQueries({ queryKey: ["planned_sprint_assignments", projectId] });
  };

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

  return { assignToDev, moveToSprint, carryOver, removeFromSprint, invalidate };
}
