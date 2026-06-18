import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Sprint, SprintDiscipline } from "./types";
import { useGanttData, type GanttEpicRow, type GanttSegment } from "./gantt/useGanttData";
import { GanttGrid } from "./gantt/GanttGrid";

interface Props {
  projectId: string;
  sprints: Sprint[];
  /** Hide the Export PNG button (e.g. on client portal). */
  hideExport?: boolean;
}

type DisciplineFilter = SprintDiscipline | "ALL";

const LEGEND = [
  { label: "todo", cls: "bg-white/10" },
  { label: "in progress", cls: "bg-amber-400" },
  { label: "for integration", cls: "bg-indigo-400" },
  { label: "done", cls: "bg-emerald-500" },
];

function mergeGanttRows(feRows: GanttEpicRow[], beRows: GanttEpicRow[]): GanttEpicRow[] {
  const merged = new Map<string, GanttEpicRow>();
  const addRows = (rows: GanttEpicRow[]) => {
    for (const r of rows) {
      const key = r.epicId !== null ? `e:${r.epicId}` : `n:${r.epicName}`;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          ...r,
          segments: r.segments.map((s) => ({ ...s })),
        });
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
      existing.startDate =
        existing.segments[0]?.startDate ?? existing.startDate;
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

export function SprintGantt({ projectId, sprints, hideExport }: Props) {
  const [discipline, setDiscipline] = useState<DisciplineFilter>("FE");
  const feRows = useGanttData(projectId, sprints, "FE");
  const beRows = useGanttData(projectId, sprints, "BE");
  const rows = useMemo(() => {
    if (discipline === "FE") return feRows;
    if (discipline === "BE") return beRows;
    return mergeGanttRows(feRows, beRows);
  }, [discipline, feRows, beRows]);
  const ganttRef = useRef<HTMLDivElement>(null);


  const onExport = async () => {
    if (!ganttRef.current) return;
    try {
      const dataUrl = await toPng(ganttRef.current, {
        backgroundColor: "#0f1117",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `gantt-${discipline}-${format(new Date(), "yyyy-MM-dd")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  if (sprints.length === 0) {
    return (
      <div className="text-sm text-dim p-6 text-center hairline rounded-md">
        Create a sprint in the Roadmap tab first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Top bar */}
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
              <span
                className={cn("w-3 h-3 rounded-sm inline-block", l.cls)}
              />
              <span>{l.label}</span>
            </div>
          ))}
        </div>

        {!hideExport && (
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export PNG
            </Button>
          </div>
        )}

      </div>

      {/* Body */}
      {rows.length === 0 ? (
        <div className="text-sm text-dim p-6 text-center hairline rounded-md">
          No tickets pooled to sprints for this discipline — assign tickets in the
          Roadmap tab.
        </div>
      ) : (
        <GanttGrid rows={rows} sprints={sprints} ganttRef={ganttRef} />
      )}

    </div>
  );
}

