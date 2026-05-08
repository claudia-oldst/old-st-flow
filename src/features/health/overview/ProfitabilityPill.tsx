import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

export function ProfitabilityPill({ state }: { state: string }) {
  if (state === "good") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-health-good/15 text-health-good ring-1 ring-health-good/30 text-xs font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
      </div>
    );
  }
  if (state === "warn") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-health-warn/15 text-health-warn ring-1 ring-health-warn/30 text-xs font-medium">
        <TrendingUp className="h-3.5 w-3.5" /> At risk
      </div>
    );
  }
  if (state === "bad") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-health-bad/15 text-health-bad ring-1 ring-health-bad/30 text-xs font-medium">
        <AlertTriangle className="h-3.5 w-3.5" /> Over budget
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-dim ring-1 ring-white/10 text-xs font-medium">
      No data
    </div>
  );
}
