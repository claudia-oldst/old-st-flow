import { formatHours } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  actual,
  estimate,
  original,
  onClick,
}: {
  label: string;
  actual: number;
  estimate: number;
  original: number;
  onClick?: () => void;
}) {
  const r = estimate > 0 ? actual / estimate : 0;
  const color = r >= 1 ? "text-health-bad" : r >= 0.8 ? "text-health-warn" : "text-health-good";
  const changed = estimate !== original;
  const delta = estimate - original;
  return (
    <div
      className={cn(
        "rounded-lg bg-white/[0.02] hairline p-3",
        onClick && "cursor-pointer hover:bg-white/[0.04] transition-colors"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
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
