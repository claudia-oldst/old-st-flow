import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { type PortalPayload } from "./types";
import { TrendChart } from "@/features/_shared/estimate-trend/TrendChart";
import { buildTrendSeries } from "@/features/_shared/estimate-trend/buildTrendSeries";
import { useTrendData } from "@/features/_shared/estimate-trend/useTrendData";
import {
  discountTotalsByEpic,
  sumTotals,
  type EpicDiscount,
} from "@/features/discounts/applyDiscounts";
import { versionKeyOf } from "@/features/health/versionFilter";
import { PortalEpicRow } from "./portal-epic/PortalEpicRow";
import { PortalEpicExpandedPanel } from "./portal-epic/PortalEpicExpandedPanel";

interface Props {
  epics: PortalPayload["epics"];
  projectId: string;
  /** Portal version scope; null/empty means all versions. */
  versions?: string[] | null;
  cutoff: string;
  ratePerHour: number;
  showRate: boolean;
  discounts: EpicDiscount[];
}

export function PortalEpicTable({
  epics,
  projectId,
  versions,
  cutoff,
  ratePerHour,
  showRate,
  discounts,
}: Props) {
  const visibleEpics = useMemo(
    () => epics.filter((e) => e.total_tickets > 0),
    [epics],
  );

  const includedIds = useMemo(
    () => new Set(visibleEpics.map((e) => e.id)),
    [visibleEpics],
  );

  const { dataset } = useTrendData(projectId);
  const { tickets, changes, logs, projectStart, ticketEpic, ticketVersion } = dataset;

  // Scope the trend chart to the same versions the rest of the portal uses.
  const versionSet = useMemo(
    () => (versions && versions.length ? new Set(versions) : null),
    [versions],
  );
  const versionAllowed = useMemo(
    () => (tid: string) =>
      !versionSet || versionSet.has(versionKeyOf(ticketVersion.get(tid))),
    [versionSet, ticketVersion],
  );

  const cutoffMs = useMemo(() => new Date(cutoff).getTime(), [cutoff]);
  const projectStartDate = useMemo(
    () => (projectStart ? new Date(projectStart) : null),
    [projectStart],
  );

  const aggregated = useMemo(
    () =>
      buildTrendSeries({
        tickets,
        changes,
        logs,
        projectStart: projectStartDate,
        cutoffMs,
        ticketFilter: (tid) => {
          if (!versionAllowed(tid)) return false;
          const eid = ticketEpic.get(tid);
          return eid != null && includedIds.has(eid);
        },
        discounts,
      }),
    [
      tickets,
      changes,
      logs,
      projectStartDate,
      cutoffMs,
      ticketEpic,
      includedIds,
      discounts,
      versionAllowed,
    ],
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
            <TrendChart data={aggregated} />
          </div>
        </div>
      )}

      {/* Epic progress table */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[20px_minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_minmax(0,0.7fr)_28px] gap-3 items-center px-4 py-2.5 text-[10px] uppercase tracking-wider text-dimmer hairline-b">
          <div />
          <div>Epic</div>
          <div>Progress</div>
          <div className="text-right">Hours (act/cur/orig)</div>
          <div className="text-right">Change</div>
          <div />
        </div>

        {visibleEpics.map((e) => {
          const delta = e.current_estimate - e.original_estimate;
          const hasDelta = delta !== 0;
          // "Show to client" toggle off => never surface the PM/BA note publicly
          const clientText = e.included === false ? null : e.pmba_text;
          const hasSummary = (clientText ?? "").trim().length > 0;
          const canExpand = hasDelta || hasSummary;
          const isOpen = expanded.has(e.id);
          return (
            <div key={e.id} className="hairline-b last:border-b-0">
              <PortalEpicRow
                epic={e}
                isOpen={isOpen}
                canExpand={canExpand}
                onToggle={() => toggle(e.id)}
              />

              {canExpand && isOpen && (
                <PortalEpicExpandedPanel
                  epicId={e.id}
                  epicName={e.epic_name ?? "Untitled epic"}
                  delta={delta}
                  pmbaText={clientText}
                  actualHours={e.actual_hours}
                  ratePerHour={ratePerHour}
                  showRate={showRate}
                  tickets={tickets}
                  changes={changes}
                  logs={logs}
                  projectStart={projectStartDate}
                  ticketEpic={ticketEpic}
                  versionAllowed={versionAllowed}
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
