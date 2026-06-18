import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { type PortalPayload } from "./types";
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
import { PortalEpicRow } from "./portal-epic/PortalEpicRow";
import { PortalEpicExpandedPanel } from "./portal-epic/PortalEpicExpandedPanel";

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
          return (
            <div key={e.id} className="hairline-b last:border-b-0">
              <PortalEpicRow
                epic={e}
                isOpen={isOpen}
                onToggle={() => toggle(e.id)}
              />

              {hasDelta && isOpen && (
                <PortalEpicExpandedPanel
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
