import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTicketListRealtime } from "./useTicketListRealtime";
import { requestTicketPage } from "./ticketPageRequest";
import { normalizeTicket } from "./useProjectTickets";
import type { TicketRow } from "./useProjectTickets";
import type { TicketFilters } from "./TicketsFilter";

export type ServerSortCol =
  | "position"
  | "ticket_number"
  | "created_at"
  | "updated_at"
  | "current_fe_estimate"
  | "current_be_estimate"
  | "current_project_estimate"
  | "actual_frontend_hours"
  | "actual_backend_hours"
  | "actual_project_hours"
  | "title"
  | "formatted_id";

export interface ServerSort {
  col: ServerSortCol;
  dir: "asc" | "desc";
}

export interface UseProjectTicketsPagedOpts {
  filters: TicketFilters;
  search: string;
  sort: ServerSort;
  page: number;
  pageSize: number;
  filterMineUserId?: string | null;
  /** List only not-yet-converted Feedback tickets instead of normal ones. */
  feedback?: boolean;
}

interface RpcResult {
  total: number;
  rows: any[];
}

/**
 * Server-paged ticket list. Filters/sort/search execute in Postgres via the
 * `list_project_tickets` RPC, so pagination reflects the *full* filtered set.
 */
export function useProjectTicketsPaged(
  projectId: string | undefined,
  opts: UseProjectTicketsPagedOpts,
) {
  const qc = useQueryClient();
  const { filters, search, sort, page, pageSize, filterMineUserId, feedback = false } = opts;
  const queryKey = [
    "projectTicketsPaged",
    projectId,
    { filters, search, sort, page, pageSize, filterMineUserId: filterMineUserId ?? null, feedback },
  ] as const;

  const query = useQuery({
    queryKey,
    enabled: !!projectId,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }): Promise<{ rows: TicketRow[]; total: number }> => {
      const payload = { ...filters, filterMineUserId: filterMineUserId ?? null, feedback };
      if (!projectId) throw new Error("Project is required");
      const data = await requestTicketPage({
        _project_id: projectId,
        _filters: payload as any,
        _search: search?.trim() || null,
        _sort_col: sort.col,
        _sort_dir: sort.dir,
        _page: page,
        _page_size: pageSize,
      }, signal);
      const r = (data ?? { rows: [], total: 0 }) as unknown as RpcResult;
      return { rows: (r.rows ?? []).map(normalizeTicket), total: r.total ?? 0 };
    },
  });

  useTicketListRealtime(projectId, ["projectTicketsPaged", projectId]);

  return {
    rows: query.data?.rows ?? [],
    total: query.data?.total ?? 0,
    loading: query.isPending && !!projectId,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    reload: () => qc.invalidateQueries({ queryKey: ["projectTicketsPaged", projectId] }),
  };
}
