import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GanttSegment } from "./useGanttData";

interface GanttBarProps {
  segment: GanttSegment;
  epicName: string;
  isCommitted: boolean;
  leftPct: number;
  widthPct: number;
}

export function GanttBar({
  segment,
  epicName,
  isCommitted,
  leftPct,
  widthPct,
}: GanttBarProps) {
  if (segment.total === 0) return null;

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2"
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        padding: "0 4px",
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "h-6 rounded-full overflow-hidden flex flex-row w-full cursor-default",
              !isCommitted && "opacity-60",
            )}
          >
            {segment.done > 0 && (
              <div
                className="bg-emerald-500 h-full"
                style={{ flex: segment.done }}
              />
            )}
            {segment.for_integration > 0 && (
              <div
                className="bg-indigo-400 h-full"
                style={{ flex: segment.for_integration }}
              />
            )}
            {segment.in_progress > 0 && (
              <div
                className="bg-amber-400 h-full"
                style={{ flex: segment.in_progress }}
              />
            )}
            {segment.todo > 0 && (
              <div
                className="bg-white/10 h-full"
                style={{ flex: segment.todo }}
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="font-medium">{epicName}</div>
          <div className="text-dim text-[11px]">
            {format(segment.startDate, "MMM d")} → {format(segment.endDate, "MMM d")}
          </div>
          <div className="text-[11px] mt-1">
            todo: {segment.todo} · in progress: {segment.in_progress} ·
            for integration: {segment.for_integration} · done: {segment.done}
          </div>
          <div className="text-[10px] text-dimmer mt-1 uppercase tracking-wide">
            {isCommitted ? "committed" : "planned only"}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
