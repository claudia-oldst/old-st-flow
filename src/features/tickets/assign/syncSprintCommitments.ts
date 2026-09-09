import { supabase } from "@/integrations/supabase/client";
import { addTicketToLane } from "@/features/sprints/dnd";
import type { AssigneeSlot } from "@/lib/types";

export interface SprintSyncRow {
  ticket_id: string;
  user_id: string;
  slot: AssigneeSlot;
}

/**
 * Keep sprint commitments in step with ticket assignment changes.
 * Only FE/BE map to sprint_tickets rows — Project slots are never committed.
 */
export async function syncSprintCommitments(
  sprintId: string | null,
  added: SprintSyncRow[],
  removed: SprintSyncRow[],
) {
  if (!sprintId) return;
  const dev = (r: SprintSyncRow) => r.slot === "FE" || r.slot === "BE";

  for (const r of removed.filter(dev)) {
    await supabase
      .from("sprint_tickets")
      .delete()
      .eq("sprint_id", sprintId)
      .eq("ticket_id", r.ticket_id)
      .eq("assigned_user_id", r.user_id)
      .eq("discipline", r.slot);
  }

  for (const r of added.filter(dev)) {
    try {
      await addTicketToLane(sprintId, r.ticket_id, r.user_id, r.slot);
    } catch {
      // Non-fatal: the assignment itself already saved.
    }
  }
}
