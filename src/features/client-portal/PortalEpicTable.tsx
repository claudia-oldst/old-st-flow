import { useMemo, useState } from "react";
import { ChevronRight, TrendingUp } from "lucide-react";
import { cn, formatHours } from "@/lib/utils";
import { formatGBP, type PortalPayload } from "./types";
import {
  buildEpicTrendSeries,
  usePortalEpicTrendData,
} from "./epic-trend/usePortalEpicTrendData";
import { PortalTrendChart } from "./epic-trend/PortalTrendChart";
import {
  discountTotalsByEpic,
  sumTotals,
  type EpicDiscount,
} from "@/features/discounts/applyDiscounts";

interface Props {
  epics: PortalPayload["epics"];
  projectId: string;
  cutoff: string;
  ratePerHour: number;
  showRate: boolean;
  discounts: EpicDiscount[];
}

export function PortalEpicTable({
  epics,
  projectId,
  cutoff,
  ratePerHour,
  showRate,
  discounts,
}: Props) {
  const visibleEpics = useMemo(
    () => epics.filter((e) => e.total_tickets > 0),
    [epics],
  );

  const includedForTrend = useMemo(
    () =>
      visibleEpics.map((e) => ({
        id: e.id,
        name: e.epic_name ?? "Untitled epic",
      })),
    [visibleEpics],
  );

  const { tickets, changes, logs, projectStart, ticketEpic } =
    usePortalEpicTrendData(projectId, includedForTrend);

  const cutoffMs = useMemo(() => new Date(cutoff).getTime(), [cutoff]);

  const aggregated = useMemo(
    () =>
      buildEpicTrendSeries({
        tickets,
        changes,
        logs,
        projectStart,
        cutoffMs,
        ticketFilter: () => true,
        discounts,
      }),
    [tickets, changes, logs, projectStart, cutoffMs, discounts],
  );

  const discountByEpic = useMemo(
    () => discountTotalsByEpic(discounts),
    [discounts],
  );

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (visibleEpics.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-sm text-dim">
        No epics yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aggregate trend chart */}
      {tickets.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-dim" />
            <div className="text-xs uppercase tracking-wider text-dimmer">
              Estimate trend over time
            </div>
          </div>
          <div className="h-56">
            {aggregated.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-dim">
                No trend data yet.
              </div>
            ) : (
              <PortalTrendChart data={aggregated} />
            )}
          </div>
        </div>
      )}

      {/* Epic progress table */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[20px_minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_28px] gap-3 items-center px-4 py-2.5 text-[10px] uppercase tracking-wider text-dimmer hairline-b">
          <div />
          <div>Epic</div>
          <div>Progress</div>
          <div className="text-right">Hours (cur/orig)</div>
          <div className="text-right">Change</div>
          <div />
        </div>

        {visibleEpics.map((e) => {
          const delta = e.current_estimate - e.original_estimate;
          const hasDelta = delta !== 0;
          const isOpen = expanded.has(e.id);
          const donePct =
            e.total_tickets > 0
              ? (e.done_tickets / e.total_tickets) * 100
              : 0;
          const ipPct =
            e.total_tickets > 0
              ? (e.in_progress_tickets / e.total_tickets) * 100
              : 0;
          const dotCls = !hasDelta
            ? ""
            : delta > 0
              ? "bg-health-warn"
              : "bg-health-good";

          const RowEl: keyof JSX.IntrinsicElements = hasDelta ? "button" : "div";
          return (
            <div key={e.id} className="hairline-b last:border-b-0">
              <RowEl
                {...(hasDelta
                  ? {
                      onClick: () => toggle(e.id),
                      "aria-expanded": isOpen,
                      type: "button",
                    }
                  : {})}
                className={cn(
                  "w-full grid grid-cols-[20px_minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_28px] gap-3 items-center px-4 py-3 text-left transition",
                  hasDelta && "hover:bg-white/[0.03] cursor-pointer",
                )}
              >
                <div className="flex justify-center">
                  {hasDelta ? (
                    <span
                      className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotCls)}
                    />
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
                    {e.epic_name ?? "Untitled epic"}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                    <div
                      className="h-full bg-health-good"
                      style={{ width: `${donePct}%` }}
                    />
                    <div
                      className="h-full"
                      style={{
                        width: `${ipPct}%`,
                        background: "hsl(217 91% 60%)",
                      }}
                    />
                  </div>
                  <div className="text-xs text-dimmer mt-1 truncate">
                    {e.done_tickets} done
                    {e.in_progress_tickets > 0 &&
                      ` · ${e.in_progress_tickets} in progress`}
                    {e.backlog_tickets > 0 && ` · ${e.backlog_tickets} to do`}
                  </div>
                </div>

                <div className="text-xs font-mono text-dim text-right">
                  {formatHours(e.current_estimate)}
                  <span className="text-dimmer">
                    {" "}
                    / {formatHours(e.original_estimate)}
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
                  {hasDelta ? (
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-dim transition-transform",
                        isOpen && "rotate-90",
                      )}
                    />
                  ) : null}
                </div>
              </RowEl>

              {hasDelta && isOpen && (
                <ExpandedPanel
                  epicId={e.id}
                  epicName={e.epic_name ?? "Untitled epic"}
                  delta={delta}
                  pmbaText={e.pmba_text}
                  actualHours={e.actual_hours}
                  ratePerHour={ratePerHour}
                  showRate={showRate}
                  tickets={tickets}
                  changes={changes}
                  logs={logs}
                  projectStart={projectStart}
                  ticketEpic={ticketEpic}
                  cutoffMs={cutoffMs}
                  discounts={discounts}
                  discountSumForEpic={sumTotals(
                    discountByEpic.get(e.id) ?? {
                      FE: 0,
                      BE: 0,
                      Project: 0,
                    },
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExpandedPanel({
  epicId,
  delta,
  pmbaText,
  actualHours,
  ratePerHour,
  showRate,
  tickets,
  changes,
  logs,
  projectStart,
  ticketEpic,
  cutoffMs,
  discounts,
  discountSumForEpic,
}: {
  epicId: number;
  epicName: string;
  delta: number;
  pmbaText: string | null;
  actualHours: number;
  ratePerHour: number;
  showRate: boolean;
  tickets: ReturnType<typeof usePortalEpicTrendData>["tickets"];
  changes: ReturnType<typeof usePortalEpicTrendData>["changes"];
  logs: ReturnType<typeof usePortalEpicTrendData>["logs"];
  projectStart: string | null;
  ticketEpic: Map<string, number>;
  cutoffMs: number;
  discounts: EpicDiscount[];
  discountSumForEpic: number;
}) {
  const series = useMemo(
    () =>
      buildEpicTrendSeries({
        tickets,
        changes,
        logs,
        projectStart,
        cutoffMs,
        ticketFilter: (tid) => ticketEpic.get(tid) === epicId,
        discounts: discounts.filter((d) => d.epic_id === epicId),
      }),
    [
      tickets,
      changes,
      logs,
      projectStart,
      cutoffMs,
      ticketEpic,
      epicId,
      discounts,
    ],
  );

  const text = (pmbaText ?? "").trim();
  const accentCls =
    delta > 0
      ? "border-l-health-warn"
      : "border-l-health-good";

  const effActual = Math.max(0, actualHours - discountSumForEpic);

  return (
    <div
      className={cn(
        "border-l-2 pl-4 pr-3 py-3 border-b border-white/5 bg-white/[0.015] space-y-3",
        accentCls,
      )}
    >
      {text.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] hairline p-3 text-sm leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      )}

      <div className="rounded-xl bg-white/[0.02] hairline p-3">
        <div className="h-40">
          {series.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-dim">
              No data
            </div>
          ) : (
            <PortalTrendChart data={series} compact />
          )}
        </div>
      </div>

      {showRate && ratePerHour > 0 && (
        <div className="text-xs text-dim font-mono text-right">
          Cost so far:{" "}
          <span className="text-foreground">
            {formatGBP(effActual * ratePerHour)}
          </span>
        </div>
      )}
    </div>
  );
}
