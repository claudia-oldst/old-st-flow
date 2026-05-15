import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

export interface TicketLogEntry {
  id: string;
  hours: number;
  discipline: "FE" | "BE" | "Project";
  note: string | null;
  logged_at: string;
  source: "timer" | "manual";
  user_id: string;
  user: { name: string; avatar_color: string };
}

/**
 * Fetches the time-log feed for a ticket. Returns the list plus a `reload`
 * callback for manual refresh after a mutation.
 */
export function useTicketTimeLogs(ticketId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ["ticketTimeLogs", ticketId] as const;

  const query = useQuery({
    queryKey,
    enabled: !!ticketId,
    queryFn: async (): Promise<TicketLogEntry[]> => {
      const { data } = await supabase
        .from("time_logs")
        .select("id,hours,discipline,note,logged_at,source,user:team_members(name,avatar_color)")
        .eq("ticket_id", ticketId!)
        .order("logged_at", { ascending: false });
      return (data as unknown as TicketLogEntry[]) ?? [];
    },
  });

  useRealtimeInvalidate(
    ticketId ? [{ table: "time_logs", filter: `ticket_id=eq.${ticketId}` }] : null,
    queryKey,
    !!ticketId,
  );

  return {
    logs: query.data ?? [],
    reload: () => qc.invalidateQueries({ queryKey }),
  };
}
