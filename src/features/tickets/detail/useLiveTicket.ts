import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { OPEN_TICKET_EVENT } from "@/features/tickets/openTicketEvent";
import { fetchTicketById } from "@/features/tickets/fetchTicketById";

/**
 * Keeps the open ticket in sync with the prop, realtime UPDATEs on that row,
 * and in-app requests to swap to another ticket without closing the sheet.
 */
export function useLiveTicket(ticketProp: TicketRow | null, open: boolean) {
  const [liveTicket, setLiveTicket] = useState<TicketRow | null>(ticketProp);

  // Sync from prop (new ticket opened, or parent reloaded list)
  useEffect(() => {
    setLiveTicket(ticketProp);
  }, [ticketProp]);

  // Realtime updates for this specific ticket so the detail view reflects
  // changes the moment they are persisted.
  useEffect(() => {
    if (!ticketProp?.id) return;
    const id = ticketProp.id;
    const channel = supabase
      .channel(`ticket-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets", filter: `id=eq.${id}` },
        (payload) => {
          setLiveTicket((prev) =>
            prev && prev.id === id ? { ...prev, ...(payload.new as Partial<TicketRow>) } : prev,
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketProp?.id]);

  // In-app navigation to another ticket (parent badge, bug link in a comment…)
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id || id === liveTicket?.id) return;
      fetchTicketById(id).then((t) => {
        if (t) setLiveTicket(t);
      });
    };
    window.addEventListener(OPEN_TICKET_EVENT, handler);
    return () => window.removeEventListener(OPEN_TICKET_EVENT, handler);
  }, [open, liveTicket?.id]);

  return { ticket: liveTicket, setLiveTicket };
}
