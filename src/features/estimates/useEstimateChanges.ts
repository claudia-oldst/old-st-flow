import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EstimateChange {
  id: string;
  ticket_id: string;
  user_id: string;
  discipline: "FE" | "BE";
  previous_hours: number;
  new_hours: number;
  delta: number;
  reason: string | null;
  status: string;
  created_at: string;
  user?: { name: string; avatar_color: string } | null;
}

/** All estimate changes for a single ticket, newest first. */
export function useTicketEstimateChanges(ticketId: string | undefined) {
  const [changes, setChanges] = useState<EstimateChange[]>([]);

  const load = useCallback(async () => {
    if (!ticketId) {
      setChanges([]);
      return;
    }
    const { data } = await supabase
      .from("ticket_estimate_changes")
      .select(
        "id,ticket_id,user_id,discipline,previous_hours,new_hours,delta,reason,status,created_at,user:team_members(name,avatar_color)"
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });
    setChanges(
      (data ?? []).map((c: any) => ({
        ...c,
        previous_hours: Number(c.previous_hours),
        new_hours: Number(c.new_hours),
        delta: Number(c.delta),
      }))
    );
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!ticketId) return;
    const ch = supabase
      .channel(`tec-${ticketId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_estimate_changes",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [ticketId, load]);

  return { changes, reload: load };
}

/** All estimate changes for all tickets in a project. */
export function useProjectEstimateChanges(projectId: string | undefined) {
  const [changes, setChanges] = useState<EstimateChange[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) {
      setChanges([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // join via tickets to filter by project
    const { data } = await supabase
      .from("ticket_estimate_changes")
      .select(
        "id,ticket_id,user_id,discipline,previous_hours,new_hours,delta,reason,status,created_at,ticket:tickets!inner(project_id,epic_id)"
      )
      .eq("ticket.project_id", projectId)
      .order("created_at", { ascending: true });
    setChanges(
      (data ?? []).map((c: any) => ({
        ...c,
        previous_hours: Number(c.previous_hours),
        new_hours: Number(c.new_hours),
        delta: Number(c.delta),
      }))
    );
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!projectId) return;
    const ch = supabase
      .channel(`tec-proj-${projectId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_estimate_changes" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectId, load]);

  return { changes, loading, reload: load };
}
