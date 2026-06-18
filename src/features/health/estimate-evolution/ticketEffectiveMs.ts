import type { TicketRow } from "@/features/tickets/useProjectTickets";

export interface TimeLogLite {
  ticket_id: string;
  hours: number;
  discipline: "FE" | "BE";
  logged_at: string;
}

export function ticketEffectiveMs(t: TicketRow): number {
  if (t.ticket_type === "CR") {
    if (t.cr_approval !== "approved") return Infinity;
    const d = t.cr_decided_at ?? t.created_at;
    return new Date(d).getTime();
  }
  return new Date(t.created_at).getTime();
}
