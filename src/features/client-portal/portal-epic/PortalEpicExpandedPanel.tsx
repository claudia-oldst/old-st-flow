import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatGBP } from "../types";
import { PortalTrendChart } from "../epic-trend/PortalTrendChart";
import {
  buildEpicTrendSeries,
  usePortalEpicTrendData,
} from "../epic-trend/usePortalEpicTrendData";
import type { EpicDiscount } from "@/features/discounts/applyDiscounts";

export function PortalEpicExpandedPanel({
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
    delta > 0 ? "border-l-health-warn" : "border-l-health-good";

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
