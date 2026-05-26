import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { TeamMember } from "@/lib/types";

export function makeTeamMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: overrides.id ?? "user-1",
    name: overrides.name ?? "Alice",
    avatar_color: overrides.avatar_color ?? "#FFCD71",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(overrides as any),
  } as TeamMember;
}

let n = 0;
export function makeTicket(overrides: Partial<TicketRow> = {}): TicketRow {
  n += 1;
  return {
    id: `t-${n}`,
    project_id: "p-1",
    ticket_number: n,
    formatted_id: `OLD-${n}`,
    title: `Ticket ${n}`,
    ticket_type: "Standard",
    status_id: "s-todo",
    fe_status: "todo",
    be_status: "todo",
    project_status_override: false,
    epic_id: null,
    epic_name: null,
    version: null,
    original_fe_estimate: 0,
    original_be_estimate: 0,
    current_fe_estimate: 0,
    current_be_estimate: 0,
    original_project_estimate: 0,
    current_project_estimate: 0,
    actual_frontend_hours: 0,
    actual_backend_hours: 0,
    actual_project_hours: 0,
    acceptance_criteria: null,
    position: n,
    created_at: new Date(2024, 0, 1).toISOString(),
    cr_approval: "pending",
    cr_decided_by: null,
    cr_decided_at: null,
    parent_ticket_id: null,
    bug_sub_number: null,
    github_issue_number: null,
    parent: null,
    assignees: [],
    ...overrides,
  };
}

export function withFeAssignee(t: TicketRow, userId = "u-fe"): TicketRow {
  return {
    ...t,
    assignees: [
      ...t.assignees,
      { user_id: userId, slot: "FE", member: makeTeamMember({ id: userId }), created_at: t.created_at },
    ],
  };
}
export function withBeAssignee(t: TicketRow, userId = "u-be"): TicketRow {
  return {
    ...t,
    assignees: [
      ...t.assignees,
      { user_id: userId, slot: "BE", member: makeTeamMember({ id: userId }), created_at: t.created_at },
    ],
  };
}
