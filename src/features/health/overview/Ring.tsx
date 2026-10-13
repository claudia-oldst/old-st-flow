import { useState } from "react";
import { healthRatio, formatHours } from "@/lib/utils";
import type { Doneness } from "./doneness";
import { DonenessArcs } from "./DonenessArcs";

interface Props {
  title: string;
  actual: number;
  estimate: number;
  original: number;
  /** Hours discounted at the epic level for this discipline. */
  discounted?: number;
  /** Status split of current-estimate hours; drawn as a third, outermost ring. */
  doneness?: Doneness;
}

export function Ring({ title, actual, estimate, original, discounted = 0, doneness }: Props) {
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

  const [tip, setTip] = useState<string[] | null>(null);
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
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="-10 -10 160 160" className="-rotate-90">
            {doneness && <DonenessArcs r={67} strokeWidth={5} doneness={doneness} label="Doneness by current" onHover={setTip} />}
            <>
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
            </>
            <>
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
            </>
          </svg>
          {tip && (
            <div className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg">
              <div className="font-medium mb-0.5">{tip[0]}</div>
              {tip.slice(1).map((l) => <div key={l} className="font-mono">{l}</div>)}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
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
