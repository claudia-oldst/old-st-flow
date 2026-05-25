import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { PAGE_SIZES } from "@/lib/pagination";
import type { DisciplineStatus, TeamMember, TicketAssignee } from "@/lib/types";

export interface TicketRow {
  id: string;
  project_id: string;
  ticket_number: number;
  formatted_id: string;
  title: string;
  ticket_type: "Standard" | "Bug" | "CR" | "Proj";
  status_id: string | null;
  fe_status: DisciplineStatus;
  be_status: DisciplineStatus;
  project_status_override: boolean;
  epic_id: number | null;
  epic_name: string | null;
  version: string | null;
  original_fe_estimate: number;
  original_be_estimate: number;
  current_fe_estimate: number;
  current_be_estimate: number;
  original_project_estimate: number;
  current_project_estimate: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_project_hours: number;
  acceptance_criteria: string | null;
  position: number;
  created_at: string;
  cr_approval: "pending" | "approved" | "rejected" | null;
  cr_decided_by: string | null;
  cr_decided_at: string | null;
  parent_ticket_id: string | null;
  bug_sub_number: number | null;
  parent: { id: string; formatted_id: string; title: string } | null;
  assignees: Array<{ user_id: string; slot: "FE" | "BE" | "Project"; member: TeamMember; created_at: string }>;
}

interface FetchResult {
  tickets: TicketRow[];
  totalCount: number;
}

async function fetchProjectTickets(projectId: string): Promise<FetchResult> {
  const cap = PAGE_SIZES.ticketsKanban;
  const { data: tix, count, error: ticketsError } = await supabase
    .from("tickets")
    .select("*", { count: "exact" })
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("ticket_number", { ascending: true })
    .range(0, cap - 1);

  if (ticketsError) {
    throw new Error(`Could not load tickets: ${ticketsError.message}`);
  }

  const ticketRows = tix ?? [];

  const epicIds = Array.from(new Set(ticketRows.map((t: any) => t.epic_id).filter(Boolean) as number[]));
  const epicMap: Record<number, string | null> = {};
  if (epicIds.length) {
    const { data: epics, error: epicsError } = await supabase
      .from("project_epics")
      .select("id, epic_name")
      .eq("project_id", projectId)
      .in("id", epicIds);
    if (epicsError) {
      console.warn("Could not load ticket epic names", epicsError);
    } else {
      (epics ?? []).forEach((e: any) => {
        epicMap[e.id] = e.epic_name ?? null;
      });
    }
  }

  const ids = ticketRows.map((t) => t.id);
  let assignees: Array<TicketAssignee & { member: TeamMember }> = [];
  if (ids.length) {
    const { data, error: assigneesError } = await supabase
      .from("ticket_assignees")
      .select("*, member:team_members(*)")
      .in("ticket_id", ids);
    if (assigneesError) {
      throw new Error(`Could not load ticket assignees: ${assigneesError.message}`);
    }
    assignees = (data as any) ?? [];
  }

  // Fetch parent ticket info for any tickets that have a parent_ticket_id
  const parentIds = Array.from(
    new Set(ticketRows.map((t: any) => t.parent_ticket_id).filter(Boolean) as string[]),
  );
  const parentMap: Record<string, { id: string; formatted_id: string; title: string }> = {};
  if (parentIds.length) {
    const { data: parents, error: parentsError } = await supabase
      .from("tickets")
      .select("id, formatted_id, title")
      .in("id", parentIds);
    if (parentsError) {
      console.warn("Could not load parent ticket details", parentsError);
    } else {
      (parents ?? []).forEach((p: any) => {
        parentMap[p.id] = { id: p.id, formatted_id: p.formatted_id, title: p.title };
      });
    }
  }

  const grouped: Record<string, TicketRow["assignees"]> = {};
  assignees.forEach((a) => {
    grouped[a.ticket_id] ??= [];
    grouped[a.ticket_id].push({
      user_id: a.user_id,
      slot: a.slot,
      member: a.member,
      created_at: (a as any).created_at,
    });
  });

  const tickets: TicketRow[] = ticketRows.map((t: any) => ({
    id: t.id,
    project_id: t.project_id,
    ticket_number: t.ticket_number,
    formatted_id: t.formatted_id,
    title: t.title,
    ticket_type: t.ticket_type,
    status_id: t.status_id,
    fe_status: (t.fe_status ?? "todo") as DisciplineStatus,
    be_status: (t.be_status ?? "todo") as DisciplineStatus,
    project_status_override: !!t.project_status_override,
    epic_id: t.epic_id ?? null,
    epic_name: t.epic_id ? (epicMap[t.epic_id] ?? null) : null,
    version: t.version ?? null,
    original_fe_estimate: Number(t.original_fe_estimate),
    original_be_estimate: Number(t.original_be_estimate),
    current_fe_estimate: Number(t.current_fe_estimate),
    current_be_estimate: Number(t.current_be_estimate),
    original_project_estimate: Number(t.original_project_estimate ?? 0),
    current_project_estimate: Number(t.current_project_estimate ?? 0),
    actual_frontend_hours: Number(t.actual_frontend_hours),
    actual_backend_hours: Number(t.actual_backend_hours),
    actual_project_hours: Number(t.actual_project_hours ?? 0),
    acceptance_criteria: t.acceptance_criteria ?? null,
    position: t.position,
    created_at: t.created_at,
    cr_approval: (t.ticket_type === "CR" ? (t.cr_approval ?? "pending") : null) as TicketRow["cr_approval"],
    cr_decided_by: t.cr_decided_by ?? null,
    cr_decided_at: t.cr_decided_at ?? null,
    parent_ticket_id: t.parent_ticket_id ?? null,
    bug_sub_number: t.bug_sub_number ?? null,
    parent: t.parent_ticket_id ? (parentMap[t.parent_ticket_id] ?? null) : null,
    assignees: grouped[t.id] ?? [],
  }));

  return { tickets, totalCount: count ?? tickets.length };
}

export function useProjectTickets(projectId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ["projectTickets", projectId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchProjectTickets(projectId!),
    enabled: !!projectId,
  });

  useRealtimeInvalidate(
    projectId
      ? [
          { table: "tickets", filter: `project_id=eq.${projectId}` },
          { table: "ticket_assignees" },
          { table: "project_epics", filter: `project_id=eq.${projectId}` },
        ]
      : null,
    queryKey,
    !!projectId,
  );

  const tickets = query.data?.tickets ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  return {
    tickets,
    loading: query.isPending && !!projectId,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    reload: () => qc.invalidateQueries({ queryKey }),
    totalCount,
    truncated: totalCount > tickets.length,
  };
}
