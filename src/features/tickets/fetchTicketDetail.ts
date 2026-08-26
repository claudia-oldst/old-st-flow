import { supabase } from "@/integrations/supabase/client";
import type { DisciplineStatus, TeamMember, TicketAssignee } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

/** Loads a full TicketRow (with assignees) for detail sheets and dialogs. */
export async function fetchTicketDetail(ticketId: string): Promise<TicketRow | null> {
  const { data: t } = await supabase
    .from("tickets")
    .select("*, epic:project_epics(epic_name)")
    .eq("id", ticketId)
    .maybeSingle();
  if (!t) return null;
  const { data: assignees } = await supabase
    .from("ticket_assignees")
    .select("*, member:team_members(*)")
    .eq("ticket_id", ticketId);
  const list = (assignees as Array<TicketAssignee & { member: TeamMember; created_at: string }> | null) ?? [];
  const tt: any = t;
  return {
    id: tt.id,
    project_id: tt.project_id,
    ticket_number: tt.ticket_number,
    formatted_id: tt.formatted_id,
    title: tt.title,
    ticket_type: tt.ticket_type,
    status_id: tt.status_id,
    fe_status: (tt.fe_status ?? "todo") as DisciplineStatus,
    be_status: (tt.be_status ?? "todo") as DisciplineStatus,
    project_status_override: !!tt.project_status_override,
    epic_id: tt.epic_id ?? null,
    epic_name: tt.epic?.epic_name ?? null,
    version: tt.version ?? null,
    original_fe_estimate: Number(tt.original_fe_estimate ?? 0),
    original_be_estimate: Number(tt.original_be_estimate ?? 0),
    current_fe_estimate: Number(tt.current_fe_estimate ?? 0),
    current_be_estimate: Number(tt.current_be_estimate ?? 0),
    original_project_estimate: Number(tt.original_project_estimate ?? 0),
    current_project_estimate: Number(tt.current_project_estimate ?? 0),
    has_original_fe_estimate: tt.original_fe_estimate !== null && tt.original_fe_estimate !== undefined,
    has_original_be_estimate: tt.original_be_estimate !== null && tt.original_be_estimate !== undefined,
    has_original_project_estimate: tt.original_project_estimate !== null && tt.original_project_estimate !== undefined,
    actual_frontend_hours: Number(tt.actual_frontend_hours),
    actual_backend_hours: Number(tt.actual_backend_hours),
    actual_project_hours: Number(tt.actual_project_hours ?? 0),
    acceptance_criteria: tt.acceptance_criteria ?? null,
    position: tt.position,
    created_at: tt.created_at,
    cr_approval: (tt.ticket_type === "CR" ? (tt.cr_approval ?? "pending") : null) as TicketRow["cr_approval"],
    cr_decided_by: tt.cr_decided_by ?? null,
    cr_decided_at: tt.cr_decided_at ?? null,
    parent_ticket_id: tt.parent_ticket_id ?? null,
    bug_sub_number: tt.bug_sub_number ?? null,
    github_issue_number: tt.github_issue_number ?? null,
    parent: null,
    assignees: list.map((a) => ({
      user_id: a.user_id,
      slot: a.slot,
      member: a.member,
      created_at: (a as any).created_at,
    })),
  };
}
