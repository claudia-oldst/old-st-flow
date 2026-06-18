import { Search, X, Map as MapIcon, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import type { Sprint } from "../types";
import {
  GROUP_BY_OPTIONS,
  UNPLANNED,
  type PoolGroupBy,
} from "./usePoolGroups";

interface Props {
  projectId: string;
  pool: TicketRow[];
  search: string;
  setSearch: (v: string) => void;
  filters: TicketFilters;
  setFilters: (f: TicketFilters) => void;
  groupBy: PoolGroupBy;
  setGroupBy: (v: PoolGroupBy) => void;
  sortedSprints: Sprint[];
  sprintId: string;
  roadmapIds: Set<string>;
  toggleRoadmap: (id: string) => void;
  roadmapLabel: string;
}

export function PoolFilterBar({
  projectId,
  pool,
  search,
  setSearch,
  filters,
  setFilters,
  groupBy,
  setGroupBy,
  sortedSprints,
  sprintId,
  roadmapIds,
  toggleRoadmap,
  roadmapLabel,
}: Props) {
  return (
    <>
      <div className="relative">
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
      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1.5">
              <MapIcon className="h-3 w-3" />
              <span className="truncate max-w-[10rem]">{roadmapLabel}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1">
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-dimmer">
              Sprint roadmaps
            </div>
            <div className="max-h-72 overflow-y-auto">
              {sortedSprints.map((s) => {
                const checked = roadmapIds.has(s.id);
                const isCurrent = s.id === sprintId;
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/[0.04] cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleRoadmap(s.id)}
                    />
                    <span className="flex-1">Sprint {s.sprint_number}</span>
                    {isCurrent && (
                      <span className="text-[9px] uppercase tracking-wide text-dimmer">
                        current
                      </span>
                    )}
                  </label>
                );
              })}
              <label className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/[0.04] cursor-pointer">
                <Checkbox
                  checked={roadmapIds.has(UNPLANNED)}
                  onCheckedChange={() => toggleRoadmap(UNPLANNED)}
                />
                <span className="flex-1">Unplanned</span>
              </label>
            </div>
          </PopoverContent>
        </Popover>
        <TicketsFilter
          projectId={projectId}
          tickets={pool}
          filters={filters}
          onChange={setFilters}
          sections={["epic"]}
        />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-dimmer">Group</span>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as PoolGroupBy)}>
            <SelectTrigger className="h-7 text-xs w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
