import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

export interface Epic {
  id: number;
  project_id: string;
  epic_name: string | null;
  order_index: number;
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
        .order("order_index", { ascending: true })
        .order("id", { ascending: true });
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

  /** Rename an existing epic. Returns true on success. */
  const renameEpic = useCallback(
    async (id: number, name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      const { error } = await supabase
        .from("project_epics")
        .update({ epic_name: trimmed })
        .eq("id", id);
      if (error) return false;
      await qc.invalidateQueries({ queryKey });
      await qc.invalidateQueries({ queryKey: ["projectTickets", projectId] });
      await qc.invalidateQueries({ queryKey: ["projectTicketsPaged", projectId] });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId, qc],
  );

  /** Persist a new epic order (PMBA only). Optimistically updates the cache. */
  const reorderEpics = useCallback(
    async (ids: number[]): Promise<boolean> => {
      if (!projectId) return false;
      const prev = qc.getQueryData<Epic[]>(queryKey);
      if (prev) {
        const byId = new Map(prev.map((e) => [e.id, e]));
        qc.setQueryData(queryKey, [
          ...ids.map((id, i) => ({ ...byId.get(id)!, order_index: i })).filter((e) => e.id != null),
          ...prev.filter((e) => !ids.includes(e.id)),
        ]);
      }
      const { error } = await (supabase.rpc as any).call(supabase, "reorder_project_epics", {
        _project_id: projectId,
        _epic_ids: ids,
      });
      if (error) {
        if (prev) qc.setQueryData(queryKey, prev);
        return false;
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId, qc],
  );

  return {
    epics,
    reorderEpics,
    loading: query.isPending && !!projectId,
    reload,
    createEpic,
    renameEpic,
  };
}
