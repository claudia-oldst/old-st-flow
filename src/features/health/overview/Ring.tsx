import { healthRatio, formatHours } from "@/lib/utils";

interface Props {
  title: string;
  actual: number;
  estimate: number;
  original: number;
  /** Hours discounted at the epic level for this discipline. */
  discounted?: number;
}

export function Ring({ title, actual, estimate, original, discounted = 0 }: Props) {
  // "Effective" actual = what we charge / count once discounts are applied.
  const effective = Math.max(0, actual - discounted);

  // Outer arc reflects EFFECTIVE / estimate (per direction: arcs use effective ratio).
  const ratio = estimate > 0 ? Math.min(effective / estimate, 1.5) : 0;
  const pct = Math.min(ratio * 100, 100);
  const health = healthRatio(effective, estimate);
  const color =
    health === "good" ? "hsl(var(--health-good))" :
    health === "warn" ? "hsl(var(--health-warn))" :
    health === "bad" ? "hsl(var(--health-bad))" :
    "hsl(0 0% 30%)";

  // Inner arc reflects EFFECTIVE / original.
  const origRatio = original > 0 ? Math.min(effective / original, 1.5) : 0;
  const origPct = Math.min(origRatio * 100, 100);
  const origHealth = healthRatio(effective, original);
  const origColor =
    origHealth === "good" ? "hsl(var(--health-good))" :
    origHealth === "warn" ? "hsl(var(--health-warn))" :
    origHealth === "bad" ? "hsl(var(--health-bad))" :
    "hsl(0 0% 30%)";

  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  const rInner = 30;
  const cInner = 2 * Math.PI * rInner;
  const dashInner = (origPct / 100) * cInner;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-dimmer mb-3">{title}</div>
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 140 140" className="-rotate-90">
            <circle cx="70" cy="70" r={r} stroke="hsl(0 0% 100% / 0.06)" strokeWidth="10" fill="none" />
            <circle
              cx="70" cy="70" r={r}
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${dash} ${c}`}
              strokeLinecap="round"
              className="transition-all"
            />
            <circle cx="70" cy="70" r={rInner} stroke="hsl(0 0% 100% / 0.05)" strokeWidth="6" fill="none" />
            {original > 0 && (
              <circle
                cx="70" cy="70" r={rInner}
                stroke={origColor}
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${dashInner} ${cInner}`}
                strokeLinecap="round"
                opacity={0.7}
                className="transition-all"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-[10px] uppercase tracking-wider text-dimmer leading-none">Current</div>
            <div className="text-sm font-mono leading-none mt-1 text-dim font-semibold">{Math.round(ratio * 100)}%</div>
            {original > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-wider text-dimmer leading-none mt-2">Original</div>
                <div className="text-sm font-mono leading-none mt-1 text-dim text-destructive-foreground font-semibold">{Math.round(origRatio * 100)}%</div>
              </>
            )}
          </div>
        </div>
        <div className="text-sm space-y-1">
          <div>
            <div className="text-dimmer text-xs">Actual</div>
            <div className="font-mono">{formatHours(actual)}</div>
          </div>
          {discounted > 0 && (
            <>
              <div>
                <div className="text-dimmer text-xs">Discounted</div>
                <div className="font-mono text-health-bad">−{formatHours(discounted)}</div>
              </div>
              <div>
                <div className="text-dimmer text-xs">Effective</div>
                <div className="font-mono">{formatHours(effective)}</div>
              </div>
            </>
          )}
          <div>
            <div className="text-dimmer text-xs">Estimate</div>
            <div className="font-mono">{formatHours(estimate)}</div>
          </div>
          <div>
            <div className="text-dimmer text-xs">Original</div>
            <div className="font-mono">{original > 0 ? formatHours(original) : "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
