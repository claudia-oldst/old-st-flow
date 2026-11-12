import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  GanttCommitmentInput,
  GanttEpicInput,
  GanttSprintInput,
  GanttTicketInput,
} from "@/features/sprints/gantt/buildGanttRows";
import { EMPTY_FILTERS, filterArgs, filterKey, type PortalFilters } from "./filters/portalFilters";

export interface PortalGanttSprint extends GanttSprintInput {
  sprint_number: number;
  name: string | null;
}

export interface PortalGanttPayload {
  project: { id: string; name: string };
  sprints: PortalGanttSprint[];
  epics: GanttEpicInput[];
  tickets: GanttTicketInput[];
  sprint_tickets: GanttCommitmentInput[];
}

/**
 * Hash-scoped read for the public client portal timeline. Goes through a
 * security-definer RPC because anonymous visitors have no RLS access to
 * sprints / tickets / epics.
 */
export function usePublicPortalGantt(hash: string | undefined, filters: PortalFilters = EMPTY_FILTERS) {
  const query = useQuery({
    queryKey: ["publicPortalGantt", hash, filterKey(filters)] as const,
    enabled: !!hash,
    queryFn: async (): Promise<PortalGanttPayload | null> => {
      const { data, error } = await supabase.rpc("get_client_portal_gantt", {
        _hash: hash!,
        ...filterArgs(filters),
      });
      if (error) throw error;
      return (data as unknown as PortalGanttPayload) ?? null;
    },
  });

  return {
    data: query.data ?? null,
    loading: query.isPending && !!hash,
    error: query.error ? (query.error as Error).message : null,
  };
}
