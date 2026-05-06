import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";

export interface TicketLogEntry {
  id: string;
  hours: number;
  discipline: "FE" | "BE" | "Project";
  note: string | null;
  logged_at: string;
  source: "timer" | "manual";
  user: { name: string; avatar_color: string };
}

/**
 * Fetches the time-log feed for a ticket. Returns the list plus a `reload`
 * callback for manual refresh after a mutation.
 */
export function useTicketTimeLogs(ticketId: string | undefined) {
  const [logs, setLogs] = useState<TicketLogEntry[]>([]);

  const reload = useCallback(async () => {
    if (!ticketId) {
      setLogs([]);
      return;
    }
    const { data } = await supabase
      .from("time_logs")
      .select("id,hours,discipline,note,logged_at,source,user:team_members(name,avatar_color)")
      .eq("ticket_id", ticketId)
      .order("logged_at", { ascending: false });
    setLogs((data as unknown as TicketLogEntry[]) ?? []);
  }, [ticketId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useRealtimeReload(
    ticketId ? [{ table: "time_logs", filter: `ticket_id=eq.${ticketId}` }] : null,
    reload,
    !!ticketId,
  );

  return { logs, reload };
}
