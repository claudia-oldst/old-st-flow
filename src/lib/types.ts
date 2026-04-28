import type { Database } from "@/integrations/supabase/types";

export type ProjectRole = Database["public"]["Enums"]["project_role"];
export type StatusCategory = Database["public"]["Enums"]["status_category"];
export type TicketType = Database["public"]["Enums"]["ticket_type"];
export type AssigneeSlot = Database["public"]["Enums"]["assignee_slot"];
export type LogDiscipline = Database["public"]["Enums"]["log_discipline"];
export type LogSource = Database["public"]["Enums"]["log_source"];
export type DisciplineStatus = "todo" | "in_progress" | "for_integration" | "done";

export const DISCIPLINE_STATUS_LABEL: Record<DisciplineStatus, string> = {
  todo: "To-do",
  in_progress: "In progress",
  for_integration: "For integration",
  done: "Done",
};

export const DISCIPLINE_STATUS_COLOR: Record<DisciplineStatus, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  for_integration: "#a855f7",
  done: "#22c55e",
};

/** Canonical ordering of roles for selectors / lists. */
export const PROJECT_ROLES: ProjectRole[] = ["Frontend", "Backend", "Fullstack", "QA", "PMBA", "Design"];

/** Tailwind class strings for role chips/badges. */
export const PROJECT_ROLE_COLORS: Record<ProjectRole, string> = {
  Frontend: "bg-blue-500/15 text-blue-300 ring-blue-400/20",
  Backend: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  Fullstack: "bg-purple-500/15 text-purple-300 ring-purple-400/20",
  QA: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  PMBA: "bg-pink-500/15 text-pink-300 ring-pink-400/20",
  Design: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/20",
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
