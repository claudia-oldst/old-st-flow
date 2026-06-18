import { supabase } from "@/integrations/supabase/client";
import type { AssigneeSlot } from "@/lib/types";
import { toast } from "sonner";
import { formatSupabaseError } from "@/lib/formatSupabaseError";

/**
 * Add a ticket to a developer's lane in a sprint.
 * - Inserts or updates the sprint_tickets row (pinned to this dev)
 * - Adds the dev to ticket_assignees in their specialty slot (additive)
 */
export async function addTicketToLane(
  sprintId: string,
  ticketId: string,
  userId: string,
  slot: AssigneeSlot,
) {
  const { data: existing } = await supabase
    .from("sprint_tickets")
    .select("id")
    .eq("sprint_id", sprintId)
    .eq("ticket_id", ticketId)
    .eq("assigned_user_id", userId)
    .maybeSingle();

  if (existing) return; // already committed to this dev

  const { error } = await supabase
    .from("sprint_tickets")
    .insert({ sprint_id: sprintId, ticket_id: ticketId, assigned_user_id: userId });
  if (error) throw error;

  // Upsert ticket_assignees row in specialty slot — additive
  const { data: existingAssn } = await supabase
    .from("ticket_assignees")
    .select("ticket_id")
    .eq("ticket_id", ticketId)
    .eq("user_id", userId)
    .eq("slot", slot)
    .maybeSingle();

  if (!existingAssn) {
    const { error: aerr } = await supabase
      .from("ticket_assignees")
      .insert({ ticket_id: ticketId, user_id: userId, slot });
    if (aerr) {
      // Don't block — assignee insertion can fail validation (e.g. role mismatch).
      toast.error(`Could not assign ${slot}: ${formatSupabaseError(aerr)}`);
    }
  }
}

/**
 * Remove a per-dev sprint_tickets row.
 * Conditional ticket_assignees cleanup: preserves the row if any time_logs exist
 * for this (ticket, user, discipline) to avoid orphaning metrics.
 */
export async function removeTicketFromSprint(
  sprintTicketId: string,
  ticketId: string,
  userId: string | null,
  slot: AssigneeSlot | null,
) {
  const { error } = await supabase.from("sprint_tickets").delete().eq("id", sprintTicketId);
  if (error) throw error;
  if (userId && slot) {
    await cleanupAssignee(ticketId, userId, slot);
  }
}

async function cleanupAssignee(ticketId: string, userId: string, slot: AssigneeSlot) {
  const discipline = slot === "FE" ? "FE" : slot === "BE" ? "BE" : "Project";
  const { count } = await supabase
    .from("time_logs")
    .select("id", { count: "exact", head: true })
    .eq("ticket_id", ticketId)
    .eq("user_id", userId)
    .eq("discipline", discipline);

  if ((count ?? 0) > 0) return; // preserve for audit trail
  await supabase
    .from("ticket_assignees")
    .delete()
    .eq("ticket_id", ticketId)
    .eq("user_id", userId)
    .eq("slot", slot);
}
