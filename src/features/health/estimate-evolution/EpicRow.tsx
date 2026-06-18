import { cn, formatHours } from "@/lib/utils";

export function EpicRow({
  name,
  original,
  current,
  actual,
}: {
  name: string;
  original: number;
  current: number;
  actual: number;
}) {
  const max = Math.max(original, current, actual, 1);
  const scopeDelta = current - original;
  const burnPct = current > 0 ? Math.round((actual / current) * 100) : 0;
  const burnColor =
    burnPct >= 100 ? "text-health-bad" : burnPct >= 80 ? "text-health-warn" : "text-health-good";
  return (
    <div className="rounded-xl bg-white/[0.02] hairline p-3">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="flex items-center gap-2 text-[10px]">
          {scopeDelta !== 0 && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full ring-1",
                scopeDelta > 0
                  ? "bg-health-warn/15 text-health-warn ring-health-warn/30"
                  : "bg-health-good/15 text-health-good ring-health-good/30"
              )}
            >
              {scopeDelta > 0 ? "+" : ""}
              {formatHours(scopeDelta)} scope
            </span>
          )}
          <span className={cn("font-mono", burnColor)}>{burnPct}% burned</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <BarRow label="Original" value={original} max={max} color="hsl(0 0% 60%)" />
        <BarRow label="Current" value={current} max={max} color="hsl(var(--chart-in-progress))" />
        <BarRow label="Actual" value={actual} max={max} color="hsl(38 92% 50%)" />
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 text-[10px] text-dimmer">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="w-16 text-right text-xs font-mono text-dim">
        {formatHours(value)}
      </div>
    </div>
  );
}
