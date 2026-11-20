import type { ReactNode } from "react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

/** A feature-specific column appended to the shared tickets table. Clicks inside don't open the ticket. */
export interface ExtraColumn {
  key: string;
  header: ReactNode;
  width: number;
  cell: (t: TicketRow) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}
