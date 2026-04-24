import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Epic {
  id: number;
  project_id: string;
  epic_name: string | null;
}

export function useProjectEpics(projectId: string | undefined) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) {
      setEpics([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("project_epics")
      .select("*")
      .eq("project_id", projectId)
      .order("epic_name", { ascending: true });
    setEpics((data as Epic[]) ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // realtime
  useEffect(() => {
    if (!projectId) return;
    const ch = supabase
      .channel(`project_epics-${projectId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_epics",
          filter: `project_id=eq.${projectId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectId, load]);

  /**
   * Create a new epic for the project. Returns the new epic's id, or null on failure.
   * If an epic with the same name already exists, returns its id.
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
      await load();
      return (data as Epic).id;
    },
    [projectId, epics, load]
  );

  return { epics, loading, reload: load, createEpic };
}
