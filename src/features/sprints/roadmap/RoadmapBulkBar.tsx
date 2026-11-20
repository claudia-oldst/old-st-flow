import { useState } from "react";
import { Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CellState } from "./cellRules";

export type BulkDisc = "both" | "FE" | "BE";

interface Props {
  count: number;
  sprintNumber: number | undefined;
  onSet: (disc: BulkDisc, to: CellState) => void;
  onAssign: () => void;
  onClear: () => void;
}

/** Shown when rows are ticked: set FE/BE cells in the working sprint, or assign people. */
export function RoadmapBulkBar({ count, sprintNumber, onSet, onAssign, onClear }: Props) {
  const [disc, setDisc] = useState<BulkDisc>("both");
  if (!count) return null;
  return (
    <div className="sticky bottom-3 z-30 mx-auto w-fit flex items-center gap-3 rounded-lg glass-strong hairline px-3 py-2 text-xs shadow-elev">
      <span className="font-medium">{count} selected</span>
      <div className="flex rounded-md hairline overflow-hidden">
        {(["both", "FE", "BE"] as BulkDisc[]).map((d) => (
          <button key={d} type="button" onClick={() => setDisc(d)} className={cn("px-2 h-7", disc === d ? "bg-accent/15 text-accent" : "text-dim hover:text-foreground")}>
            {d === "both" ? "FE + BE" : d}
          </button>
        ))}
      </div>
      <span className="text-dimmer">Set to</span>
      {(["none", "planned", "committed"] as CellState[]).map((s) => (
        <Button key={s} size="sm" variant="outline" className="h-7 text-xs capitalize" onClick={() => onSet(disc, s)} disabled={!sprintNumber}>
          {s === "none" ? "None" : s}
        </Button>
      ))}
      <span className="text-dimmer">in Sprint {sprintNumber ?? "–"}</span>
      <span className="text-dimmer">·</span>
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={onAssign}><Users className="h-3.5 w-3.5" /> Assign people</Button>
      <button type="button" onClick={onClear} aria-label="Clear selection" className="text-dimmer hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}
