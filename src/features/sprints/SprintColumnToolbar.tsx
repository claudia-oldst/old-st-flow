import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  TicketsFilter,
  EMPTY_FILTERS,
  type TicketFilters,
} from "@/features/tickets/TicketsFilter";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

/**
 * Shared search + filter toolbar used by every sprint planning column and the
 * Tab 1 pooling table. Wraps the existing TicketsFilter so look-and-feel matches
 * the Tickets tab exactly.
 */
export function SprintColumnToolbar({
  projectId,
  tickets,
  filters,
  onChange,
  search,
  onSearch,
  placeholder = "Search ID or title…",
  extras,
}: {
  projectId: string;
  tickets: TicketRow[];
  filters: TicketFilters;
  onChange: (f: TicketFilters) => void;
  search: string;
  onSearch: (s: string) => void;
  placeholder?: string;
  extras?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dimmer pointer-events-none" />
        <Input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="h-8 pl-8 pr-7 text-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-dimmer hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <TicketsFilter
          projectId={projectId}
          tickets={tickets}
          filters={filters}
          onChange={onChange}
        />
        {extras}
      </div>
    </div>
  );
}

export { EMPTY_FILTERS };

/** Helper to apply the shared text search consistently. */
export function searchTickets(tickets: TicketRow[], q: string): TicketRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return tickets;
  return tickets.filter((t) =>
    `${t.formatted_id} ${t.title}`.toLowerCase().includes(needle),
  );
}
