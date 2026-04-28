import { useMemo } from "react";
import { Filter, X, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useStatuses } from "@/features/statuses/useStatuses";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { cn, healthRatio } from "@/lib/utils";

export type HealthColor = "good" | "warn" | "bad";

export interface TicketFilters {
  epicIds: string[]; // string of epic id, or "_none" for no epic
  versions: string[]; // version label, or "_none" for no version
  statusIds: string[];
  feStatuses: DisciplineStatus[];
  beStatuses: DisciplineStatus[];
  assigneeIds: string[]; // user ids, or "_unassigned"
  types: string[]; // Standard | Bug | CR
  feHealth: HealthColor[];
  beHealth: HealthColor[];
  projectHealth: HealthColor[];
}

export const EMPTY_FILTERS: TicketFilters = {
  epicIds: [],
  versions: [],
  statusIds: [],
  feStatuses: [],
  beStatuses: [],
  assigneeIds: [],
  types: [],
  feHealth: [],
  beHealth: [],
  projectHealth: [],
};

export function activeFilterCount(f: TicketFilters): number {
  return (
    f.epicIds.length +
    f.versions.length +
    f.statusIds.length +
    f.feStatuses.length +
    f.beStatuses.length +
    f.assigneeIds.length +
    f.types.length +
    f.feHealth.length +
    f.beHealth.length +
    f.projectHealth.length
  );
}

export function applyFilters(tickets: TicketRow[], f: TicketFilters): TicketRow[] {
  if (activeFilterCount(f) === 0) return tickets;
  return tickets.filter((t) => {
    if (f.epicIds.length) {
      const key = t.epic_id == null ? "_none" : String(t.epic_id);
      if (!f.epicIds.includes(key)) return false;
    }
    if (f.versions.length) {
      const v = t.version?.trim();
      const key = v ? v : "_none";
      if (!f.versions.includes(key)) return false;
    }
    if (f.statusIds.length) {
      const key = t.status_id ?? "_none";
      if (!f.statusIds.includes(key)) return false;
    }
    if (f.feStatuses.length) {
      const hasFE = t.assignees.some((a) => a.slot === "FE");
      if (!hasFE || !f.feStatuses.includes(t.fe_status)) return false;
    }
    if (f.beStatuses.length) {
      const hasBE = t.assignees.some((a) => a.slot === "BE");
      if (!hasBE || !f.beStatuses.includes(t.be_status)) return false;
    }
    if (f.assigneeIds.length) {
      if (t.assignees.length === 0) {
        if (!f.assigneeIds.includes("_unassigned")) return false;
      } else {
        const ids = t.assignees.map((a) => a.user_id);
        if (!ids.some((id) => f.assigneeIds.includes(id))) return false;
      }
    }
    if (f.types.length && !f.types.includes(t.ticket_type)) return false;
    if (f.feHealth.length) {
      const hasFE = t.assignees.some((a) => a.slot === "FE");
      if (!hasFE) return false;
      const h = healthRatio(t.actual_frontend_hours, t.current_fe_estimate);
      if (h === "none" || !f.feHealth.includes(h)) return false;
    }
    if (f.beHealth.length) {
      const hasBE = t.assignees.some((a) => a.slot === "BE");
      if (!hasBE) return false;
      const h = healthRatio(t.actual_backend_hours, t.current_be_estimate);
      if (h === "none" || !f.beHealth.includes(h)) return false;
    }
    if (f.projectHealth.length) {
      if (t.ticket_type !== "Proj") return false;
      const h = healthRatio(
        (t as any).actual_project_hours ?? 0,
        (t as any).current_project_estimate ?? 0
      );
      if (h === "none" || !f.projectHealth.includes(h)) return false;
    }
    return true;
  });
}

const DISC_OPTS: DisciplineStatus[] = ["todo", "in_progress", "for_integration", "done"];
const TYPE_OPTS = ["Standard", "Bug", "CR"];
const HEALTH_OPTS: { value: HealthColor; label: string; dot: string }[] = [
  { value: "good", label: "Green — under 80%", dot: "hsl(var(--health-good))" },
  { value: "warn", label: "Orange — 80–99%", dot: "hsl(var(--health-warn))" },
  { value: "bad", label: "Red — at or over estimate", dot: "hsl(var(--health-bad))" },
];

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

  // Derive assignees from tickets so we only show people actually on this project's tickets
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
    const next = arr.includes(value as any)
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
                  label={tp}
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

            <FilterSection title="Estimate vs actual — Frontend">
              {HEALTH_OPTS.map((h) => (
                <FilterRow
                  key={h.value}
                  label={h.label}
                  dot={h.dot}
                  selected={filters.feHealth.includes(h.value)}
                  onClick={() => toggle("feHealth", h.value)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Estimate vs actual — Backend">
              {HEALTH_OPTS.map((h) => (
                <FilterRow
                  key={h.value}
                  label={h.label}
                  dot={h.dot}
                  selected={filters.beHealth.includes(h.value)}
                  onClick={() => toggle("beHealth", h.value)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Estimate vs actual — Project (shared)">
              {HEALTH_OPTS.map((h) => (
                <FilterRow
                  key={h.value}
                  label={h.label}
                  dot={h.dot}
                  selected={filters.projectHealth.includes(h.value)}
                  onClick={() => toggle("projectHealth", h.value)}
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

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-2">
      <div className="text-[10px] uppercase tracking-wider text-dimmer px-2 py-1">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterRow({
  label,
  selected,
  onClick,
  dot,
  muted,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  dot?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition",
        "hover:bg-white/[0.04]",
        selected && "bg-white/[0.04]"
      )}
    >
      <span
        className={cn(
          "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition",
          selected
            ? "bg-foreground border-foreground text-background"
            : "border-white/20"
        )}
      >
        {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
      {dot && (
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dot }} />
      )}
      <span className={cn("truncate", muted && "text-dim")}>{label}</span>
    </button>
  );
}
