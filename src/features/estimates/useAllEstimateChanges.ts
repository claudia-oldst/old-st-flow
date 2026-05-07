import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";

export interface ChangeRow {
  id: string;
  ticket_id: string;
  user_id: string;
  discipline: "FE" | "BE" | "Project";
  previous_hours: number;
  new_hours: number;
  delta: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  requester: { id: string; name: string; avatar_color: string } | null;
  ticket: {
    id: string;
    formatted_id: string;
    title: string;
    project_id: string;
    epic_id: number | null;
    original_fe_estimate: number;
    original_be_estimate: number;
    original_project_estimate: number;
    current_fe_estimate: number;
    current_be_estimate: number;
    current_project_estimate: number;
    actual_frontend_hours: number;
    actual_backend_hours: number;
    actual_project_hours: number;
  };
}

export interface ProjectLite {
  id: string;
  name: string;
  acronym: string;
}
export interface EpicLite {
  id: number;
  project_id: string;
  epic_name: string | null;
}

/**
 * Project-scoped estimate-change feed. Server-side filter on
 * `tickets.project_id` via `tickets!inner` removes the cross-project
 * payload + 1000-row truncation risk.
 */
export function useAllEstimateChanges(projectId: string | undefined) {
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [epics, setEpics] = useState<EpicLite[]>([]);
  const [loading, setLoading] = useState(!!projectId);

  const load = useCallback(async () => {
    if (!projectId) {
      setChanges([]);
      setProjects([]);
      setEpics([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [changesRes, projectsRes, epicsRes] = await Promise.all([
      supabase
        .from("ticket_estimate_changes")
        .select(
          `id,ticket_id,user_id,discipline,previous_hours,new_hours,delta,reason,status,decided_by,decided_at,created_at,
           requester:team_members!ticket_estimate_changes_user_id_fkey(id,name,avatar_color),
           ticket:tickets!inner(id,formatted_id,title,project_id,epic_id,
             original_fe_estimate,original_be_estimate,original_project_estimate,
             current_fe_estimate,current_be_estimate,current_project_estimate,
             actual_frontend_hours,actual_backend_hours,actual_project_hours)`
        )
        .eq("ticket.project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase.from("projects").select("id,name,acronym").eq("id", projectId),
      supabase.from("project_epics").select("id,project_id,epic_name").eq("project_id", projectId),
    ]);

    let rows: any[] = changesRes.data ?? [];
    if (changesRes.error) {
      const retry = await supabase
        .from("ticket_estimate_changes")
        .select(
          `id,ticket_id,user_id,discipline,previous_hours,new_hours,delta,reason,status,decided_by,decided_at,created_at,
           requester:team_members(id,name,avatar_color),
           ticket:tickets!inner(id,formatted_id,title,project_id,epic_id,
             original_fe_estimate,original_be_estimate,original_project_estimate,
             current_fe_estimate,current_be_estimate,current_project_estimate,
             actual_frontend_hours,actual_backend_hours,actual_project_hours)`
        )
        .eq("ticket.project_id", projectId)
        .order("created_at", { ascending: false });
      rows = retry.data ?? [];
    }

    setChanges(
      rows.map((c: any) => ({
        ...c,
        previous_hours: Number(c.previous_hours),
        new_hours: Number(c.new_hours),
        delta: Number(c.delta),
        ticket: c.ticket
          ? {
              ...c.ticket,
              original_fe_estimate: Number(c.ticket.original_fe_estimate),
              original_be_estimate: Number(c.ticket.original_be_estimate),
              original_project_estimate: Number(c.ticket.original_project_estimate),
              current_fe_estimate: Number(c.ticket.current_fe_estimate),
              current_be_estimate: Number(c.ticket.current_be_estimate),
              current_project_estimate: Number(c.ticket.current_project_estimate),
              actual_frontend_hours: Number(c.ticket.actual_frontend_hours),
              actual_backend_hours: Number(c.ticket.actual_backend_hours),
              actual_project_hours: Number(c.ticket.actual_project_hours),
            }
          : null,
      }))
    );
    setProjects((projectsRes.data as any) ?? []);
    setEpics((epicsRes.data as any) ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeReload(
    projectId
      ? [
          { table: "ticket_estimate_changes" },
          { table: "tickets", filter: `project_id=eq.${projectId}` },
          { table: "project_epics", filter: `project_id=eq.${projectId}` },
        ]
      : null,
    load,
    !!projectId,
  );

  return { changes, projects, epics, loading, reload: load };
}
