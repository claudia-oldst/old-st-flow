import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TicketsFilter,
  type TicketFilters,
} from "@/features/tickets/TicketsFilter";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import {
  DEV_COL_GROUP_OPTIONS,
  type DevColGroupBy,
} from "./useDevColumnGroups";

interface Props {
  projectId: string;
  tickets: TicketRow[];
  search: string;
  setSearch: (v: string) => void;
  filters: TicketFilters;
  setFilters: (f: TicketFilters) => void;
  groupBy: DevColGroupBy;
  setGroupBy: (v: DevColGroupBy) => void;
  visibleCount: number;
}

/** Shared filter + group control that governs every developer column. */
export function DevColumnsToolbar({
  projectId,
  tickets,
  search,
  setSearch,
  filters,
  setFilters,
  groupBy,
  setGroupBy,
  visibleCount,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap p-2 rounded-md hairline bg-surface-1/40">
      <div className="relative w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dimmer pointer-events-none" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ID or title…"
          className="h-8 pl-8 pr-7 text-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-dimmer hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <TicketsFilter
        projectId={projectId}
        tickets={tickets}
        filters={filters}
        onChange={setFilters}
        sections={["epic"]}
      />
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-dimmer">Group</span>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as DevColGroupBy)}>
          <SelectTrigger className="h-7 text-xs w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEV_COL_GROUP_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="ml-auto text-[10px] font-mono text-dim">
        {visibleCount} ticket{visibleCount === 1 ? "" : "s"}
      </div>
    </div>
  );
}
