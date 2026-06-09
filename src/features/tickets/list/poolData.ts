/** Optional pool data passed into TicketsList to render & sort FE/BE pool columns. */
export interface PoolData {
  byTicket: Map<string, { fe: string | null; be: string | null }>;
  sprintsById: Map<string, { sprint_number: number }>;
}
