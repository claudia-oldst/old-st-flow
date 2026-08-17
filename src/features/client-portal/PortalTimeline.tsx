import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { GanttGrid } from "@/features/sprints/gantt/GanttGrid";
import {
  buildGanttRows,
  type GanttEpicRow,
  type GanttSegment,
} from "@/features/sprints/gantt/buildGanttRows";
import { usePublicPortalGantt } from "./usePortalGantt";

type DisciplineFilter = "FE" | "BE" | "ALL";

const LEGEND = [
  { label: "todo", cls: "bg-white/10" },
  { label: "in progress", cls: "bg-amber-400" },
  { label: "for integration", cls: "bg-indigo-400" },
  { label: "done", cls: "bg-emerald-500" },
];

function mergeRows(feRows: GanttEpicRow[], beRows: GanttEpicRow[]): GanttEpicRow[] {
  const merged = new Map<string, GanttEpicRow>();
  const addRows = (rows: GanttEpicRow[]) => {
    for (const r of rows) {
      const key = r.epicId !== null ? `e:${r.epicId}` : `n:${r.epicName}`;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...r, segments: r.segments.map((s) => ({ ...s })) });
        continue;
      }
      const segBySprint = new Map<string, GanttSegment>();
      existing.segments.forEach((s) => segBySprint.set(s.sprintId, s));
      for (const s of r.segments) {
        const cur = segBySprint.get(s.sprintId);
        if (!cur) {
          const copy = { ...s };
          existing.segments.push(copy);
          segBySprint.set(s.sprintId, copy);
        } else {
          cur.todo += s.todo;
          cur.in_progress += s.in_progress;
          cur.for_integration += s.for_integration;
          cur.done += s.done;
          cur.total += s.total;
          cur.committed += s.committed;
          cur.planned += s.planned;
        }
      }
      existing.isCommitted = existing.isCommitted || r.isCommitted;
      existing.segments.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      existing.startDate = existing.segments[0]?.startDate ?? existing.startDate;
      existing.endDate =
        existing.segments[existing.segments.length - 1]?.endDate ?? existing.endDate;
    }
  };
  addRows(feRows);
  addRows(beRows);
  return Array.from(merged.values()).sort((a, b) =>
    a.epicName.localeCompare(b.epicName, undefined, { sensitivity: "base" }),
  );
}

/** Read-only sprint timeline for the public /h/:hash portal. */
export function PortalTimeline({ hash }: { hash: string | undefined }) {
  const { data, loading } = usePublicPortalGantt(hash);
  const [discipline, setDiscipline] = useState<DisciplineFilter>("ALL");
  const ganttRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const fe = buildGanttRows(
      data.sprints,
      data.tickets,
      data.sprint_tickets,
      data.epics,
      "FE",
    );
    const be = buildGanttRows(
      data.sprints,
      data.tickets,
      data.sprint_tickets,
      data.epics,
      "BE",
    );
    const all =
      discipline === "FE" ? fe : discipline === "BE" ? be : mergeRows(fe, be);
    // Hide epics that have no tickets scheduled in any sprint.
    return all.filter((r) => r.segments.length > 0);
  }, [data, discipline]);


  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-sm text-dim">Loading…</div>
    );
  }

  if (!data || data.sprints.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-sm text-dim">
        No sprint timeline available yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="inline-flex rounded-md border border-white/10 overflow-hidden">
          {(["FE", "BE", "ALL"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDiscipline(d)}
              className={cn(
                "px-3 h-8 text-xs font-medium transition",
                discipline === d
                  ? "bg-accent/20 text-accent"
                  : "text-dim hover:text-foreground hover:bg-white/5",
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs text-dim">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={cn("w-3 h-3 rounded-sm inline-block", l.cls)} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-sm text-dim">
          No epics scheduled into sprints yet.
        </div>
      ) : (
        <GanttGrid rows={rows} sprints={data.sprints} ganttRef={ganttRef} />
      )}
    </div>
  );
}
