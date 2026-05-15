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
  const effective = Math.max(0, actual - discounted);

  const ratio = estimate > 0 ? Math.min(effective / estimate, 1.5) : 0;
  const pct = Math.min(ratio * 100, 100);
  const health = healthRatio(effective, estimate);
  const color =
    health === "good" ? "hsl(var(--health-good))" :
    health === "warn" ? "hsl(var(--health-warn))" :
    health === "bad" ? "hsl(var(--health-bad))" :
    "hsl(0 0% 30%)";

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

  const rInner = 38;
  const cInner = 2 * Math.PI * rInner;
  const dashInner = (origPct / 100) * cInner;

  const stats: { label: string; value: string; tone?: string }[] = [
    { label: "Actual", value: formatHours(actual) },
    { label: "Estimate", value: formatHours(estimate) },
  ];
  if (discounted > 0) {
    stats.push({ label: "Discounted", value: `−${formatHours(discounted)}`, tone: "text-health-bad" });
    stats.push({ label: "Effective", value: formatHours(effective) });
  }
  stats.push({ label: "Original", value: original > 0 ? formatHours(original) : "—" });

  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-dimmer mb-4">{title}</div>
      <div className="flex items-center gap-5">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 140 140" className="-rotate-90">
            <circle cx="70" cy="70" r={r} stroke="hsl(0 0% 100% / 0.06)" strokeWidth="8" fill="none" />
            <circle
              cx="70" cy="70" r={r}
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${dash} ${c}`}
              strokeLinecap="round"
              className="transition-all"
            />
            <circle cx="70" cy="70" r={rInner} stroke="hsl(0 0% 100% / 0.05)" strokeWidth="5" fill="none" />
            {original > 0 && (
              <circle
                cx="70" cy="70" r={rInner}
                stroke={origColor}
                strokeWidth="5"
                fill="none"
                strokeDasharray={`${dashInner} ${cInner}`}
                strokeLinecap="round"
                opacity={0.6}
                className="transition-all"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-2xl font-mono font-semibold leading-none" style={{ color }}>
              {Math.round(ratio * 100)}%
            </div>
            <div className="text-[9px] uppercase tracking-wider text-dimmer mt-1 leading-none">of estimate</div>
            {original > 0 && (
              <div className="text-[10px] font-mono mt-2 leading-none" style={{ color: origColor, opacity: 0.85 }}>
                {Math.round(origRatio * 100)}%
                <span className="text-dimmer font-sans ml-1">orig</span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm flex-1 min-w-0">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <div className="text-dimmer text-[10px] uppercase tracking-wider">{s.label}</div>
              <div className={`font-mono ${s.tone ?? ""}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
