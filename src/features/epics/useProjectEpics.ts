import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

export interface Epic {
  id: number;
  project_id: string;
  epic_name: string | null;
}

export function useProjectEpics(projectId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ["projectEpics", projectId] as const;

  const query = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async (): Promise<Epic[]> => {
      const { data } = await supabase
        .from("project_epics")
        .select("*")
        .eq("project_id", projectId!)
        .order("epic_name", { ascending: true });
      return (data as Epic[]) ?? [];
    },
  });

  useRealtimeInvalidate(
    projectId
      ? [{ table: "project_epics", filter: `project_id=eq.${projectId}` }]
      : null,
    queryKey,
    !!projectId,
  );

  const epics = query.data ?? [];
  const reload = useCallback(
    () => qc.invalidateQueries({ queryKey }) as Promise<void> & any,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc, projectId],
  );

  /**
   * Create a new epic. Returns the new (or existing) epic id, or null on failure.
   */
  const createEpic = useCallback(
    async (name: string): Promise<number | null> => {
      if (!projectId) return null;
      const trimmed = name.trim();
      if (!trimmed) return null;

      const existing = epics.find(
        (e) => e.epic_name?.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) return existing.id;

      const { data, error } = await supabase
        .from("project_epics")
        .insert({ project_id: projectId, epic_name: trimmed })
        .select("*")
        .single();
      if (error || !data) return null;
      await qc.invalidateQueries({ queryKey });
      return (data as Epic).id;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId, epics, qc],
  );

  return {
    epics,
    loading: query.isPending && !!projectId,
    reload,
    createEpic,
  };
}
