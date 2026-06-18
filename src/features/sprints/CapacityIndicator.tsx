import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/utils";

/**
 * Shared capacity bar used in the Planning tab — header and per-dev columns.
 * Bar turns red when used > cap.
 */
export function CapacityIndicator({
  used,
  cap,
  className,
}: {
  used: number;
  cap: number;
  className?: string;
}) {
  const over = cap > 0 && used > cap;
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "font-mono text-[11px] whitespace-nowrap",
          over && "text-primary font-semibold",
        )}
      >
        {formatHours(used)} / {formatHours(cap)}
      </span>
      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden min-w-12">
        <div
          className={cn("h-full transition-all", over ? "bg-primary" : "bg-accent/70")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
