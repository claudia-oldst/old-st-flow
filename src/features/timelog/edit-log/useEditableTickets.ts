import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LogDiscipline } from "@/lib/types";
import type { EditableTicket } from "./editLogHelpers";

const n = (v: unknown) => Number(v) || 0;

/**
 * Slim list of tickets in a project the user is assigned to (plus the log's
 * current ticket), with only the fields the edit dialog needs — no acceptance
 * criteria or other heavy columns.
 */
export function useEditableTickets(
  projectId: string | undefined,
  userId: string,
  currentTicketId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["editable-log-tickets", projectId, userId, currentTicketId],
    enabled: enabled && !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<EditableTicket[]> => {
      const cols =
        "id,project_id,formatted_id,title,ticket_type,actual_frontend_hours,actual_backend_hours,actual_project_hours,current_fe_estimate,current_be_estimate,current_project_estimate";
      const [assigned, current] = await Promise.all([
        projectId
          ? supabase
              .from("ticket_assignees")
              .select(`slot, ticket:tickets!inner(${cols})`)
              .eq("user_id", userId)
              .eq("ticket.project_id", projectId)
              .neq("ticket.ticket_type", "Feedback")
          : Promise.resolve({ data: [], error: null }),
        supabase.from("tickets").select(cols).eq("id", currentTicketId).maybeSingle(),
      ]);
      if (assigned.error) throw assigned.error;
      const byId = new Map<string, EditableTicket>();
      const add = (t: any, slot?: string) => {
        if (!t) return;
        const row =
          byId.get(t.id) ??
          ({
            ...t,
            actual_frontend_hours: n(t.actual_frontend_hours),
            actual_backend_hours: n(t.actual_backend_hours),
            actual_project_hours: n(t.actual_project_hours),
            current_fe_estimate: n(t.current_fe_estimate),
            current_be_estimate: n(t.current_be_estimate),
            current_project_estimate: n(t.current_project_estimate),
            disciplines: [],
          } as EditableTicket);
        if (slot && !row.disciplines.includes(slot as LogDiscipline))
          row.disciplines.push(slot as LogDiscipline);
        byId.set(t.id, row);
      };
      add(current.data);
      for (const r of (assigned.data as any[]) ?? []) add(r.ticket, r.slot);
      return [...byId.values()].sort((a, b) => a.formatted_id.localeCompare(b.formatted_id));
    },
  });
}
