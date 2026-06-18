import { useMemo, type RefObject } from "react";
import { eachWeekOfInterval, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Sprint } from "../types";
import type { GanttEpicRow } from "./useGanttData";
import { GanttBar } from "./GanttBar";

interface Props {
  rows: GanttEpicRow[];
  sprints: Sprint[];
  ganttRef: RefObject<HTMLDivElement>;
}

export function GanttGrid({ rows, sprints, ganttRef }: Props) {
  const { rangeStart, rangeEnd, totalMs, weeks, sprintStartMs } = useMemo(() => {
    const starts = sprints.map((s) => parseISO(s.start_date).getTime());
    const ends = sprints.map((s) => parseISO(s.end_date).getTime());
    const rs = new Date(Math.min(...starts));
    const re = new Date(Math.max(...ends));
    const wks = eachWeekOfInterval({ start: rs, end: re }, { weekStartsOn: 1 });
    const sMs = new Map<number, Sprint>();
    sprints.forEach((s) => sMs.set(parseISO(s.start_date).getTime(), s));
    return {
      rangeStart: rs,
      rangeEnd: re,
      totalMs: re.getTime() - rs.getTime(),
      weeks: wks,
      sprintStartMs: sMs,
    };
  }, [sprints]);

  const todayPct = useMemo(() => {
    const now = Date.now();
    if (now < rangeStart.getTime() || now > rangeEnd.getTime()) return null;
    return ((now - rangeStart.getTime()) / totalMs) * 100;
  }, [rangeStart, rangeEnd, totalMs]);

  return (
    <div ref={ganttRef} className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-white/5 bg-surface-1/40">
        <div className="w-48 shrink-0 px-3 py-2 border-r border-white/5 text-[10px] uppercase tracking-wide text-dim">
          Epic
        </div>
        <div className="flex-1 relative flex">
          {weeks.map((week, i) => {
            const sprint = sprintStartMs.get(week.getTime());
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 text-center py-2",
                  sprint && "border-l border-white/10",
                )}
              >
                {sprint && (
                  <div className="text-[10px] text-dimmer font-medium">
                    S{sprint.sprint_number}
                  </div>
                )}
                <div className="text-[10px] text-dimmer">
                  {format(week, "MMM d")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rows */}
      <TooltipProvider delayDuration={150}>
        <div className="relative">
          {rows.map((row) => (
            <div
              key={`${row.epicId ?? "none"}:${row.epicName}`}
              className="flex items-center h-10 border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
            >
              <div className="w-48 shrink-0 px-3 border-r border-white/5 flex items-center gap-2 h-full">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    row.isCommitted ? "bg-emerald-500" : "bg-white/20",
                  )}
                />
                <span
                  className={cn(
                    "text-xs truncate",
                    row.isCommitted ? "text-foreground" : "text-dim",
                  )}
                  title={row.epicName}
                >
                  {row.epicName}
                </span>
              </div>
              <div className="flex-1 relative h-full">
                {row.segments.map((seg) => {
                  const leftPct =
                    ((seg.startDate.getTime() - rangeStart.getTime()) / totalMs) *
                    100;
                  const widthPct =
                    ((seg.endDate.getTime() - seg.startDate.getTime()) / totalMs) *
                    100;
                  return (
                    <GanttBar
                      key={seg.sprintId}
                      segment={seg}
                      epicName={row.epicName}
                      isCommitted={row.isCommitted}
                      leftPct={leftPct}
                      widthPct={widthPct}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {todayPct !== null && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{ left: `calc(12rem + (100% - 12rem) * ${todayPct / 100})` }}
            >
              <div className="relative h-full">
                <div className="absolute top-0 bottom-0 w-px bg-amber-400/60" />
                <div className="absolute top-1 left-1 text-[9px] text-amber-400/80 font-medium">
                  today
                </div>
              </div>
            </div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
