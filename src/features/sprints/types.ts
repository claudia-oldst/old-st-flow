import type { Database } from "@/integrations/supabase/types";
import type { Ticket, TeamMember, ProjectRole } from "@/lib/types";

export type Sprint = Database["public"]["Tables"]["sprints"]["Row"];
export type SprintCapacity = Database["public"]["Tables"]["sprint_capacities"]["Row"];
export type SprintTicket = Database["public"]["Tables"]["sprint_tickets"]["Row"];

export type SprintDiscipline = "FE" | "BE";

export interface SprintMember {
  user_id: string;
  role: ProjectRole;
  member: TeamMember;
}

/** Disciplines a member can take cards in. */
export function memberDisciplines(role: ProjectRole): SprintDiscipline[] {
  if (role === "Frontend") return ["FE"];
  if (role === "Backend") return ["BE"];
  if (role === "Fullstack") return ["FE", "BE"];
  return [];
}

/** Remaining hours per discipline using max(0, current_est − actual). */
export function remainingHours(t: Ticket): { FE: number; BE: number } {
  return {
    FE: Math.max(0, (Number(t.current_fe_estimate) || 0) - (Number(t.actual_frontend_hours) || 0)),
    BE: Math.max(0, (Number(t.current_be_estimate) || 0) - (Number(t.actual_backend_hours) || 0)),
  };
}

/** Stable DnD ids. */
export const dndId = {
  backlogCard: (ticketId: string) => `backlog:${ticketId}`,
  poolCard: (sprintTicketId: string) => `pool:${sprintTicketId}`,
  laneCard: (sprintTicketId: string, userId: string) => `lane:${sprintTicketId}:${userId}`,
  backlogZone: "zone:backlog",
  poolZone: "zone:pool",
  laneZone: (userId: string) => `zone:lane:${userId}`,
};
