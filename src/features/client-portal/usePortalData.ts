import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";
import type { PortalPayload } from "./types";

/**
 * Compute the live portal payload for a project at a given cutoff date.
 * Used inside the PMBA editor to preview the dashboard for any "as of" date,
 * without requiring data to be published.
 */
export function usePortalPreview(projectId: string, hash: string | null, asOf: Date) {
  const [data, setData] = useState<PortalPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: payload, error: rpcErr } = await supabase.rpc(
      "get_project_portal_preview",
      { _project_id: projectId, _cutoff: asOf.toISOString() },
    );
    if (rpcErr) {
      setError(rpcErr.message);
      setData(null);
    } else {
      setData(payload as unknown as PortalPayload);
    }
    setLoading(false);
  }, [projectId, asOf]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live updates whenever underlying portal data changes.
  useRealtimeReload(
    projectId
      ? [
          { table: "projects", filter: `id=eq.${projectId}` },
          { table: "tickets", filter: `project_id=eq.${projectId}` },
          { table: "project_epics", filter: `project_id=eq.${projectId}` },
          { table: "project_epic_summaries", filter: `project_id=eq.${projectId}` },
          { table: "time_logs" },
          { table: "ticket_estimate_changes" },
        ]
      : null,
    refresh,
    !!hash,
  );

  return { data, loading, error, refresh };
}

/** Read-only fetch for the public /h/:hash page. */
export function usePublicPortal(hash: string | undefined) {
  const [data, setData] = useState<PortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = data?.project?.id;

  const refresh = useCallback(async () => {
    if (!hash) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: payload, error: err } = await supabase.rpc("get_client_portal", {
      _hash: hash,
    });
    if (err) {
      setError(err.message);
      setData(null);
    } else if (!payload) {
      setError("Portal not found or not enabled.");
    } else {
      setData(payload as unknown as PortalPayload);
      setError(null);
    }
    setLoading(false);
  }, [hash]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useRealtimeReload(
    projectId
      ? [
          { table: "projects", filter: `id=eq.${projectId}` },
          { table: "tickets", filter: `project_id=eq.${projectId}` },
          { table: "project_epics", filter: `project_id=eq.${projectId}` },
          { table: "project_epic_summaries", filter: `project_id=eq.${projectId}` },
          { table: "time_logs" },
          { table: "ticket_estimate_changes" },
        ]
      : null,
    refresh,
    !!projectId,
  );

  return { data, loading, error };
}
