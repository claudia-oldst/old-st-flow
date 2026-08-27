import { cn, formatHours } from "@/lib/utils";
import { SegmentedBar } from "@/features/_shared/SegmentedBar";
import type { EpicRiskRow, Risk } from "./epicRisk";

export function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-2 w-2 rounded-sm", className)} />
      {label}
    </span>
  );
}

export function RiskPill({ risk }: { risk: Risk }) {
  const map: Record<Risk, { cls: string; label: string }> = {
    at_risk: { cls: "bg-health-bad/15 text-health-bad ring-health-bad/30", label: "At risk" },
    watch: { cls: "bg-health-warn/15 text-health-warn ring-health-warn/30", label: "Watch" },
    healthy: { cls: "bg-health-good/15 text-health-good ring-health-good/30", label: "Healthy" },
  };
  const { cls, label } = map[risk];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full ring-1 text-[11px] font-medium whitespace-nowrap",
        cls,
      )}
    >
      {label}
    </span>
  );
}

/** One epic line: doneness segments, estimate burn bar and risk pill. */
export function EpicRiskRowView({ row }: { row: EpicRiskRow }) {
  return (
    <div className="grid grid-cols-[2fr_3fr_3fr_auto] gap-4 items-center px-2 py-2 rounded-lg hover:bg-white/[0.02] transition">
      <div className="text-sm truncate" title={row.name}>
        {row.name}
      </div>

      <div>
        <SegmentedBar
          segments={[
            { pct: (row.done / row.total) * 100, className: "bg-health-good" },
            { pct: (row.devDone / row.total) * 100, className: "bg-health-good/50" },
            { pct: (row.active / row.total) * 100, className: "bg-health-warn" },
            { pct: (row.backlog / row.total) * 100, className: "bg-white/10" },
          ]}
        />
        <div className="mt-1 text-[10px] text-dimmer font-mono flex gap-2 flex-wrap">
          <span className="text-dim font-medium">{Math.round(row.progressPct)}%</span>
          <span>{row.done} done</span>
          {row.devDone > 0 && <span>{row.devDone} dev done</span>}
          {row.active > 0 && <span>{row.active} active</span>}
          <span>{row.backlog} backlog</span>
        </div>
      </div>

      <div>
        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              row.baselineEst === 0 || row.burnPct > 100
                ? "bg-health-bad"
                : row.burnPct > 80
                  ? "bg-health-warn"
                  : "bg-health-good",
            )}
            style={{
              width: `${row.baselineEst === 0 ? (row.actualHours > 0 ? 100 : 0) : Math.min(100, row.burnPct)}%`,
            }}
          />
        </div>
        <div className="mt-1 text-[10px] text-dimmer font-mono">
          {row.baselineEst === 0 ? (
            <>no estimate · {formatHours(row.actualHours)} logged</>
          ) : (
            <>
              {Math.round(row.burnPct)}% burned · {formatHours(row.actualHours)} /{" "}
              {formatHours(row.baselineEst)}
              {row.currentEst !== row.baselineEst && (
                <span className="text-dim"> (current {formatHours(row.currentEst)})</span>
              )}
            </>
          )}
        </div>
      </div>

      <RiskPill risk={row.risk} />
    </div>
  );
}
