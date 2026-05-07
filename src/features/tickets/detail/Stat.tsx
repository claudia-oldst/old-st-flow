import { formatHours } from "@/lib/utils";

export function Stat({
  label,
  actual,
  estimate,
  original,
}: {
  label: string;
  actual: number;
  estimate: number;
  original: number;
}) {
  const r = estimate > 0 ? actual / estimate : 0;
  const color = r >= 1 ? "text-health-bad" : r >= 0.8 ? "text-health-warn" : "text-health-good";
  const changed = estimate !== original;
  const delta = estimate - original;
  return (
    <div className="rounded-lg bg-white/[0.02] hairline p-3">
      <div className="text-xs text-dimmer">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-lg font-mono font-semibold ${actual > 0 ? color : "text-foreground"}`}>{formatHours(actual)}</span>
        <span className="text-xs text-dimmer">/ {formatHours(estimate)}</span>
      </div>
      {changed && (
        <div className="mt-1 text-[10px] text-dimmer">
          Originally {formatHours(original)}{" "}
          <span className={delta > 0 ? "text-health-warn" : "text-health-good"}>
            ({delta > 0 ? "+" : ""}{formatHours(delta)})
          </span>
        </div>
      )}
    </div>
  );
}
