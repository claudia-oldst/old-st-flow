/**
 * Convenience aliases for generated Supabase row types.
 * Use these instead of `any` when handling rows returned from `supabase.from(...)`.
 */
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

export type TicketRow = Tables["tickets"]["Row"];
export type TicketInsert = Tables["tickets"]["Insert"];
export type TicketUpdate = Tables["tickets"]["Update"];

export type ProjectRow = Tables["projects"]["Row"];
export type ProjectMemberRow = Tables["project_members"]["Row"];
export type TeamMemberRow = Tables["team_members"]["Row"];

export type EstimateChangeRow = Tables["ticket_estimate_changes"]["Row"];
export type CommentRowDB = Tables["ticket_comments"]["Row"];
export type ActiveTimerRow = Tables["active_timers"]["Row"];

export type EpicRow = Tables["epics"] extends { Row: infer R } ? R : never;

export type ProjectMemberWithMember = ProjectMemberRow & {
  member: TeamMemberRow | null;
};

export interface EdgeFunctionResponse<T = unknown> {
  url?: string;
  error?: string;
  data?: T;
}
