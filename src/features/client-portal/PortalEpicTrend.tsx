import { useMemo, useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  buildEpicTrendSeries,
  usePortalEpicTrendData,
} from "./epic-trend/usePortalEpicTrendData";
import { PortalTrendChart } from "./epic-trend/PortalTrendChart";

import type { EpicDiscount } from "@/features/discounts/applyDiscounts";

export function PortalEpicTrend({
  projectId,
  cutoff,
  includedEpics,
  discounts = [],
}: {
  projectId: string;
  cutoff: string;
  includedEpics: Array<{ id: number; name: string }>;
  discounts?: EpicDiscount[];
}) {
  const [open, setOpen] = useState(false);
  const { tickets, changes, logs, projectStart, ticketEpic } = usePortalEpicTrendData(
    projectId,
    includedEpics,
  );
  const cutoffMs = new Date(cutoff).getTime();

  const aggregated = useMemo(
    () =>
      buildEpicTrendSeries({
        tickets, changes, logs, projectStart, cutoffMs,
        ticketFilter: () => true,
        discounts,
      }),
    [tickets, changes, logs, projectStart, cutoffMs, discounts],
  );

  if (includedEpics.length === 0 || tickets.length === 0) return null;

  return (
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

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg px-3 py-2 bg-white/[0.02] hairline hover:bg-white/[0.04] transition-colors">
          <span className="text-xs uppercase tracking-wider text-dimmer">
            {open ? "Hide" : "Show"} per-epic detail ({includedEpics.length})
          </span>
          <ChevronDown
            className={cn("h-4 w-4 text-dim transition-transform", open && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
          <div className="space-y-3 pt-3">
            {includedEpics.map((e) => {
              const series = buildEpicTrendSeries({
                tickets, changes, logs, projectStart, cutoffMs,
                ticketFilter: (tid) => ticketEpic.get(tid) === e.id,
                discounts: discounts.filter((d) => d.epic_id === e.id),
              });
              return (
                <div key={e.id} className="rounded-xl bg-white/[0.02] hairline p-3">
                  <div className="text-sm font-medium mb-2">{e.name}</div>
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
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
