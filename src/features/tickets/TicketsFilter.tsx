import { useMemo } from "react";
import { Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useStatuses } from "@/features/statuses/useStatuses";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { DISCIPLINE_STATUS_LABEL } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { cn } from "@/lib/utils";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyFilters,
  type HealthColor,
  type TicketFilters,
} from "./filters/applyFilters";
import { DISC_OPTS, HEALTH_OPTS, TYPE_OPTS } from "./filters/constants";
import { FilterRow, FilterSection as FilterSectionPrimitive } from "./filters/FilterPrimitives";

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
}: {
  projectId: string;
  tickets: TicketRow[];
  filters: TicketFilters;
  onChange: (f: TicketFilters) => void;
}) {
  const { statuses } = useStatuses();
  const { epics } = useProjectEpics(projectId);

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
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-white/5">
            <FilterSection title="Type">
              {TYPE_OPTS.map((tp) => (
                <FilterRow
                  key={tp}
                  label={tp === "Proj" ? "Project" : tp}
                  selected={filters.types.includes(tp)}
                  onClick={() => toggle("types", tp)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Status">
              {statuses.map((s) => (
                <FilterRow
                  key={s.id}
                  label={s.name}
                  dot={s.color}
                  selected={filters.statusIds.includes(s.id)}
                  onClick={() => toggle("statusIds", s.id)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Dev status — Frontend">
              {DISC_OPTS.map((s) => (
                <FilterRow
                  key={s}
                  label={DISCIPLINE_STATUS_LABEL[s]}
                  selected={filters.feStatuses.includes(s)}
                  onClick={() => toggle("feStatuses", s)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Dev status — Backend">
              {DISC_OPTS.map((s) => (
                <FilterRow
                  key={s}
                  label={DISCIPLINE_STATUS_LABEL[s]}
                  selected={filters.beStatuses.includes(s)}
                  onClick={() => toggle("beStatuses", s)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Estimate vs actual">
              {HEALTH_OPTS.map((h) => (
                <FilterRow
                  key={h.value}
                  label={h.label}
                  dot={h.dot}
                  selected={filters.health.includes(h.value)}
                  onClick={() => toggle("health", h.value)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Epic">
              {epics.map((e) => (
                <FilterRow
                  key={e.id}
                  label={e.epic_name ?? "Epic"}
                  selected={filters.epicIds.includes(String(e.id))}
                  onClick={() => toggle("epicIds", String(e.id))}
                />
              ))}
              <FilterRow
                label="No epic"
                muted
                selected={filters.epicIds.includes("_none")}
                onClick={() => toggle("epicIds", "_none")}
              />
            </FilterSection>

            <FilterSection title="Version">
              {versionOptions.length === 0 && (
                <div className="px-2 py-1.5 text-[11px] text-dimmer">No versions yet</div>
              )}
              {versionOptions.map((v) => (
                <FilterRow
                  key={v}
                  label={v}
                  selected={filters.versions.includes(v)}
                  onClick={() => toggle("versions", v)}
                />
              ))}
              <FilterRow
                label="No version"
                muted
                selected={filters.versions.includes("_none")}
                onClick={() => toggle("versions", "_none")}
              />
            </FilterSection>

            <FilterSection title="Assignee">
              {assigneeOptions.map((a) => (
                <FilterRow
                  key={a.id}
                  label={a.name}
                  dot={a.color}
                  selected={filters.assigneeIds.includes(a.id)}
                  onClick={() => toggle("assigneeIds", a.id)}
                />
              ))}
              <FilterRow
                label="Unassigned"
                muted
                selected={filters.assigneeIds.includes("_unassigned")}
                onClick={() => toggle("assigneeIds", "_unassigned")}
              />
            </FilterSection>
          </div>

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
