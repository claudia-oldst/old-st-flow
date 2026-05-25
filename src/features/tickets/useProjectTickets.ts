import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { PAGE_SIZES } from "@/lib/pagination";
import type { DisciplineStatus, TeamMember } from "@/lib/types";

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

interface RpcResult {
  total: number;
  rows: any[];
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out. Please retry.`)), ms);
    }),
  ]);
}

function normalizeTicket(raw: any): TicketRow {
  return {
    id: raw.id,
    project_id: raw.project_id,
    ticket_number: raw.ticket_number,
    formatted_id: raw.formatted_id,
    title: raw.title,
    ticket_type: raw.ticket_type,
    status_id: raw.status_id,
    fe_status: (raw.fe_status ?? "todo") as DisciplineStatus,
    be_status: (raw.be_status ?? "todo") as DisciplineStatus,
    project_status_override: !!raw.project_status_override,
    epic_id: raw.epic_id ?? null,
    epic_name: raw.epic?.epic_name ?? null,
    version: raw.version ?? null,
    original_fe_estimate: Number(raw.original_fe_estimate),
    original_be_estimate: Number(raw.original_be_estimate),
    current_fe_estimate: Number(raw.current_fe_estimate),
    current_be_estimate: Number(raw.current_be_estimate),
    original_project_estimate: Number(raw.original_project_estimate ?? 0),
    current_project_estimate: Number(raw.current_project_estimate ?? 0),
    actual_frontend_hours: Number(raw.actual_frontend_hours),
    actual_backend_hours: Number(raw.actual_backend_hours),
    actual_project_hours: Number(raw.actual_project_hours ?? 0),
    acceptance_criteria: raw.acceptance_criteria ?? null,
    position: raw.position,
    created_at: raw.created_at,
    cr_approval: (raw.ticket_type === "CR" ? (raw.cr_approval ?? "pending") : null) as TicketRow["cr_approval"],
    cr_decided_by: raw.cr_decided_by ?? null,
    cr_decided_at: raw.cr_decided_at ?? null,
    parent_ticket_id: raw.parent_ticket_id ?? null,
    bug_sub_number: raw.bug_sub_number ?? null,
    parent: raw.parent ?? null,
    assignees: ((raw.assignees ?? []) as any[]).map((a) => ({
      user_id: a.user_id,
      slot: a.slot,
      created_at: a.created_at,
      member: a.member as TeamMember,
    })),
  };
}

async function fetchProjectTickets(projectId: string): Promise<FetchResult> {
  const cap = PAGE_SIZES.ticketsKanban;
  const { data, error } = await withTimeout(
    supabase.rpc("list_project_tickets", {
      _project_id: projectId,
      _filters: {} as any,
      _search: null,
      _sort_col: "position",
      _sort_dir: "asc",
      _page: 1,
      _page_size: cap,
    }),
    12_000,
    "Ticket loading",
  );

  if (error) {
    throw new Error(`Could not load tickets: ${error.message}`);
  }

  const result = (data ?? { rows: [], total: 0 }) as unknown as RpcResult;
  const tickets = (result.rows ?? []).map(normalizeTicket);
  return { tickets, totalCount: result.total ?? tickets.length };
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
