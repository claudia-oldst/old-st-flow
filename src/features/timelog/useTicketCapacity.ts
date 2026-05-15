import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LogDiscipline } from "@/lib/types";

export interface TicketCapacityRow {
  actualFE: number;
  currentFE: number;
  pendingFE: number;
  availableFE: number;
  actualBE: number;
  currentBE: number;
  pendingBE: number;
  availableBE: number;
  actualProj: number;
  currentProj: number;
  pendingProj: number;
  availableProj: number;
}

export type CapacityMap = Record<string, TicketCapacityRow>;

export interface CapacityForDiscipline {
  actual: number;
  current: number;
  pending: number;
  available: number;
  isOver: boolean;
}

/**
 * Fetch pending estimate-change deltas for a set of tickets and combine with
 * the ticket row's current/actual values to compute remaining capacity per
 * discipline.
 *
 * Pending revisions: rows in `ticket_estimate_changes` with status='pending'.
 * pending_delta = sum(new_hours - previous_hours) for that ticket+discipline.
 * available = current_estimate + pending_delta.
 */
export function useTicketCapacity(
  tickets: Array<{
    id: string;
    actual_frontend_hours: number;
    actual_backend_hours: number;
    actual_project_hours: number;
    current_fe_estimate: number;
    current_be_estimate: number;
    current_project_estimate: number;
  }>,
  enabled = true,
) {
  const ids = tickets.map((t) => t.id).sort();
  const key = ids.join(",");

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["ticket-capacity-pending", key],
    enabled: enabled && ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_estimate_changes")
        .select("ticket_id, discipline, previous_hours, new_hours")
        .in("ticket_id", ids)
        .eq("status", "pending");
      if (error) throw error;
      const out: Record<string, { FE: number; BE: number; Project: number }> = {};
      for (const row of (data as any[]) ?? []) {
        const t = (out[row.ticket_id] ??= { FE: 0, BE: 0, Project: 0 });
        const delta = (Number(row.new_hours) || 0) - (Number(row.previous_hours) || 0);
        if (row.discipline === "FE") t.FE += delta;
        else if (row.discipline === "BE") t.BE += delta;
        else if (row.discipline === "Project") t.Project += delta;
      }
      return out;
    },
  });

  const map: CapacityMap = {};
  for (const t of tickets) {
    const p = data?.[t.id] ?? { FE: 0, BE: 0, Project: 0 };
    map[t.id] = {
      actualFE: t.actual_frontend_hours,
      currentFE: t.current_fe_estimate,
      pendingFE: p.FE,
      availableFE: t.current_fe_estimate + p.FE,
      actualBE: t.actual_backend_hours,
      currentBE: t.current_be_estimate,
      pendingBE: p.BE,
      availableBE: t.current_be_estimate + p.BE,
      actualProj: t.actual_project_hours,
      currentProj: t.current_project_estimate,
      pendingProj: p.Project,
      availableProj: t.current_project_estimate + p.Project,
    };
  }

  return { map, refetch, isLoading };
}

export function capacityFor(
  row: TicketCapacityRow | undefined,
  d: LogDiscipline,
): CapacityForDiscipline {
  if (!row) {
    return { actual: 0, current: 0, pending: 0, available: 0, isOver: false };
  }
  if (d === "FE") {
    return {
      actual: row.actualFE,
      current: row.currentFE,
      pending: row.pendingFE,
      available: row.availableFE,
      isOver: row.availableFE > 0 ? row.actualFE >= row.availableFE : row.actualFE > 0,
    };
  }
  if (d === "BE") {
    return {
      actual: row.actualBE,
      current: row.currentBE,
      pending: row.pendingBE,
      available: row.availableBE,
      isOver: row.availableBE > 0 ? row.actualBE >= row.availableBE : row.actualBE > 0,
    };
  }
  return {
    actual: row.actualProj,
    current: row.currentProj,
    pending: row.pendingProj,
    available: row.availableProj,
    isOver: row.availableProj > 0 ? row.actualProj >= row.availableProj : row.actualProj > 0,
  };
}

/**
 * Variant that fetches both the ticket estimate/actual fields and pending
 * deltas given just a list of ticket IDs. Useful when the caller doesn't
 * already have full ticket rows in hand (e.g. group-stop dialog).
 */
export function useTicketCapacityByIds(ids: string[], enabled = true) {
  const sortedIds = [...ids].sort();
  const key = sortedIds.join(",");

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["ticket-capacity-by-ids", key],
    enabled: enabled && sortedIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const [{ data: ticketRows, error: tErr }, { data: changeRows, error: cErr }] =
        await Promise.all([
          supabase
            .from("tickets")
            .select(
              "id, actual_frontend_hours, actual_backend_hours, actual_project_hours, current_fe_estimate, current_be_estimate, current_project_estimate"
            )
            .in("id", sortedIds),
          supabase
            .from("ticket_estimate_changes")
            .select("ticket_id, discipline, previous_hours, new_hours")
            .in("ticket_id", sortedIds)
            .eq("status", "pending"),
        ]);
      if (tErr) throw tErr;
      if (cErr) throw cErr;

      const pending: Record<string, { FE: number; BE: number; Project: number }> = {};
      for (const row of (changeRows as any[]) ?? []) {
        const p = (pending[row.ticket_id] ??= { FE: 0, BE: 0, Project: 0 });
        const delta = (Number(row.new_hours) || 0) - (Number(row.previous_hours) || 0);
        if (row.discipline === "FE") p.FE += delta;
        else if (row.discipline === "BE") p.BE += delta;
        else if (row.discipline === "Project") p.Project += delta;
      }

      const out: CapacityMap = {};
      for (const t of (ticketRows as any[]) ?? []) {
        const p = pending[t.id] ?? { FE: 0, BE: 0, Project: 0 };
        out[t.id] = {
          actualFE: Number(t.actual_frontend_hours) || 0,
          currentFE: Number(t.current_fe_estimate) || 0,
          pendingFE: p.FE,
          availableFE: (Number(t.current_fe_estimate) || 0) + p.FE,
          actualBE: Number(t.actual_backend_hours) || 0,
          currentBE: Number(t.current_be_estimate) || 0,
          pendingBE: p.BE,
          availableBE: (Number(t.current_be_estimate) || 0) + p.BE,
          actualProj: Number(t.actual_project_hours) || 0,
          currentProj: Number(t.current_project_estimate) || 0,
          pendingProj: p.Project,
          availableProj: (Number(t.current_project_estimate) || 0) + p.Project,
        };
      }
      return out;
    },
  });

  return { map: data ?? {}, refetch, isLoading };
}
