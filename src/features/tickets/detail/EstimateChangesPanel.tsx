import { useState } from "react";
import { ChevronRight, History } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn, formatHours } from "@/lib/utils";

interface ChangeRow {
  id: string;
  delta: number;
  discipline: string;
  reason?: string | null;
  created_at: string;
  user?: { name?: string } | null;
}

/** Collapsed-by-default estimate history, shown inside the Time card. */
export function EstimateChangesPanel({ changes }: { changes: ChangeRow[] }) {
  const [open, setOpen] = useState(false);
  if (changes.length === 0) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="pt-3 hairline-t">
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-dim hover:text-foreground transition">
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        <History className="h-3.5 w-3.5" /> Estimate history ({changes.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-1.5">
        {changes.map((c) => {
          const sign = c.delta > 0 ? "+" : "";
          const color = c.delta > 0 ? "text-health-warn" : c.delta < 0 ? "text-health-good" : "text-dim";
          const isAuto = (c.reason ?? "").startsWith("Auto-trimmed");
          return (
            <div key={c.id} className="flex items-start gap-2 text-xs">
              <span className={`font-mono font-semibold ${color} w-12 shrink-0`}>
                {sign}{formatHours(c.delta)}
              </span>
              <span className="text-dim shrink-0">{c.discipline}</span>
              <span className="flex-1 min-w-0 text-dim truncate">
                {isAuto && (
                  <span className="px-1.5 py-0.5 rounded hairline bg-surface-2 text-[10px] uppercase tracking-wider text-dimmer mr-1">
                    auto
                  </span>
                )}
                {c.user?.name ?? "—"}
                {c.reason && <span className="text-dimmer"> — {c.reason}</span>}
              </span>
              <span className="text-[10px] text-dimmer shrink-0">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
