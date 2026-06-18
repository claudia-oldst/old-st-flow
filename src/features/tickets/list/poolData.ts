/** Optional pool data passed into TicketsList to render & sort FE/BE pool columns. */
export interface PoolData {
  byTicket: Map<string, { fe: string | null; be: string | null }>;
  sprintsById: Map<string, { sprint_number: number }>;
  /** Per ticket → sprint_numbers where the ticket has committed sprint_tickets rows
   *  for FE / BE disciplines respectively (sorted ascending, deduped). */
  activeByTicket: Map<string, { fe: number[]; be: number[] }>;
}
