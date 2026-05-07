import { useState } from "react";
import { History } from "lucide-react";
import { formatHours } from "@/lib/utils";

interface ChangeRow {
  id: string;
  delta: number;
  discipline: string;
  reason?: string | null;
  created_at: string;
  user?: { name?: string } | null;
}

export function EstimateChangesPanel({ changes }: { changes: ChangeRow[] }) {
  const [showAll, setShowAll] = useState(false);
  if (changes.length === 0) return null;
  return (
    <div className="mt-4 rounded-lg bg-white/[0.02] hairline p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] text-dimmer uppercase tracking-wider inline-flex items-center gap-1.5">
          <History className="h-3 w-3" /> Estimate changes ({changes.length})
        </div>
        {changes.length > 3 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-[10px] text-dim hover:text-foreground transition"
          >
            {showAll ? "Show less" : "View all"}
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {(showAll ? changes : changes.slice(0, 3)).map((c) => {
          const sign = c.delta > 0 ? "+" : "";
          const color =
            c.delta > 0
              ? "text-health-warn"
              : c.delta < 0
              ? "text-health-good"
              : "text-dim";
          const isAuto = (c.reason ?? "").startsWith("Auto-trimmed");
          return (
            <div key={c.id} className="flex items-start gap-2 text-xs">
              <span className={`font-mono font-semibold ${color} w-12 shrink-0`}>
                {sign}{formatHours(c.delta)}
              </span>
              <span className="text-dim shrink-0">{c.discipline}</span>
              <span className="flex-1 min-w-0 text-dim truncate">
                {isAuto ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded ring-1 ring-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-dimmer mr-1">
                    auto
                  </span>
                ) : null}
                {c.user?.name ?? "—"}
                {c.reason && <span className="text-dimmer"> — {c.reason}</span>}
              </span>
              <span className="text-[10px] text-dimmer shrink-0">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
