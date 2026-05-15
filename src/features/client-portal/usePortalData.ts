import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import type { PortalPayload } from "./types";

/**
 * Compute the live portal payload for a project at a given cutoff date.
 * Used inside the PMBA editor to preview the dashboard for any "as of" date,
 * without requiring data to be published.
 */
export function usePortalPreview(projectId: string, _hash: string | null, asOf: Date) {
  const asOfIso = asOf.toISOString();
  const queryKey = ["portalPreview", projectId, asOfIso] as const;

  const query = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async (): Promise<PortalPayload> => {
      const { data, error } = await supabase.rpc("get_project_portal_preview", {
        _project_id: projectId,
        _cutoff: asOfIso,
      });
      if (error) throw error;
      return data as unknown as PortalPayload;
    },
  });

  useRealtimeInvalidate(
    projectId
      ? [
          { table: "projects", filter: `id=eq.${projectId}` },
          { table: "tickets", filter: `project_id=eq.${projectId}` },
          { table: "project_epics", filter: `project_id=eq.${projectId}` },
          { table: "project_epic_summaries", filter: `project_id=eq.${projectId}` },
          { table: "epic_discounts", filter: `project_id=eq.${projectId}` },
          { table: "time_logs" },
          { table: "ticket_estimate_changes" },
        ]
      : null,
    ["portalPreview", projectId],
    !!projectId,
  );

  return {
    data: query.data ?? null,
    loading: query.isPending && !!projectId,
    error: query.error ? (query.error as Error).message : null,
    refresh: () => query.refetch(),
  };
}

/** Read-only fetch for the public /h/:hash page. */
export function usePublicPortal(hash: string | undefined) {
  const queryKey = ["publicPortal", hash] as const;

  const query = useQuery({
    queryKey,
    enabled: !!hash,
    queryFn: async (): Promise<PortalPayload> => {
      const { data, error } = await supabase.rpc("get_client_portal", { _hash: hash! });
      if (error) throw error;
      if (!data) throw new Error("Portal not found or not enabled.");
      return data as unknown as PortalPayload;
    },
  });

  const projectId = query.data?.project?.id;

  useRealtimeInvalidate(
    projectId
      ? [
          { table: "projects", filter: `id=eq.${projectId}` },
          { table: "tickets", filter: `project_id=eq.${projectId}` },
          { table: "project_epics", filter: `project_id=eq.${projectId}` },
          { table: "project_epic_summaries", filter: `project_id=eq.${projectId}` },
          { table: "epic_discounts", filter: `project_id=eq.${projectId}` },
          { table: "time_logs" },
          { table: "ticket_estimate_changes" },
        ]
      : null,
    queryKey,
    !!projectId,
  );

  return {
    data: query.data ?? null,
    loading: query.isPending && !!hash,
    error: query.error ? (query.error as Error).message : null,
  };
}
