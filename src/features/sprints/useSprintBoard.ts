import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import type { Sprint, SprintCapacity, SprintTicket, SprintMember } from "./types";
import type { Ticket, TeamMember, ProjectRole } from "@/lib/types";

/** All sprints for a project, ordered by sprint_number. */
export function useSprints(projectId: string | undefined) {
  const queryKey = ["sprints", projectId] as const;
  const query = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async (): Promise<Sprint[]> => {
      const { data, error } = await supabase
        .from("sprints")
        .select("*")
        .eq("project_id", projectId!)
        .order("sprint_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Sprint[];
    },
  });
  useRealtimeInvalidate(
    projectId ? [{ table: "sprints", filter: `project_id=eq.${projectId}` }] : null,
    queryKey,
    !!projectId,
  );
  return query;
}

/** Project members with their team_members row. */
export function useProjectMembers(projectId: string | undefined) {
  const queryKey = ["projectMembers", projectId] as const;
  const query = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async (): Promise<SprintMember[]> => {
      const { data, error } = await supabase
        .from("project_members")
        .select("user_id, role, member:team_members(*)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return ((data ?? []) as unknown as Array<{
        user_id: string;
        role: ProjectRole;
        member: TeamMember;
      }>).filter((r) => !!r.member);
    },
  });
  useRealtimeInvalidate(
    projectId
      ? [
          { table: "project_members", filter: `project_id=eq.${projectId}` },
          { table: "team_members" },
        ]
      : null,
    queryKey,
    !!projectId,
  );
  return query;
}

/** Capacities for one sprint. */
export function useSprintCapacities(sprintId: string | undefined) {
  const queryKey = ["sprint_capacities", sprintId] as const;
  const query = useQuery({
    queryKey,
    enabled: !!sprintId,
    queryFn: async (): Promise<SprintCapacity[]> => {
      const { data, error } = await supabase
        .from("sprint_capacities")
        .select("*")
        .eq("sprint_id", sprintId!);
      if (error) throw error;
      return (data ?? []) as SprintCapacity[];
    },
  });
  useRealtimeInvalidate(
    sprintId ? [{ table: "sprint_capacities", filter: `sprint_id=eq.${sprintId}` }] : null,
    queryKey,
    !!sprintId,
  );
  return query;
}

/** Sprint_tickets (with full ticket) for one sprint. */
export function useSprintTickets(sprintId: string | undefined) {
  const queryKey = ["sprint_tickets", sprintId] as const;
  const query = useQuery({
    queryKey,
    enabled: !!sprintId,
    queryFn: async (): Promise<Array<SprintTicket & { ticket: Ticket }>> => {
      const { data, error } = await supabase
        .from("sprint_tickets")
        .select("*, ticket:tickets(*)")
        .eq("sprint_id", sprintId!);
      if (error) throw error;
      return ((data ?? []) as unknown) as Array<SprintTicket & { ticket: Ticket }>;
    },
  });
  useRealtimeInvalidate(
    sprintId
      ? [
          { table: "sprint_tickets", filter: `sprint_id=eq.${sprintId}` },
          { table: "tickets" },
        ]
      : null,
    queryKey,
    !!sprintId,
  );
  return query;
}

/** All sprint_tickets for the whole project — used to detect which backlog tickets are unscheduled. */
export function useProjectSprintTickets(projectId: string | undefined) {
  const queryKey = ["project_sprint_tickets", projectId] as const;
  const query = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async (): Promise<SprintTicket[]> => {
      const { data, error } = await supabase
        .from("sprint_tickets")
        .select("*, sprint:sprints!inner(project_id)")
        .eq("sprint.project_id", projectId!);
      if (error) throw error;
      return ((data ?? []) as unknown) as SprintTicket[];
    },
  });
  useRealtimeInvalidate(
    projectId ? [{ table: "sprint_tickets" }] : null,
    queryKey,
    !!projectId,
  );
  return query;
}

/** Project tickets (excludes Proj-type — they can't be sprinted). */
export function useProjectTickets(projectId: string | undefined) {
  const queryKey = ["projectTickets:nonProj", projectId] as const;
  const query = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async (): Promise<Ticket[]> => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("project_id", projectId!)
        .neq("ticket_type", "Proj")
        .order("ticket_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Ticket[];
    },
  });
  useRealtimeInvalidate(
    projectId ? [{ table: "tickets", filter: `project_id=eq.${projectId}` }] : null,
    queryKey,
    !!projectId,
  );
  return query;
}
