import { ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatHours } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { SprintDiscipline } from "../types";
import { RoadmapRow, ROW_GRID } from "./RoadmapRow";
import type { CellState, Commitment, SprintLite } from "./cellRules";
import type { RoadmapGroup } from "./roadmapGroups";
import type { Load, SprintTotals } from "./sprintTotals";

interface Props {
  groups: RoadmapGroup[];
  sprints: SprintLite[];
  workingId: string | undefined;
  totals: Map<string, SprintTotals>;
  caps: Map<string, { FE: number; BE: number }>;
  commitsByTicket: Map<string, Commitment[]>;
  plannedByTicket: Map<string, { fe: string | null; be: string | null }>;
  statusById: Map<string, { name: string; color: string }>;
  isSplit: (t: TicketRow) => boolean;
  selected: Set<string>;
  setSelected: (ids: string[], on: boolean) => void;
  collapsed: Set<string>;
  toggleGroup: (key: string) => void;
  editable: boolean;
  onOpen: (t: TicketRow) => void;
  onAssign: (t: TicketRow) => void;
  onSet: (t: TicketRow, s: SprintLite, d: SprintDiscipline, to: CellState) => void;
}

const DISCS = ["FE", "BE"] as const;

function TotalLine({ l, cap }: { l: Load | undefined; cap: number }) {
  const used = (l?.committed ?? 0) + (l?.planned ?? 0);
  return <span className={cn("font-mono", cap > 0 && used > cap && "text-primary")}>{formatHours(used)}/{formatHours(cap)}</span>;
}

export function RoadmapTable(p: Props) {
  const n = p.sprints.length * 2;
  const grid = { gridTemplateColumns: ROW_GRID(n) };
  const all = p.groups.flatMap((g) => g.rows.map((r) => r.id));
  const allOn = all.length > 0 && all.every((id) => p.selected.has(id));
  return (
    <div className="hairline rounded-md bg-surface-1/40 overflow-auto max-h-[calc(100vh-220px)]">
      <div className="min-w-fit">
        <div className="sticky top-0 z-10 bg-surface-1 border-b border-white/10 text-[10px] uppercase tracking-wider text-dimmer">
          <div className="grid items-end gap-x-2 px-2 pt-2" style={grid}>
            <span className="col-span-7" />
            {p.sprints.map((s) => (
              <div key={s.id} className={cn("col-span-2 text-center normal-case text-[11px] pb-1 rounded-t", s.id === p.workingId ? "text-accent bg-accent/[0.06]" : "text-dim")}>
                Sprint {s.sprint_number}{s.id === p.workingId && " · working"}
              </div>
            ))}
          </div>
          <div className="grid items-center gap-x-2 px-2 pb-2" style={grid}>
            <Checkbox checked={allOn} onCheckedChange={(v) => p.setSelected(all, !!v)} aria-label="Select all" />
            <span>ID</span><span>Title</span><span>Status</span><span>FE · BE status</span><span>Assigned</span><span>Hours</span>
            {p.sprints.flatMap((s) => DISCS.map((d) => (
              <div key={s.id + d} className={cn("text-center", s.id === p.workingId && "bg-accent/[0.06] text-accent")}>
                {d}
                {s.id === p.workingId && <div className="normal-case text-[10px]"><TotalLine l={p.totals.get(s.id)?.sprint[d]} cap={p.caps.get(s.id)?.[d] ?? 0} /></div>}
              </div>
            )))}
          </div>
        </div>

        {p.groups.map((g) => {
          const isCollapsed = p.collapsed.has(g.key);
          const ids = g.rows.map((r) => r.id);
          const on = ids.length > 0 && ids.every((id) => p.selected.has(id));
          return (
            <div key={g.key}>
              {p.groups.length > 1 || g.key !== "all" ? (
                <div className="flex items-center gap-2 px-2 h-9 border-b border-white/5 bg-white/[0.02] text-xs">
                  <Checkbox checked={on} onCheckedChange={(v) => p.setSelected(ids, !!v)} aria-label={`Select ${g.label}`} />
                  <button type="button" onClick={() => p.toggleGroup(g.key)} className="flex items-center gap-1.5 font-medium">
                    <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", !isCollapsed && "rotate-90")} />
                    {g.label}
                    <span className="text-dimmer font-normal">{g.rows.length}</span>
                  </button>
                </div>
              ) : null}
              {!isCollapsed && g.rows.map((t) => (
                <RoadmapRow
                  key={t.id}
                  t={t}
                  sprints={p.sprints}
                  workingId={p.workingId}
                  commits={p.commitsByTicket.get(t.id) ?? []}
                  planned={p.plannedByTicket.get(t.id)}
                  status={t.status_id ? p.statusById.get(t.status_id) : undefined}
                  split={p.isSplit(t)}
                  selected={p.selected.has(t.id)}
                  editable={p.editable}
                  onSelect={(id, v) => p.setSelected([id], v)}
                  onOpen={p.onOpen}
                  onAssign={p.onAssign}
                  onSet={p.onSet}
                />
              ))}
            </div>
          );
        })}
        {all.length === 0 && <div className="text-sm text-dim text-center py-10">No tickets match these filters.</div>}

        <div className="sticky bottom-0 grid items-center gap-x-2 px-2 py-2 bg-surface-1 border-t border-white/10 text-[10px] text-dim" style={grid}>
          <span className="col-span-7 text-dimmer uppercase tracking-wider">Committed (unplanned) · Planned · Total / capacity</span>
          {p.sprints.flatMap((s) => DISCS.map((d) => {
            const l = p.totals.get(s.id)?.sprint[d];
            return (
              <div key={s.id + d} className={cn("text-center leading-tight", s.id === p.workingId && "text-accent")}>
                <div>C {l?.committedCount ?? 0}{l?.unplannedCount ? ` (${l.unplannedCount} unpl.)` : ""}</div>
                <div>P {l?.plannedCount ?? 0}</div>
                <TotalLine l={l} cap={p.caps.get(s.id)?.[d] ?? 0} />
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
}
