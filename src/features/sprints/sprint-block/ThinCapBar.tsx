import { cn, formatHours } from "@/lib/utils";

export function ThinCapBar({
  label,
  pooled,
  cap,
}: {
  label: string;
  pooled: number;
  cap: number;
}) {
  const over = pooled > cap;
  const pct = cap > 0 ? Math.min(100, (pooled / cap) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[10px] text-dimmer w-6">{label}</span>
      <div className="flex-1 min-w-[60px] h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full transition-all", over ? "bg-primary" : "bg-accent/70")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[10px] font-mono text-dimmer whitespace-nowrap",
          over && "text-primary font-semibold",
        )}
      >
        {formatHours(pooled)}/{formatHours(cap)}h
      </span>
    </div>
  );
}
