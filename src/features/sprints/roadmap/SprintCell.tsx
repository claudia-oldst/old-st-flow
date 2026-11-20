import { memo } from "react";
import { Check, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { CellState } from "./cellRules";

const LABEL: Record<CellState, string> = { none: "None", planned: "Planned", committed: "Committed" };

interface Props {
  state: CellState;
  unplanned: boolean;
  /** Ticket has no hours for this discipline. */
  noHours: boolean;
  working: boolean;
  editable: boolean;
  onSet: (s: CellState) => void;
}

/** One ticket × sprint × discipline cell: None / Planned / Committed. */
export const SprintCell = memo(function SprintCell({ state, unplanned, noHours, working, editable, onSet }: Props) {
  const base = cn("h-7 w-full flex items-center justify-center text-[10px] font-medium rounded", working && "bg-accent/[0.04]");
  if (noHours) return <div className={cn(base, "text-dimmer")}>–</div>;
  const chip =
    state === "committed" ? (
      <span className="px-1.5 py-0.5 rounded bg-health-good/15 text-health-good">Committed</span>
    ) : state === "planned" ? (
      <span className="px-1.5 py-0.5 rounded bg-brand-gold/15 text-brand-gold">Planned</span>
    ) : (
      <Plus className="h-3 w-3 text-dimmer opacity-0 group-hover/cell:opacity-100" />
    );
  if (!editable) return <div className={base}>{state === "none" ? null : chip}</div>;
  if (state === "none")
    return (
      <button type="button" className={cn(base, "group/cell hover:bg-white/5")} onClick={() => onSet("planned")} aria-label="Plan into this sprint">
        {chip}
      </button>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn(base, "hover:bg-white/5")} aria-label={`${LABEL[state]} — change`}>{chip}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[130px]">
        {(["none", "planned", "committed"] as CellState[]).map((s) => (
          <DropdownMenuItem key={s} onSelect={() => s !== state && onSet(s)} className="text-xs gap-2">
            <Check className={cn("h-3 w-3", s === state ? "opacity-100" : "opacity-0")} />
            {LABEL[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
