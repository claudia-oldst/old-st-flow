import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchTicketById } from "../fetchTicketById";
import type { TicketRow } from "../useProjectTickets";

export type TicketDetailTab = "status" | "acceptance" | "discussion";

export function ticketDetailTab(value: string | null): TicketDetailTab | undefined {
  return value === "status" || value === "acceptance" || value === "discussion" ? value : undefined;
}

/** Capture a link's requested tab before consuming its query parameters. */
export function useTicketDeepLink() {
  const [params, setParams] = useSearchParams();
  const ticketId = params.get("ticket");
  const tab = ticketDetailTab(params.get("tab"));
  const [selection, setSelection] = useState<{ ticket: TicketRow | null; tab?: TicketDetailTab }>({ ticket: null });
  const setOpenTicket = useCallback((ticket: TicketRow | null) => setSelection({ ticket }), []);

  useEffect(() => {
    if (!ticketId) return;
    let cancelled = false;
    void (async () => {
      const ticket = await fetchTicketById(ticketId);
      if (cancelled) return;
      if (ticket) setSelection({ ticket, tab });
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("ticket");
        next.delete("tab");
        return next;
      }, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [ticketId, tab, setParams]);

  return { openTicket: selection.ticket, initialTab: selection.tab, setOpenTicket };
}