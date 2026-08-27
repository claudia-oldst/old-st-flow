import { useMemo } from "react";
import { Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { cn } from "@/lib/utils";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyFilters,
  type HealthColor,
  type TicketFilters,
} from "./filters/applyFilters";
import { FilterSections } from "./filters/FilterSections";

export type FilterSection =
  | "type"
  | "status"
  | "fe_status"
  | "be_status"
  | "health"
  | "epic"
  | "assignee"
  | "version";

const ALL_SECTIONS: FilterSection[] = [
  "type",
  "status",
  "fe_status",
  "be_status",
  "health",
  "epic",
  "assignee",
  "version",
];

// Re-export public API at original module path for existing imports.
export { EMPTY_FILTERS, activeFilterCount, applyFilters };
export type { TicketFilters, HealthColor };

export function TicketsFilter({
  projectId,
  tickets,
  filters,
  onChange,
  sections = ALL_SECTIONS,
}: {
  projectId: string;
  tickets: TicketRow[];
  filters: TicketFilters;
  onChange: (f: TicketFilters) => void;
  sections?: FilterSection[];
}) {
  const assigneeOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    tickets.forEach((t) =>
      t.assignees.forEach((a) => {
        if (!map.has(a.user_id))
          map.set(a.user_id, {
            id: a.user_id,
            name: a.member.name,
            color: a.member.avatar_color,
          });
      })
    );
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tickets]);

  const versionOptions = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      const v = t.version?.trim();
      if (v) set.add(v);
    });
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [tickets]);

  const count = activeFilterCount(filters);

  function toggle<K extends keyof TicketFilters>(key: K, value: string) {
    const arr = filters[key] as string[];
    const next = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
    onChange({ ...filters, [key]: next } as TicketFilters);
  }

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className={cn("h-8 gap-2 text-xs", count > 0 && "border-accent/40 bg-accent/5")}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
            {count > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-foreground text-background text-[10px] font-mono">
                {count}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[300px] p-0 glass-strong"
          sideOffset={6}
        >
          <FilterSections
            projectId={projectId}
            sections={sections}
            filters={filters}
            toggle={toggle}
            assigneeOptions={assigneeOptions}
            versionOptions={versionOptions}
          />


          {count > 0 && (
            <div className="p-2 border-t border-white/5 flex justify-end">
              <button
                onClick={() => onChange(EMPTY_FILTERS)}
                className="text-xs text-dim hover:text-foreground inline-flex items-center gap-1 px-2 py-1 rounded transition"
              >
                <X className="h-3 w-3" /> Clear all
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {count > 0 && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-xs text-dimmer hover:text-foreground inline-flex items-center gap-1 transition"
          title="Clear filters"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}
