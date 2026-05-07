import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";
import type { DisciplineStatus, TeamMember } from "@/lib/types";
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
}

interface RpcResult {
  total: number;
  rows: any[];
}

function normalize(raw: any): TicketRow {
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
    cr_approval: (raw.cr_approval ?? "pending") as TicketRow["cr_approval"],
    cr_decided_by: raw.cr_decided_by ?? null,
    cr_decided_at: raw.cr_decided_at ?? null,
    assignees: ((raw.assignees ?? []) as any[]).map((a) => ({
      user_id: a.user_id,
      slot: a.slot,
      created_at: a.created_at,
      member: a.member as TeamMember,
    })),
  };
}

/**
 * Server-paged ticket list. Filters/sort/search execute in Postgres via the
 * `list_project_tickets` RPC, so pagination reflects the *full* filtered set.
 */
export function useProjectTicketsPaged(
  projectId: string | undefined,
  opts: UseProjectTicketsPagedOpts,
) {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(!!projectId);

  const { filters, search, sort, page, pageSize, filterMineUserId } = opts;
  const filterKey = JSON.stringify({ filters, search, sort, page, pageSize, filterMineUserId });

  const load = useCallback(async () => {
    if (!projectId) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const payload = {
      ...filters,
      filterMineUserId: filterMineUserId ?? null,
    };
    const { data, error } = await supabase.rpc("list_project_tickets", {
      _project_id: projectId,
      _filters: payload as any,
      _search: search?.trim() || null,
      _sort_col: sort.col,
      _sort_dir: sort.dir,
      _page: page,
      _page_size: pageSize,
    });
    if (error) {
      console.error("list_project_tickets failed", error);
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const r = (data ?? { rows: [], total: 0 }) as unknown as RpcResult;
    setRows((r.rows ?? []).map(normalize));
    setTotal(r.total ?? 0);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filterKey]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeReload(
    projectId
      ? [
          { table: "tickets", filter: `project_id=eq.${projectId}` },
          { table: "ticket_assignees" },
          { table: "project_epics", filter: `project_id=eq.${projectId}` },
        ]
      : null,
    load,
    !!projectId,
  );

  return { rows, total, loading, reload: load };
}
