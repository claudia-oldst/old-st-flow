import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

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

function num(c: any): EstimateChange {
  return {
    ...c,
    previous_hours: Number(c.previous_hours),
    new_hours: Number(c.new_hours),
    delta: Number(c.delta),
  };
}

/** All estimate changes for a single ticket, newest first. */
export function useTicketEstimateChanges(ticketId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ["estimateChangesByTicket", ticketId] as const;

  const query = useQuery({
    queryKey,
    enabled: !!ticketId,
    queryFn: async (): Promise<EstimateChange[]> => {
      const { data } = await supabase
        .from("ticket_estimate_changes")
        .select(
          "id,ticket_id,user_id,discipline,previous_hours,new_hours,delta,reason,status,created_at,user:team_members(name,avatar_color)"
        )
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: false });
      return ((data ?? []) as any[]).map(num);
    },
  });

  useRealtimeInvalidate(
    ticketId
      ? [{ table: "ticket_estimate_changes", filter: `ticket_id=eq.${ticketId}` }]
      : null,
    queryKey,
    !!ticketId,
  );

  return {
    changes: query.data ?? [],
    reload: () => qc.invalidateQueries({ queryKey }),
  };
}

/** All estimate changes for all tickets in a project. */
export function useProjectEstimateChanges(projectId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ["projectEstimateChanges", projectId] as const;

  const query = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async (): Promise<EstimateChange[]> => {
      const { data } = await supabase
        .from("ticket_estimate_changes")
        .select(
          "id,ticket_id,user_id,discipline,previous_hours,new_hours,delta,reason,status,created_at,ticket:tickets!inner(project_id,epic_id)"
        )
        .eq("ticket.project_id", projectId!)
        .order("created_at", { ascending: true });
      return ((data ?? []) as any[]).map(num);
    },
  });

  useRealtimeInvalidate(
    projectId ? [{ table: "ticket_estimate_changes" }] : null,
    queryKey,
    !!projectId,
  );

  return {
    changes: query.data ?? [],
    loading: query.isPending && !!projectId,
    reload: () => qc.invalidateQueries({ queryKey }),
  };
}
