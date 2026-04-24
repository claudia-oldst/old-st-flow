import type { Database } from "@/integrations/supabase/types";

export type ProjectRole = Database["public"]["Enums"]["project_role"];
export type StatusCategory = Database["public"]["Enums"]["status_category"];
export type TicketType = Database["public"]["Enums"]["ticket_type"];
export type AssigneeSlot = Database["public"]["Enums"]["assignee_slot"];
export type LogDiscipline = Database["public"]["Enums"]["log_discipline"];
export type LogSource = Database["public"]["Enums"]["log_source"];
export type DisciplineStatus = "todo" | "in_progress" | "done";

export const DISCIPLINE_STATUS_LABEL: Record<DisciplineStatus, string> = {
  todo: "To-do",
  in_progress: "In progress",
  done: "Done",
};

export const DISCIPLINE_STATUS_COLOR: Record<DisciplineStatus, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  done: "#22c55e",
};

export type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectMember = Database["public"]["Tables"]["project_members"]["Row"];
export type Status = Database["public"]["Tables"]["statuses"]["Row"];
export type Ticket = Database["public"]["Tables"]["tickets"]["Row"];
export type TicketAssignee = Database["public"]["Tables"]["ticket_assignees"]["Row"];
export type TimeLog = Database["public"]["Tables"]["time_logs"]["Row"];
export type ActiveTimer = Database["public"]["Tables"]["active_timers"]["Row"];

export interface TicketWithAssignees extends Ticket {
  assignees: Array<TicketAssignee & { member: TeamMember }>;
}
