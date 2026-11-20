import { cn, formatHours } from "@/lib/utils";

/** Stacked bar: committed (green) + planned (gold) against capacity; coral when over. */
export function ThinCapBar({
  label,
  committed,
  planned = 0,
  cap,
  wide,
}: {
  label: string;
  committed: number;
  planned?: number;
  cap: number;
  wide?: boolean;
}) {
  const used = committed + planned;
  const over = cap > 0 && used > cap;
  const scale = Math.max(cap, used, 1);
  return (
    <div className="flex items-center gap-1.5 min-w-0" title={`${formatHours(committed)} committed · ${formatHours(planned)} planned / ${formatHours(cap)}`}>
      <span className="text-[10px] text-dimmer w-6">{label}</span>
      <div className={cn("relative flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden flex", wide ? "min-w-[120px]" : "min-w-[60px]")}>
        <div className={cn("h-full transition-all", over ? "bg-primary" : "bg-health-good")} style={{ width: `${(committed / scale) * 100}%` }} />
        <div className={cn("h-full transition-all", over ? "bg-primary/60" : "bg-brand-gold/80")} style={{ width: `${(planned / scale) * 100}%` }} />
      </div>
      <span className={cn("text-[10px] font-mono text-dimmer whitespace-nowrap", over && "text-primary font-semibold")}>
        {formatHours(used)}/{formatHours(cap)}
      </span>
    </div>
  );
}
