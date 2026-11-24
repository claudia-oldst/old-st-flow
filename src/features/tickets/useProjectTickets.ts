import { useQuery, useQueryClient, isCancelledError } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTicketListRealtime } from "./useTicketListRealtime";
import { requestTicketPage } from "./ticketPageRequest";
import type { DisciplineStatus, TeamMember } from "@/lib/types";

export interface TicketRow {
  id: string;
  project_id: string;
  ticket_number: number;
  formatted_id: string;
  title: string;
  ticket_type: "Standard" | "Bug" | "CR" | "Proj" | "Feedback";
  external_source?: string | null;
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
  has_original_fe_estimate: boolean;
  has_original_be_estimate: boolean;
  has_original_project_estimate: boolean;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_project_hours: number;
  acceptance_criteria?: string | null;
  /** Whether acceptance criteria text exists (list rows omit the text). */
  has_acceptance_criteria?: boolean;
  position: number;
  created_at: string;
  updated_at?: string | null;
  cr_approval: "pending" | "approved" | "rejected" | null;
  cr_decided_by: string | null;
  cr_decided_at: string | null;
  parent_ticket_id: string | null;
  bug_sub_number: number | null;
  github_issue_number: number | null;
  parent: { id: string; formatted_id: string; title?: string } | null;
  assignees: Array<{ user_id: string; slot: "FE" | "BE" | "Project"; member: TeamMember; created_at: string }>;
}

export interface FetchResult {
  tickets: TicketRow[];
  totalCount: number;
  complete: boolean;
}

interface RpcResult {
  total: number;
  rows: any[];
}

export function normalizeTicket(raw: any): TicketRow {
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
    original_fe_estimate: Number(raw.original_fe_estimate ?? 0),
    original_be_estimate: Number(raw.original_be_estimate ?? 0),
    current_fe_estimate: Number(raw.current_fe_estimate ?? 0),
    current_be_estimate: Number(raw.current_be_estimate ?? 0),
    original_project_estimate: Number(raw.original_project_estimate ?? 0),
    current_project_estimate: Number(raw.current_project_estimate ?? 0),
    has_original_fe_estimate: raw.original_fe_estimate !== null && raw.original_fe_estimate !== undefined,
    has_original_be_estimate: raw.original_be_estimate !== null && raw.original_be_estimate !== undefined,
    has_original_project_estimate: raw.original_project_estimate !== null && raw.original_project_estimate !== undefined,
    actual_frontend_hours: Number(raw.actual_frontend_hours),
    actual_backend_hours: Number(raw.actual_backend_hours),
    actual_project_hours: Number(raw.actual_project_hours ?? 0),
    acceptance_criteria: Object.prototype.hasOwnProperty.call(raw, "acceptance_criteria") ? raw.acceptance_criteria ?? null : undefined,
    has_acceptance_criteria: typeof raw.has_acceptance_criteria === "boolean" ? raw.has_acceptance_criteria : typeof raw.acceptance_criteria === "string" ? raw.acceptance_criteria.trim() !== "" : undefined,
    external_source: raw.external_source ?? null,
    position: raw.position,
    created_at: raw.created_at,
    updated_at: raw.updated_at ?? null,
    cr_approval: (raw.ticket_type === "CR" ? (raw.cr_approval ?? "pending") : null) as TicketRow["cr_approval"],
    cr_decided_by: raw.cr_decided_by ?? null,
    cr_decided_at: raw.cr_decided_at ?? null,
    parent_ticket_id: raw.parent_ticket_id ?? null,
    bug_sub_number: raw.bug_sub_number ?? null,
    github_issue_number: raw.github_issue_number ?? null,
    parent: raw.parent ?? null,
    assignees: ((raw.assignees ?? []) as any[]).map((a) => ({
      user_id: a.user_id,
      slot: a.slot,
      created_at: a.created_at,
      member: a.member as TeamMember,
    })),
  };
}

export const FETCH_ALL_PAGE_SIZE = 200;

export async function fetchProjectTickets(projectId: string, options: {
  signal?: AbortSignal;
  onProgress?: (result: FetchResult) => void;
} = {}): Promise<FetchResult> {
  const tickets: TicketRow[] = [];
  let total = 0;
  for (let page = 1; ; page++) {
    const data = await requestTicketPage({
      _project_id: projectId, _filters: {}, _search: null,
      _sort_col: "position", _sort_dir: "asc", _page: page,
      _page_size: FETCH_ALL_PAGE_SIZE,
    }, options.signal);
    const result = (data ?? { rows: [], total: 0 }) as unknown as RpcResult;
    const rows = result.rows ?? [];
    tickets.push(...rows.map(normalizeTicket));
    total = result.total ?? tickets.length;
    options.onProgress?.({ tickets: [...tickets], totalCount: total, complete: false });
    if (rows.length < FETCH_ALL_PAGE_SIZE || tickets.length >= total) break;
  }
  return { tickets, totalCount: total, complete: true };
}

const latestRun = new Map<string, number>();

export function isCancelled(err: unknown): boolean {
  return isCancelledError(err) || (err instanceof Error && (err.name === "AbortError" || err.name === "CancelledError"));
}

export function useProjectTickets(projectId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ["projectTickets", projectId] as const;
  const query = useQuery({
    queryKey,
    // No abort signal: leaving the tab must not cancel the download, otherwise
    // returning shows a stale "CancelledError". A newer run supersedes older ones.
    queryFn: () => {
      if (!projectId) throw new Error("Project is required");
      const run = (latestRun.get(projectId) ?? 0) + 1;
      latestRun.set(projectId, run);
      return fetchProjectTickets(projectId, {
        // Partial pages only fill an empty list; a reload keeps the full old
        // list on screen and swaps in the finished result once.
        onProgress: (result) => {
          if (latestRun.get(projectId) !== run) return;
          if (qc.getQueryData<FetchResult>(queryKey)?.complete) return;
          qc.setQueryData(queryKey, result);
        },
      });
    },
    enabled: !!projectId,
    gcTime: 30 * 60_000,
    retry: (count, err) => count < 1 && !isCancelled(err),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: (q) => q.state.status === "error" || q.state.data?.complete !== true,
  });
  useTicketListRealtime(projectId, queryKey);
  const tickets = query.data?.tickets ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const loadingMore = !!projectId && query.isFetching;
  return {
    tickets,
    loading: query.isPending && !!projectId,
    loadingMore,
    loadedCount: tickets.length,
    error: !query.error || isCancelled(query.error) ? null
      : query.error instanceof Error ? query.error.message : String(query.error),
    reload: () => qc.invalidateQueries({ queryKey }, { cancelRefetch: false }),
    totalCount,
    truncated: query.data?.complete === true && totalCount > tickets.length,
  };
}
