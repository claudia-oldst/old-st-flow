import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useTimerStore, type TimerTicket } from "@/store/timer";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";

export function TimerSync() {
  const user = useCurrentUser((s) => s.user);
  const setActive = useTimerStore((s) => s.setActive);
  const setTickets = useTimerStore((s) => s.setTickets);

  const load = useCallback(async () => {
    if (!user) {
      setActive(null);
      setTickets([]);
      return;
    }

    const { data: active } = await supabase
      .from("active_timers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setActive(active ?? null);

    if (!active) {
      setTickets([]);
      return;
    }

    const { data: groupRows } = await supabase
      .from("active_timer_tickets")
      .select("position, ticket_id")
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    let tickets: TimerTicket[] = [];
    const rows = ((groupRows as any[]) ?? []).filter((r) => r.ticket_id);
    if (rows.length > 0) {
      const { data: ticketRows } = await supabase
        .from("tickets")
        .select("id, formatted_id, title, fe_status, be_status, status_id, project_id")
        .in(
          "id",
          rows.map((r) => r.ticket_id)
        );

      const byId = new Map((ticketRows ?? []).map((t) => [t.id, t]));
      tickets = rows
        .map((r) => {
          const t = byId.get(r.ticket_id);
          if (!t) return null;
          return {
            id: t.id,
            formatted_id: t.formatted_id,
            title: t.title,
            position: r.position,
            fe_status: t.fe_status as any,
            be_status: t.be_status as any,
            status_id: t.status_id,
            project_id: t.project_id,
          };
        })
        .filter(Boolean) as TimerTicket[];
    }

    // Self-heal: backfill missing group row for any pre-migration
    // active_timers row, then take the single normal path.
    if (tickets.length === 0 && active.ticket_id) {
      await supabase
        .from("active_timer_tickets")
        .upsert(
          { user_id: user.id, ticket_id: active.ticket_id, position: 0 },
          { onConflict: "user_id,ticket_id" },
        );

      const { data: t } = await supabase
        .from("tickets")
        .select("id, formatted_id, title, fe_status, be_status, status_id, project_id")
        .eq("id", active.ticket_id)
        .maybeSingle();
      if (t) {
        tickets = [
          {
            id: t.id,
            formatted_id: t.formatted_id,
            title: t.title,
            position: 0,
            fe_status: t.fe_status as any,
            be_status: t.be_status as any,
            status_id: t.status_id,
            project_id: t.project_id,
          },
        ];
      }
    }

    setTickets(tickets);
  }, [user, setActive, setTickets]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeReload(
    user
      ? [
          { table: "active_timers", filter: `user_id=eq.${user.id}` },
          { table: "active_timer_tickets", filter: `user_id=eq.${user.id}` },
        ]
      : null,
    load,
    !!user,
  );

  return null;
}
