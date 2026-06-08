import { supabase } from "@/integrations/supabase/client";
import type { AssigneeSlot } from "@/lib/types";
import { toast } from "sonner";

/**
 * Add a ticket to a sprint's pool (no developer assigned).
 * Source sprint rows are intentionally preserved for telemetry.
 */
export async function addTicketToPool(sprintId: string, ticketId: string) {
  // Skip if already in this sprint
  const { data: existing } = await supabase
    .from("sprint_tickets")
    .select("id, assigned_user_id")
    .eq("sprint_id", sprintId)
    .eq("ticket_id", ticketId)
    .maybeSingle();
  if (existing) {
    if (existing.assigned_user_id) {
      const { error } = await supabase
        .from("sprint_tickets")
        .update({ assigned_user_id: null })
        .eq("id", existing.id);
      if (error) throw error;
    }
    return;
  }
  const { error } = await supabase
    .from("sprint_tickets")
    .insert({ sprint_id: sprintId, ticket_id: ticketId, assigned_user_id: null });
  if (error) throw error;
}

/**
 * Add a ticket to a developer's lane in the current sprint.
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
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("sprint_tickets")
      .update({ assigned_user_id: userId })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("sprint_tickets")
      .insert({ sprint_id: sprintId, ticket_id: ticketId, assigned_user_id: userId });
    if (error) throw error;
  }

  // Upsert ticket_assignees row in specialty slot — additive
  const { data: existingAssn } = await supabase
    .from("ticket_assignees")
    .select("ticket_id")
    .eq("ticket_id", ticketId)
    .eq("user_id", userId)
    .eq("slot", slot)
    .maybeSingle();

  if (!existingAssn) {
    const { error } = await supabase
      .from("ticket_assignees")
      .insert({ ticket_id: ticketId, user_id: userId, slot });
    if (error) {
      // Don't block — assignee insertion can fail validation (e.g. role mismatch);
      // surface it but keep sprint linkage intact.
      toast.error(`Could not assign ${slot}: ${error.message}`);
    }
  }
}

/**
 * Move a card off a developer lane back into the sprint pool.
 * - Sets assigned_user_id = NULL on sprint_tickets
 * - Conditional ticket_assignees cleanup: preserves the row if any time_logs exist
 *   for this (ticket, user, discipline) to avoid orphaning metrics.
 */
export async function unpinTicketFromLane(
  sprintTicketId: string,
  ticketId: string,
  userId: string,
  slot: AssigneeSlot,
) {
  const { error } = await supabase
    .from("sprint_tickets")
    .update({ assigned_user_id: null })
    .eq("id", sprintTicketId);
  if (error) throw error;

  await cleanupAssignee(ticketId, userId, slot);
}

/**
 * Remove a ticket from the current sprint entirely (card dragged to Backlog).
 * Does NOT touch other sprints. Conditional assignee cleanup applied.
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

/**
 * Delete the matching ticket_assignees row only if no time_logs exist for this
 * (ticket_id, user_id, discipline). If logs exist, preserve the assignee row.
 */
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
