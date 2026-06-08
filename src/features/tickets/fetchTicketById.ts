import { supabase } from "@/integrations/supabase/client";
import { normalizeTicket, type TicketRow } from "./useProjectTickets";

/**
 * Fetch a single ticket with the same shape normalizeTicket expects.
 * Used when navigating from within a detail sheet (e.g. clicking a parent
 * ticket badge, or a bug-link comment) to a ticket that may not be present
 * in the originating list.
 */
export async function fetchTicketById(id: string): Promise<TicketRow | null> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `*,
       epic:project_epics(epic_name),
       parent:tickets!tickets_parent_ticket_id_fkey(id, formatted_id, title),
       assignees:ticket_assignees(user_id, slot, created_at, member:team_members(*))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeTicket(data);
}
