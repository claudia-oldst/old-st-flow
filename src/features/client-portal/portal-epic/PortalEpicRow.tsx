import { ChevronRight } from "lucide-react";
import { cn, formatHours } from "@/lib/utils";
import { SegmentedBar } from "@/features/_shared/SegmentedBar";
import type { PortalPayload } from "../types";

type EpicLite = PortalPayload["epics"][number];

interface Props {
  epic: EpicLite;
  isOpen: boolean;
  onToggle: () => void;
  /** When true, the row is expandable (delta present OR PMBA summary present). */
  canExpand?: boolean;
}

export function PortalEpicRow({ epic, isOpen, onToggle, canExpand }: Props) {
  const delta = epic.current_estimate - epic.original_estimate;
  const hasDelta = delta !== 0;
  const expandable = canExpand ?? hasDelta;
  const donePct =
    epic.total_tickets > 0 ? (epic.done_tickets / epic.total_tickets) * 100 : 0;
  const ipPct =
    epic.total_tickets > 0
      ? (epic.in_progress_tickets / epic.total_tickets) * 100
      : 0;
  const dotCls = !hasDelta
    ? ""
    : delta > 0
      ? "bg-health-warn"
      : "bg-health-good";

  const RowEl: keyof JSX.IntrinsicElements = expandable ? "button" : "div";

  return (
    <RowEl
      {...(expandable
        ? { onClick: onToggle, "aria-expanded": isOpen, type: "button" as const }
        : {})}
      className={cn(
        "w-full grid grid-cols-[20px_minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_28px] gap-3 items-center px-4 py-3 text-left transition",
        expandable && "hover:bg-white/[0.03] cursor-pointer",
      )}
    >
      <div className="flex justify-center">
        {hasDelta ? (
          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotCls)} />
        ) : (
          <span className="w-1.5 h-1.5 flex-shrink-0" />
        )}
      </div>

      <div className="min-w-0">
        <div
          className={cn(
            "text-sm truncate",
            hasDelta ? "font-medium" : "text-dim",
          )}
        >
          {epic.epic_name ?? "Untitled epic"}
        </div>
      </div>

      <div className="min-w-0">
        <SegmentedBar
          className="h-1.5 bg-white/5"
          segments={[
            { pct: donePct, className: "bg-health-good" },
            { pct: ipPct, className: "bg-chart-in-progress" },
          ]}
        />
        <div className="text-xs text-dimmer mt-1 truncate">
          {epic.done_tickets} done
          {epic.in_progress_tickets > 0 &&
            ` · ${epic.in_progress_tickets} in progress`}
          {epic.backlog_tickets > 0 && ` · ${epic.backlog_tickets} to do`}
        </div>
      </div>

      <div className="text-xs font-mono text-dim text-right">
        {formatHours(epic.current_estimate)}
        <span className="text-dimmer">
          {" "}
          / {formatHours(epic.original_estimate)}
        </span>
      </div>

      <div className="text-right">
        {hasDelta ? (
          <span
            className={cn(
              "inline-block text-[11px] font-mono px-1.5 py-0.5 rounded hairline",
              delta > 0
                ? "text-health-warn bg-health-warn/10"
                : "text-health-good bg-health-good/10",
            )}
          >
            {delta > 0 ? "+" : ""}
            {formatHours(delta)}
          </span>
        ) : (
          <span className="text-dimmer text-xs">—</span>
        )}
      </div>

      <div className="flex justify-center">
        {expandable ? (
          <ChevronRight
            className={cn(
              "h-4 w-4 text-dim transition-transform",
              isOpen && "rotate-90",
            )}
          />
        ) : null}
      </div>
    </RowEl>
  );
}
