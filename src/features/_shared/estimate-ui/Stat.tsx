import { cn, formatHours } from "@/lib/utils";

export type StatAccent = "primary" | "warn" | "gold" | "good";

const ACCENT_CLASS: Record<StatAccent, string> = {
  primary: "text-primary",
  warn: "text-health-warn",
  gold: "text-brand-gold",
  good: "text-health-good",
};

export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: StatAccent;
}) {
  const color = accent ? ACCENT_CLASS[accent] : "text-foreground";
  return (
    <div className="rounded-lg bg-white/[0.02] hairline px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-dimmer">{label}</div>
      <div className={cn("font-mono text-sm", color)}>{formatHours(value)}</div>
    </div>
  );
}
